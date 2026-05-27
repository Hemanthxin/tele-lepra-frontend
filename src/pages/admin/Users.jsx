import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const ROLES = ['patient', 'agent', 'mo', 'admin'];

const ROLE_PILL = {
  patient: 'pill-ink',
  agent: 'pill-brand',
  mo: 'pill-amber',
  admin: 'pill-red',
};

export default function Users() {
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);

  const load = () => api('/admin/users').then(setList);
  useEffect(() => {
    load();
  }, []);

  const setRole = async (uid, role) => {
    setMsg(null);
    try {
      await api('/auth/set-role', {
        method: 'POST',
        body: JSON.stringify({ uid, role }),
      });
      setMsg(`Updated ${uid.slice(0, 6)} → ${role}`);
      load();
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  };

  return (
    <div className="anim-fade-up space-y-5">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="section-title">Access control</div>
          <h1 className="text-3xl md:text-4xl font-bold t-ink tracking-tight">Users</h1>
          <p className="text-sm t-muted mt-1">Assign roles to control access across the console.</p>
        </div>
        <div className="pill-brand">{list.length} {list.length === 1 ? 'user' : 'users'}</div>
      </header>

      {msg && (
        <div className="rounded-xl neu-inset px-4 py-2.5 text-sm t-soft">{msg}</div>
      )}

      <div className="card">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider t-muted text-left">
                <th className="px-2 py-2 font-semibold">Email</th>
                <th className="px-2 py-2 font-semibold">Name</th>
                <th className="px-2 py-2 font-semibold">Role</th>
                <th className="px-2 py-2 font-semibold">Change role</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.uid} className="border-t border-ink-200/50 dark:border-ink-700/40 hover:bg-ink-50/50 dark:hover:bg-ink-700/20 transition">
                  <td className="px-2 py-3 t-ink font-mono text-xs">{u.email}</td>
                  <td className="px-2 py-3 t-soft">{u.name || '—'}</td>
                  <td className="px-2 py-3">
                    <span className={ROLE_PILL[u.role] || 'pill-ink'}>{u.role}</span>
                  </td>
                  <td className="px-2 py-3">
                    <select
                      className="input max-w-[160px]"
                      value={u.role}
                      onChange={(e) => setRole(u.uid, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-10 text-center t-muted">No users yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
