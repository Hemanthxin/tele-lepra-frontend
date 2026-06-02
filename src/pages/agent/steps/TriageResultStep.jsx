import { useState } from 'react';
import { useTranslation } from '../../../i18n/I18nContext';

const PILL = {
  rule_out: 'pill-green',
  alternative_dx: 'pill-amber',
  escalate: 'pill-red',
  queued: 'pill-ink',
};

const DISEASE_LABELS = {
  leprosy: 'Leprosy',
  lymphatic_filariasis: 'Lymphatic Filariasis',
  tuberculosis: 'Tuberculosis',
  scabies: 'Scabies',
  japanese_encephalitis: 'Japanese Encephalitis',
  malaria: 'Malaria',
  sickle_cell: 'Sickle Cell Disease',
};

const RISK_PILL = { high: 'pill-red', moderate: 'pill-amber', low: 'pill-green' };

/**
 * Triage result + advisory agent decision.
 *
 * Props:
 *   triage   — TriageResult (outcome, condition_findings, allow_close, recommendation, …)
 *   caseId   — server case id (null when the intake is queued offline)
 *   onDecide(action, chosenCondition, note) — async; action is 'send_mo' | 'close'
 *   onDone() — close the wizard (used for the offline/queued path)
 */
export default function TriageResultStep({ triage, caseId, onDecide, onDone }) {
  const { t } = useTranslation();
  const [closing, setClosing] = useState(false);
  const [chosen, setChosen] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!triage) return null;

  const isQueued = triage.outcome === 'queued';
  const forced = triage.allow_close === false;
  const findings = triage.condition_findings || [];
  const canDecide = Boolean(caseId) && !isQueued;

  const title = isQueued ? 'Saved offline — pending sync' : t('triage.outcome.' + triage.outcome);

  const decide = async (action, condition, n) => {
    setBusy(true);
    setErr(null);
    try {
      await onDecide(action, condition || null, n || null);
    } catch (e) {
      setErr(e.message || 'Could not save the decision. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className="card-elev">
      <header className="mb-5">
        <h2 className="text-lg font-semibold t-ink">{t('triage.title')}</h2>
        <p className="text-sm t-muted mt-1">{t('triage.subtitle')}</p>
      </header>

      <section>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className={PILL[triage.outcome] || 'pill-amber'}>{title}</span>
          {!isQueued && (
            <span className="text-xs t-muted">{t('triage.confidence')} {(triage.confidence * 100).toFixed(0)}%</span>
          )}
        </div>

        {/* Recommendation callout */}
        {!isQueued && triage.recommendation && (
          <div className={`rounded-md border px-4 py-3 mb-4 ${
            forced ? 'border-red-200 bg-red-50' : triage.outcome === 'rule_out' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
          }`}>
            <div className="text-[11px] uppercase tracking-wider font-semibold mb-1 t-muted">Recommendation</div>
            <div className="text-sm font-semibold t-ink">{triage.recommendation}</div>
            {forced && (
              <div className="text-xs text-red-700 mt-1 font-medium">
                High leprosy probability — this case must be sent to the Medical Officer.
              </div>
            )}
          </div>
        )}

        {isQueued && (
          <p className="text-sm t-soft">
            The intake has been stored on this device. It will upload automatically when network returns,
            and triage will run then.
          </p>
        )}
      </section>

      {/* Per-condition findings */}
      {findings.length > 0 && (
        <section className="border-t border-[color:var(--border)] pt-5 mt-5">
          <div className="section-title mb-3">Conditions assessed</div>
          <div className="space-y-3">
            {findings.map((f) => (
              <div key={f.condition} className="rounded-md border border-[color:var(--border)] px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold t-ink">{DISEASE_LABELS[f.condition] || f.condition}</span>
                  <span className={RISK_PILL[f.risk] || 'pill-ink'}>{f.risk} risk</span>
                </div>
                {f.reasons?.length > 0 && (
                  <ul className="text-xs t-soft list-disc pl-5 space-y-0.5 mt-1">
                    {f.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Suggested action */}
      {!isQueued && triage.suggested_action && (
        <section className="border-t border-[color:var(--border)] pt-5 mt-5">
          <div className="section-title mb-3">{t('triage.suggested')}</div>
          <div className="border border-[color:var(--border)] bg-brand-50 rounded-md p-4 text-sm t-ink leading-relaxed">
            {triage.suggested_action}
          </div>
        </section>
      )}

      {err && <div className="text-sm text-red-700 border border-red-200 bg-red-50 rounded-md px-3 py-2 mt-4">{err}</div>}

      {/* Decision controls */}
      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        {isQueued || !canDecide ? (
          <div className="flex justify-end">
            <button className="btn-primary" onClick={onDone} disabled={busy}>Done</button>
          </div>
        ) : forced ? (
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <button className="btn-primary" disabled={busy} onClick={() => decide('send_mo')}>
              {busy ? '…' : 'Send to Medical Officer'}
            </button>
          </div>
        ) : closing ? (
          <div className="space-y-3">
            <div className="text-sm font-medium t-ink">Close at community level</div>
            <div>
              <label className="block text-xs font-medium t-soft mb-1.5">Condition treated / ruled out</label>
              <select className="neu-input max-w-sm" value={chosen} onChange={(e) => setChosen(e.target.value)}>
                <option value="">No specific condition (rule-out)</option>
                {findings.map((f) => (
                  <option key={f.condition} value={f.condition}>{DISEASE_LABELS[f.condition] || f.condition}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium t-soft mb-1.5">Note to patient / advice (optional)</label>
              <textarea className="neu-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Apply prescribed cream; recall in 2 weeks." />
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <button type="button" className="btn-ghost" disabled={busy} onClick={() => setClosing(false)}>Cancel</button>
              <button type="button" className="btn-primary" disabled={busy} onClick={() => decide('close', chosen, note)}>
                {busy ? '…' : 'Confirm close'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => setClosing(true)}>
              Close at community level
            </button>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => decide('send_mo')}>
              {busy ? '…' : 'Send to Medical Officer'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
