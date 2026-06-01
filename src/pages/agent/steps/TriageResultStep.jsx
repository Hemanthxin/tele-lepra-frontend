import { useTranslation } from '../../../i18n/I18nContext';

const PILL = {
  rule_out: 'pill-green',
  alternative_dx: 'pill-amber',
  escalate: 'pill-red',
  queued: 'pill-ink',
};

export default function TriageResultStep({ triage, onNext }) {
  const { t } = useTranslation();
  if (!triage) return null;
  const isQueued = triage.outcome === 'queued';
  const title = isQueued ? 'Saved offline — pending sync' : t('triage.outcome.' + triage.outcome);
  const blurb = isQueued
    ? 'The intake has been stored on this device. It will upload automatically when network returns.'
    : t('triage.outcome.' + triage.outcome + '_blurb');

  return (
    <div className="card-elev">
      <header className="mb-5">
        <h2 className="text-lg font-semibold t-ink">{t('triage.title')}</h2>
        <p className="text-sm t-muted mt-1">{t('triage.subtitle')}</p>
      </header>

      <section>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className={PILL[triage.outcome] || 'pill-amber'}>{title}</span>
          <span className="text-xs t-muted">
            {t('triage.confidence')} {(triage.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 mb-3">
          <div className="text-[11px] uppercase tracking-wider t-muted font-semibold mb-1">
            {t('triage.suspected')}
          </div>
          <div className="text-base font-semibold t-ink capitalize">
            {triage.suspected_condition}
          </div>
          {triage.alternative_dx_hint && (
            <div className="text-xs t-soft mt-1">
              May also be: <em className="t-ink not-italic font-medium">{triage.alternative_dx_hint}</em>
            </div>
          )}
        </div>
        <p className="text-sm t-soft">{blurb}</p>
      </section>

      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">{t('triage.reasoning')}</div>
        <ul className="text-sm t-soft list-disc pl-5 space-y-1">
          {triage.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </section>

      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">{t('triage.suggested')}</div>
        <div className="border border-[color:var(--border)] bg-brand-50 rounded-md p-4">
          <div className="text-sm t-ink leading-relaxed">{triage.suggested_action}</div>
          {triage.alternative_dx_hint && (
            <div className="mt-3 pt-3 border-t border-[color:var(--border)] text-xs t-muted">
              <span className="font-semibold t-soft">{t('triage.alt_hint')}:</span>{' '}
              <em className="t-ink not-italic font-medium">{triage.alternative_dx_hint}</em>
            </div>
          )}
        </div>
      </section>

      <div className="flex justify-end mt-6">
        <button className="btn-primary" onClick={onNext}>
          {triage.outcome === 'escalate' ? t('triage.next.escalate') : t('triage.next.close')}
        </button>
      </div>
    </div>
  );
}
