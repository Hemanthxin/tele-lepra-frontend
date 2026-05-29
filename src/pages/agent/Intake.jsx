import { useState } from 'react';
import EnrollStep from './steps/EnrollStep';
import HistoryStep from './steps/HistoryStep';
import PickConditionStep from './steps/PickConditionStep';
import ScreenStep from './steps/ScreenStep';
import TriageResultStep from './steps/TriageResultStep';
import { useTranslation } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';

export default function Intake() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const STEPS = [
    { key: 'enroll', short: t('intake.step.enroll.short'), desc: t('intake.step.enroll.desc') },
    { key: 'history', short: t('intake.step.history.short'), desc: t('intake.step.history.desc') },
    { key: 'pick', short: t('intake.step.pick.short'), desc: t('intake.step.pick.desc') },
    { key: 'screen', short: t('intake.step.screen.short'), desc: t('intake.step.screen.desc') },
    { key: 'triage', short: t('intake.step.triage.short'), desc: t('intake.step.triage.desc') },
  ];

  const [step, setStep] = useState('enroll');
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState(null);
  const [condition, setCondition] = useState(null);
  const [caseId, setCaseId] = useState(null);
  const [triage, setTriage] = useState(null);
  // Cached form drafts so going back preserves what was typed
  const [draftEnroll, setDraftEnroll] = useState(null);
  const [draftHistory, setDraftHistory] = useState(null);
  const [draftScreen, setDraftScreen] = useState(null);

  const currentIdx = STEPS.findIndex((s) => s.key === step);
  const displayName = profile?.profile?.name || profile?.email || 'Agent';

  const reset = () => {
    setStep('enroll');
    setPatient(null);
    setHistory(null);
    setCondition(null);
    setCaseId(null);
    setTriage(null);
    setDraftEnroll(null);
    setDraftHistory(null);
    setDraftScreen(null);
  };

  // Steps the user has already reached are clickable; future ones are not.
  const canVisit = (key) => {
    const idx = STEPS.findIndex((s) => s.key === key);
    if (idx <= currentIdx) return true;
    // Can also revisit a step if its dependency is already set
    if (key === 'history') return Boolean(patient);
    if (key === 'pick') return Boolean(patient);
    if (key === 'screen') return Boolean(caseId);
    if (key === 'triage') return Boolean(triage);
    return false;
  };

  const goTo = (key) => {
    if (canVisit(key)) setStep(key);
  };

  const svgProps = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="section-title">{t('role.agent')}</div>
          <h1 className="text-2xl font-semibold tracking-tight t-ink">{t('intake.title')}</h1>
          <p className="text-sm t-muted mt-1">
            {STEPS[currentIdx]?.short} · {STEPS[currentIdx]?.desc}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs t-muted">{displayName}</span>
          <span className="pill-ink">
            {currentIdx + 1} / {STEPS.length}
          </span>
        </div>
      </div>

      {/* Step chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {STEPS.map((s, i) => {
          const active = i === currentIdx;
          const done = i < currentIdx;
          const clickable = canVisit(s.key);
          const cls = active ? 'step-chip-active' : done ? 'step-chip-done' : 'step-chip-todo';
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => goTo(s.key)}
              disabled={!clickable}
              className={`${cls} ${!clickable ? 'opacity-60 cursor-not-allowed' : ''}`}
              title={clickable ? `Go to ${s.short}` : `${s.short} (locked)`}
            >
              <span className="text-[10px] font-semibold opacity-80">{i + 1}</span>
              <span>{s.short}</span>
            </button>
          );
        })}
      </div>

      {/* Back link */}
      {currentIdx > 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => goTo(STEPS[currentIdx - 1].key)}
            className="btn-ghost inline-flex items-center gap-1.5 text-xs"
          >
            <svg {...svgProps}><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
            Back to {STEPS[currentIdx - 1].short}
          </button>
        </div>
      )}

      {/* Step body */}
      <div>
        {step === 'enroll' && (
          <EnrollStep
            initial={draftEnroll}
            onDone={(p, draft) => { setPatient(p); setDraftEnroll(draft || null); setStep('history'); }}
          />
        )}
        {step === 'history' && (
          <HistoryStep
            patient={patient}
            initial={draftHistory}
            onDone={(h, draft) => { setHistory(h); setDraftHistory(draft || null); setStep('pick'); }}
          />
        )}
        {step === 'pick' && (
          <PickConditionStep
            patient={patient} history={history}
            initial={condition ? { condition } : null}
            onDone={(cid, cond) => { setCaseId(cid); setCondition(cond); setStep('screen'); }}
          />
        )}
        {step === 'screen' && (
          <ScreenStep
            caseId={caseId} condition={condition}
            initial={draftScreen}
            onDone={(r, draft) => { setTriage(r); setDraftScreen(draft || null); setStep('triage'); }}
          />
        )}
        {step === 'triage' && (
          <TriageResultStep
            triage={triage}
            onNext={() => {
              if (triage?.outcome === 'escalate') alert(t('intake.escalate_alert'));
              else if (triage?.outcome === 'alternative_dx') alert(t('intake.altdx_alert'));
              else alert(t('intake.ruleout_alert'));
              reset();
            }}
          />
        )}
      </div>
    </div>
  );
}
