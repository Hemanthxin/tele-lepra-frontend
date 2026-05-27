import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useTranslation } from '../../i18n/I18nContext';

const PILL = {
  rule_out: 'pill-green',
  alternative_dx: 'pill-amber',
  escalate: 'pill-red',
};

export default function Queue() {
  const { t } = useTranslation();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api('/cases/queue')
      .then(setCases)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const statusLabel = (s) => t('status.' + s, s.replace('_', ' '));

  return (
    <div className="anim-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
        <div>
          <div className="section-title">{t('role.mo')}</div>
          <h1 className="text-3xl font-bold tracking-tight t-ink">{t('queue.title')}</h1>
          <p className="text-sm t-muted mt-1">{t('queue.subtitle')}</p>
        </div>
        <div className="pill-brand">
          {cases.length} {cases.length === 1 ? t('queue.case') : t('queue.cases')} · {t('queue.pending')}
        </div>
      </div>

      {loading ? (
        <div className="neu-raised rounded-2xl p-8 t-muted text-sm">{t('common.loading')}</div>
      ) : cases.length === 0 ? (
        <div className="neu-raised rounded-2xl p-12 text-center">
          <div className="t-soft text-sm font-medium">{t('queue.empty')}</div>
          <div className="t-muted text-xs mt-1">{t('queue.empty_hint')}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 anim-stagger">
          {cases.map((c) => (
            <Link
              to={`/mo/case/${c.id}`}
              key={c.id}
              className="neu-raised neu-pressable rounded-2xl p-5 block"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="font-bold t-ink truncate">{c.patient_name}</div>
                  <div className="text-xs t-muted mt-0.5">
                    {c.condition} · #{c.id.slice(0, 8)}
                  </div>
                </div>
                <span className={PILL[c.triage_outcome] || 'pill-amber'}>
                  {(c.triage_outcome || 'pending').replace('_', ' ')}
                </span>
              </div>

              <div className="text-xs mb-2">
                <span className="pill-ink">{statusLabel(c.status)}</span>
              </div>

              {c.scheduled_at && (
                <div className="text-xs t-muted mb-2">
                  {t('queue.scheduled')} · {new Date(c.scheduled_at).toLocaleString()}
                </div>
              )}

              {c.triage?.reasons && (
                <p className="text-xs t-soft line-clamp-2 mt-2 border-t border-ink-200/40 dark:border-ink-700/40 pt-2">
                  {c.triage.reasons.join(' · ')}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
