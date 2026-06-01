import { useRef, useState } from 'react';
import { api, uploadImage } from '../../../lib/api';
import { useTranslation } from '../../../i18n/I18nContext';
import GeoCaptureButton from '../../../components/GeoCaptureButton';

const SYMPTOM_CHECKLIST = [
  { key: 'skin_patches', label: 'Light-colored or reddish skin patch(es)' },
  { key: 'patch_loss_of_sensation', label: 'Reduced or loss of sensation over skin patch(es)' },
  { key: 'numb_tingling_burning', label: 'Tingling, numbness, or burning sensation in hands/feet' },
  { key: 'weakness_in_hands_or_feet', label: 'Weakness in hands or feet' },
  { key: 'weak_grip', label: 'Weak grip or objects slipping from hands' },
  { key: 'painless_wounds', label: 'Painless wounds, burns, or ulcers on hands/feet' },
  { key: 'nerve_tenderness', label: 'Pain or tenderness near elbow, wrist, knee, or ankle' },
  { key: 'foot_drop', label: 'Foot slipping out of slippers/chappals or dragging while walking' },
  { key: 'eye_closure_difficulty', label: 'Difficulty closing eyes completely or reduced blinking' },
  { key: 'eyebrow_loss_nasal_collapse', label: 'Loss of eyebrows, collapsed nose' },
  { key: 'nodules_or_earlobe_swelling', label: 'Lumps/nodules on skin or swelling of earlobes' },
];

