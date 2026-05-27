import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import MeetingDetails from '../../components/MeetingDetails';

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

  const load = () => api('/appointments/mine').then(setList).catch(() => setList([]));
  useEffect(() => {
    load();
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

  const now = new Date();

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
          const minsUntil = Math.round((when - now) / 60000);
          const isPast = minsUntil < -((a.duration_minutes || 30) + 15);
          const isOpen = minsUntil <= 15 && !isPast; // open join window: 15 min before through end
          const hasJoinUrl = Boolean(a.zoom_join_url);

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
                <span className={STATUS_PILL[a.status] || 'pill-ink'}>{(a.status || '').replace('_', ' ')}</span>
              </div>

              {!isPast && (
                <div className="text-xs t-muted mb-3">
                  {minsUntil > 60 * 24
                    ? `In ${Math.round(minsUntil / (60 * 24))} day(s)`
                    : minsUntil > 60
                      ? `In ${Math.round(minsUntil / 60)} hour(s)`
                      : minsUntil > 0
                        ? `In ${minsUntil} minute(s)`
                        : 'Starting now'}
                </div>
              )}

              <a
                href={hasJoinUrl ? a.zoom_join_url : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn-primary w-full inline-flex items-center justify-center gap-2 ${
                  !hasJoinUrl || isPast ? 'opacity-50 pointer-events-none' : ''
                }`}
                aria-disabled={!hasJoinUrl || isPast}
              >
                <svg {...svg} width="14" height="14"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                {isPast ? 'Consult ended' : isOpen ? 'Join now' : 'Open Zoom link'}
              </a>

              {!isPast && (a.zoom_meeting_id || a.zoom_password) && (
                <div className="mt-3">
                  <MeetingDetails
                    meetingId={a.zoom_meeting_id}
                    password={a.zoom_password}
                    joinUrl={a.zoom_join_url}
                    compact
                  />
                  <p className="text-[10px] t-muted mt-1.5">
                    Keep this password handy in case Zoom asks for it when joining.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
