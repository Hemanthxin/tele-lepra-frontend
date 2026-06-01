/**
 * IndexedDB persistence for the offline-write queue.
 *
 * Two stores:
 *   - intake_bundles: a complete agent intake (patient + history + screening + images-as-blobs)
 *                     queued atomically; sync replays the whole bundle sequentially.
 *   - sync_log     : append-only diagnostics so we can show retry history in the UI.
 */
import { openDB } from 'idb';

const DB_NAME = 'lepra-offline';
const DB_VERSION = 1;

let _dbPromise = null;

export function getDB() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('intake_bundles')) {
          const store = db.createObjectStore('intake_bundles', { keyPath: 'id' });
          store.createIndex('by_status', 'status');
          store.createIndex('by_created', 'created_at');
        }
        if (!db.objectStoreNames.contains('sync_log')) {
          db.createObjectStore('sync_log', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return _dbPromise;
}

// ---------- Intake bundles ----------
export async function saveIntakeBundle(bundle) {
  const db = await getDB();
  await db.put('intake_bundles', bundle);
  return bundle.id;
}

export async function getIntakeBundle(id) {
  const db = await getDB();
  return db.get('intake_bundles', id);
}

export async function listPendingBundles() {
  const db = await getDB();
  const all = await db.getAll('intake_bundles');
  return all
    .filter((b) => b.status !== 'synced')
    .sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
}

export async function listAllBundles() {
  const db = await getDB();
  const all = await db.getAll('intake_bundles');
  return all.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}

export async function deleteBundle(id) {
  const db = await getDB();
  await db.delete('intake_bundles', id);
}

export async function updateBundleStatus(id, patch) {
  const db = await getDB();
  const current = await db.get('intake_bundles', id);
  if (!current) return;
  await db.put('intake_bundles', { ...current, ...patch });
}

// ---------- Sync log ----------
export async function logSyncEvent(event) {
  const db = await getDB();
  await db.add('sync_log', { ...event, at: Date.now() });
  // Cap the log so it doesn't grow forever.
  const all = await db.getAll('sync_log');
  if (all.length > 200) {
    const drop = all.slice(0, all.length - 200);
    const tx = db.transaction('sync_log', 'readwrite');
    for (const e of drop) await tx.store.delete(e.id);
    await tx.done;
  }
}
