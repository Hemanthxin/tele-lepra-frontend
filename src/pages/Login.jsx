import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { api } from '../lib/api';
import { useTranslation } from '../i18n/I18nContext';
import PartnerLogos from '../components/PartnerLogos';

const FEATURES = [
  { icon: 'cpu', key: 'login.feature.triage' },
  { icon: 'shield', key: 'login.feature.audit' },
  { icon: 'wifi', key: 'login.feature.recall' },
  { icon: 'globe', key: 'login.feature.scheduling' },
  { icon: 'doc', key: 'login.feature.repo' },
];

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-\[\];/\\`~+=]).{6,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Human label per role — used to enforce that a card only logs in its own role.
const ROLE_LABEL = { agent: 'Field Agent', mo: 'Medical Officer', admin: 'Administrator' };

const CARDS = [
  { role: 'agent', color: 'var(--brand)', title: 'Field Agent', desc: 'Screen patients and capture intake in the field.', icon: <AgentIcon /> },
  { role: 'mo', color: 'var(--accent)', title: 'Medical Officer', desc: 'Review cases and make tele-consult decisions.', icon: <MOIcon /> },
  { role: 'admin', color: '#4f46e5', title: 'Administrator', desc: 'Manage users, metrics, and the audit log.', icon: <AdminIcon />, loginOnly: true },
];

export default function Login() {
  const { t, lang, setLang, languages } = useTranslation();
  const nav = useNavigate();
  const [mobileRole, setMobileRole] = useState(null); // small screens: which card is open

  const renderCard = (c) => (
    <AuthCard key={c.role} role={c.role} color={c.color} title={c.title} desc={c.desc} icon={c.icon} loginOnly={c.loginOnly} t={t} nav={nav} />
  );
  const selectedCard = CARDS.find((c) => c.role === mobileRole);

  return (
    <div
      className="min-h-screen md:h-screen md:overflow-hidden flex flex-col overflow-x-hidden relative"
      style={{
        backgroundImage: 'url(/login-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center right',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Subtle white veil so text and cards stay crisp over the image */}
      <div className="absolute inset-0 bg-white/55 pointer-events-none" aria-hidden />

      {/* ===== Header bar ===== */}
      <header className="sticky top-0 z-30 border-b border-white/40 bg-white/70 backdrop-blur-md">
        <div className="w-full px-4 sm:px-5 h-16 sm:h-[72px] flex items-center justify-between gap-4">
          {/* Logo — left */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="brand-mark"><Logo /></span>
            <div className="leading-tight">
              <div className="font-bold tracking-wide text-sm t-ink">TELE-LEPROSY</div>
              <div className="text-[9px] uppercase tracking-[0.16em] t-muted">{t('brand.subtitle')}</div>
            </div>
          </div>

          {/* Heading — center (hidden on mobile, shown md+) */}
          <h1 className="hidden md:block flex-1 text-center text-base lg:text-lg xl:text-xl font-bold tracking-tight t-ink whitespace-nowrap">
            AI-assisted triage for community health workers.
          </h1>

          {/* Language — right */}
          <div className="shrink-0">
            <LanguagePicker lang={lang} setLang={setLang} languages={languages} />
          </div>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="relative z-10 flex-1 w-full px-4 sm:px-6 lg:px-10 py-4 md:py-3 md:flex md:flex-col md:min-h-0">
        {/* Mobile-only heading (header heading is hidden on small screens) */}
        <div className="md:hidden text-center mb-3 px-1">
          <h1 className="text-2xl font-bold leading-tight tracking-tight t-ink">
            AI-assisted triage for community health workers.
          </h1>
        </div>

        {/* Feature pills — visible on sm+ */}
        <ul className="hidden sm:flex flex-wrap items-center justify-center gap-2 mb-3">
          {FEATURES.map((f) => (
            <li key={f.key} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium t-soft bg-white/80 backdrop-blur-sm border border-white/60 shadow-card">
              <span className="text-[color:var(--brand)]"><FeatureIcon name={f.icon} /></span>
              {t(f.key)}
            </li>
          ))}
        </ul>

        {/* Desktop: all three cards in a row */}
        <div className="hidden md:grid grid-cols-3 gap-5 lg:gap-7 xl:gap-9 mt-1 items-start">
          {CARDS.map(renderCard)}
        </div>

        {/* Mobile: pick a role, then show that card */}
        <div className="md:hidden mt-6">
          {!selectedCard ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs t-muted text-center font-medium uppercase tracking-wider mb-1">Choose how you want to sign in</p>
              {CARDS.map((c) => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => setMobileRole(c.role)}
                  className="w-full flex items-center gap-3 text-left bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl px-4 py-3.5 shadow-card active:scale-[0.99] transition-transform"
                >
                  <span className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0" style={{ background: c.color }}>{c.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold t-ink">{c.title} login</span>
                    <span className="block text-xs t-muted leading-snug mt-0.5" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.desc}</span>
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="t-muted shrink-0"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <button type="button" onClick={() => setMobileRole(null)} className="inline-flex items-center gap-1.5 mb-4 text-sm t-muted active:opacity-70">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                All sign-in options
              </button>
              {renderCard(selectedCard)}
            </div>
          )}
        </div>
      </main>

      {/* ===== Footer bar ===== */}
      <footer className="relative z-10 border-t border-white/40 bg-white/70 backdrop-blur-md mt-4">
        <div className="w-full px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldIcon />
            <div className="min-w-0">
              <div className="text-xs font-semibold t-ink">Secure &amp; compliant platform</div>
              <p className="text-[11px] t-muted leading-relaxed mt-0.5">{t('login.note')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-center sm:self-auto">
            <PartnerLogos size="sm" />
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ===================== Auth card (per role) ===================== */
function AuthCard({ role, color, title, desc, icon, loginOnly, t, nav }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const phoneDigits = phone.replace(/\D/g, '');
  const emailError =
    touched.email && !email ? t('validation.required') :
    touched.email && !EMAIL_RE.test(email) ? t('validation.invalid_email') : null;
  const passwordError =
    touched.password && !password ? t('validation.required') :
    touched.password && mode === 'signup' && !PASSWORD_RE.test(password) ? t('validation.password_rule') :
    touched.password && mode === 'signin' && password.length < 6 ? t('validation.password_short') : null;
  const nameError = touched.name && mode === 'signup' && !name ? t('validation.required') : null;
  const phoneError = touched.phone && mode === 'signup' && phoneDigits.length !== 10
    ? 'Phone must be exactly 10 digits' : null;

  const passwordRules = mode === 'signup' && password
    ? [
        { ok: /[A-Za-z]/.test(password), label: 'A-z' },
        { ok: /\d/.test(password), label: '0-9' },
        { ok: /[!@#$%^&*(),.?":{}|<>_\-\[\];/\\`~+=]/.test(password), label: '!@#' },
        { ok: password.length >= 6, label: '≥6' },
      ]
    : [];

  const switchMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError(null);
    setNotice(null);
    setTouched({});
    setPassword('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true, name: true, phone: true });
    setError(null);
    setNotice(null);
    if (!EMAIL_RE.test(email)) return;
    if (mode === 'signup' && !PASSWORD_RE.test(password)) return;
    if (mode === 'signin' && password.length < 6) return;
    if (mode === 'signup' && !name) return;
    if (mode === 'signup' && phoneDigits.length !== 10) return;

    setBusy(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        await api('/auth/bootstrap', { method: 'POST', body: JSON.stringify({ name, role, phone: phoneDigits }) });
        await signOut(auth);
        setMode('signin');
        setPassword('');
        setName('');
        setPhone('');
        setTouched({});
        setNotice(t('login.account_created'));
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // Enforce that this account's role matches the card it was used on.
        let me = null;
        try { me = await api('/auth/me'); } catch { /* handled below */ }
        if (!me?.role) {
          await signOut(auth);
          setError('Could not verify your account role. Please try again.');
          return;
        }
        if (me.role !== role) {
          await signOut(auth);
          const real = ROLE_LABEL[me.role] || me.role;
          setError(`This account can only sign in from the ${real} card.`);
          return;
        }
        nav('/');
      }
    } catch (err) {
      setError(prettifyAuthError(err.message, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-elev flex flex-col !p-0 overflow-x-hidden md:overflow-y-auto md:max-h-[calc(100vh-160px)]">
      {/* Coloured header strip */}
      <div className="px-6 sm:px-7 pt-6 pb-5 border-b border-[color:var(--border-cool)]">
        <div className="flex items-start gap-4">
          <span
            className="w-14 h-14 rounded-2xl grid place-items-center text-white shrink-0 shadow-card"
            style={{ background: color }}
          >
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold t-ink leading-tight">{title}</h2>
            <p className="text-sm t-muted mt-1 leading-snug">{desc}</p>
          </div>
        </div>

        {/* Sign in / Register toggle. Admin is login-only — show a single
            active "Sign In" tab so the header height matches the other cards. */}
        {loginOnly ? (
          <div className="flex p-1 rounded-xl mt-5 border border-[color:var(--border-cool)] bg-[color:var(--surface-2)]">
            <div
              className="flex-1 px-3 py-2.5 rounded-lg text-base font-semibold text-white text-center shadow-card"
              style={{ background: color }}
            >
              Sign In
            </div>
          </div>
        ) : (
          <div role="tablist" className="flex p-1 rounded-xl mt-5 border border-[color:var(--border-cool)] bg-[color:var(--surface-2)]">
            {[
              { k: 'signin', label: t('login.signin') },
              { k: 'signup', label: t('login.register') },
            ].map((opt) => {
              const active = mode === opt.k;
              return (
                <button
                  key={opt.k}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => active || switchMode()}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-base font-semibold transition-all ${
                    active ? 'text-white shadow-card -translate-y-px' : 't-soft hover:t-ink'
                  }`}
                  style={active ? { background: color } : undefined}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={submit} noValidate className="px-6 sm:px-7 py-5 space-y-4">
        {mode === 'signup' && (
          <Field label={t('common.name')} required error={nameError}>
            <input
              className={inputCls(nameError)}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, name: true }))}
              placeholder="Jane Doe"
            />
          </Field>
        )}

        {mode === 'signup' && (
          <Field label="Phone number" required error={phoneError}>
            <input
              className={inputCls(phoneError)}
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              onBlur={() => setTouched((s) => ({ ...s, phone: true }))}
              placeholder="10-digit mobile number"
            />
            <p className="text-[11px] t-muted mt-1.5">You can change this later in your profile.</p>
          </Field>
        )}

        <Field label="Email" required error={emailError}>
          <input
            className={inputCls(emailError)}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((s) => ({ ...s, email: true }))}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>

        <Field label="Password" required error={passwordError}>
          <div className="relative">
            <input
              className={inputCls(passwordError) + ' pr-10'}
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, password: true }))}
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 t-muted hover:t-ink"
              tabIndex={-1}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {mode === 'signup' && passwordRules.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {passwordRules.map((r, i) => (
                <span
                  key={i}
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold tracking-wide ${
                    r.ok
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-[color:var(--surface-2)] t-muted'
                  }`}
                >
                  {r.ok ? '✓ ' : '· '}{r.label}
                </span>
              ))}
            </div>
          )}
        </Field>

        {notice && <Banner kind="info">{notice}</Banner>}
        {error && <Banner kind="error">{error}</Banner>}

        <button
          className="neu-btn-primary"
          disabled={busy}
          style={{ background: color }}
        >
          {busy ? (
            <><Spinner /> {t('common.please_wait')}</>
          ) : mode === 'signin' ? (
            <>{t('login.signin')} <Arrow /></>
          ) : (
            <>{role === 'mo' ? t('login.create_mo') : t('login.create_agent')} <Arrow /></>
          )}
        </button>

        {!loginOnly && mode === 'signin' && (
          <p className="text-center text-xs t-muted">
            New here?{' '}
            <button type="button" onClick={switchMode} className="link font-semibold">
              Create a {title} account
            </button>
          </p>
        )}
        {loginOnly && (
          <p className="text-center text-xs t-muted">
            Admin accounts are provisioned by the system administrator.
          </p>
        )}
      </form>
    </div>
  );
}

