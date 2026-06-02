import { useMemo, useRef, useState } from 'react';
import { uploadImage } from '../../../lib/api';
import { useTranslation } from '../../../i18n/I18nContext';
import GeoCaptureButton from '../../../components/GeoCaptureButton';

/**
 * Symptom-driven screening. The agent answers COMMON questions first; each
 * "yes" reveals its follow-ups. The likely condition(s) are inferred live from
 * the answers (mirrors the backend rule engine) — the agent never picks a
 * disease.
 */

// Common questions, each with the follow-ups it reveals when answered "yes".
const QUESTIONS = [
  {
    key: 'skin_changes',
    q: 'Any skin patch, rash, or discoloured area?',
    followups: [
      { key: 'skin_pale_or_reddish_patch', q: 'Is the patch pale/light-coloured or reddish?' },
      { key: 'skin_loss_of_sensation', q: 'Loss of sensation over the patch?', hint: 'Test with a pinprick or cotton wisp vs adjacent skin.' },
      { key: 'skin_patch_count', q: 'How many patches?', type: 'number' },
      { key: 'skin_itchy_worse_at_night', q: 'Itchy, worse at night?' },
      { key: 'skin_household_others_affected', q: 'Others at home have similar itching?' },
      { key: 'skin_nodules_or_earlobe', q: 'Lumps/nodules or ear-lobe swelling?' },
    ],
  },
  {
    key: 'numbness_or_weakness',
    q: 'Numbness, tingling, or weakness in hands or feet?',
    followups: [
      { key: 'glove_stocking_anesthesia', q: 'Numbness in a glove / stocking pattern (both hands or feet)?' },
      { key: 'enlarged_nerves', q: 'Thickened or tender nerves felt?' },
      { key: 'eye_closure_or_foot_drop', q: 'Difficulty closing eyes, or foot dragging?' },
      { key: 'painless_wounds', q: 'Painless wounds, burns, or ulcers on hands/feet?' },
    ],
  },
  {
    key: 'fever',
    q: 'Fever in the last 2 weeks?',
    followups: [
      { key: 'fever_chills_rigor', q: 'With chills and shivering (rigor)?' },
      { key: 'fever_periodic', q: 'Comes and goes in a pattern (every 1–2 days)?' },
      { key: 'fever_altered_consciousness', q: 'With confusion, drowsiness, or fits?', hint: 'Acute emergency — escalate immediately.' },
      { key: 'fever_neck_stiff_or_headache', q: 'With severe headache or neck stiffness?' },
      { key: 'fever_night_sweats', q: 'With drenching night sweats?' },
    ],
  },
  {
    key: 'cough',
    q: 'Any cough?',
    followups: [
      { key: 'cough_2_weeks_or_more', q: 'Lasting 2 weeks or more?' },
      { key: 'cough_blood_in_sputum', q: 'Blood in the sputum?' },
      { key: 'cough_weight_loss', q: 'With significant weight loss?' },
    ],
  },
  {
    key: 'swelling',
    q: 'Swelling of any limb, breast, or genitals?',
    followups: [
      { key: 'swelling_limb_or_genitals', q: 'Persistent swelling of a limb or genitals?' },
      { key: 'swelling_acute_attacks', q: 'Recurrent painful swelling attacks with fever?' },
    ],
  },
  {
    key: 'pain_or_fatigue',
    q: 'Recurrent body/joint pain, severe tiredness, or yellow eyes?',
    followups: [
      { key: 'recurrent_pain_episodes', q: 'Recurrent severe body/bone pain episodes?' },
      { key: 'anaemia_or_fatigue', q: 'Very pale, tired, or breathless (anaemia)?' },
      { key: 'jaundice', q: 'Yellow eyes or skin (jaundice)?' },
      { key: 'family_history_sickle_cell', q: 'Family history of sickle cell disease?' },
    ],
  },
];

// General questions, always shown.
const GENERAL = [
  { key: 'family_history_leprosy', q: 'Household contact / family history of leprosy?' },
  { key: 'duration_months', q: 'Duration of symptoms', type: 'number', suffix: 'months' },
];

