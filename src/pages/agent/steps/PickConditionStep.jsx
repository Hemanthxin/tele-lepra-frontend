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

export default function PickConditionStep({ patient, history, onDone }) {
  const { t } = useTranslation();
  const [condition, setCondition] = useState('leprosy');
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
    <form onSubmit={submit} className="card space-y-5 anim-fade-up">
      <div>
        <h2 className="font-semibold t-ink text-lg">{t('pick.title')}</h2>
        <p className="text-xs t-muted mt-1">{t('pick.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 anim-stagger">
        {CONDITIONS.map((c) => {
          const selected = condition === c.key;
          const base =
            'relative text-left p-4 rounded-2xl transition-all duration-300 overflow-hidden group';
          const stateCls = selected
            ? 'bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-lg shadow-brand-700/30 scale-[1.02] ring-2 ring-brand-300/50'
            : c.enabled
            ? 'neu-raised-sm hover:-translate-y-1 hover:shadow-md cursor-pointer'
            : 'neu-raised-sm opacity-60 cursor-not-allowed';

          return (
            <button
              key={c.key}
              type="button"
              disabled={!c.enabled}
              onClick={() => c.enabled && setCondition(c.key)}
              className={`${base} ${stateCls}`}
            >
              {/* corner accent on selected */}
              {selected && (
                <span className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
              )}

              <div className="flex items-start justify-between gap-2 relative">
                <div
                  className={`w-10 h-10 rounded-xl grid place-items-center transition ${
                    selected
                      ? 'bg-white/20 text-white'
                      : 'neu-icon text-brand-700 dark:text-brand-300 group-hover:scale-110'
                  }`}
                >
                  <CondIcon name={c.icon} />
                </div>
                {!c.enabled ? (
                  <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-ink-200/70 dark:bg-ink-700/70 t-muted">
                    {t('pick.coming_soon')}
                  </span>
                ) : selected ? (
                  <span className="w-6 h-6 rounded-full bg-white text-brand-700 grid place-items-center text-xs font-bold shadow">
                    ✓
                  </span>
                ) : null}
              </div>

              <div className={`mt-3 font-semibold ${selected ? 'text-white' : 't-ink'}`}>
                {t('cond.' + c.key)}
              </div>
              <div
                className={`text-xs mt-0.5 leading-relaxed ${
                  selected ? 'text-white/85' : 't-muted'
                }`}
              >
                {t('cond.' + c.key + '.hint')}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-ink-200/40 dark:border-ink-700/40">
        <p className="text-xs t-muted">
          {t('pick.patient_chip')}:{' '}
          <strong className="t-ink">{patient?.name}</strong> · {patient?.age}y · {patient?.sex}
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? '…' : t('pick.submit')}
        </button>
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
