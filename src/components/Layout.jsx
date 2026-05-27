import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n/I18nContext';

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
    <div className="h-screen overflow-hidden p-2 sm:p-3 md:p-4 flex">
      <div className="flex-1 min-h-0 rounded-3xl border border-ink-200/50 dark:border-ink-700/40 shadow-[0_30px_80px_-25px_rgba(15,23,42,0.25),0_15px_40px_-20px_rgba(15,23,42,0.55)] overflow-hidden flex flex-col bg-gradient-to-br from-ink-50 to-[#eef2f7] dark:from-ink-900 dark:to-ink-800">
        {/* ============ TOP NAV ============ */}
        <header className="shrink-0 relative bg-white/80 dark:bg-ink-800/80 backdrop-blur-md border-b border-ink-200/60 dark:border-ink-700/40">
          <div className="px-4 md:px-6 h-16 flex items-center justify-between gap-3">
            <Link to="/" className="shrink-0 flex items-center gap-2.5 anim-fade-right">
              <span className="brand-mark anim-pulse-glow">
                <Logo />
              </span>
              <div className="leading-tight hidden sm:block">
                <div className="font-bold tracking-wide text-[14px] t-ink">
                  TELE<span className="text-brand-700 dark:text-brand-400">-</span>LEPROSY
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] t-muted">
                  {t('brand.subtitle')}
                </div>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1 mx-4 flex-1 justify-center">
              {items.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-700/30 dark:from-brand-500 dark:to-brand-800'
                        : 't-soft hover:t-ink hover:bg-ink-100/60 dark:hover:bg-ink-700/40'
                    }`
                  }
                >
                  {i.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setTheme(nextTheme)}
                title={t('settings.theme')}
                className="neu-icon w-9 h-9 rounded-xl text-brand-700 dark:text-brand-300 transition hover:scale-110"
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>

              <div className="relative">
                <select
                  aria-label={t('settings.language')}
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="neu-raised-sm rounded-xl pl-3 pr-7 py-2 text-xs font-semibold appearance-none cursor-pointer t-ink"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code} lang={l.code}>
                      {l.native}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none t-muted"
                  width="10"
                  height="10"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" />
                </svg>
              </div>

              <div className="hidden md:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold t-ink">{displayName}</span>
                <span className="text-[11px] t-muted">{role ? t('role.' + role) : '…'}</span>
              </div>
              <Link
                to="/settings"
                title={t('nav.settings')}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white grid place-items-center font-semibold text-sm shadow-md hover:scale-110 transition"
              >
                {initials}
              </Link>
              <button onClick={async () => { await signOut(); nav('/login'); }} className="neu-btn-ghost">
                {t('nav.signout')}
              </button>
            </div>
          </div>

          {items.length > 0 && (
            <nav className="lg:hidden border-t border-ink-200/40 dark:border-ink-700/40 overflow-x-auto">
              <div className="px-4 flex gap-1">
                {items.map((i) => (
                  <NavLink
                    key={i.to}
                    to={i.to}
                    end
                    className={({ isActive }) =>
                      `px-3 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition ${
                        isActive
                          ? 'border-brand-600 text-brand-700 dark:text-brand-300'
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

        {/* ============ BODY ============ */}
        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4 md:py-5">
          {children}
        </main>

        {/* ============ FOOTER ============ */}
        <footer className="shrink-0 bg-white/80 dark:bg-ink-800/80 backdrop-blur-md border-t border-ink-200/60 dark:border-ink-700/40 px-4 md:px-6 h-10 flex items-center justify-between text-xs">
          <span className="t-muted font-medium">{t('footer.copy')}</span>
          <span className="hidden sm:inline t-muted">{t('footer.note')}</span>
        </footer>
      </div>
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
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v6" />
      <path d="M9 7h6" />
      <path d="M3 17h3l2-4 3 8 2-6 2 2h6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
