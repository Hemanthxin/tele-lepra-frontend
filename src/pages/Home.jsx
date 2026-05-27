import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, role, loading, profileError, signOut } = useAuth();
  if (loading) return <div className="p-8 t-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  // Authenticated but no role on profile — this happens when /auth/me
  // failed or when the Firestore user doc wasn't bootstrapped. Don't
  // silently demote the user to a patient view; show what's happening.
  if (!role) {
    return (
      <div className="p-8 max-w-md mx-auto t-soft">
        <h2 className="text-lg font-bold t-ink mb-2">Account not configured</h2>
        <p className="text-sm t-muted mb-4">
          We couldn't load your profile.{' '}
          {profileError ? <span className="block mt-1 text-red-600 dark:text-red-400 text-xs">{profileError}</span> : null}
          This usually means the backend is unreachable or your account was not
          finished setting up. Sign out and sign in again, or contact an admin.
        </p>
        <button onClick={signOut} className="btn-primary">Sign out</button>
      </div>
    );
  }

  const dest = {
    patient: '/patient',
    agent: '/agent',
    mo: '/mo',
    admin: '/admin',
  }[role] || '/login';
  return <Navigate to={dest} replace />;
}