/* ===================== Small UI helpers ===================== */
function inputCls(error) {
  return `neu-input${error ? ' border-red-400 focus:border-red-500' : ''}`;
}

function Banner({ kind, children }) {
  const cls = kind === 'error'
    ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40';
  return <div className={`text-sm rounded-lg border px-3.5 py-2.5 ${cls}`}>{children}</div>;
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="neu-label flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-red-500" aria-hidden>*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-600 dark:text-red-400 mt-1.5 font-medium">{error}</p>}
    </div>
  );
}

function LanguagePicker({ lang, setLang, languages }) {
  return (
    <div className="relative">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="rounded-lg pl-3 pr-7 py-1.5 text-xs font-medium appearance-none cursor-pointer border border-[color:var(--border)] bg-[color:var(--surface)] t-ink shadow-card"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>{l.native}</option>
        ))}
      </select>
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none t-muted" width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" />
      </svg>
    </div>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v6" /><path d="M9 7h6" /><path d="M3 17h3l2-4 3 8 2-6 2 2h6" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function MOIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2.3a.3.3 0 0 0-.2 0" /><path d="M8 2v3a4 4 0 0 0 8 0V2" />
      <path d="M6 5a6 6 0 0 0 6 6 6 6 0 0 0 6-6" /><path d="M12 11v4a4 4 0 0 0 8 0v-1" />
      <circle cx="20" cy="14" r="2" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" /><circle cx="12" cy="11" r="2.5" />
      <path d="M12 13.5V16" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0 bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" /><path d="M9 12l2 2 4-4" />
      </svg>
    </span>
  );
}

