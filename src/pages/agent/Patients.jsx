import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useTranslation } from '../../i18n/I18nContext';

const AVATAR_GRADIENTS = [
  'from-emerald-400 to-emerald-700',
  'from-teal-400 to-teal-700',
  'from-sky-400 to-sky-700',
  'from-indigo-400 to-indigo-700',
  'from-violet-400 to-violet-700',
  'from-rose-400 to-rose-700',
  'from-amber-400 to-amber-700',
];
const avatarFor = (name) => {
  const i = (name || '?').charCodeAt(0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[i];
};

const svg = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const STATUS_KEYS = {
  rule_out: {
    labelKey: 'pstatus.not_affected',
    pillCls: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/50',
    dot: 'bg-emerald-500',
  },
  alternative_dx: {
    labelKey: 'pstatus.alt_dx',
    pillCls: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800/50',
    dot: 'bg-amber-500',
  },
  escalate: {
    labelKey: 'pstatus.affected_mo',
    pillCls: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800/50',
    dot: 'bg-red-500',
  },
};

const PENDING_META = {
  labelKey: 'pstatus.pending',
  pillCls: 'bg-ink-100 text-ink-700 ring-ink-200 dark:bg-ink-700/40 dark:text-ink-200 dark:ring-ink-700',
  dot: 'bg-ink-400',
};

const NOT_SCREENED_META = {
  labelKey: 'pstatus.not_screened',
  pillCls: 'bg-ink-50 text-ink-500 ring-ink-200 dark:bg-ink-800 dark:text-ink-400 dark:ring-ink-700',
  dot: 'bg-ink-300',
};

function statusFor(p) {
  const c = p.latest_case;
  if (!c) return NOT_SCREENED_META;
  if (c.triage_outcome && STATUS_KEYS[c.triage_outcome]) return STATUS_KEYS[c.triage_outcome];
  return PENDING_META;
}

function reasonFor(p) {
  const c = p.latest_case;
  if (!c) return null;
  if (Array.isArray(c.reason) && c.reason.length) return c.reason.join(' · ');
  if (c.condition) return c.condition.replace(/_/g, ' ');
  return null;
}

export default function Patients() {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (query) => {
    setLoading(true);
    return api(`/patients${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      .then(setList)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load('');
  }, []);

  return (
    <div className="anim-fade-up flex-1 min-h-0 flex flex-col -mx-4 md:-mx-6 -my-4 md:-my-5">
      {/* SUB-HEADER */}
      <div className="shrink-0 bg-white/60 dark:bg-ink-800/40 border-b border-ink-200/60 dark:border-ink-700/40 px-5 md:px-7 py-3.5 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-[11px] t-muted font-semibold">
            {t('role.agent')} <span className="mx-1">›</span> <span className="t-soft">{t('nav.patients')}</span>
          </div>
          <div className="text-[15px] md:text-base font-bold t-ink leading-tight tracking-tight">
            {t('patients.title')}
            <span className="t-muted font-medium text-xs ml-2">· {t('patients.subtitle_inline')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-[11px] font-bold ring-1 ring-emerald-200 dark:ring-emerald-800/50">
            <svg {...svg} width="12" height="12">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {list.length} {list.length === 1 ? t('patients.count_one') : t('patients.count_many')}
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="shrink-0 bg-white/40 dark:bg-ink-800/30 border-b border-ink-200/50 dark:border-ink-700/30 px-5 md:px-7 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 t-muted pointer-events-none">
            <svg {...svg} width="15" height="15"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          </span>
          <input
            className="w-full rounded-xl bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 pl-10 pr-9 py-2.5 text-sm t-ink placeholder:t-muted focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
            placeholder={t('patients.search_ph')}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              load(e.target.value);
            }}
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(''); load(''); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md t-muted hover:t-ink hover:bg-ink-100 dark:hover:bg-ink-700 grid place-items-center transition"
              aria-label="Clear search"
            >
              <svg {...svg} width="12" height="12"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs t-muted">
          <svg {...svg} width="13" height="13" className="text-emerald-600"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          <span>{t('common.updated_now')}</span>
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading && list.length === 0 ? (
          <div className="p-10 text-center t-muted text-sm">{t('common.loading')}</div>
        ) : list.length === 0 ? (
          <EmptyState query={q} t={t} />
        ) : (
          <>
            {/* Desktop: clean table */}
            <table className="hidden md:table w-full text-sm">
              <thead className="sticky top-0 bg-white/90 dark:bg-ink-800/90 backdrop-blur-sm">
                <tr className="text-[10px] uppercase tracking-[0.14em] t-muted text-left">
                  <th className="px-7 py-3 font-bold">{t('patients.col.patient')}</th>
                  <th className="px-3 py-3 font-bold w-20">{t('patients.col.age')}</th>
                  <th className="px-3 py-3 font-bold">{t('patients.col.phone')}</th>
                  <th className="px-3 py-3 font-bold">{t('patients.col.location')}</th>
                  <th className="px-3 py-3 font-bold w-44">{t('patients.col.status')}</th>
                  <th className="px-3 py-3 font-bold">{t('patients.col.reason')}</th>
                  <th className="px-7 py-3 font-bold w-12"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const meta = statusFor(p);
                  const reason = reasonFor(p);
                  return (
                  <tr
                    key={p.id}
                    className="group border-t border-ink-200/50 dark:border-ink-700/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition cursor-pointer"
                  >
                    <td className="px-7 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarFor(p.name)} text-white grid place-items-center text-xs font-bold shadow-sm`}>
                          {(p.name || '?').slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold t-ink truncate">{p.name}</div>
                          <div className="text-[10px] t-muted truncate">ID #{(p.id || '').slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center rounded-md bg-ink-100 dark:bg-ink-700/40 px-2 py-0.5 text-[11px] font-bold t-soft">
                        {p.age ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 t-soft">
                      {p.phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <svg {...svg} width="12" height="12" className="t-muted">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          {p.phone}
                        </span>
                      ) : (
                        <span className="t-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 t-soft">
                      {p.location ? (
                        <span className="inline-flex items-center gap-1.5 max-w-[220px]">
                          <svg {...svg} width="12" height="12" className="text-emerald-600 shrink-0">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                          </svg>
                          <span className="truncate">{p.location}</span>
                        </span>
                      ) : (
                        <span className="t-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${meta.pillCls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {t(meta.labelKey)}
                      </span>
                    </td>
                    <td className="px-3 py-3 t-soft max-w-[280px]">
                      {reason ? (
                        <span className="block truncate" title={reason}>{reason}</span>
                      ) : (
                        <span className="t-muted">—</span>
                      )}
                    </td>
                    <td className="px-7 py-3 text-right">
                      <svg {...svg} width="14" height="14" className="t-muted group-hover:text-emerald-600 transition inline-block">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile: cards */}
            <ul className="md:hidden divide-y divide-ink-200/50 dark:divide-ink-700/40">
              {list.map((p) => {
                const meta = statusFor(p);
                const reason = reasonFor(p);
                return (
                  <li key={p.id} className="px-5 py-3 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition">
                    <div className="flex items-start gap-3">
                      <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarFor(p.name)} text-white grid place-items-center text-sm font-bold shadow-sm shrink-0`}>
                        {(p.name || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold t-ink truncate">{p.name}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${meta.pillCls}`}>
                            <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
                            {t(meta.labelKey)}
                          </span>
                        </div>
                        <div className="text-[11px] t-muted truncate flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center rounded bg-ink-100 dark:bg-ink-700/40 px-1.5 text-[10px] font-bold">{p.age ?? '—'}</span>
                          {p.phone && <span>· {p.phone}</span>}
                          {p.location && <span>· {p.location}</span>}
                        </div>
                        {reason && (
                          <div className="text-[11px] t-soft truncate mt-0.5">{reason}</div>
                        )}
                      </div>
                      <svg {...svg} width="14" height="14" className="t-muted shrink-0 mt-1"><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ query, t }) {
  return (
    <div className="p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 grid place-items-center mx-auto mb-3">
        <svg {...svg} width="28" height="28" className="text-emerald-600">
          {query ? (
            <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>
          ) : (
            <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>
          )}
        </svg>
      </div>
      <div className="t-ink font-bold text-sm">
        {query ? `${t('patients.empty_query_title')} "${query}"` : t('patients.empty_title')}
      </div>
      <div className="t-muted text-xs mt-1">
        {query ? t('patients.empty_query_hint') : t('patients.empty_hint')}
      </div>
    </div>
  );
}
