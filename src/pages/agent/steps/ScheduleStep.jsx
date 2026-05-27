import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function ScheduleStep({ caseId, onDone }) {
  const [mos, setMos] = useState([]);
  const [moUid, setMoUid] = useState('');
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/admin/mos')
      .then((list) => {
        setMos(list);
        if (list[0]) setMoUid(list[0].uid);
      })
      .catch(() => setMos([]));
    // default to 1 hour from now
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    setWhen(d.toISOString().slice(0, 16));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          case_id: caseId,
          mo_uid: moUid,
          scheduled_at: new Date(when).toISOString(),
          duration_minutes: duration,
        }),
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div>
        <h2 className="font-semibold">Step 6 · Schedule MO consult</h2>
        <p className="text-xs text-slate-500">
          Books a Zoom slot. Patient gets a join link via WhatsApp (stub).
        </p>
      </div>

      <div>
        <label className="label">Medical Officer</label>
        <select className="input" value={moUid} onChange={(e) => setMoUid(e.target.value)}>
          {mos.length === 0 && <option value="">(no MOs configured)</option>}
          {mos.map((m) => (
            <option key={m.uid} value={m.uid}>
              {m.name || m.email}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">When</label>
          <input
            type="datetime-local"
            className="input"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Duration (min)</label>
          <input
            type="number"
            className="input"
            value={duration}
            min={10}
            max={60}
            onChange={(e) => setDuration(+e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" disabled={busy || !moUid}>
        {busy ? '…' : 'Book appointment'}
      </button>
    </form>
  );
}
