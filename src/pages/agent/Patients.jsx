import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useTranslation } from '../../i18n/I18nContext';

const svg = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const STATUS_KEYS = {
  rule_out: { labelKey: 'pstatus.not_affected', pillCls: 'pill-green' },
  alternative_dx: { labelKey: 'pstatus.alt_dx', pillCls: 'pill-amber' },
  escalate: { labelKey: 'pstatus.affected_mo', pillCls: 'pill-red' },
};

const PENDING_META = { labelKey: 'pstatus.pending', pillCls: 'pill-ink' };
const NOT_SCREENED_META = { labelKey: 'pstatus.not_screened', pillCls: 'pill-ink' };

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
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="section-title">{t('role.agent')}</div>
          <h1 className="text-2xl font-semibold tracking-tight t-ink">{t('patients.title')}</h1>
          <p className="text-sm t-muted mt-1">{t('patients.subtitle_inline')}</p>
        </div>
        <div>
          <span className="pill-brand">
            {list.length} {list.length === 1 ? t('patients.count_one') : t('patients.count_many')}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 t-muted pointer-events-none">
            <svg {...svg} width="14" height="14"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          </span>
          <input
            className="neu-input pl-9 pr-9"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded t-muted hover:t-ink grid place-items-center"
              aria-label="Clear search"
            >
              <svg {...svg} width="12" height="12"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="text-xs t-muted">{t('common.updated_now')}</div>
      </div>

      {/* Content */}
      {loading && list.length === 0 ? (
        <div className="card-elev text-center text-sm t-muted">{t('common.loading')}</div>
      ) : list.length === 0 ? (
        <EmptyState query={q} t={t} />
      ) : (
        <>
          {/* Desktop: table */}
          <div className="card-elev !p-0 overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider t-muted">
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-2)]">
                  <th className="text-left font-semibold px-4 py-2.5">{t('patients.col.patient')}</th>
                  <th className="text-left font-semibold px-4 py-2.5 w-16">{t('patients.col.age')}</th>
                  <th className="text-left font-semibold px-4 py-2.5">{t('patients.col.phone')}</th>
                  <th className="text-left font-semibold px-4 py-2.5">{t('patients.col.location')}</th>
                  <th className="text-left font-semibold px-4 py-2.5 w-44">{t('patients.col.status')}</th>
                  <th className="text-left font-semibold px-4 py-2.5">{t('patients.col.reason')}</th>
                  <th className="px-4 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const meta = statusFor(p);
                  const reason = reasonFor(p);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface-2)] cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium t-ink">{p.name}</div>
                        <div className="text-[11px] t-muted">ID #{(p.id || '').slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-3 t-soft">{p.age ?? '—'}</td>
                      <td className="px-4 py-3 t-soft">{p.phone || <span className="t-muted">—</span>}</td>
                      <td className="px-4 py-3 t-soft">
                        {p.location ? (
                          <span className="block truncate max-w-[220px]">{p.location}</span>
                        ) : (
                          <span className="t-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={meta.pillCls}>{t(meta.labelKey)}</span>
                      </td>
                      <td className="px-4 py-3 t-soft max-w-[280px]">
                        {reason ? (
                          <span className="block truncate" title={reason}>{reason}</span>
                        ) : (
                          <span className="t-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <svg {...svg} width="14" height="14" className="t-muted inline-block">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked rows */}
          <div className="card-elev !p-0 overflow-hidden md:hidden">
            <ul>
              {list.map((p) => {
                const meta = statusFor(p);
                const reason = reasonFor(p);
                return (
                  <li key={p.id} className="px-4 py-3 border-b border-[color:var(--border)] last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium t-ink truncate">{p.name}</span>
                          <span className={meta.pillCls}>{t(meta.labelKey)}</span>
                        </div>
                        <div className="text-[11px] t-muted mt-0.5">
                          {p.age ?? '—'}
                          {p.phone && <span> · {p.phone}</span>}
                          {p.location && <span> · {p.location}</span>}
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
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ query, t }) {
  return (
    <div className="card-elev text-center">
      <div className="w-12 h-12 rounded-md bg-brand-50 grid place-items-center mx-auto mb-3 text-brand-700">
        <svg {...svg} width="22" height="22">
          {query ? (
            <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>
          ) : (
            <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>
          )}
        </svg>
      </div>
      <div className="t-ink font-medium text-sm">
        {query ? `${t('patients.empty_query_title')} "${query}"` : t('patients.empty_title')}
      </div>
      <div className="t-muted text-xs mt-1">
        {query ? t('patients.empty_query_hint') : t('patients.empty_hint')}
      </div>
    </div>
  );
}
