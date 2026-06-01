/**
 * Sync engine — replays queued offline intakes when network returns.
 *
 * For the agent intake flow we queue a "bundle" containing the full
 * { patient, history, screen, images, lab_images } snapshot. The engine
 * replays each bundle in order, running the same 4 backend POSTs that the
 * online wizard would: /patients → /cases → /cases/{id}/history →
 * /cases/{id}/screen. Images are multipart-uploaded just before the screen
 * post, and the returned URLs are substituted into the screen payload.
 *
 * Failures keep the bundle in queue with status='error' + last_error; the
 * engine retries on the next online event / page load. There is no automatic
 * exponential backoff yet — the UI exposes a manual "Retry" button.
 */
import { auth } from './firebase';
import {
  deleteBundle,
  listPendingBundles,
  logSyncEvent,
  updateBundleStatus,
} from './offlineDB';

const BASE = import.meta.env.VITE_API_BASE || '/api';

let _syncing = false;
const _listeners = new Set();

function emit() {
  for (const fn of _listeners) {
    try { fn(); } catch {}
  }
}

/** Subscribe to sync-state changes. Returns unsubscribe fn. */
export function onSyncChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json();
}

async function uploadBlobAsImage(blob, filename) {
  const fd = new FormData();
  fd.append('file', blob, filename || 'image.jpg');
  const res = await fetch(`${BASE}/uploads/image`, {
    method: 'POST',
    headers: await authHeaders(),
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const json = await res.json();
  return json.url;
}

/** Process a single bundle. Throws on failure; caller updates queue state. */
async function syncBundle(bundle) {
  // 1. Create the patient.
  const patient = await postJson('/patients', bundle.patient);

  // 2. Create the case (default to leprosy, same as the live wizard).
  const caseDoc = await postJson('/cases', {
    patient_id: patient.id,
    condition: 'leprosy',
  });
  const caseId = caseDoc.id;

  // 3. Post history.
  await postJson(`/cases/${caseId}/history`, bundle.history || {
    chronic_conditions: [],
    prior_prescriptions_urls: [],
    prior_labs_urls: [],
    past_visits_notes: null,
  });

  // 4. Upload any pending images, substitute URLs into screen payload.
  const screen = { ...(bundle.screen || {}) };
  const imageUrls = [...(screen.image_urls || [])];
  for (const item of bundle.images || []) {
    if (item.blob) {
      const url = await uploadBlobAsImage(item.blob, item.filename);
      imageUrls.push(url);
    } else if (item.url) {
      imageUrls.push(item.url);
    }
  }
  screen.image_urls = imageUrls;

  const labUrls = [...(screen.lab_urls || [])];
  for (const item of bundle.lab_images || []) {
    if (item.blob) {
      const url = await uploadBlobAsImage(item.blob, item.filename);
      labUrls.push(url);
    } else if (item.url) {
      labUrls.push(item.url);
    }
  }
  screen.lab_urls = labUrls;

  // 5. Submit screening (this also runs triage server-side).
  const triage = await postJson(`/cases/${caseId}/screen`, screen);

  return { patient_id: patient.id, case_id: caseId, triage };
}

export async function drainQueue() {
  if (_syncing) return;
  if (!navigator.onLine) return;
  // Wait until Firebase auth is hydrated — otherwise the very first sync
  // after a cold start would fire without a token.
  if (!auth.currentUser) return;

  _syncing = true;
  emit();
  try {
    const pending = await listPendingBundles();
    for (const bundle of pending) {
      if (bundle.status === 'syncing') continue;
      await updateBundleStatus(bundle.id, { status: 'syncing', last_error: null });
      emit();
      try {
        const result = await syncBundle(bundle);
        await updateBundleStatus(bundle.id, {
          status: 'synced',
          synced_at: Date.now(),
          result,
        });
        await logSyncEvent({ kind: 'success', bundle_id: bundle.id, result });
        // Drop synced bundles from the queue after a short delay so the UI
        // can flash "uploaded" briefly. Done in the background.
        setTimeout(() => deleteBundle(bundle.id).then(emit).catch(() => {}), 4000);
      } catch (err) {
        await updateBundleStatus(bundle.id, {
          status: 'error',
          last_error: String(err.message || err),
          last_attempt: Date.now(),
        });
        await logSyncEvent({ kind: 'error', bundle_id: bundle.id, error: String(err.message || err) });
        // Don't keep looping if one bundle fails — likely a token/server issue
        // that will affect the rest. Stop here and let the next online event retry.
        break;
      }
      emit();
    }
  } finally {
    _syncing = false;
    emit();
  }
}

export function isSyncing() {
  return _syncing;
}

let _initialised = false;

export function initSyncEngine() {
  if (_initialised) return;
  _initialised = true;

  // Drain on every online transition.
  window.addEventListener('online', () => {
    drainQueue();
  });

  // First drain after Firebase auth hydrates.
  auth.onAuthStateChanged((user) => {
    if (user && navigator.onLine) drainQueue();
  });

  // Periodic safety-net drain every 60s in case events were missed.
  setInterval(() => {
    if (navigator.onLine && auth.currentUser) drainQueue();
  }, 60_000);
}
