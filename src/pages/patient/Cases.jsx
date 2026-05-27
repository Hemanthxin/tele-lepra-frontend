import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

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
    <div className="anim-fade-up space-y-5">
      <header>
        <div className="section-title">Health record</div>
        <h1 className="text-3xl md:text-4xl font-bold t-ink tracking-tight">My Cases</h1>
        <p className="text-sm t-muted mt-1">Decisions and notes from your tele-consultations.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 anim-stagger">
        {list.map((c) => {
          const pill = PILL[c.triage_outcome];
          return (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-bold t-ink">{c.condition}</div>
                  <div className="text-xs t-muted mt-0.5">
                    {new Date(c.created_at).toLocaleDateString()} · Status <strong className="t-soft">{c.status}</strong>
                  </div>
                </div>
                {pill && <span className={pill.cls}>{pill.label}</span>}
              </div>
              {c.prescription && (
                <div className="mt-3 rounded-xl neu-inset px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wider t-muted font-semibold">Prescription</div>
                  <div className="text-sm t-soft mt-0.5">{c.prescription}</div>
                </div>
              )}
              {c.referral_note && (
                <div className="mt-2 rounded-xl neu-inset px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wider t-muted font-semibold">Referral</div>
                  <div className="text-sm t-soft mt-0.5">{c.referral_note}</div>
                </div>
              )}
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="md:col-span-2 card text-center py-12">
            <div className="t-soft text-sm font-medium">No cases on file yet.</div>
            <div className="t-muted text-xs mt-1">A health worker will create one after your visit.</div>
          </div>
        )}
      </div>
    </div>
  );
}
