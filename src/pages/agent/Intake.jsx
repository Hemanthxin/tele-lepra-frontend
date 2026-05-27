import { useState } from 'react';
import EnrollStep from './steps/EnrollStep';
import HistoryStep from './steps/HistoryStep';
import PickConditionStep from './steps/PickConditionStep';
import ScreenStep from './steps/ScreenStep';
import TriageResultStep from './steps/TriageResultStep';
import { useTranslation } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';

const STEP_ICONS = {
  enroll: (p) => (
    <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
  ),
  history: (p) => (
    <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" /></svg>
  ),
  pick: (p) => (
    <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  screen: (p) => (
    <svg {...p}><path d="M12 2a3 3 0 0 0-3 3v.5A4.5 4.5 0 0 0 7 14a4 4 0 0 0 1 7 3 3 0 0 0 4 0 3 3 0 0 0 4 0 4 4 0 0 0 1-7 4.5 4.5 0 0 0-2-8.5V5a3 3 0 0 0-3-3z" /><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01" /></svg>
  ),
  triage: (p) => (
    <svg {...p}><path d="M20 6L9 17l-5-5" /></svg>
  ),
};

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

  const currentIdx = STEPS.findIndex((s) => s.key === step);
  const progress = Math.round(((currentIdx + 1) / STEPS.length) * 100);
  const displayName = profile?.profile?.name || profile?.email || 'Agent';
  const initials = displayName.slice(0, 1).toUpperCase();

  const reset = () => {
    setStep('enroll');
    setPatient(null);
    setHistory(null);
    setCondition(null);
    setCaseId(null);
    setTriage(null);
  };

  const svgProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

  return (
    <div className="anim-fade-up flex-1 min-h-0 flex flex-col -mx-4 md:-mx-6 -my-4 md:-my-5">
      {/* SUB-HEADER — breadcrumb + progress bar + step badges */}
      <div className="shrink-0 relative bg-white/60 dark:bg-ink-800/40 border-b border-ink-200/60 dark:border-ink-700/40">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-ink-100/70 dark:bg-ink-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, boxShadow: '0 0 12px rgba(16,185,129,0.55)' }}
          />
        </div>
        <div className="px-5 md:px-7 pt-3.5 pb-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] t-muted">
              <span className="font-semibold">{t('role.agent')}</span>
              <span>›</span>
              <span className="t-soft font-semibold">{t('intake.title')}</span>
            </div>
            <div className="text-[15px] md:text-base font-bold t-ink leading-tight tracking-tight truncate">
              {STEPS[currentIdx]?.short}
              <span className="t-muted font-medium text-xs ml-2">· {STEPS[currentIdx]?.desc}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 rounded-full bg-ink-900/5 dark:bg-white/5 px-3 py-1.5 text-[11px] font-bold t-ink ring-1 ring-ink-200 dark:ring-ink-700">
              <span className="text-emerald-600 dark:text-emerald-400">{currentIdx + 1}</span>
              <span className="t-muted">/ {STEPS.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 min-h-0">
        {/* SIDEBAR */}
        <aside className="shrink-0 w-20 sm:w-72 relative bg-white dark:bg-ink-800 border-r border-ink-200/70 dark:border-ink-700/40 flex flex-col overflow-hidden">
          <span aria-hidden className="hidden sm:block pointer-events-none absolute -top-20 -left-20 w-56 h-56 rounded-full bg-emerald-200/30 blur-3xl" />
          <span aria-hidden className="hidden sm:block pointer-events-none absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-teal-200/20 blur-3xl" />

          <div className="relative px-3 sm:px-5 pt-5 pb-3 shrink-0">
            <div className="hidden sm:flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] t-muted font-bold">{t('intake.patient_label')}</div>
                <div className="text-base font-bold t-ink tracking-tight">{t('intake.workflow')}</div>
              </div>
              <div className="relative w-11 h-11">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-ink-100 dark:text-ink-700" />
                  <circle
                    cx="18" cy="18" r="15" fill="none" stroke="url(#progGrad)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${(progress * 94.2) / 100} 94.2`}
                  />
                  <defs>
                    <linearGradient id="progGrad" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#0d9488" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 grid place-items-center text-[10px] font-bold t-ink">{progress}%</div>
              </div>
            </div>
            <div className="sm:hidden text-[9px] uppercase tracking-wider t-muted font-bold mb-2 text-center">{progress}%</div>
          </div>

          <div className="relative flex-1 overflow-y-auto px-2 sm:px-3 pb-3">
            <ol className="relative space-y-0.5">
              {STEPS.map((s, i) => {
                const active = i === currentIdx;
                const done = i < currentIdx;
                const Icon = STEP_ICONS[s.key];
                return (
                  <li key={s.key} className="relative">
                    {i < STEPS.length - 1 && (
                      <span
                        aria-hidden
                        className={`absolute left-[26px] top-[44px] w-[2px] h-[18px] rounded-full transition-colors ${
                          done ? 'bg-gradient-to-b from-emerald-500 to-emerald-400' : 'bg-ink-200 dark:bg-ink-700'
                        }`}
                      />
                    )}
                    <div
                      className={`group relative flex items-center gap-3 px-2 sm:px-3 py-2.5 rounded-xl transition-all duration-200 ${
                        active
                          ? 'bg-gradient-to-r from-emerald-50 to-emerald-50/0 dark:from-emerald-900/30 dark:to-transparent'
                          : 'hover:bg-ink-50 dark:hover:bg-ink-700/30'
                      }`}
                      title={s.short}
                    >
                      {active && (
                        <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
                      )}
                      <span
                        className={`relative w-9 h-9 rounded-xl grid place-items-center shrink-0 mx-auto sm:mx-0 transition-all duration-200 ${
                          done
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-500/30'
                            : active
                              ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-500/15'
                              : 'bg-ink-50 text-ink-500 dark:bg-ink-700 dark:text-ink-300 border border-ink-200/70 dark:border-ink-700'
                        }`}
                      >
                        {done ? (
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L9 11.6l6.3-6.3a1 1 0 0 1 1.4 0z" />
                          </svg>
                        ) : (
                          <Icon {...svgProps} width="16" height="16" />
                        )}
                        {active && (
                          <span aria-hidden className="absolute -right-0.5 -top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-ink-800 animate-pulse" />
                        )}
                      </span>
                      <div className="hidden sm:block min-w-0 flex-1">
                        <div className={`text-[13px] font-bold leading-tight ${active ? 't-ink' : 't-soft'}`}>
                          {s.short}
                        </div>
                        <div className="text-[10px] t-muted mt-0.5">{s.desc}</div>
                      </div>
                      {active && (
                        <svg {...svgProps} width="14" height="14" className="hidden sm:block text-emerald-600 shrink-0">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* user mini-card */}
          <div className="relative shrink-0 hidden sm:block px-4 pb-4 pt-1">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-3 shadow-lg shadow-emerald-700/20 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm grid place-items-center text-sm font-bold ring-1 ring-white/25">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">{displayName}</div>
                <div className="text-[10px] text-emerald-100 truncate">{t('role.agent')}</div>
              </div>
              <svg {...svgProps} width="14" height="14" className="text-emerald-100">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 min-w-0 overflow-y-auto px-4 md:px-7 py-4 md:py-5">
          <div className="anim-fade-up" style={{ animationDelay: '80ms' }}>
            {step === 'enroll' && (
              <EnrollStep onDone={(p) => { setPatient(p); setStep('history'); }} />
            )}
            {step === 'history' && (
              <HistoryStep patient={patient} onDone={(h) => { setHistory(h); setStep('pick'); }} />
            )}
            {step === 'pick' && (
              <PickConditionStep
                patient={patient} history={history}
                onDone={(cid, cond) => { setCaseId(cid); setCondition(cond); setStep('screen'); }}
              />
            )}
            {step === 'screen' && (
              <ScreenStep caseId={caseId} condition={condition} onDone={(r) => { setTriage(r); setStep('triage'); }} />
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
        </main>
      </div>
    </div>
  );
}
