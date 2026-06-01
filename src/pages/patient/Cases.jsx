import { useEffect, useState } from 'react';
import { api, downloadAuthFile } from '../../lib/api';

const PILL = {
  rule_out: { cls: 'pill-green', label: 'Rule out' },
  alternative_dx: { cls: 'pill-amber', label: 'Alternative dx' },
  escalate: { cls: 'pill-red', label: 'Escalate' },
};

export default function PatientCases() {
  const [list, setList] = useState([]);
  useEffect(() => {
    api('/cases/mine').then(setList).catch(() => setList([]));
  }, []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="section-title">Health record</div>
          <h1 className="text-2xl font-semibold tracking-tight t-ink">My Cases</h1>
          <p className="text-sm t-muted mt-1">Decisions and notes from your tele-consultations.</p>
        </div>
        <div>
          <span className="pill-brand">{list.length} {list.length === 1 ? 'case' : 'cases'}</span>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card-elev text-center">
          <div className="t-soft text-sm font-medium">No cases on file yet.</div>
          <div className="t-muted text-xs mt-1">A health worker will create one after your visit.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((c) => {
            const pill = PILL[c.triage_outcome];
            return (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-semibold t-ink">{c.condition}</div>
                    <div className="text-xs t-muted mt-0.5">
                      {new Date(c.created_at).toLocaleDateString()} · Status <strong className="t-soft">{c.status}</strong>
                    </div>
                  </div>
                  {pill && <span className={pill.cls}>{pill.label}</span>}
                </div>
                {c.prescription && (
                  <div className="mt-3 neu-inset px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wider t-muted font-semibold">Prescription</div>
                    <div className="text-sm t-soft mt-0.5">{c.prescription}</div>
                  </div>
                )}
                {c.referral_note && (
                  <div className="mt-2 neu-inset px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wider t-muted font-semibold">Referral</div>
                    <div className="text-sm t-soft mt-0.5">{c.referral_note}</div>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-[color:var(--border)] flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadAuthFile(`/cases/${c.id}/intake.pdf`, `intake-${c.id.slice(0, 8)}.pdf`)}
                    className="btn-ghost text-xs"
                  >
                    Download intake PDF
                  </button>
                  {c.clinical_assessment && (
                    <button
                      type="button"
                      onClick={() => downloadAuthFile(`/cases/${c.id}/decision.pdf`, `decision-${c.id.slice(0, 8)}.pdf`)}
                      className="btn-ghost text-xs"
                    >
                      Download decision PDF
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
