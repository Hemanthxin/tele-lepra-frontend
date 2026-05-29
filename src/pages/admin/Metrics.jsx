import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function Metrics() {
  const { profile } = useAuth();
  const [m, setM] = useState(null);
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/admin/metrics').then(setM).catch((e) => setError(e?.message || 'Failed to load metrics'));
    api('/cases/queue').then((q) => setQueue(q || [])).catch(() => setQueue([]));
  }, []);

  const greeting = useGreeting();
  const displayName = profile?.profile?.name || profile?.email?.split('@')[0] || 'Admin';

  const recentEscalations = useMemo(
    () =>
      queue
        .filter((c) => (c.triage_outcome || 'pending') === 'escalate')
        .slice(0, 5),
    [queue],
  );

  const pendingImageCases = useMemo(
    () =>
      queue
        .filter((c) => Array.isArray(c.screening?.image_urls) && c.screening.image_urls.length > 0)
        .slice(0, 4),
    [queue],
  );

  if (error) {
    return (
      <div>
        <div className="card-elev">
          <div className="section-title">Error</div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }
  if (!m) return <div className="p-6"><p className="t-muted">Loading…</p></div>;

  const total = m.total_cases || 0;
  const byOutcome = m.by_triage_outcome || {};
  const ruleOut = byOutcome.rule_out || 0;
  const altDx = byOutcome.alternative_dx || 0;
  const escalate = byOutcome.escalate || 0;
  const pending = byOutcome.pending || 0;
  const closedRemote = m.remote_closure_rate_pct || 0;

  const moreImages = Math.max(
    0,
    queue.reduce((n, c) => n + ((c.screening?.image_urls || []).length || 0), 0) -
      pendingImageCases.reduce((n, c) => n + ((c.screening?.image_urls || []).length || 0), 0),
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="section-title">Administrator</div>
          <h1 className="text-2xl font-semibold tracking-tight t-ink">
            {greeting}, {displayName}
          </h1>
          <p className="text-sm t-muted mt-1">Operational metrics across the triage system.</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* KPI tiles */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Total cases" value={total} delta="all-time" tone="accent" />
          <Kpi
            label="Escalated"
            value={escalate}
            delta="Needs MO review"
            tone={escalate > 0 ? 'danger' : 'neutral'}
          />
          <Kpi
            label="Referral rate"
            value={`${m.referral_rate_pct}%`}
            delta="target ≤25%"
            tone={m.referral_rate_pct > 25 ? 'danger' : 'brand'}
          />
          <Kpi label="Closed remote" value={`${closedRemote}%`} delta="resolved in community" tone="brand" />
        </section>

        {/* Triage overview + system health */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card-elev">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-base font-semibold t-ink">Triage overview</h2>
              <span className="text-xs t-muted">of {total} total</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <Donut
                total={total}
                segments={[
                  { value: ruleOut, color: '#059669', label: 'Rule out' },
                  { value: altDx, color: '#f59e0b', label: 'Alternative dx' },
                  { value: escalate, color: '#ef4444', label: 'Escalate' },
                  { value: pending, color: '#94a3b8', label: 'Pending' },
                ]}
              />
              <ul className="space-y-3">
                <LegendRow color="#059669" label="Rule out" value={ruleOut} total={total} />
                <LegendRow color="#f59e0b" label="Alternative dx" value={altDx} total={total} />
                <LegendRow color="#ef4444" label="Escalate" value={escalate} total={total} />
                {pending > 0 && (
                  <LegendRow color="#94a3b8" label="Pending" value={pending} total={total} />
                )}
              </ul>
            </div>
          </div>

          <div className="card-elev">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-base font-semibold t-ink">System health</h2>
              <span className="pill-green">Online</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <HealthRow label="Cases awaiting MO" value={queue.filter((c) => c.status === 'awaiting_mo').length} />
              <HealthRow label="Scheduled consults" value={queue.filter((c) => c.status === 'scheduled').length} />
              <HealthRow label="In consult" value={queue.filter((c) => c.status === 'in_consult').length} />
              <HealthRow label="Pending images" value={pendingImageCases.length} />
            </div>
            <div className="mt-5">
              <div className="section-title mb-2">Weekly throughput</div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 7 }).map((_, i) => {
                  const intensity = Math.min(1, ((total + i) % 7) / 6 + 0.2);
                  return (
                    <div
                      key={i}
                      className="h-10 rounded-sm border border-[color:var(--border)]"
                      style={{ background: `rgba(15,118,110,${intensity * 0.7})` }}
                      title={`Day ${i + 1}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Recent escalations */}
        <section className="card-elev p-0 overflow-hidden">
          <div className="flex items-baseline justify-between px-5 py-4 border-b border-[color:var(--border)]">
            <h2 className="text-base font-semibold t-ink">Recent escalations</h2>
            <Link to="/admin/users" className="text-xs link">View all</Link>
          </div>
          {recentEscalations.length === 0 ? (
            <div className="text-sm t-muted py-8 text-center">No active escalations.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider t-muted">
                  <tr className="border-b border-[color:var(--border)]">
                    <th className="text-left font-semibold px-4 py-2.5">Case</th>
                    <th className="text-left font-semibold px-4 py-2.5">Patient</th>
                    <th className="text-left font-semibold px-4 py-2.5">Risk</th>
                    <th className="text-left font-semibold px-4 py-2.5">Reason</th>
                    <th className="text-left font-semibold px-4 py-2.5">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEscalations.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface-2)]"
                    >
                      <td className="px-4 py-3 font-mono text-xs t-soft">#{c.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 t-ink font-medium">{c.patient_name}</td>
                      <td className="px-4 py-3"><span className="pill-red">High</span></td>
                      <td className="px-4 py-3 t-soft truncate max-w-[320px]">
                        {(c.triage?.reasons || []).slice(0, 2).join(' · ') || c.condition}
                      </td>
                      <td className="px-4 py-3 text-xs t-muted whitespace-nowrap font-mono">
                        {relTime(c.updated_at || c.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pending image reviews */}
        <section className="card-elev">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-base font-semibold t-ink">Pending image reviews</h2>
            <Link to="/mo" className="text-xs link">View all</Link>
          </div>
          {pendingImageCases.length === 0 ? (
            <div className="text-sm t-muted py-6 text-center">No image reviews waiting.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {pendingImageCases.slice(0, 3).map((c) => (
                <Link
                  key={c.id}
                  to={`/mo/case/${c.id}`}
                  className="aspect-square rounded-md overflow-hidden border border-[color:var(--border)] hover:border-[color:var(--border-strong)] bg-[color:var(--surface-2)]"
                  title={c.patient_name}
                >
                  <img
                    src={c.screening.image_urls[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </Link>
              ))}
              {moreImages > 0 && (
                <div className="aspect-square rounded-md border border-dashed border-[color:var(--border)] grid place-items-center text-center">
                  <div>
                    <div className="text-sm font-semibold t-ink">+{moreImages}</div>
                    <div className="text-[10px] t-muted">more</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, delta, tone = 'neutral' }) {
  const borderCls = {
    brand: 'kpi-tile-brand',
    accent: 'kpi-tile-accent',
    danger: 'border-l-[3px] border-l-red-500',
    warning: 'border-l-[3px] border-l-amber-500',
    neutral: 'kpi-tile-neutral',
  }[tone] || 'kpi-tile-neutral';
  const valueCls = {
    brand: 'text-brand-700',
    accent: 'text-accent-700',
    danger: 'text-red-700',
    warning: 'text-amber-700',
    neutral: 't-ink',
  }[tone] || 't-ink';
  return (
    <div className={`card ${borderCls}`}>
      <div className="section-title">{label}</div>
      <div className={`text-3xl font-semibold mt-1 ${valueCls}`}>{value}</div>
      {delta && <div className="text-xs t-muted mt-1">{delta}</div>}
    </div>
  );
}

function Donut({ segments, total }) {
  const size = 180;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = segments.reduce((s, x) => s + x.value, 0) || 1;

  let offset = 0;
  return (
    <div className="relative w-[180px] h-[180px] mx-auto">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = (s.value / sum) * c;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-2xl font-semibold t-ink">{total}</div>
          <div className="text-[11px] t-muted uppercase tracking-wider">Total cases</div>
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm t-ink">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
        {label}
      </span>
      <span className="text-sm font-medium t-ink">
        {value} <span className="text-xs t-muted font-normal">({pct}%)</span>
      </span>
    </li>
  );
}

function HealthRow({ label, value }) {
  return (
    <div className="rounded-md neu-inset px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider t-muted font-semibold">{label}</div>
      <div className="text-xl font-semibold t-ink mt-0.5">{value}</div>
    </div>
  );
}

function useGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function relTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
