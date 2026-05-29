import { useState } from 'react';
import { api } from '../../../lib/api';
import { useTranslation } from '../../../i18n/I18nContext';

const CONDITIONS = [
  { key: 'leprosy', enabled: true, icon: 'leaf' },
  { key: 'scabies', enabled: false, icon: 'bug' },
  { key: 'fungal', enabled: false, icon: 'ring' },
  { key: 'eczema', enabled: false, icon: 'drop' },
  { key: 'psoriasis', enabled: false, icon: 'flake' },
  { key: 'vitiligo', enabled: false, icon: 'patch' },
  { key: 'contact_dermatitis', enabled: false, icon: 'hand' },
];

export default function PickConditionStep({ patient, history, onDone, initial }) {
  const { t } = useTranslation();
  const [condition, setCondition] = useState(initial?.condition || 'leprosy');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const c = await api('/cases', {
        method: 'POST',
        body: JSON.stringify({ patient_id: patient.id, condition }),
      });
      await api(`/cases/${c.id}/history`, { method: 'POST', body: JSON.stringify(history) });
      onDone(c.id, condition);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card-elev">
      <header className="mb-5">
        <h2 className="text-lg font-semibold t-ink">{t('pick.title')}</h2>
        <p className="text-sm t-muted mt-1">{t('pick.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CONDITIONS.map((c) => {
          const selected = condition === c.key;
          const baseCls = 'relative text-left p-4 rounded-md border transition';
          const stateCls = selected
            ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-200'
            : c.enabled
              ? 'bg-[color:var(--surface)] border-[color:var(--border)] hover:border-[color:var(--border-strong)] cursor-pointer'
              : 'bg-[color:var(--surface)] border-[color:var(--border)] opacity-60 cursor-not-allowed';

          return (
            <button
              key={c.key}
              type="button"
              disabled={!c.enabled}
              onClick={() => c.enabled && setCondition(c.key)}
              className={`${baseCls} ${stateCls}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={
                    selected
                      ? 'w-9 h-9 rounded-md bg-brand-100 text-brand-700 grid place-items-center'
                      : 'w-9 h-9 rounded-md bg-[color:var(--surface-2)] text-brand-700 grid place-items-center border border-[color:var(--border)]'
                  }
                >
                  <CondIcon name={c.icon} />
                </div>
                {!c.enabled ? (
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-[color:var(--surface-2)] t-muted border border-[color:var(--border)]">
                    {t('pick.coming_soon')}
                  </span>
                ) : selected ? (
                  <span className="w-5 h-5 rounded-full bg-brand-600 text-white grid place-items-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                ) : null}
              </div>

              <div className="mt-3 font-semibold t-ink">{t('cond.' + c.key)}</div>
              <div className="text-xs t-muted mt-0.5 leading-relaxed">
                {t('cond.' + c.key + '.hint')}
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-[color:var(--border)] pt-5 mt-6 flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs t-muted">
          {t('pick.patient_chip')}:{' '}
          <strong className="t-ink font-medium">{patient?.name}</strong> · {patient?.age}y · {patient?.sex}
        </p>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary" disabled={busy}>
            {busy ? '…' : t('pick.submit')}
          </button>
        </div>
      </div>
    </form>
  );
}

function CondIcon({ name }) {
  const p = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (name) {
    case 'leaf':
      return (
        <svg {...p}>
          <path d="M21 3c-9 0-17 7-17 16 0 1 0 2 1 2 9 0 16-8 16-17V3z" />
          <path d="M4 21c2-6 7-11 13-13" />
        </svg>
      );
    case 'bug':
      return (
        <svg {...p}>
          <ellipse cx="12" cy="13" rx="5" ry="7" />
          <path d="M7 13H3M21 13h-4M9 6l-2-3M15 6l2-3M7 17l-3 2M17 17l3 2M9 20l-1 2M15 20l1 2" />
        </svg>
      );
    case 'ring':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'drop':
      return (
        <svg {...p}>
          <path d="M12 2c-4 6-7 10-7 13a7 7 0 0 0 14 0c0-3-3-7-7-13z" />
        </svg>
      );
    case 'flake':
      return (
        <svg {...p}>
          <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" />
        </svg>
      );
    case 'patch':
      return (
        <svg {...p}>
          <path d="M5 8c2-3 5-5 8-5s5 2 6 5-2 6-4 8-5 4-7 3-4-3-4-6 0-3 1-5z" />
        </svg>
      );
    case 'hand':
      return (
        <svg {...p}>
          <path d="M7 11V5a2 2 0 1 1 4 0v6" />
          <path d="M11 11V3a2 2 0 1 1 4 0v8" />
          <path d="M15 11V5a2 2 0 1 1 4 0v9a8 8 0 0 1-8 8h-2a6 6 0 0 1-6-6v-2a2 2 0 0 1 4 0" />
        </svg>
      );
    default:
      return null;
  }
}
