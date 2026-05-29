import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n/I18nContext';
import PartnerLogos from './PartnerLogos';

export default function Layout({ children }) {
  const { profile, role, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang, languages } = useTranslation();
  const nav = useNavigate();

  const items = navByRole(role, t);
  const displayName = profile?.profile?.name || profile?.email || 'User';
  const initials = (displayName || '?').slice(0, 1).toUpperCase();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: 'var(--bg)' }}>
      <header
        className="shrink-0 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="px-4 md:px-8 h-14 flex items-center justify-between gap-3 max-w-[1600px] mx-auto w-full">
          <Link to="/" className="shrink-0 flex items-center gap-2.5">
            <span className="brand-mark"><Logo /></span>
            <div className="leading-tight hidden sm:block">
              <div className="font-semibold tracking-wide text-[13px] t-ink">TELE-LEPROSY</div>
              <div className="text-[10px] uppercase tracking-[0.16em] t-muted">
                {t('brand.subtitle')}
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 mx-4">
            {items.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-md text-sm font-medium transition ${
                    isActive
                      ? 'text-[color:var(--brand)] bg-[color:var(--brand-soft)]'
                      : 't-soft hover:t-ink hover:bg-[color:var(--surface-2)]'
                  }`
                }
              >
                {i.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(nextTheme)}
              title={t('settings.theme')}
              className="w-8 h-8 rounded-md grid place-items-center border t-soft hover:t-ink transition"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            <div className="relative">
              <select
                aria-label={t('settings.language')}
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="rounded-md pl-3 pr-7 py-1.5 text-xs font-medium appearance-none cursor-pointer t-ink border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code} lang={l.code}>{l.native}</option>
                ))}
              </select>
              <svg
                className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none t-muted"
                width="10" height="10" viewBox="0 0 20 20" fill="currentColor"
              >
                <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" />
              </svg>
            </div>

            <div className="hidden md:flex flex-col items-end leading-tight ml-1">
              <span className="text-sm font-medium t-ink">{displayName}</span>
              <span className="text-[11px] t-muted">{role ? t('role.' + role) : '…'}</span>
            </div>
            <Link
              to="/settings"
              title={t('nav.settings')}
              className="w-8 h-8 rounded-full text-white grid place-items-center font-semibold text-sm"
              style={{ background: 'var(--brand)' }}
            >
              {initials}
            </Link>
            <button onClick={async () => { await signOut(); nav('/login'); }} className="neu-btn-ghost">
              {t('nav.signout')}
            </button>
          </div>
        </div>

        {items.length > 0 && (
          <nav className="lg:hidden border-t overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
            <div className="px-4 flex gap-1">
              {items.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end
                  className={({ isActive }) =>
                    `px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                      isActive
                        ? 'border-[color:var(--brand)] text-[color:var(--brand)]'
                        : 'border-transparent t-soft hover:t-ink'
                    }`
                  }
                >
                  {i.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>

      <footer
        className="shrink-0 border-t"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="t-muted">{t('footer.copy')}</span>
            <span className="hidden md:inline t-muted">·</span>
            <span className="hidden md:inline t-muted">{t('footer.note')}</span>
          </div>
          <PartnerLogos size="sm" />
        </div>
      </footer>
    </div>
  );
}

function navByRole(role, t) {
  const settings = { to: '/settings', label: t('nav.settings') };
  switch (role) {
    case 'agent':
      return [
        { to: '/agent', label: t('nav.intake') },
        { to: '/agent/patients', label: t('nav.patients') },
        settings,
      ];
    case 'mo':
      return [
        { to: '/mo', label: t('nav.queue') },
        { to: '/mo/appointments', label: t('nav.appointments') },
        settings,
      ];
    case 'admin':
      return [
        { to: '/admin', label: t('nav.metrics') },
        { to: '/admin/users', label: t('nav.users') },
        { to: '/admin/audit', label: t('nav.audit') },
        settings,
      ];
    default:
      return [settings];
  }
}

function Logo() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v6" /><path d="M9 7h6" /><path d="M3 17h3l2-4 3 8 2-6 2 2h6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
