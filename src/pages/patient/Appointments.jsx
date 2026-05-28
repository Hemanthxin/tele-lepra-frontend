import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import MeetingDetails from '../../components/MeetingDetails';
import { meetingPhase } from '../../lib/meetingPhase';

const STATUS_PILL = {
  scheduled: 'pill-brand',
  in_consult: 'pill-amber',
  completed: 'pill-green',
  cancelled: 'pill-red',
};

const svg = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export default function PatientAppointments() {
  const [list, setList] = useState([]);
  const [linkPhone, setLinkPhone] = useState('');
  const [linkMsg, setLinkMsg] = useState(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [, setTick] = useState(0); // re-render every 30s so the join window flips correctly

  const load = () => api('/appointments/mine').then(setList).catch(() => setList([]));
  useEffect(() => {
    load();
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const linkSelf = async (e) => {
    e.preventDefault();
    setLinkBusy(true);
    setLinkMsg(null);
    try {
      const r = await api(`/patients/link-self?phone=${encodeURIComponent(linkPhone)}`, {
        method: 'POST',
      });
      setLinkMsg(`Linked to patient ${r.patient_id}`);
      load();
    } catch (err) {
      setLinkMsg(`Error: ${err.message}`);
    } finally {
      setLinkBusy(false);
    }
  };

  return (
    <div className="anim-fade-up space-y-5">
      <header>
        <div className="section-title">Tele-consults</div>
        <h1 className="text-3xl md:text-4xl font-bold t-ink tracking-tight">My Appointments</h1>
        <p className="text-sm t-muted mt-1">Your scheduled tele-consults appear here. Tap "Join" to open Zoom.</p>
      </header>

      {list.length === 0 && (
        <div className="card">
          <div className="flex items-start gap-3 mb-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 grid place-items-center shrink-0">
              <svg {...svg} width="18" height="18"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 11l-3-3-3 3M19 8v10" /></svg>
            </span>
            <div>
              <div className="font-semibold t-ink">Link your account</div>
              <p className="text-xs t-muted mt-0.5">
                If a health worker has already enrolled you, link your account using your phone number.
              </p>
            </div>
          </div>
          <form onSubmit={linkSelf} className="flex flex-col sm:flex-row gap-2">
            <input
              className="input flex-1"
              placeholder="Phone number"
              value={linkPhone}
              onChange={(e) => setLinkPhone(e.target.value)}
            />
            <button className="btn-primary" disabled={linkBusy || !linkPhone}>
              {linkBusy ? '…' : 'Link account'}
            </button>
          </form>
          {linkMsg && (
            <p className="text-xs mt-2 t-soft rounded-xl neu-inset px-3 py-2">{linkMsg}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 anim-stagger">
        {list.map((a) => {
          const when = new Date(a.scheduled_at);
          const { phase, label } = meetingPhase(a.scheduled_at, a.duration_minutes || 30);
          const isActive = phase === 'active';
          const isExpired = phase === 'expired';
          const hasJoinUrl = Boolean(a.zoom_join_url);
          const canJoin = isActive && hasJoinUrl;

          const pillCls = isExpired ? 'pill-red' : isActive ? 'pill-amber' : STATUS_PILL[a.status] || 'pill-ink';
          const pillLabel = isExpired ? 'expired' : isActive ? 'live now' : (a.status || '').replace('_', ' ');

          return (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="font-bold t-ink">
                    {when.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-sm t-soft">
                    {when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    {' · '}{a.duration_minutes} min
                  </div>
                </div>
                <span className={pillCls}>{pillLabel}</span>
              </div>

              {label && (
                <div className={`text-xs mb-3 ${isExpired ? 'text-red-600 font-semibold' : isActive ? 'text-emerald-600 font-semibold' : 't-muted'}`}>
                  {label}
                </div>
              )}

              {isExpired ? (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 px-3 py-3">
                  <div className="flex items-start gap-2">
                    <svg {...svg} width="16" height="16" className="text-red-600 mt-0.5 shrink-0">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div>
                      <div className="text-sm font-semibold text-red-700 dark:text-red-300">Session expired</div>
                      <p className="text-xs t-soft mt-0.5">
                        This slot has passed. Please contact your Medical Officer to schedule a new tele-consult.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <a
                    href={canJoin ? a.zoom_join_url : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`btn-primary w-full inline-flex items-center justify-center gap-2 ${
                      !canJoin ? 'opacity-50 pointer-events-none' : ''
                    }`}
                    aria-disabled={!canJoin}
                    title={!canJoin && hasJoinUrl ? 'Join button activates 5 minutes before the scheduled time' : undefined}
                  >
                    <svg {...svg} width="14" height="14"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                    {isActive ? 'Join now' : 'Join (available at slot time)'}
                  </a>

                  {(a.zoom_meeting_id || a.zoom_password) && (
                    <div className="mt-3">
                      <MeetingDetails
                        meetingId={a.zoom_meeting_id}
                        password={a.zoom_password}
                        joinUrl={a.zoom_join_url}
                        compact
                      />
                      {a.zoom_password && (
                        <p className="text-[11px] t-soft mt-2 leading-snug">
                          <strong className="t-ink">If Zoom asks for a passcode</strong>, tap the copy icon next
                          to the password above and paste it into Zoom's <em>Enter meeting passcode</em> prompt.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
