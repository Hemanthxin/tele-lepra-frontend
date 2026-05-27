import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function Audit() {
  const [sample, setSample] = useState([]);
  const [pct, setPct] = useState(5);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    return api(`/admin/audit-sample?pct=${pct}`).then(setSample).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="anim-fade-up space-y-5">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="section-title">Quality control</div>
          <h1 className="text-3xl md:text-4xl font-bold t-ink tracking-tight">Audit sample</h1>
          <p className="text-sm t-muted mt-1 max-w-2xl">
            Random sample of rule-out cases for independent review. Used to track missed-case rate.
          </p>
        </div>
        <div className="pill-brand">{sample.length} sampled</div>
      </header>

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Sample %</label>
          <input
            type="number"
            className="input max-w-[120px]"
            value={pct}
            min={1}
            max={100}
            onChange={(e) => setPct(+e.target.value)}
          />
        </div>
        <button className="btn-ghost" onClick={load}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          Resample
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 anim-stagger">
        {sample.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="font-bold t-ink truncate">{c.patient_name}</div>
                <div className="text-[11px] t-muted mt-0.5">
                  {new Date(c.created_at).toLocaleDateString()} · #{c.id.slice(0, 8)}
                </div>
              </div>
              <span className="pill-green">rule out</span>
            </div>
            {c.triage?.reasons && (
              <ul className="text-xs t-soft space-y-0.5 mt-1.5 border-t border-ink-200/50 dark:border-ink-700/40 pt-2">
                {c.triage.reasons.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {sample.length === 0 && !loading && (
          <div className="md:col-span-2 xl:col-span-3 text-center text-sm t-muted py-10">
            No rule-out cases to audit yet.
          </div>
        )}
      </div>
    </div>
  );
}
