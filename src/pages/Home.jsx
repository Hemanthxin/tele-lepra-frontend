import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { role, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
  const dest = {
    patient: '/patient',
    agent: '/agent',
    mo: '/mo',
    admin: '/admin',
  }[role] || '/login';
  return <Navigate to={dest} replace />;
}