function FeatureIcon({ name }) {
  const c = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'cpu': return <svg {...c}><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" /></svg>;
    case 'shield': return <svg {...c}><path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" /></svg>;
    case 'wifi': return <svg {...c}><path d="M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0" /><line x1="12" y1="20" x2="12" y2="20" /></svg>;
    case 'globe': return <svg {...c}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20z" /></svg>;
    case 'doc': return <svg {...c}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h6" /></svg>;
    default: return null;
  }
}

function Eye() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
}
function EyeOff() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.65 19.65 0 0 1 4.06-5.94" /><path d="M1 1l22 22" /><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.62 19.62 0 0 1-3.17 4.19" /></svg>;
}
function Arrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
function prettifyAuthError(msg, t) {
  if (!msg) return msg;
  if (msg.includes('auth/wrong-password')) return t('validation.wrong_password');
  if (msg.includes('auth/invalid-credential')) return t('validation.wrong_password');
  if (msg.includes('auth/user-not-found')) return t('validation.no_user');
  if (msg.includes('auth/email-already-in-use')) return 'An account with that email already exists.';
  if (msg.includes('auth/weak-password')) return t('validation.password_short');
  if (msg.includes('auth/network-request-failed')) return 'Network error. Check your connection.';
  if (msg.includes('auth/too-many-requests')) return 'Too many attempts. Please try again later.';
  return msg.replace(/^Firebase:\s*/, '');
}
