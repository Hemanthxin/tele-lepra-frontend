import { useTranslation } from '../../../i18n/I18nContext';

const PILL = {
  rule_out: 'pill-green',
  alternative_dx: 'pill-amber',
  escalate: 'pill-red',
};

export default function TriageResultStep({ triage, onNext }) {
  const { t } = useTranslation();
  if (!triage) return null;
  const title = t('triage.outcome.' + triage.outcome);
  const blurb = t('triage.outcome.' + triage.outcome + '_blurb');

  return (
    <div className="card space-y-4 anim-fade-up">
      <div>
        <h2 className="font-semibold t-ink">{t('triage.title')}</h2>
        <p className="text-xs t-muted mt-0.5">{t('triage.subtitle')}</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className={PILL[triage.outcome] || 'pill-amber'}>{title}</span>
        <span className="text-sm t-muted">
          {t('triage.confidence')} {(triage.confidence * 100).toFixed(0)}% · {t('triage.suspected')}: {triage.suspected_condition}
        </span>
      </div>

      <p className="text-sm t-soft">{blurb}</p>

      <div>
        <h3 className="text-sm font-semibold mb-1 t-ink">{t('triage.reasoning')}</h3>
        <ul className="text-sm t-soft list-disc pl-5 space-y-0.5">
          {triage.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      <div className="neu-raised-sm rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden">
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-400 to-brand-700" />
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center shrink-0 shadow-md shadow-brand-700/30">
          <SparkIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-brand-700 dark:text-brand-300 mb-1">
            {t('triage.suggested')}
          </div>
          <div className="text-sm t-ink leading-relaxed">{triage.suggested_action}</div>
          {triage.alternative_dx_hint && (
            <div className="mt-2 pt-2 border-t border-ink-200/40 dark:border-ink-700/40 text-xs t-muted">
              <span className="font-semibold t-soft">{t('triage.alt_hint')}:</span>{' '}
              <em className="t-ink not-italic font-medium">{triage.alternative_dx_hint}</em>
            </div>
          )}
        </div>
      </div>

      <button className="btn-primary" onClick={onNext}>
        {triage.outcome === 'escalate' ? t('triage.next.escalate') : t('triage.next.close')}
      </button>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M12 2l2.4 5.4L20 10l-5.6 2.6L12 18l-2.4-5.4L4 10l5.6-2.6L12 2z" />
    </svg>
  );
}
