import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import MeetingDetails from '../../components/MeetingDetails';

const RISK_PILL = {
  rule_out: { cls: 'pill-green', label: 'Low Risk' },
  alternative_dx: { cls: 'pill-amber', label: 'Possible' },
  escalate: { cls: 'pill-red', label: 'High Risk' },
};

const REVIEW_STEPS = [
  { key: 'enrollment', label: 'Enrollment' },
  { key: 'history', label: 'History' },
  { key: 'symptoms', label: 'Symptoms' },
  { key: 'screening', label: 'AI Screening' },
  { key: 'decision', label: 'Decision' },
];

const defaultWhen = () => {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
};

export default function CaseReview() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [c, setC] = useState(null);
  const [tab, setTab] = useState('summary');
  const [decision, setDecision] = useState('close_remote');
  const [rx, setRx] = useState('');
  const [referral, setReferral] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [appointmentId, setAppointmentId] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [when, setWhen] = useState(defaultWhen());
  const [duration, setDuration] = useState(20);
  const [schedBusy, setSchedBusy] = useState(false);
  const [schedError, setSchedError] = useState(null);

  const refresh = () => {
    api(`/cases/${id}`).then(setC);
    api('/appointments/mine').then((appts) => {
      const a = (appts || []).find((x) => x.case_id === id);
      if (a) {
        setAppointmentId(a.id);
        setAppointment(a);
      }
    });
  };

  useEffect(() => {
    refresh();
  }, [id]);

  const schedule = async () => {
    setSchedBusy(true);
    setSchedError(null);
    try {
      const appt = await api('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          case_id: id,
          mo_uid: user.uid,
          scheduled_at: new Date(when).toISOString(),
          duration_minutes: duration,
        }),
      });
      setAppointment(appt);
      setAppointmentId(appt.id);
      refresh();
    } catch (err) {
      setSchedError(err.message);
    } finally {
      setSchedBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      await api(`/cases/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          prescription: decision === 'close_remote' ? rx : null,
          referral_note: decision === 'refer' ? referral : null,
          notes,
        }),
      });
      nav('/mo');
    } finally {
      setBusy(false);
    }
  };

  if (!c) return <p className="t-muted">Loading…</p>;
  const t = c.triage;
  const risk = RISK_PILL[t?.outcome] || { cls: 'pill-amber', label: 'Pending' };
  const initials = (c.patient_name || '?').slice(0, 1).toUpperCase();
  const conf = t ? Math.round((t.confidence || 0) * 100) : null;
  const reasons = t?.reasons || [];
  const screen = c.screening || {};

  return (
    <div className="anim-fade-up space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => nav('/mo')} className="neu-btn-ghost !px-3 !py-2 !rounded-xl" aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold t-ink tracking-tight">Case Review</h1>
          <p className="text-xs t-muted">Step 5 of 5 · MO Decision</p>
        </div>
      </div>

      {/* Top stepper (all done by review stage) */}
      <div className="card !py-5">
        <ol className="flex items-center justify-between gap-2 overflow-x-auto">
          {REVIEW_STEPS.map((s, i) => {
            const active = s.key === 'decision';
            return (
              <li key={s.key} className="flex items-center gap-2 min-w-0">
                <div className="flex flex-col items-center">
                  <span
                    className={`w-9 h-9 rounded-full grid place-items-center text-sm font-bold ${
                      active
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-600/20'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L9 11.6l6.3-6.3a1 1 0 0 1 1.4 0z" />
                    </svg>
                  </span>
                  <span className={`text-[11px] mt-1.5 font-semibold ${active ? 't-ink' : 't-muted'}`}>
                    {s.label}
                  </span>
                </div>
                {i < REVIEW_STEPS.length - 1 && (
                  <span className="h-0.5 flex-1 bg-emerald-500/60 self-start mt-4" />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Patient profile card */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white grid place-items-center text-2xl font-bold shadow-lg">
            {initials}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold t-ink">{c.patient_name}</h2>
              <span className={risk.cls}>{risk.label}</span>
              {t?.suspected_condition && (
                <span className="pill-amber">{t.suspected_condition}</span>
              )}
            </div>
            <div className="text-xs t-muted mt-1">
              {c.patient_age ? `${c.patient_age} yrs` : ''}
              {c.patient_age && c.patient_sex ? ' · ' : ''}
              {c.patient_sex ? cap(c.patient_sex) : ''}
              {' · '}
              <span className="font-mono">#{c.id.slice(0, 8)}</span>
              {' · '}Condition <strong className="t-ink">{c.condition}</strong>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider t-muted">Submitted</div>
            <div className="text-sm font-semibold t-ink">{fmtDateTime(c.created_at)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 border-b border-ink-200/60 dark:border-ink-700/40 flex gap-1 overflow-x-auto">
          {[
            { k: 'summary', label: 'Summary' },
            { k: 'history', label: 'History' },
            { k: 'symptoms', label: 'Symptoms' },
            { k: 'images', label: `Images (${(screen.image_urls || []).length})` },
            { k: 'analysis', label: 'AI Analysis' },
          ].map((x) => (
            <button
              key={x.k}
              type="button"
              onClick={() => setTab(x.k)}
              className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
                tab === x.k
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300'
                  : 'border-transparent t-soft hover:t-ink'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main grid: AI findings + MO decision */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AI Findings */}
        <div className="card">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-bold t-ink text-lg">AI Findings</h3>
            <span className="pill-brand">AI</span>
          </div>

          {t && (
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm t-soft">Leprosy Confidence</span>
                  <span className="text-sm font-bold t-ink">{conf}%</span>
                </div>
                <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-700/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-700 transition-all"
                    style={{ width: `${conf}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FindingRow label="Lesion Detected" value={screen.has_skin_patches ? 'Yes' : 'No'} tone={screen.has_skin_patches ? 'good' : 'muted'} />
                <FindingRow label="Nerve Involvement" value={yn(screen.enlarged_nerves || screen.weakness_in_hands_or_feet) || 'No'} tone={(screen.enlarged_nerves || screen.weakness_in_hands_or_feet) ? 'warn' : 'muted'} />
                <FindingRow label="Symmetry" value={yn(screen.symmetric_lesions) || 'No'} tone="muted" />
                <FindingRow label="Risk Score" value={risk.label} tone={t.outcome === 'escalate' ? 'bad' : t.outcome === 'alternative_dx' ? 'warn' : 'good'} />
              </div>

              {reasons.length > 0 && (
                <div className="rounded-xl neu-inset px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wider t-muted font-semibold mb-1.5">Reasons</div>
                  <ul className="text-sm t-soft space-y-0.5">
                    {reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-0.5">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(screen.image_urls || []).length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {screen.image_urls.slice(0, 6).map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden block">
                      <img src={u} alt="" className="w-full h-full object-cover hover:scale-105 transition" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MO Decision */}
        <div className="card">
          <h3 className="font-bold t-ink text-lg mb-4">MO Decision</h3>
          <div className="space-y-2.5">
            <DecisionRadio
              checked={decision === 'close_remote'}
              onChange={() => setDecision('close_remote')}
              title="Rule-out"
              subtitle="Home care, recall in 4–6 weeks"
              tone="good"
            />
            <DecisionRadio
              checked={decision === 'alt_dx'}
              onChange={() => setDecision('alt_dx')}
              title="Alternative Diagnosis"
              subtitle="Provide treatment & close"
              tone="warn"
            />
            <DecisionRadio
              checked={decision === 'refer'}
              onChange={() => setDecision('refer')}
              title="Escalate"
              subtitle="Refer to PHC / CHC / Hospital"
              tone="bad"
            />
          </div>

          {decision === 'close_remote' ? (
            <div className="mt-4">
              <label className="label">Prescription / care plan</label>
              <textarea
                className="input"
                rows={3}
                value={rx}
                onChange={(e) => setRx(e.target.value)}
                placeholder="MDT-MB regimen, dose, duration…"
              />
            </div>
          ) : decision === 'refer' ? (
            <div className="mt-4">
              <label className="label">Referral note (optional)</label>
              <textarea
                className="input"
                rows={3}
                value={referral}
                onChange={(e) => setReferral(e.target.value)}
                placeholder="Add referral notes or instructions…"
              />
            </div>
          ) : (
            <div className="mt-4">
              <label className="label">Treatment notes</label>
              <textarea
                className="input"
                rows={3}
                value={rx}
                onChange={(e) => setRx(e.target.value)}
                placeholder="Recommended treatment for alternative diagnosis…"
              />
            </div>
          )}

          <div className="mt-3">
            <label className="label">Internal notes</label>
            <textarea
              className="input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes for the audit log…"
            />
          </div>
        </div>
      </div>

      {/* Tele-consult scheduler / launcher */}
      <div className="card">
        {!appointmentId ? (
          <>
            <h3 className="font-bold t-ink text-lg mb-1">Schedule tele-consult</h3>
            <p className="text-xs t-muted mb-3">
              Books a Zoom slot. Patient gets the join link via WhatsApp/SMS.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">When</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Duration (min)</label>
                <input
                  type="number"
                  className="input"
                  value={duration}
                  min={10}
                  max={60}
                  onChange={(e) => setDuration(+e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button className="btn-primary w-full" onClick={schedule} disabled={schedBusy}>
                  {schedBusy ? '…' : 'Book Zoom consult'}
                </button>
              </div>
            </div>
            {schedError && <p className="text-sm text-red-600 mt-2">{schedError}</p>}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold t-ink text-lg">Tele-consult</h3>
                {appointment && (
                  <div className="text-xs t-muted mt-0.5">
                    Scheduled <strong className="t-ink">{fmtDateTime(appointment.scheduled_at)}</strong> · {appointment.duration_minutes} min
                  </div>
                )}
              </div>
              {appointment && (appointment.zoom_start_url || appointment.zoom_join_url) && (
                <a
                  className="btn-primary inline-flex items-center gap-2"
                  href={appointment.zoom_start_url || appointment.zoom_join_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                  Start Zoom consult
                </a>
              )}
            </div>
            {appointment && (appointment.zoom_meeting_id || appointment.zoom_join_url) && (
              <div className="mt-3">
                <MeetingDetails
                  meetingId={appointment.zoom_meeting_id}
                  password={appointment.zoom_password}
                  joinUrl={appointment.zoom_join_url}
                />
                <p className="text-[10px] t-muted mt-1.5">
                  Patient receives the same details via WhatsApp.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action bar */}
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs t-muted">
          Referral note (optional) is sent to the patient and field agent.
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
            Request More Info
          </button>
          <button type="button" className="btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
            Generate Referral
          </button>
          <button type="button" className="btn-primary !bg-emerald-600 hover:!bg-emerald-700" disabled={busy} onClick={submit}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
            {busy ? 'Submitting…' : 'Send via WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}

const TONE = {
  good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300/60',
  warn: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300/60',
  bad: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-300/60',
  muted: 'bg-ink-50 t-soft dark:bg-ink-700/30 border-ink-200',
};

function FindingRow({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="t-soft flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {label}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${TONE[tone] || TONE.muted}`}>
        {value}
      </span>
    </div>
  );
}

function DecisionRadio({ checked, onChange, title, subtitle, tone }) {
  const ring = {
    good: 'ring-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-900/20',
    warn: 'ring-amber-500/40 bg-amber-50/60 dark:bg-amber-900/20',
    bad: 'ring-red-500/40 bg-red-50/60 dark:bg-red-900/20',
  }[tone] || '';
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
        checked ? `border-transparent ring-2 ${ring}` : 'border-ink-200 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-700/20'
      }`}
    >
      <span
        className={`mt-0.5 w-5 h-5 rounded-full border-2 grid place-items-center shrink-0 ${
          checked ? 'border-emerald-600' : 'border-ink-300 dark:border-ink-600'
        }`}
      >
        {checked && <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
      </span>
      <input type="radio" checked={checked} onChange={onChange} className="sr-only" />
      <div>
        <div className="text-sm font-bold t-ink">{title}</div>
        <div className="text-xs t-muted mt-0.5">{subtitle}</div>
      </div>
    </label>
  );
}

const yn = (b) => (b ? 'Yes' : null);
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};
