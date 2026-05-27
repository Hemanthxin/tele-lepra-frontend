import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n/I18nContext';

const svgP = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const TABS = [
  {
    key: 'profile',
    labelKey: 'settings.tab.profile',
    descKey: 'settings.tab.profile_desc',
    icon: (p) => <svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></svg>,
  },
  {
    key: 'theme',
    labelKey: 'settings.tab.appearance',
    descKey: 'settings.tab.appearance_desc',
    icon: (p) => <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>,
  },
  {
    key: 'language',
    labelKey: 'settings.tab.language',
    descKey: 'settings.tab.language_desc',
    icon: (p) => <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20z" /></svg>,
  },
];

export default function Settings() {
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang, languages } = useTranslation();

  const initialName = profile?.profile?.name || '';
  const initialPhone = profile?.profile?.phone || '';
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    setName(initialName);
    setPhone(initialPhone);
  }, [initialName, initialPhone]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name, phone }),
      });
      setNotice(t('settings.profile_saved'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const displayName = profile?.profile?.name || profile?.email || 'User';
  const initials = displayName.slice(0, 1).toUpperCase();
  const role = profile?.role || 'agent';
  const currentTab = TABS.find((x) => x.key === tab) || TABS[0];

  return (
    <div className="anim-fade-up flex-1 min-h-0 flex flex-col -mx-4 md:-mx-6 -my-4 md:-my-5">
      {/* SUB-HEADER */}
      <div className="shrink-0 bg-white/60 dark:bg-ink-800/40 border-b border-ink-200/60 dark:border-ink-700/40 px-5 md:px-7 py-3.5 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-[11px] t-muted font-semibold">
            <span>{t('role.' + role)}</span>
            <span className="mx-1">›</span>
            <span className="t-soft">Settings</span>
          </div>
          <div className="text-[15px] md:text-base font-bold t-ink leading-tight tracking-tight">
            {t(currentTab.labelKey)}
            <span className="t-muted font-medium text-xs ml-2">· {t(currentTab.descKey)}</span>
          </div>
        </div>
        {notice && (
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-[11px] font-semibold ring-1 ring-emerald-200 dark:ring-emerald-800/50 anim-fade-in">
            <svg {...svgP} width="12" height="12"><path d="M20 6L9 17l-5-5" /></svg>
            {notice}
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="flex flex-1 min-h-0">
        {/* SIDEBAR — tab nav */}
        <aside className="shrink-0 w-20 sm:w-64 relative bg-white dark:bg-ink-800 border-r border-ink-200/70 dark:border-ink-700/40 flex flex-col overflow-hidden">
          <span aria-hidden className="hidden sm:block pointer-events-none absolute -top-20 -left-20 w-56 h-56 rounded-full bg-emerald-200/30 blur-3xl" />
          <span aria-hidden className="hidden sm:block pointer-events-none absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-teal-200/20 blur-3xl" />

          <div className="relative px-3 sm:px-5 pt-5 pb-3 shrink-0">
            <div className="hidden sm:block text-[10px] uppercase tracking-[0.18em] t-muted font-bold mb-1">{t('settings.manage')}</div>
            <h2 className="hidden sm:block text-base font-bold t-ink tracking-tight">{t('nav.settings')}</h2>
            <div className="sm:hidden text-[9px] uppercase tracking-wider t-muted font-bold text-center">{t('common.menu')}</div>
          </div>

          <div className="relative flex-1 overflow-y-auto px-2 sm:px-3 pb-3">
            <ol className="space-y-0.5">
              {TABS.map((s) => {
                const active = s.key === tab;
                const Icon = s.icon;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => setTab(s.key)}
                      className={`group relative w-full flex items-center gap-3 px-2 sm:px-3 py-2.5 rounded-xl transition-all duration-200 text-left ${
                        active
                          ? 'bg-gradient-to-r from-emerald-50 to-emerald-50/0 dark:from-emerald-900/30 dark:to-transparent'
                          : 'hover:bg-ink-50 dark:hover:bg-ink-700/30'
                      }`}
                      title={t(s.labelKey)}
                    >
                      {active && (
                        <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
                      )}
                      <span
                        className={`relative w-9 h-9 rounded-xl grid place-items-center shrink-0 mx-auto sm:mx-0 transition-all duration-200 ${
                          active
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-500/15'
                            : 'bg-ink-50 text-ink-500 dark:bg-ink-700 dark:text-ink-300 border border-ink-200/70 dark:border-ink-700'
                        }`}
                      >
                        <Icon {...svgP} width="16" height="16" />
                      </span>
                      <div className="hidden sm:block min-w-0 flex-1">
                        <div className={`text-[13px] font-bold leading-tight ${active ? 't-ink' : 't-soft'}`}>{t(s.labelKey)}</div>
                        <div className="text-[10px] t-muted mt-0.5">{t(s.descKey)}</div>
                      </div>
                      {active && (
                        <svg {...svgP} width="14" height="14" className="hidden sm:block text-emerald-600 shrink-0">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* user card */}
          <div className="relative shrink-0 hidden sm:block px-4 pb-4 pt-1">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-3 shadow-lg shadow-emerald-700/20 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm grid place-items-center text-sm font-bold ring-1 ring-white/25">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">{displayName}</div>
                <div className="text-[10px] text-emerald-100 truncate">{t('role.' + role)}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN — settings content */}
        <main className="flex-1 min-w-0 overflow-y-auto px-4 md:px-7 py-4 md:py-5">
          {tab === 'profile' && (
            <div className="anim-fade-up max-w-3xl">
              <form onSubmit={saveProfile} className="bg-white dark:bg-ink-800 rounded-2xl border border-ink-200/60 dark:border-ink-700/40 shadow-sm p-5 md:p-6">
                <div className="flex items-center gap-4 pb-4 mb-4 border-b border-ink-200/60 dark:border-ink-700/40">
                  <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white grid place-items-center text-lg font-bold shadow-md shadow-emerald-500/30">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold t-ink truncate">{displayName}</div>
                    <div className="text-xs t-muted truncate">{profile?.email}</div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-emerald-200 dark:ring-emerald-800/50">
                    {role}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label={t('common.name')}>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
                  </Field>
                  <Field label={t('common.phone')}>
                    <input
                      className="input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 ……"
                    />
                  </Field>
                  <Field label={t('common.email')}>
                    <input className="input opacity-60 cursor-not-allowed" value={profile?.email || ''} readOnly />
                  </Field>
                  <Field label={t('common.role')}>
                    <input className="input opacity-60 cursor-not-allowed uppercase tracking-wider" value={role} readOnly />
                  </Field>
                </div>

                {error && (
                  <div className="mt-4 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800/50 rounded-xl px-4 py-3 anim-fade-in">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 mt-5">
                  <button type="button" onClick={() => { setName(initialName); setPhone(initialPhone); }} className="btn-ghost">
                    {t('common.reset')}
                  </button>
                  <button className="btn-primary px-5" disabled={busy}>
                    {busy ? t('common.please_wait') : t('settings.save_profile')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'theme' && (
            <div className="anim-fade-up max-w-3xl">
              <div className="bg-white dark:bg-ink-800 rounded-2xl border border-ink-200/60 dark:border-ink-700/40 shadow-sm p-5 md:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-bold t-ink">{t('settings.theme')}</h3>
                  <p className="text-xs t-muted mt-0.5">{t('settings.theme_desc')}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'light', label: t('theme.light'), preview: '#f1f5f9', accent: '#0d9488' },
                    { key: 'dark', label: t('theme.dark'), preview: '#1f2937', accent: '#5eead4' },
                    { key: 'system', label: t('theme.system'), preview: 'linear-gradient(90deg,#f1f5f9 50%,#1f2937 50%)', accent: '#10b981' },
                  ].map((opt) => {
                    const selected = theme === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setTheme(opt.key)}
                        className={`group relative rounded-2xl p-1 text-left transition-all duration-200 ${
                          selected
                            ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-ink-800'
                            : 'ring-1 ring-ink-200 dark:ring-ink-700 hover:ring-emerald-300 hover:-translate-y-0.5'
                        }`}
                      >
                        <div
                          className="rounded-xl h-24 flex items-end p-2.5 relative overflow-hidden"
                          style={{ background: opt.preview }}
                        >
                          <div className="flex gap-1.5 z-10">
                            <span className="w-2 h-2 rounded-full" style={{ background: '#fb7185' }} />
                            <span className="w-2 h-2 rounded-full" style={{ background: '#fbbf24' }} />
                            <span className="w-2 h-2 rounded-full" style={{ background: opt.accent }} />
                          </div>
                          {selected && (
                            <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white grid place-items-center shadow-md">
                              <svg {...svgP} width="12" height="12"><path d="M20 6L9 17l-5-5" /></svg>
                            </span>
                          )}
                        </div>
                        <div className="px-2 py-2 flex items-center justify-between">
                          <span className={`text-sm font-bold ${selected ? 't-ink' : 't-soft'}`}>{opt.label}</span>
                          {selected && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{t('common.active')}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'language' && (
            <div className="anim-fade-up max-w-3xl">
              <div className="bg-white dark:bg-ink-800 rounded-2xl border border-ink-200/60 dark:border-ink-700/40 shadow-sm p-5 md:p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-bold t-ink">{t('settings.language')}</h3>
                  <p className="text-xs t-muted mt-0.5">{t('settings.language_desc')}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {languages.map((l) => {
                    const selected = lang === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setLang(l.code)}
                        lang={l.code}
                        className={`relative rounded-xl p-3 text-left transition-all duration-200 ${
                          selected
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-ink-800'
                            : 'bg-ink-50 dark:bg-ink-700/30 ring-1 ring-ink-200 dark:ring-ink-700 hover:ring-emerald-300 hover:-translate-y-0.5'
                        }`}
                      >
                        <div className={`text-base font-bold leading-tight ${selected ? 'text-white' : 't-ink'}`}>{l.native}</div>
                        <div className={`text-[10px] mt-0.5 ${selected ? 'text-emerald-100' : 't-muted'}`}>{l.label}</div>
                        {selected && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/20 grid place-items-center">
                            <svg {...svgP} width="11" height="11" stroke="white"><path d="M20 6L9 17l-5-5" /></svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-[0.14em] uppercase t-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}
