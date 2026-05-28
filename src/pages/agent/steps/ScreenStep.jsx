import { useRef, useState } from 'react';
import { api, uploadImage } from '../../../lib/api';
import { useTranslation } from '../../../i18n/I18nContext';

function YesNo({ value, onChange, t }) {
  return (
    <div className="inline-flex p-1 rounded-xl neu-inset gap-1">
      {[
        { v: true, label: t('common.yes'), icon: '✓' },
        { v: false, label: t('common.no'), icon: '✕' },
      ].map(({ v, label, icon }) => {
        const selected = value === v;
        return (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 transition-all ${
              selected
                ? v
                  ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-700/30 scale-[1.02]'
                  : 'bg-gradient-to-br from-ink-500 to-ink-700 text-white shadow-md shadow-ink-700/30 scale-[1.02]'
                : 't-muted hover:t-ink'
            }`}
          >
            <span className="text-xs">{icon}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function NumberInput({ value, onChange, max = 999, suffix }) {
  return (
    <div className="relative inline-flex items-center neu-inset rounded-xl px-1 py-1 max-w-[200px]">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 rounded-lg neu-raised-sm grid place-items-center t-soft hover:text-brand-700 transition"
        tabIndex={-1}
      >
        −
      </button>
      <input
        type="number"
        min={0}
        max={max}
        className="w-16 bg-transparent text-center text-sm font-semibold t-ink outline-none"
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 rounded-lg neu-raised-sm grid place-items-center t-soft hover:text-brand-700 transition"
        tabIndex={-1}
      >
        +
      </button>
      {suffix && <span className="text-xs t-muted ml-1.5 mr-2">{suffix}</span>}
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
    <form onSubmit={submit} className="card space-y-5 anim-fade-up">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-lg t-ink">
            {t('screen.title')}
            {condition && (
              <span className="ml-2 text-sm font-normal t-muted">
                ({t('cond.' + condition, condition)})
              </span>
            )}
          </h2>
          <p className="text-xs t-muted mt-1">{t('screen.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-3 anim-stagger">
        <QuestionCard
          label={t('screen.has_patches')}
          required
        >
          <YesNo value={s.has_skin_patches} onChange={(v) => set('has_skin_patches', v)} t={t} />
        </QuestionCard>

        {s.has_skin_patches && (
          <>
            <QuestionCard label={t('screen.patch_count')} required>
              <NumberInput value={s.patch_count} onChange={(v) => set('patch_count', v)} max={50} />
            </QuestionCard>

            <QuestionCard label={t('screen.patch_los')} hint={t('screen.patch_los_hint')} required>
              <YesNo value={s.patch_loss_of_sensation} onChange={(v) => set('patch_loss_of_sensation', v)} t={t} />
            </QuestionCard>
          </>
        )}

        <QuestionCard label={t('screen.nerves')} required>
          <YesNo value={s.enlarged_nerves} onChange={(v) => set('enlarged_nerves', v)} t={t} />
        </QuestionCard>

        <QuestionCard label={t('screen.weakness')} required>
          <YesNo value={s.weakness_in_hands_or_feet} onChange={(v) => set('weakness_in_hands_or_feet', v)} t={t} />
        </QuestionCard>

        <QuestionCard label={t('screen.glove')} required>
          <YesNo value={s.glove_stocking_anesthesia} onChange={(v) => set('glove_stocking_anesthesia', v)} t={t} />
        </QuestionCard>

        <QuestionCard label={t('screen.family')}>
          <YesNo value={s.family_history} onChange={(v) => set('family_history', v)} t={t} />
        </QuestionCard>

        <QuestionCard label={t('screen.duration')}>
          <NumberInput
            value={s.duration_weeks}
            onChange={(v) => set('duration_weeks', v)}
            max={520}
            suffix="weeks"
          />
        </QuestionCard>
      </div>

      {/* Image upload */}
      <div className="pt-3">
        <label className="label">{t('screen.images')}</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="neu-inset rounded-2xl p-6 text-center cursor-pointer hover:scale-[1.005] transition"
        >
          <div className="w-12 h-12 rounded-2xl neu-raised-sm grid place-items-center mx-auto mb-2 text-brand-700 dark:text-brand-300">
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
              <div key={i} className="relative group anim-fade-up">
                <img
                  src={u}
                  alt=""
                  className="w-24 h-24 object-cover rounded-xl neu-raised-sm"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white grid place-items-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="label">{t('screen.notes')}</label>
        <textarea
          className="input rounded-xl"
          rows={3}
          value={s.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder={t('screen.notes_ph')}
        />
      </div>

      {error && (
        <div className="text-sm text-red-700 dark:text-red-300 neu-inset rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-ink-200/40 dark:border-ink-700/40">
        <button className="btn-primary px-6" disabled={busy}>
          {busy ? '…' : t('screen.submit')}
        </button>
      </div>
    </form>
  );
}

function QuestionCard({ label, hint, required, children }) {
  return (
    <div className="rounded-xl neu-raised-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 transition hover:shadow-md">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium t-ink flex items-center gap-1.5">
          <span>{label}</span>
          {required && <span className="text-red-500 text-xs" aria-hidden>*</span>}
        </div>
        {hint && <div className="text-xs t-muted mt-1">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
