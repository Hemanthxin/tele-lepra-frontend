import { useRef, useState } from 'react';
import { api, uploadImage } from '../../../lib/api';
import { useTranslation } from '../../../i18n/I18nContext';

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

export default function ScreenStep({ caseId, condition, onDone, initial }) {
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
    family_history: false,
    image_urls: [],
    notes: '',
    ...(initial || {}),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setS({ ...s, [k]: v });

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const { url } = await uploadImage(f);
      setS((cur) => ({ ...cur, image_urls: [...cur.image_urls, url] }));
    }
  };

  const removeImage = (idx) => setS((cur) => ({ ...cur, image_urls: cur.image_urls.filter((_, i) => i !== idx) }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api(`/cases/${caseId}/screen`, {
        method: 'POST',
        body: JSON.stringify(s),
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
        <h2 className="text-lg font-semibold t-ink">
          {t('screen.title')}
          {condition && (
            <span className="ml-2 text-sm font-normal t-muted">
              ({t('cond.' + condition, condition)})
            </span>
          )}
        </h2>
        <p className="text-sm t-muted mt-1">{t('screen.subtitle')}</p>
      </header>

      <section>
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

          <QuestionRow label={t('screen.duration')}>
            <NumberInput
              value={s.duration_weeks}
              onChange={(v) => set('duration_weeks', v)}
              max={520}
              suffix="weeks"
            />
          </QuestionRow>
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
