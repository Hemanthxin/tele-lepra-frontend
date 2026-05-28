import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

export default function MOAppointments() {
  const [list, setList] = useState([]);
  const [, setTick] = useState(0);
  useEffect(() => {
    api('/appointments/mine').then(setList).catch(() => setList([]));
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="anim-fade-up space-y-5">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="section-title">Tele-consults</div>
          <h1 className="text-3xl md:text-4xl font-bold t-ink tracking-tight">My Appointments</h1>
          <p className="text-sm t-muted mt-1">Click "Start consult" to open Zoom as host.</p>
        </div>
        <div className="pill-brand">{list.length} {list.length === 1 ? 'appointment' : 'appointments'}</div>
      </header>

      {list.length === 0 ? (
        <div className="card text-center py-12">
          <div className="t-soft text-sm font-medium">No appointments yet.</div>
          <div className="t-muted text-xs mt-1">Scheduled tele-consults will appear here.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 anim-stagger">
          {list.map((a) => {
            const when = new Date(a.scheduled_at);
            const initials = (a.patient_name || '?').slice(0, 1).toUpperCase();
            const { phase, label } = meetingPhase(a.scheduled_at, a.duration_minutes || 30);
            const isActive = phase === 'active';
            const isExpired = phase === 'expired';
            // Host link: prefer start_url (host token), fall back to join_url.
            const hostUrl = a.zoom_start_url || a.zoom_join_url;
            const hasUrl = Boolean(hostUrl);
            const canStart = isActive && hasUrl;

            const pillCls = isExpired ? 'pill-red' : isActive ? 'pill-amber' : STATUS_PILL[a.status] || 'pill-ink';
            const pillLabel = isExpired ? 'expired' : isActive ? 'live now' : (a.status || '').replace('_', ' ');

            return (
              <div key={a.id} className="card">
                <div className="flex items-start gap-3 mb-3">
                  <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white grid place-items-center text-base font-bold shadow shrink-0">
                    {initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold t-ink truncate">{a.patient_name}</div>
                      <span className={pillCls}>{pillLabel}</span>
                    </div>
                    <div className="text-xs t-muted mt-0.5">
                      {when.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}
                      {when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      {' · '}
                      {a.duration_minutes}m
                    </div>
                    {label && (
                      <div className={`text-[11px] mt-1 ${isExpired ? 'text-red-600 font-semibold' : isActive ? 'text-emerald-600 font-semibold' : 't-muted'}`}>
                        {label}
                      </div>
                    )}
                  </div>
                </div>

                {isExpired ? (
                  <div className="space-y-2 mb-3">
                    <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 px-3 py-2.5">
                      <div className="text-xs font-semibold text-red-700 dark:text-red-300">Session expired</div>
                      <p className="text-[11px] t-soft mt-0.5">
                        Slot has passed. Reschedule a new tele-consult from the case file.
                      </p>
                    </div>
                    <Link
                      to={`/mo/case/${a.case_id}`}
                      className="btn-primary w-full inline-flex items-center justify-center gap-2"
                    >
                      <svg {...svg} width="14" height="14"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      Schedule new session
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-3">
                      <a
                        href={canStart ? hostUrl : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`btn-primary flex-1 inline-flex items-center justify-center gap-2 ${
                          !canStart ? 'opacity-50 pointer-events-none' : ''
                        }`}
                        aria-disabled={!canStart}
                        title={!canStart && hasUrl ? 'Available 5 minutes before the scheduled time' : undefined}
                      >
                        <svg {...svg} width="14" height="14"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                        {isActive ? 'Start consult' : 'Start (at slot time)'}
                      </a>
                      <Link
                        to={`/mo/case/${a.case_id}`}
                        className="btn-ghost inline-flex items-center justify-center gap-1.5"
                        title="Open case file"
                      >
                        <svg {...svg} width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        Case
                      </Link>
                    </div>

                    {(a.zoom_meeting_id || a.zoom_join_url) && (
                      <MeetingDetails
                        meetingId={a.zoom_meeting_id}
                        password={a.zoom_password}
                        joinUrl={a.zoom_join_url}
                        compact
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
