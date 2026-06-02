import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, downloadAuthFile } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import MeetingDetails from '../../components/MeetingDetails';
import MOClinicalAssessment from './MOClinicalAssessment';
import { meetingPhase } from '../../lib/meetingPhase';
import { formatId, idForFilename } from '../../lib/ids';

const RISK_PILL = {
  rule_out: { cls: 'pill-green', label: 'Low Risk' },
  alternative_dx: { cls: 'pill-amber', label: 'Possible' },
  escalate: { cls: 'pill-red', label: 'High Risk' },
};

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
  const [decision, setDecision] = useState('close_remote');
  const [rx, setRx] = useState('');
  const [referral, setReferral] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [assessmentSaved, setAssessmentSaved] = useState(false);
  const [appointmentId, setAppointmentId] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [when, setWhen] = useState(defaultWhen());
  const [duration, setDuration] = useState(20);
  const [schedBusy, setSchedBusy] = useState(false);
  const [schedError, setSchedError] = useState(null);

  const refresh = () => {
    api(`/cases/${id}`).then((d) => {
      setC(d);
      setAssessmentSaved(Boolean(d?.clinical_assessment));
    });
    api('/appointments/mine').then((appts) => {
      const matches = (appts || []).filter((x) => x.case_id === id);
      const latest = matches.sort(
        (a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at),
      )[0];
      if (latest) {
        setAppointmentId(latest.id);
        setAppointment(latest);
      } else {
        setAppointmentId(null);
        setAppointment(null);
      }
    });
  };

  const [, setNowTick] = useState(0);

  useEffect(() => {
    refresh();
    const handle = setInterval(() => setNowTick((t) => t + 1), 30_000);
    return () => clearInterval(handle);
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
  const conf = t ? Math.round((t.confidence || 0) * 100) : null;
  const reasons = t?.reasons || [];
  const screen = c.screening || {};
  const hist = c.history || {};

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <button onClick={() => nav('/mo')} className="btn-ghost !px-2.5 !py-2" aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="section-title">MO · Case Review</div>
            <h1 className="text-2xl font-semibold tracking-tight t-ink">{c.patient_name}</h1>
            <p className="text-sm t-muted mt-1">
              <span className="font-mono">{formatId(c.id)}</span> · Submitted {fmtDateTime(c.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={risk.cls}>{risk.label}</span>
          {t?.suspected_condition && (
            <span className="pill-amber">{t.suspected_condition}</span>
          )}
          {c.condition && <span className="pill-brand">{c.condition}</span>}
        </div>
      </div>

      <div className="space-y-5">
        {/* TELE-CONSULT — at the top, core feature */}
        <TeleConsultBlock
          appointment={appointment}
          when={when}
          setWhen={setWhen}
          duration={duration}
          setDuration={setDuration}
          schedule={schedule}
          schedBusy={schedBusy}
          schedError={schedError}
        />

        {/* AGENT-COLLECTED INTAKE — every section visible at once */}
        <section className="card-elev">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="section-title">Intake by field agent</div>
              <h3 className="text-lg font-semibold t-ink">Patient record</h3>
            </div>
            {c.agent_name && (
              <span className="text-xs t-muted">Submitted by {c.agent_name}</span>
            )}
          </div>

          {/* Demographics */}
          <SectionLabel>Demographics</SectionLabel>
          <DataGrid>
            <DataRow label="Full name" value={c.patient_name} />
            <DataRow label="Age" value={c.patient_age ? `${c.patient_age} years` : null} />
            <DataRow label="Sex" value={cap(c.patient_sex)} />
            <DataRow label="Phone" value={c.patient_phone} mono />
          </DataGrid>

          {/* Programme context */}
          <Divider />
          <SectionLabel>Programme context</SectionLabel>
          <DataGrid>
            <DataRow label="PHC / CHC" value={c.patient_phc} />
          </DataGrid>

          {/* Location & IDs */}
          <Divider />
          <SectionLabel>Location & identifiers</SectionLabel>
          <DataGrid>
            <DataRow label="House no" value={c.patient_house_no} />
            <DataRow label="Village" value={c.patient_village} />
            <DataRow label="Gram Panchayat" value={c.patient_gram_panchayat} />
            <DataRow label="District" value={c.patient_district} />
            <DataRow label="State" value={c.patient_state} />
            <DataRow label="Aadhaar" value={c.patient_aadhaar_id} mono />
            <DataRow label="ABHA" value={c.patient_abha_id} mono />
            <DataRow label="Referred by" value={c.patient_referred_by} />
          </DataGrid>

          {/* Household */}
          <Divider />
          <SectionLabel>Household</SectionLabel>
          <DataGrid>
            <DataRow label="Household number" value={c.patient_household_number} />
            <DataRow label="Relation to head" value={prettyRelation(c.patient_relation_to_head)} />
            <DataRow label="Head-of-family name" value={c.patient_head_of_family_name} />
            <DataRow label="Head-of-family phone" value={c.patient_head_of_family_phone} mono />
          </DataGrid>

          {/* Medical history */}
          <Divider />
          <SectionLabel>Medical history</SectionLabel>
          <div className="space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider t-muted font-semibold mb-2">Chronic conditions</div>
              {Array.isArray(hist.chronic_conditions) && hist.chronic_conditions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {hist.chronic_conditions.map((cc, i) => (
                    <span key={i} className="pill-brand">{cc}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm t-muted">None reported</p>
              )}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider t-muted font-semibold mb-1">Past visits / notes</div>
              <p className="text-sm t-ink whitespace-pre-wrap">{hist.past_visits_notes || <span className="t-muted">—</span>}</p>
            </div>
            {Array.isArray(hist.prior_prescriptions_urls) && hist.prior_prescriptions_urls.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wider t-muted font-semibold mb-2">Prior prescriptions</div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {hist.prior_prescriptions_urls.map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="aspect-square rounded-md overflow-hidden block border border-[color:var(--border-cool)] hover:border-[color:var(--border-strong)]">
                      <img src={u} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Screening event context */}
          {(screen.screened_at || screen.geolocation) && (
            <>
              <Divider />
              <SectionLabel>Screening event</SectionLabel>
              <DataGrid>
                <DataRow label="Date of screening" value={screen.screened_at ? fmtDateTime(screen.screened_at) : null} />
                <DataRow
                  label="GPS"
                  value={screen.geolocation ? (
                    <a
                      href={`https://maps.google.com/?q=${screen.geolocation.lat},${screen.geolocation.lng}`}
                      target="_blank" rel="noreferrer"
                      className="link font-mono text-xs"
                    >
                      {screen.geolocation.lat?.toFixed?.(5)}, {screen.geolocation.lng?.toFixed?.(5)}
                      {screen.geolocation.accuracy != null && ` · ±${Math.round(screen.geolocation.accuracy)}m`}
                    </a>
                  ) : null}
                />
              </DataGrid>
            </>
          )}

          {/* Symptoms & screening */}
          <Divider />
          <SectionLabel>Symptoms & screening</SectionLabel>
          <DataGrid>
            <YesNoRow label="Skin patches present" value={screen.has_skin_patches} />
            <DataRow label="Patch count" value={screen.patch_count > 0 ? screen.patch_count : null} />
            <YesNoRow label="Loss of sensation in patches" value={screen.patch_loss_of_sensation} />
            <YesNoRow label="Enlarged nerves" value={screen.enlarged_nerves} />
            <YesNoRow label="Weakness in hands or feet" value={screen.weakness_in_hands_or_feet} />
            <YesNoRow label="Glove / stocking anaesthesia" value={screen.glove_stocking_anesthesia} />
            <YesNoRow label="Symmetric lesions" value={screen.symmetric_lesions} />
            <YesNoRow label="Household contact with leprosy" value={screen.family_history} />
            <DataRow
              label="Duration"
              value={
                screen.duration_months > 0
                  ? `${screen.duration_months} months`
                  : screen.duration_weeks > 0
                    ? `${screen.duration_weeks} weeks`
                    : null
              }
            />
          </DataGrid>

          {/* PDF1 symptom checklist (multi-select) */}
          {Array.isArray(screen.symptoms_checklist) && screen.symptoms_checklist.length > 0 && (
            <>
              <Divider />
              <SectionLabel>Symptoms checklist (PDF1)</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {screen.symptoms_checklist.map((k) => (
                  <span key={k} className="pill-amber">{prettySymptom(k)}</span>
                ))}
              </div>
            </>
          )}
          {screen.notes && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wider t-muted font-semibold mb-1">Agent notes</div>
              <p className="text-sm t-ink whitespace-pre-wrap">{screen.notes}</p>
            </div>
          )}

          {/* Screening images */}
          {Array.isArray(screen.image_urls) && screen.image_urls.length > 0 && (
            <>
              <Divider />
              <SectionLabel>Screening images ({screen.image_urls.length})</SectionLabel>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {screen.image_urls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="aspect-square rounded-md overflow-hidden block border border-[color:var(--border-cool)] hover:border-[color:var(--border-strong)]">
                    <img src={u} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </>
          )}

          {/* Lab investigations (from screening or history) */}
          {(() => {
            const labs = [
              ...(Array.isArray(screen.lab_urls) ? screen.lab_urls : []),
              ...(Array.isArray(hist.prior_labs_urls) ? hist.prior_labs_urls : []),
            ];
            if (labs.length === 0) return null;
            return (
              <>
                <Divider />
                <SectionLabel>Lab investigations ({labs.length})</SectionLabel>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {labs.map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="aspect-square rounded-md overflow-hidden block border border-[color:var(--border-cool)] hover:border-[color:var(--border-strong)]">
                      <img src={u} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </>
            );
          })()}
        </section>

        {/* AI / Triage findings */}
        {t && (
          <section className="card-elev">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <div className="section-title">Automated triage</div>
                <h3 className="text-lg font-semibold t-ink">AI findings</h3>
              </div>
              <span className="pill-brand">AI</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm t-soft">Leprosy confidence</span>
                  <span className="text-sm font-semibold t-ink">{conf}%</span>
                </div>
                <div className="h-2 rounded-full bg-[color:var(--surface-2)] overflow-hidden border border-[color:var(--border-cool)]">
                  <div className="h-full" style={{ width: `${conf}%`, background: 'var(--brand)' }} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <FindingRow label="Lesion detected" value={screen.has_skin_patches ? 'Yes' : 'No'} tone={screen.has_skin_patches ? 'good' : 'muted'} />
                <FindingRow label="Nerve involvement" value={yn(screen.enlarged_nerves || screen.weakness_in_hands_or_feet) || 'No'} tone={(screen.enlarged_nerves || screen.weakness_in_hands_or_feet) ? 'warn' : 'muted'} />
                <FindingRow label="Symmetry" value={yn(screen.symmetric_lesions) || 'No'} tone="muted" />
                <FindingRow label="Risk score" value={risk.label} tone={t.outcome === 'escalate' ? 'bad' : t.outcome === 'alternative_dx' ? 'warn' : 'good'} />
              </div>

              {reasons.length > 0 && (
                <div className="neu-inset px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wider t-muted font-semibold mb-1.5">Reasons</div>
                  <ul className="text-sm t-soft space-y-0.5">
                    {reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="t-ink mt-0.5">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* MO Clinical Assessment — required before decision */}
        <MOClinicalAssessment
          caseId={c.id}
          initial={c.clinical_assessment || null}
          onSaved={() => setAssessmentSaved(true)}
        />

        {/* MO Decision */}
        <section className="card-elev">
          <div className="mb-4">
            <div className="section-title">Action</div>
            <h3 className="text-lg font-semibold t-ink">MO decision</h3>
          </div>
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
              <textarea className="neu-input" rows={3} value={rx} onChange={(e) => setRx(e.target.value)} placeholder="MDT-MB regimen, dose, duration…" />
            </div>
          ) : decision === 'refer' ? (
            <div className="mt-4">
              <label className="label">Referral note (optional)</label>
              <textarea className="neu-input" rows={3} value={referral} onChange={(e) => setReferral(e.target.value)} placeholder="Add referral notes or instructions…" />
            </div>
          ) : (
            <div className="mt-4">
              <label className="label">Treatment notes</label>
              <textarea className="neu-input" rows={3} value={rx} onChange={(e) => setRx(e.target.value)} placeholder="Recommended treatment for alternative diagnosis…" />
            </div>
          )}

          <div className="mt-3">
            <label className="label">Internal notes</label>
            <textarea className="neu-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes for the audit log…" />
          </div>
        </section>

        {/* Action bar */}
        <section className="card-elev">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-xs t-muted">
              {assessmentSaved
                ? 'Decision will be sent to the patient via WhatsApp with the decision PDF attached.'
                : 'Save the clinical assessment above before sending the decision.'}
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                className="btn-ghost w-full sm:w-auto"
                onClick={() => downloadAuthFile(`/cases/${c.id}/intake.pdf`, `intake-${idForFilename(c.id)}.pdf`)}
                title="Download patient intake PDF"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Intake PDF
              </button>
              <button
                type="button"
                className="btn-ghost w-full sm:w-auto"
                onClick={() => downloadAuthFile(`/cases/${c.id}/decision.pdf`, `decision-${idForFilename(c.id)}.pdf`)}
                disabled={!assessmentSaved}
                title={assessmentSaved ? 'Download MO decision PDF' : 'Save the clinical assessment first'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Decision PDF
              </button>
              <button
                type="button"
                className="btn-primary w-full sm:w-auto"
                disabled={busy || !assessmentSaved}
                onClick={submit}
                title={!assessmentSaved ? 'Save the clinical assessment first' : undefined}
              >
                {busy ? 'Submitting…' : 'Send via WhatsApp'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const TONE = {
  good: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warn: 'bg-amber-50 text-amber-800 border-amber-200',
  bad: 'bg-red-50 text-red-700 border-red-200',
  muted: 'bg-[color:var(--surface-2)] t-soft border-[color:var(--border-cool)]',
};

function SectionLabel({ children }) {
  return <div className="text-[11px] uppercase tracking-[0.12em] t-muted font-semibold mb-3">{children}</div>;
}

function Divider() {
  return <div className="border-t border-[color:var(--border-cool)] my-5" />;
}

function DataGrid({ children }) {
  return <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">{children}</dl>;
}

function DataRow({ label, value, mono }) {
  const empty = value == null || value === '';
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider t-muted font-semibold">{label}</dt>
      <dd className={`text-sm mt-0.5 truncate ${empty ? 't-muted' : 't-ink'} ${mono ? 'font-mono' : ''}`}>
        {empty ? '—' : value}
      </dd>
    </div>
  );
}

function YesNoRow({ label, value }) {
  if (value === undefined || value === null) {
    return (
      <div className="flex items-center justify-between gap-3 py-1.5">
        <span className="text-sm t-soft">{label}</span>
        <span className="text-xs t-muted">—</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm t-soft">{label}</span>
      {value
        ? <span className="pill-amber">Yes</span>
        : <span className="pill-ink">No</span>}
    </div>
  );
}

function FindingRow({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="t-soft">{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${TONE[tone] || TONE.muted}`}>
        {value}
      </span>
    </div>
  );
}

function DecisionRadio({ checked, onChange, title, subtitle, tone }) {
  const accent = {
    good: 'border-emerald-500 bg-emerald-50',
    warn: 'border-amber-500 bg-amber-50',
    bad: 'border-red-500 bg-red-50',
  }[tone] || '';
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer ${
        checked ? accent : 'border-[color:var(--border-cool)] hover:border-[color:var(--border-strong)]'
      }`}
    >
      <span
        className={`mt-0.5 w-5 h-5 rounded-full border-2 grid place-items-center shrink-0`}
        style={{ borderColor: checked ? 'var(--brand)' : 'var(--border-strong)' }}
      >
        {checked && <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--brand)' }} />}
      </span>
      <input type="radio" checked={checked} onChange={onChange} className="sr-only" />
      <div>
        <div className="text-sm font-semibold t-ink">{title}</div>
        <div className="text-xs t-muted mt-0.5">{subtitle}</div>
      </div>
    </label>
  );
}

const yn = (b) => (b ? 'Yes' : null);
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const SYMPTOM_LABELS = {
  skin_patches: 'Light/reddish skin patches',
  patch_loss_of_sensation: 'Loss of sensation over patches',
  numb_tingling_burning: 'Tingling/numbness/burning hands/feet',
  weakness_in_hands_or_feet: 'Weakness in hands or feet',
  weak_grip: 'Weak grip / objects slipping',
  painless_wounds: 'Painless wounds/burns/ulcers',
  nerve_tenderness: 'Pain/tenderness near joints',
  foot_drop: 'Foot drop / dragging',
  eye_closure_difficulty: 'Difficulty closing eyes',
  eyebrow_loss_nasal_collapse: 'Eyebrow loss / collapsed nose',
  nodules_or_earlobe_swelling: 'Nodules / earlobe swelling',
};
const prettySymptom = (k) => SYMPTOM_LABELS[k] || k.replace(/_/g, ' ');

const RELATION_LABELS = {
  self: 'Self',
  father_mother: 'Father / Mother',
  husband_wife: 'Husband / Wife',
  brother_sister: 'Brother / Sister',
  son_daughter: 'Son / Daughter',
  grand_son_grand_daughter: 'Grand Son / Grand Daughter',
  others: 'Others',
};
const prettyRelation = (k) => (k ? RELATION_LABELS[k] || k : null);
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

function TeleConsultBlock({
  appointment, when, setWhen, duration, setDuration, schedule, schedBusy, schedError,
}) {
  const phaseInfo = appointment
    ? meetingPhase(appointment.scheduled_at, appointment.duration_minutes || 30)
    : null;
  const isActive = phaseInfo?.phase === 'active';
  const isExpired = phaseInfo?.phase === 'expired';
  const isUpcoming = phaseInfo?.phase === 'upcoming';
  const hostUrl = appointment?.zoom_start_url || appointment?.zoom_join_url;
  const canStart = isActive && hostUrl;

  const SchedulerForm = ({ title, subtitle }) => (
    <div>
      <div className="section-title">Scheduler</div>
      <h3 className="text-lg font-semibold t-ink">{title}</h3>
      <p className="text-xs t-muted mb-3 mt-1">{subtitle}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">When</label>
          <input type="datetime-local" className="neu-input" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div>
          <label className="label">Duration (min)</label>
          <input type="number" className="neu-input" value={duration} min={10} max={60} onChange={(e) => setDuration(+e.target.value)} />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" onClick={schedule} disabled={schedBusy}>
            {schedBusy ? '…' : 'Book Zoom consult'}
          </button>
        </div>
      </div>
      {schedError && <p className="text-sm text-red-600 mt-2">{schedError}</p>}
    </div>
  );

  // No appointment yet — show scheduler with a calm brand-bordered card so it draws the eye
  if (!appointment) {
    return (
      <section className="card-brand p-6">
        <SchedulerForm
          title="Schedule tele-consult"
          subtitle="Books a Zoom slot. Patient receives the join link via WhatsApp/SMS."
        />
      </section>
    );
  }

  return (
    <section className="card-brand p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="section-title">Tele-consult</div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold t-ink">Session</h3>
            {isExpired && <span className="pill-red">expired</span>}
            {isActive && <span className="pill-amber">live now</span>}
            {isUpcoming && <span className="pill-brand">scheduled</span>}
          </div>
          <div className="text-xs t-muted mt-1">
            <strong className="t-ink">{fmtDateTime(appointment.scheduled_at)}</strong> · {appointment.duration_minutes} min
            {phaseInfo?.label && (
              <span className={`ml-2 ${isExpired ? 'text-red-600 font-semibold' : isActive ? 't-ink font-semibold' : ''}`}>
                · {phaseInfo.label}
              </span>
            )}
          </div>
        </div>
        {!isExpired && (
          <a
            className={`btn-primary inline-flex items-center gap-2 ${!canStart ? 'opacity-50 pointer-events-none' : ''}`}
            href={canStart ? hostUrl : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!canStart}
            title={!canStart ? 'Available 5 minutes before the scheduled time' : undefined}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
            {isActive ? 'Start Zoom consult' : 'Start (at slot time)'}
          </a>
        )}
      </div>

      {!isExpired && (appointment.zoom_meeting_id || appointment.zoom_join_url) && (
        <div>
          <MeetingDetails
            meetingId={appointment.zoom_meeting_id}
            password={appointment.zoom_password}
            joinUrl={appointment.zoom_join_url}
          />
          <p className="text-[10px] t-muted mt-1.5">
            Patient receives the same details via WhatsApp. Ask them to copy the passcode and paste it into Zoom if prompted.
          </p>
        </div>
      )}

      {isExpired && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3">
          <div className="text-sm font-semibold text-red-700">Session expired</div>
          <p className="text-xs t-soft mt-0.5">
            The scheduled slot has passed and the Zoom link is no longer active. Book a new session below if needed.
          </p>
        </div>
      )}

      {isExpired && (
        <div className="border-t border-[color:var(--border-cool)] pt-4">
          <SchedulerForm
            title="Schedule a new session"
            subtitle="Pick a fresh date and time. A new Zoom meeting will be created."
          />
        </div>
      )}
    </section>
  );
}