// Symptom -> condition weights for the live preview only. The authoritative
// triage runs server-side at submit. Keep in sync with the backend source of
// truth: backend/app/services/rule_engine.py (_SYMPTOM_MAP / _CARDINAL_HIGH).
const WEIGHTS = {
  skin_loss_of_sensation: { leprosy: 3 }, glove_stocking_anesthesia: { leprosy: 3 },
  enlarged_nerves: { leprosy: 3 }, skin_pale_or_reddish_patch: { leprosy: 1 },
  skin_nodules_or_earlobe: { leprosy: 1 }, eye_closure_or_foot_drop: { leprosy: 1 },
  painless_wounds: { leprosy: 1 }, numbness_or_weakness: { leprosy: 1 },
  family_history_leprosy: { leprosy: 1 },
  skin_itchy_worse_at_night: { scabies: 2 }, skin_household_others_affected: { scabies: 2 },
  fever_chills_rigor: { malaria: 3 }, fever_periodic: { malaria: 2 },
  fever_altered_consciousness: { japanese_encephalitis: 3 }, fever_neck_stiff_or_headache: { japanese_encephalitis: 2 },
  fever_night_sweats: { tuberculosis: 1 },
  cough_2_weeks_or_more: { tuberculosis: 3 }, cough_blood_in_sputum: { tuberculosis: 3 }, cough_weight_loss: { tuberculosis: 1 },
  swelling_limb_or_genitals: { lymphatic_filariasis: 3 }, swelling_acute_attacks: { lymphatic_filariasis: 2 },
  recurrent_pain_episodes: { sickle_cell: 2 }, anaemia_or_fatigue: { sickle_cell: 1 },
  jaundice: { sickle_cell: 1 }, family_history_sickle_cell: { sickle_cell: 1 },
};
const CARDINAL = {
  leprosy: ['skin_loss_of_sensation', 'glove_stocking_anesthesia', 'enlarged_nerves'],
  japanese_encephalitis: ['fever_altered_consciousness'],
  tuberculosis: ['cough_2_weeks_or_more', 'cough_blood_in_sputum'],
  malaria: ['fever_chills_rigor'], lymphatic_filariasis: ['swelling_limb_or_genitals'],
};
const DISEASE_LABELS = {
  leprosy: 'Leprosy', lymphatic_filariasis: 'Lymphatic Filariasis', tuberculosis: 'Tuberculosis',
  scabies: 'Scabies', japanese_encephalitis: 'Japanese Encephalitis', malaria: 'Malaria',
  sickle_cell: 'Sickle Cell Disease',
};

function inferConditions(s) {
  const scores = {};
  for (const [key, contrib] of Object.entries(WEIGHTS)) {
    if (s[key] === true) for (const [cond, w] of Object.entries(contrib)) scores[cond] = (scores[cond] || 0) + w;
  }
  const out = [];
  for (const [cond, score] of Object.entries(scores)) {
    const cardinal = (CARDINAL[cond] || []).some((k) => s[k] === true);
    const risk = cardinal || score >= 3 ? 'high' : score >= 1 ? 'moderate' : 'low';
    out.push({ cond, score, risk });
  }
  const rank = { high: 2, moderate: 1, low: 0 };
  out.sort((a, b) => rank[b.risk] - rank[a.risk] || b.score - a.score);
  return out;
}

function YesNo({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="inline-flex rounded-md border border-[color:var(--border)] overflow-hidden">
      {[{ v: true, label: t('common.yes') }, { v: false, label: t('common.no') }].map(({ v, label }, idx) => {
        const selected = value === v;
        return (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            className={(selected ? 'bg-brand-600 text-white' : 'bg-[color:var(--surface)] t-soft hover:bg-[color:var(--surface-2)]')
              + ' px-4 py-1.5 text-sm font-medium' + (idx === 0 ? ' border-r border-[color:var(--border)]' : '')}
          >{label}</button>
        );
      })}
    </div>
  );
}

function NumberInput({ value, onChange, max = 999, suffix }) {
  return (
    <div className="inline-flex items-center border border-[color:var(--border)] rounded-md overflow-hidden bg-[color:var(--surface)]">
      <button type="button" tabIndex={-1} onClick={() => onChange(Math.max(0, (value || 0) - 1))}
        className="w-8 h-8 grid place-items-center t-soft hover:bg-[color:var(--surface-2)] border-r border-[color:var(--border)]">−</button>
      <input type="number" min={0} max={max} value={value ?? 0} onChange={(e) => onChange(+e.target.value)}
        className="w-16 bg-transparent text-center text-sm font-medium t-ink outline-none" />
      <button type="button" tabIndex={-1} onClick={() => onChange(Math.min(max, (value || 0) + 1))}
        className="w-8 h-8 grid place-items-center t-soft hover:bg-[color:var(--surface-2)] border-l border-[color:var(--border)]">+</button>
      {suffix && <span className="text-xs t-muted ml-2 mr-2">{suffix}</span>}
    </div>
  );
}

