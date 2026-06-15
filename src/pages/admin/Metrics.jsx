import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, downloadAuthFile } from '../../lib/api';
import { formatId } from '../../lib/ids';
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
  
  const handleBulkEscalatedDownload = () => {
    downloadAuthFile('/patients/export/excel?escalated=true', 'escalated_patients.csv');
  };

  const handleSingleDownload = (patientId) => {
    downloadAuthFile(`/patients/export/excel?patient_id=${patientId}`, `patient_${patientId}.csv`);
  };

  if (error) {
    return (
      <div>
        <div className="card-elev">
          <div className="section-title">Error</div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!m) {
    return <p className="t-muted">Loading metrics…</p>;
  }

  const { total_cases: total, triage_counts: tc, system_health: health } = m;
  const noAction = total - (tc.rule_out + tc.alternative_dx + tc.escalate);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header block */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight t-ink">{greeting}, {displayName}.</h1>
          <p className="text-sm t-muted mt-1">Here is the current state of the screening programme.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Triaged Outcomes (Main Chart replacement) */}
        <div className="md:col-span-2 card-elev flex flex-col">
          <div className="section-title">Case distribution</div>
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-8 mt-2">
            <Pie total={total} a={tc.rule_out} b={tc.alternative_dx} c={tc.escalate} d={noAction} />
            <ul className="flex-1 w-full space-y-3">
              <LegendRow color="var(--brand)" label="Rule Out (Home Care)" value={tc.rule_out} total={total} />
              <LegendRow color="var(--amber)" label="Alternative Diagnosis" value={tc.alternative_dx} total={total} />
              <LegendRow color="var(--red)" label="Escalated to MO" value={tc.escalate} total={total} />
              {noAction > 0 && <LegendRow color="var(--border-strong)" label="Pending / Draft" value={noAction} total={total} />}
            </ul>
          </div>
        </div>

        {/* Rapid Actions & Queue */}
        <div className="space-y-6">
          <section className="card-elev">
            <div className="flex items-center justify-between mb-4">
              <div className="section-title !mb-0">Needs attention</div>
              {recentEscalations.length > 0 && (
                <button onClick={handleBulkEscalatedDownload} className="btn-ghost !py-1 !px-2 text-xs" title="Download All Escalated">
                  Download All
                </button>
              )}
            </div>
            <h2 className="text-lg font-semibold t-ink mb-4">Recently escalated</h2>
            {recentEscalations.length > 0 ? (
              <div className="space-y-3">
                {recentEscalations.map((c) => (
                  <Link key={c.id} to={`/cases/${c.id}`} className="block rounded-md border border-[color:var(--border-cool)] p-3 hover:border-brand-300 hover:shadow-sm transition-all group relative">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="font-mono text-xs text-brand-600 font-medium">{formatId(c.id)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.preventDefault(); handleSingleDownload(c.patient_id); }}
                          className="opacity-0 group-hover:opacity-100 btn-ghost !p-1"
                          title="Download Patient Data"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </button>
                        <span className="text-[10px] t-muted">{relTime(c.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-sm font-semibold t-ink truncate">{c.patient_name}</div>
                    <div className="text-xs t-soft truncate mt-0.5">
                      {c.patient_village || c.patient_district || 'No location'}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm t-muted bg-[color:var(--surface-2)] rounded-md p-4 text-center">
                Queue is clear.
              </div>
            )}
          </section>
        </div>
      </div>

      {/* System Health / Telemetry */}
      <section className="card-elev">
        <div className="section-title">Telemetry</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <HealthRow label="WhatsApp Delivery" value={`${Math.round(health.wa_delivery_rate * 100)}%`} />
          <HealthRow label="API Latency (avg)" value={`${health.api_latency_ms}ms`} />
          <HealthRow label="Sync Failures" value={health.sync_failures} />
          <HealthRow label="Storage Used" value={health.storage_used_gb.toFixed(1) + ' GB'} />
        </div>
      </section>

      {/* Media Review Preview */}
      {pendingImageCases.length > 0 && (
        <section className="card-elev">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title !mb-0">Quality control</div>
              <h2 className="text-lg font-semibold t-ink mt-0.5">Pending media review</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {pendingImageCases.map((c) => (
              <Link key={c.id} to={`/cases/${c.id}`} className="block group">
                <div className="aspect-square rounded-lg overflow-hidden border border-[color:var(--border-cool)] group-hover:border-brand-400 group-hover:shadow-md transition-all relative">
                  <img src={c.screening.image_urls[0]} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                    <span className="text-white text-xs font-mono">{formatId(c.id)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------- UI Components ---------------- //

// A clean CSS-based donut chart.
function Pie({ total, a, b, c, d }) {
  if (total === 0) {
    return (
      <div className="w-32 h-32 rounded-full border-8 border-[color:var(--surface-2)] flex items-center justify-center shrink-0">
        <span className="text-xs t-muted">No data</span>
      </div>
    );
  }
  const pa = (a / total) * 100;
  const pb = (b / total) * 100;
  const pc = (c / total) * 100;
  const pd = (d / total) * 100;

  const bg = `conic-gradient(
    var(--brand) 0% ${pa}%,
    var(--amber) ${pa}% ${pa + pb}%,
    var(--red) ${pa + pb}% ${pa + pb + pc}%,
    var(--border-strong) ${pa + pb + pc}% ${pa + pb + pc + pd}%
  )`;

  return (
    <div className="relative w-36 h-36 shrink-0 rounded-full" style={{ background: bg }}>
      <div className="absolute inset-[15%] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
        <div className="text-2xl font-semibold t-ink">{total}</div>
        <div className="text-[11px] t-muted uppercase tracking-wider">Total cases</div>
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
        {value} <span className="text-xs t-muted font-normal\">({pct}%)</span>
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
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}