function YesNo({ value, onChange, t }) {
  return (
    <div className="inline-flex rounded-md border border-[color:var(--border)] overflow-hidden">
      {[
        { v: true, label: t('common.yes') },
        { v: false, label: t('common.no') },
      ].map(({ v, label }, idx) => {
        const selected = value === v;
        return (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={
              (selected
                ? 'bg-brand-600 text-white'
                : 'bg-[color:var(--surface)] t-soft hover:bg-[color:var(--surface-2)]') +
              ' px-4 py-1.5 text-sm font-medium' +
              (idx === 0 ? ' border-r border-[color:var(--border)]' : '')
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function NumberInput({ value, onChange, max = 999, suffix }) {
  return (
    <div className="inline-flex items-center border border-[color:var(--border)] rounded-md overflow-hidden bg-[color:var(--surface)]">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 grid place-items-center t-soft hover:bg-[color:var(--surface-2)] border-r border-[color:var(--border)]"
        tabIndex={-1}
      >
        −
      </button>
      <input
        type="number"
        min={0}
        max={max}
        className="w-16 bg-transparent text-center text-sm font-medium t-ink outline-none"
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 grid place-items-center t-soft hover:bg-[color:var(--surface-2)] border-l border-[color:var(--border)]"
        tabIndex={-1}
      >
        +
      </button>
      {suffix && <span className="text-xs t-muted ml-2 mr-2">{suffix}</span>}
    </div>
  );
}

export default function ScreenStep({ caseId, onDone, initial }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [s, setS] = useState({
    has_skin_patches: false,
    patch_count: 0,
    patch_loss_of_sensation: false,
    enlarged_nerves: false,
    weakness_in_hands_or_feet: false,
    glove_stocking_anesthesia: false,
    duration_weeks: 0,
    duration_months: 0,
    family_history: false,
    image_urls: [],
    lab_urls: [],
    notes: '',
    symptoms_checklist: [],
    screened_at: '',
    geolocation: null,
    ...(initial || {}),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setS({ ...s, [k]: v });

  const toggleSymptom = (key) =>
    setS((cur) => ({
      ...cur,
      symptoms_checklist: cur.symptoms_checklist.includes(key)
        ? cur.symptoms_checklist.filter((x) => x !== key)
        : [...cur.symptoms_checklist, key],
    }));

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const { url } = await uploadImage(f);
      setS((cur) => ({ ...cur, image_urls: [...cur.image_urls, url] }));
    }
  };

  const handleLabUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const { url } = await uploadImage(f);
      setS((cur) => ({ ...cur, lab_urls: [...cur.lab_urls, url] }));
    }
  };

  const removeImage = (idx) => setS((cur) => ({ ...cur, image_urls: cur.image_urls.filter((_, i) => i !== idx) }));
  const removeLab = (idx) => setS((cur) => ({ ...cur, lab_urls: cur.lab_urls.filter((_, i) => i !== idx) }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Keep duration_weeks roughly in sync with duration_months for the rule engine.
      const payload = {
        ...s,
        duration_weeks: s.duration_months > 0 ? Math.max(s.duration_weeks, s.duration_months * 4) : s.duration_weeks,
        screened_at: s.screened_at ? new Date(s.screened_at).toISOString() : new Date().toISOString(),
      };
      const result = await api(`/cases/${caseId}/screen`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onDone(result, s);
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
        <p className="text-sm t-muted mt-1">{t('screen.subtitle')}</p>
      </header>

      <section>
        <div className="section-title mb-3">Screening Context</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium t-soft mb-1.5">Date of screening</label>
            <input
              type="datetime-local"
              className="neu-input"
              value={s.screened_at}
              onChange={(e) => set('screened_at', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium t-soft mb-1.5">Location (GPS)</label>
            <GeoCaptureButton
              value={s.geolocation}
              onCapture={(g) => set('geolocation', g)}
            />
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">Clinical Screening</div>
        <div className="divide-y divide-[color:var(--border)] border border-[color:var(--border)] rounded-md">
          <QuestionRow label={t('screen.has_patches')} required>
            <YesNo value={s.has_skin_patches} onChange={(v) => set('has_skin_patches', v)} t={t} />
          </QuestionRow>

          {s.has_skin_patches && (
            <>
              <QuestionRow label={t('screen.patch_count')} required>
                <NumberInput value={s.patch_count} onChange={(v) => set('patch_count', v)} max={50} />
              </QuestionRow>

              <QuestionRow label={t('screen.patch_los')} hint={t('screen.patch_los_hint')} required>
                <YesNo value={s.patch_loss_of_sensation} onChange={(v) => set('patch_loss_of_sensation', v)} t={t} />
              </QuestionRow>
            </>
          )}

          <QuestionRow label={t('screen.nerves')} required>
            <YesNo value={s.enlarged_nerves} onChange={(v) => set('enlarged_nerves', v)} t={t} />
          </QuestionRow>

          <QuestionRow label={t('screen.weakness')} required>
            <YesNo value={s.weakness_in_hands_or_feet} onChange={(v) => set('weakness_in_hands_or_feet', v)} t={t} />
          </QuestionRow>

          <QuestionRow label={t('screen.glove')} required>
            <YesNo value={s.glove_stocking_anesthesia} onChange={(v) => set('glove_stocking_anesthesia', v)} t={t} />
          </QuestionRow>

          <QuestionRow label={t('screen.family')}>
            <YesNo value={s.family_history} onChange={(v) => set('family_history', v)} t={t} />
          </QuestionRow>

          <QuestionRow label="Duration of symptoms">
            <NumberInput
              value={s.duration_months}
              onChange={(v) => set('duration_months', v)}
              max={120}
              suffix="months"
            />
          </QuestionRow>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">Symptoms Checklist (PDF1)</div>
        <p className="text-xs t-muted mb-3">
          Tap every symptom the patient reports — this is the canonical clinical checklist alongside the Y/N rows above.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SYMPTOM_CHECKLIST.map((sym) => {
            const selected = s.symptoms_checklist.includes(sym.key);
            return (
              <button
                key={sym.key}
                type="button"
                onClick={() => toggleSymptom(sym.key)}
                className={
                  selected
                    ? 'text-left px-3 py-2.5 rounded-md border text-sm font-medium bg-brand-50 text-brand-700 border-brand-300'
                    : 'text-left px-3 py-2.5 rounded-md border text-sm bg-[color:var(--surface)] t-soft border-[color:var(--border)] hover:border-[color:var(--border-strong)]'
                }
              >
                <span className="flex items-start gap-2">
                  <span className={selected ? 'text-brand-700 mt-0.5' : 't-muted mt-0.5'}>
                    {selected ? '☑' : '☐'}
                  </span>
                  <span className="flex-1">{sym.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">{t('screen.images')}</div>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-[color:var(--border-strong)] rounded-md p-6 text-center cursor-pointer hover:bg-[color:var(--surface-2)]"
        >
          <div className="w-10 h-10 rounded-md bg-brand-50 grid place-items-center mx-auto mb-2 text-brand-700">
            <UploadIcon />
          </div>
          <div className="text-sm font-medium t-ink">Click to upload or take photo</div>
          <div className="text-xs t-muted mt-0.5">PNG, JPG · up to 10MB each</div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            capture="environment"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
        {s.image_urls.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3">
            {s.image_urls.map((u, i) => (
              <div key={i} className="relative group">
                <img
                  src={u}
                  alt=""
                  className="w-24 h-24 object-cover rounded-md border border-[color:var(--border)]"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white grid place-items-center text-xs opacity-0 group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">Lab investigations</div>
        <p className="text-xs t-muted mb-3">
          Upload prior lab reports (skin smear, biopsy, blood work) if available.
        </p>
        <label className="block">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleLabUpload}
            className="text-sm t-soft"
          />
        </label>
        {s.lab_urls.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3">
            {s.lab_urls.map((u, i) => (
              <div key={i} className="relative group">
                <img
                  src={u}
                  alt=""
                  className="w-24 h-24 object-cover rounded-md border border-[color:var(--border)]"
                />
                <button
                  type="button"
                  onClick={() => removeLab(i)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white grid place-items-center text-xs opacity-0 group-hover:opacity-100"
                  aria-label="Remove lab report"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">{t('screen.notes')}</div>
        <textarea
          className="neu-input"
          rows={3}
          value={s.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder={t('screen.notes_ph')}
        />
      </section>

      {error && (
        <div className="text-sm text-red-700 border border-red-200 bg-red-50 rounded-md px-3 py-2 mt-4">
          {error}
        </div>
      )}

      <div className="flex justify-end mt-6">
        <button className="btn-primary" disabled={busy}>
          {busy ? '…' : t('screen.submit')}
        </button>
      </div>
    </form>
  );
}

function QuestionRow({ label, hint, required, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium t-ink">
          {label}
          {required && <span className="text-red-600 ml-0.5" aria-hidden>*</span>}
        </div>
        {hint && <div className="text-xs t-muted mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