function Row({ label, hint, indent, children }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-4 py-3 ${indent ? 'pl-8 bg-[color:var(--surface-2)]/40' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium t-ink">{label}</div>
        {hint && <div className="text-xs t-muted mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const RISK_PILL = { high: 'pill-red', moderate: 'pill-amber', low: 'pill-green' };

export default function ScreenStep({ onDone, initial, busy: parentBusy }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [s, setS] = useState({
    skin_patch_count: 0, duration_months: 0,
    image_urls: [], image_blobs: [], lab_urls: [], lab_blobs: [],
    notes: '', screened_at: '', geolocation: null,
    ...(initial || {}),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submitBusy = busy || parentBusy;

  const set = (k, v) => setS((cur) => ({ ...cur, [k]: v }));
  const inferred = useMemo(() => inferConditions(s), [s]);
  const topInferred = inferred.filter((i) => i.risk !== 'low');

  const uploadInto = (field, blobField, fallbackName) => async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      try {
        const { url } = await uploadImage(f);
        setS((cur) => ({ ...cur, [field]: [...cur[field], url] }));
      } catch (err) {
        if (err.offline) {
          const localUrl = URL.createObjectURL(f);
          const id = crypto.randomUUID();
          setS((cur) => ({ ...cur, [blobField]: [...cur[blobField], { id, blob: f, filename: f.name || fallbackName, localUrl }] }));
        } else { throw err; }
      }
    }
  };
  const handleUpload = uploadInto('image_urls', 'image_blobs', 'image.jpg');
  const handleLabUpload = uploadInto('lab_urls', 'lab_blobs', 'lab.jpg');
  const removeAt = (field, idx) => setS((cur) => ({ ...cur, [field]: cur[field].filter((_, i) => i !== idx) }));
  const removeBlob = (field, id) => setS((cur) => ({ ...cur, [field]: cur[field].filter((b) => b.id !== id) }));

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    // Require every common question to be answered.
    const unanswered = QUESTIONS.filter((q) => s[q.key] !== true && s[q.key] !== false);
    if (unanswered.length) {
      setError('Please answer all the main questions (Yes/No) before continuing.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...s,
        screened_at: s.screened_at ? new Date(s.screened_at).toISOString() : new Date().toISOString(),
      };
      onDone(payload, s);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card-elev">
      <header className="mb-5">
        <h2 className="text-lg font-semibold t-ink">{t('screen.title')}</h2>
        <p className="text-sm t-muted mt-1">
          Answer the symptom questions. Follow-up questions appear based on the answers, and the likely condition is suggested automatically.
        </p>
      </header>

      {/* Screening context */}
      <section>
        <div className="section-title mb-3">Screening Context</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium t-soft mb-1.5">Date of screening</label>
            <input type="datetime-local" className="neu-input" value={s.screened_at} onChange={(e) => set('screened_at', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium t-soft mb-1.5">Location (GPS)</label>
            <GeoCaptureButton value={s.geolocation} onCapture={(g) => set('geolocation', g)} />
          </div>
        </div>
      </section>

      {/* Symptom questionnaire */}
      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">Symptom screening</div>
        <div className="divide-y divide-[color:var(--border)] border border-[color:var(--border)] rounded-md overflow-hidden">
          {QUESTIONS.map((q) => (
            <div key={q.key}>
              <Row label={q.q}>
                <YesNo value={s[q.key]} onChange={(v) => set(q.key, v)} />
              </Row>
              {s[q.key] === true && q.followups.map((f) => (
                <Row key={f.key} label={f.q} hint={f.hint} indent>
                  {f.type === 'number'
                    ? <NumberInput value={s[f.key]} onChange={(v) => set(f.key, v)} max={50} suffix={f.suffix} />
                    : <YesNo value={s[f.key]} onChange={(v) => set(f.key, v)} />}
                </Row>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* General */}
      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">General</div>
        <div className="divide-y divide-[color:var(--border)] border border-[color:var(--border)] rounded-md">
          {GENERAL.map((g) => (
            <Row key={g.key} label={g.q}>
              {g.type === 'number'
                ? <NumberInput value={s[g.key]} onChange={(v) => set(g.key, v)} max={120} suffix={g.suffix} />
                : <YesNo value={s[g.key]} onChange={(v) => set(g.key, v)} />}
            </Row>
          ))}
        </div>
      </section>

      {/* Live inferred-condition preview */}
      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-2">Likely condition (auto-detected)</div>
        {topInferred.length === 0 ? (
          <p className="text-sm t-muted">No condition flagged yet — answer the questions above. Final triage runs after you submit.</p>
        ) : (
          <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3">
            <p className="text-sm t-soft mb-2">Based on the answers so far, this may be:</p>
            <div className="flex flex-wrap gap-1.5">
              {topInferred.map((i) => (
                <span key={i.cond} className={RISK_PILL[i.risk]}>{DISEASE_LABELS[i.cond]} · {i.risk}</span>
              ))}
            </div>
            <p className="text-[11px] t-muted mt-2">Add a clear photo of the affected area below to help the Medical Officer confirm.</p>
          </div>
        )}
      </section>

      {/* Images */}
      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">{t('screen.images')}</div>
        <div onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-[color:var(--border-strong)] rounded-md p-6 text-center cursor-pointer hover:bg-[color:var(--surface-2)]">
          <div className="w-10 h-10 rounded-md bg-brand-50 grid place-items-center mx-auto mb-2 text-brand-700"><UploadIcon /></div>
          <div className="text-sm font-medium t-ink">Click to upload or take photo</div>
          <div className="text-xs t-muted mt-0.5">PNG, JPG · up to 10MB each</div>
          <input ref={fileInputRef} type="file" multiple accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
        </div>
        <Thumbs urls={s.image_urls} blobs={s.image_blobs} onRemoveUrl={(i) => removeAt('image_urls', i)} onRemoveBlob={(id) => removeBlob('image_blobs', id)} />
      </section>

      {/* Lab investigations */}
      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">Lab investigations</div>
        <p className="text-xs t-muted mb-3">Upload prior lab reports (skin smear, biopsy, blood work) if available.</p>
        <input type="file" multiple accept="image/*" onChange={handleLabUpload} className="text-sm t-soft" />
        <Thumbs urls={s.lab_urls} blobs={s.lab_blobs} onRemoveUrl={(i) => removeAt('lab_urls', i)} onRemoveBlob={(id) => removeBlob('lab_blobs', id)} />
      </section>

      {/* Notes */}
      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">{t('screen.notes')}</div>
        <textarea className="neu-input" rows={3} value={s.notes} onChange={(e) => set('notes', e.target.value)} placeholder={t('screen.notes_ph')} />
      </section>

      {error && <div className="text-sm text-red-700 border border-red-200 bg-red-50 rounded-md px-3 py-2 mt-4">{error}</div>}

      <div className="flex justify-end mt-6">
        <button className="btn-primary" disabled={submitBusy}>{submitBusy ? '…' : t('screen.submit')}</button>
      </div>
    </form>
  );
}

function Thumbs({ urls, blobs, onRemoveUrl, onRemoveBlob }) {
  if (urls.length === 0 && blobs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {urls.map((u, i) => (
        <div key={`url-${i}`} className="relative group">
          <img src={u} alt="" className="w-24 h-24 object-cover rounded-md border border-[color:var(--border)]" />
          <RemoveBtn onClick={() => onRemoveUrl(i)} />
        </div>
      ))}
      {blobs.map((item) => (
        <div key={item.id} className="relative group">
          <img src={item.localUrl} alt="" className="w-24 h-24 object-cover rounded-md border border-amber-300" />
          <span className="absolute bottom-0 left-0 right-0 text-[9px] font-semibold text-center bg-amber-100/90 text-amber-800 py-0.5 rounded-b-md">Pending upload</span>
          <RemoveBtn onClick={() => onRemoveBlob(item.id)} />
        </div>
      ))}
    </div>
  );
}

function RemoveBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Remove"
      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white grid place-items-center text-xs opacity-0 group-hover:opacity-100">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
    </button>
  );
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
