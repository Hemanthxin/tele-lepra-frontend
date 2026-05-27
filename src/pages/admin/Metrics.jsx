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
      <div className="p-6">
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
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
    <div className="space-y-7 anim-fade-up">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold t-ink tracking-tight">
            {greeting}, {displayName} <span aria-hidden>☀️</span>
          </h1>
          <p className="text-sm t-muted mt-1">Here's what's happening in your triage system today.</p>
        </div>
      </header>

      {/* Top stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat
          label="Total cases"
          value={total}
          delta="all-time"
          tone="brand"
          icon={
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          }
        />
        <Stat
          label="Escalated cases"
          value={escalate}
          delta="Needs MO review"
          tone={escalate > 0 ? 'warn' : 'muted'}
          icon={
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          }
        />
        <Stat
          label="Referral rate"
          value={`${m.referral_rate_pct}%`}
          delta="target ≤25%"
          tone={m.referral_rate_pct > 25 ? 'bad' : 'good'}
          icon={
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
          }
        />
        <Stat
          label="Closed remote"
          value={`${closedRemote}%`}
          delta="resolved in community"
          tone="good"
          icon={
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          }
        />
      </section>

      {/* Triage overview (donut) + outcome details */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-semibold t-ink text-lg">Triage Overview</h2>
            <span className="text-xs t-muted">of {total} total</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <Donut
              total={total}
              segments={[
                { value: ruleOut, color: '#10b981', label: 'Rule out' },
                { value: altDx, color: '#f59e0b', label: 'Alternative dx' },
                { value: escalate, color: '#ef4444', label: 'Escalate' },
                { value: pending, color: '#94a3b8', label: 'Pending' },
              ]}
            />
            <ul className="space-y-3">
              <LegendRow color="#10b981" label="Rule out" value={ruleOut} total={total} />
              <LegendRow color="#f59e0b" label="Alternative dx" value={altDx} total={total} />
              <LegendRow color="#ef4444" label="Escalate" value={escalate} total={total} />
              {pending > 0 && (
                <LegendRow color="#94a3b8" label="Pending" value={pending} total={total} />
              )}
            </ul>
          </div>
        </div>

        {/* System health card (placeholder for geo heatmap) */}
        <div className="card">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-semibold t-ink text-lg">System health</h2>
            <span className="pill-green">Online</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <HealthRow label="Cases awaiting MO" value={queue.filter((c) => c.status === 'awaiting_mo').length} />
            <HealthRow label="Scheduled consults" value={queue.filter((c) => c.status === 'scheduled').length} />
            <HealthRow label="In consult" value={queue.filter((c) => c.status === 'in_consult').length} />
            <HealthRow label="Pending images" value={pendingImageCases.length} />
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => {
              const intensity = Math.min(1, ((total + i) % 7) / 6 + 0.2);
              return (
                <div
                  key={i}
                  className="h-12 rounded-md"
                  style={{ background: `rgba(16,185,129,${intensity * 0.85})` }}
                  title={`Day ${i + 1}`}
                />
              );
            })}
          </div>
          <div className="text-[11px] t-muted mt-2">Weekly throughput indicator</div>
        </div>
      </section>

      {/* Recent escalations + pending image reviews */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card xl:col-span-2">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-semibold t-ink text-lg">Recent Escalations</h2>
            <Link to="/admin/users" className="text-xs link">View all →</Link>
          </div>
          {recentEscalations.length === 0 ? (
            <div className="text-sm t-muted py-8 text-center">No active escalations.</div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider t-muted text-left">
                    <th className="px-2 py-2 font-semibold">Case</th>
                    <th className="px-2 py-2 font-semibold">Name</th>
                    <th className="px-2 py-2 font-semibold">Risk</th>
                    <th className="px-2 py-2 font-semibold">Reason</th>
                    <th className="px-2 py-2 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEscalations.map((c) => (
                    <tr key={c.id} className="border-t border-ink-200/50 dark:border-ink-700/40">
                      <td className="px-2 py-3 font-mono text-xs t-soft">#{c.id.slice(0, 8)}</td>
                      <td className="px-2 py-3 font-semibold t-ink">{c.patient_name}</td>
                      <td className="px-2 py-3"><span className="pill-red">High</span></td>
                      <td className="px-2 py-3 t-soft truncate max-w-[260px]">
                        {(c.triage?.reasons || []).slice(0, 2).join(' · ') || c.condition}
                      </td>
                      <td className="px-2 py-3 text-xs t-muted whitespace-nowrap">{relTime(c.updated_at || c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-semibold t-ink text-lg">Pending Image Reviews</h2>
            <Link to="/mo" className="text-xs link">View all →</Link>
          </div>
          {pendingImageCases.length === 0 ? (
            <div className="text-sm t-muted py-6 text-center">No image reviews waiting.</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {pendingImageCases.slice(0, 3).map((c) => (
                <Link
                  key={c.id}
                  to={`/mo/case/${c.id}`}
                  className="aspect-square rounded-xl overflow-hidden bg-ink-100 dark:bg-ink-700/30 relative group"
                  title={c.patient_name}
                >
                  <img
                    src={c.screening.image_urls[0]}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                </Link>
              ))}
              {moreImages > 0 && (
                <div className="aspect-square rounded-xl border border-dashed border-ink-300 dark:border-ink-600 grid place-items-center text-sm font-bold t-muted">
                  +{moreImages}<br />
                  <span className="text-[10px] font-medium">more</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const TONE = {
  brand: { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', bar: 'from-emerald-400/70 to-emerald-700/70' },
  good: { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', bar: 'from-emerald-400/70 to-emerald-700/70' },
  warn: { chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', bar: 'from-amber-400/70 to-amber-700/70' },
  bad: { chip: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', bar: 'from-red-400/70 to-red-700/70' },
  muted: { chip: 'bg-ink-100 t-soft dark:bg-ink-700/40', bar: 'from-ink-300/70 to-ink-500/70' },
};

function Stat({ label, value, delta, tone = 'brand', icon }) {
  const t = TONE[tone];
  return (
    <div className="card relative overflow-hidden group transition hover:-translate-y-0.5">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs uppercase tracking-wide t-muted font-semibold">{label}</div>
        <span className={`w-10 h-10 rounded-xl grid place-items-center ${t.chip}`}>{icon}</span>
      </div>
      <div className="text-3xl font-bold t-ink mt-2 tracking-tight">{value}</div>
      <div className="text-[11px] t-muted mt-1">{delta}</div>
    </div>
  );
}

function Donut({ segments, total }) {
  const size = 200;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = segments.reduce((s, x) => s + x.value, 0) || 1;

  let offset = 0;
  return (
    <div className="relative w-[200px] h-[200px] mx-auto">
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
          <div className="text-3xl font-bold t-ink">{total}</div>
          <div className="text-[11px] t-muted uppercase tracking-wider">Total Cases</div>
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
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="text-sm font-semibold t-ink">
        {value} <span className="text-xs t-muted font-normal">({pct}%)</span>
      </span>
    </li>
  );
}

function HealthRow({ label, value }) {
  return (
    <div className="rounded-xl neu-inset px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider t-muted font-semibold">{label}</div>
      <div className="text-xl font-bold t-ink">{value}</div>
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
