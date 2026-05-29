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
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="section-title">Tele-consults</div>
          <h1 className="text-2xl font-semibold tracking-tight t-ink">My Appointments</h1>
          <p className="text-sm t-muted mt-1">Your scheduled tele-consults appear here. Tap "Join" to open Zoom.</p>
        </div>
        <div>
          <span className="pill-brand">{list.length} {list.length === 1 ? 'appointment' : 'appointments'}</span>
        </div>
      </div>

      {list.length === 0 && (
        <section className="card-elev mb-5">
          <div className="mb-3">
            <div className="section-title">Account linking</div>
            <h2 className="text-lg font-semibold t-ink">Link your account</h2>
            <p className="text-xs t-muted mt-1">
              If a health worker has already enrolled you, link your account using your phone number.
            </p>
          </div>
          <form onSubmit={linkSelf} className="flex flex-col sm:flex-row gap-2">
            <input
              className="neu-input flex-1"
              placeholder="Phone number"
              value={linkPhone}
              onChange={(e) => setLinkPhone(e.target.value)}
            />
            <button className="btn-primary" disabled={linkBusy || !linkPhone}>
              {linkBusy ? '…' : 'Link account'}
            </button>
          </form>
          {linkMsg && (
            <p className="text-xs mt-3 t-soft neu-inset px-3 py-2">{linkMsg}</p>
          )}
        </section>
      )}

      {list.length > 0 && (
        <div className="space-y-4">
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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold t-ink">
                        {when.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                      </div>
                      <span className={pillCls}>{pillLabel}</span>
                    </div>
                    <div className="text-sm t-soft mt-1">
                      {when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      {' · '}{a.duration_minutes} min
                    </div>
                    {label && (
                      <div className={`text-xs mt-1 ${isExpired ? 'text-red-600 font-semibold' : isActive ? 'text-brand-700 font-semibold' : 't-muted'}`}>
                        {label}
                      </div>
                    )}
                  </div>

                  {!isExpired && (
                    <a
                      href={canJoin ? a.zoom_join_url : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`btn-primary inline-flex items-center justify-center gap-2 ${
                        !canJoin ? 'opacity-50 pointer-events-none' : ''
                      }`}
                      aria-disabled={!canJoin}
                      title={!canJoin && hasJoinUrl ? 'Join button activates 5 minutes before the scheduled time' : undefined}
                    >
                      <svg {...svg} width="14" height="14"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                      {isActive ? 'Join consultation' : 'Join (at slot time)'}
                    </a>
                  )}
                </div>

                {isExpired ? (
                  <div className="mt-4 neu-inset px-3 py-3 border-red-200">
                    <div className="text-sm font-semibold text-red-700">Session expired</div>
                    <p className="text-xs t-soft mt-0.5">
                      This slot has passed. Please contact your Medical Officer to schedule a new tele-consult.
                    </p>
                  </div>
                ) : (
                  (a.zoom_meeting_id || a.zoom_password) && (
                    <div className="mt-4 border-t border-[color:var(--border)] pt-4">
                      <MeetingDetails
                        meetingId={a.zoom_meeting_id}
                        password={a.zoom_password}
                        joinUrl={a.zoom_join_url}
                        compact
                      />
                      {a.zoom_password && (
                        <p className="text-[11px] t-muted mt-2 leading-snug">
                          <strong className="t-ink">If Zoom asks for a passcode</strong>, tap the copy icon next
                          to the password above and paste it into Zoom's <em>Enter meeting passcode</em> prompt.
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
