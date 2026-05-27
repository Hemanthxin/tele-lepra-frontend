import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

const STATUS_PILL = {
  scheduled: 'pill-brand',
  in_consult: 'pill-amber',
  completed: 'pill-green',
  cancelled: 'pill-red',
};

const svg = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export default function MOAppointments() {
  const [list, setList] = useState([]);
  useEffect(() => {
    api('/appointments/mine').then(setList).catch(() => setList([]));
  }, []);

  const now = new Date();

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
            const minsUntil = Math.round((when - now) / 60000);
            const isPast = minsUntil < -((a.duration_minutes || 30) + 15);
            // Host link: prefer start_url (host token), fall back to join_url.
            // start_url expires ~2h after creation — if expired the Zoom landing
            // page will simply ask the MO to sign in.
            const hostUrl = a.zoom_start_url || a.zoom_join_url;
            const hasUrl = Boolean(hostUrl);

            return (
              <div key={a.id} className="card">
                <div className="flex items-start gap-3 mb-3">
                  <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white grid place-items-center text-base font-bold shadow shrink-0">
                    {initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold t-ink truncate">{a.patient_name}</div>
                      <span className={STATUS_PILL[a.status] || 'pill-ink'}>
                        {(a.status || '').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs t-muted mt-0.5">
                      {when.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}
                      {when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      {' · '}
                      {a.duration_minutes}m
                    </div>
                    {!isPast && (
                      <div className="text-[11px] t-muted mt-1">
                        {minsUntil > 60 * 24
                          ? `In ${Math.round(minsUntil / (60 * 24))} day(s)`
                          : minsUntil > 60
                            ? `In ${Math.round(minsUntil / 60)} hour(s)`
                            : minsUntil > 0
                              ? `In ${minsUntil} min`
                              : 'Starting now'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={hasUrl ? hostUrl : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`btn-primary flex-1 inline-flex items-center justify-center gap-2 ${
                      !hasUrl ? 'opacity-50 pointer-events-none' : ''
                    }`}
                    aria-disabled={!hasUrl}
                  >
                    <svg {...svg} width="14" height="14"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                    {isPast ? 'Open Zoom' : 'Start consult'}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
