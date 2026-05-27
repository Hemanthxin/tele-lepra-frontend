import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

const STATUS_PILL = {
  scheduled: 'pill-brand',
  in_consult: 'pill-amber',
  completed: 'pill-green',
  cancelled: 'pill-red',
};

export default function MOAppointments() {
  const [list, setList] = useState([]);
  useEffect(() => {
    api('/appointments/mine').then(setList).catch(() => setList([]));
  }, []);

  return (
    <div className="anim-fade-up space-y-5">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="section-title">Tele-consults</div>
          <h1 className="text-3xl md:text-4xl font-bold t-ink tracking-tight">My Appointments</h1>
          <p className="text-sm t-muted mt-1">Upcoming and recent consults assigned to you.</p>
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
            return (
              <Link
                to={`/mo/case/${a.case_id}`}
                key={a.id}
                className="card hover:-translate-y-0.5 transition block"
              >
                <div className="flex items-start gap-3">
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
                    {a.zoom_join_url && (
                      <div className="text-[11px] mt-2 truncate">
                        <span className="t-muted">Join: </span>
                        <span className="link">{a.zoom_join_url}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
