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

const ROLES = [
  { key: 'agent', label: 'Agent / Mediator' },
  { key: 'mo', label: 'Medical Officer' },
];

const FEATURES = [
  { icon: 'cpu', key: 'login.feature.triage' },
  { icon: 'shield', key: 'login.feature.audit' },
  { icon: 'wifi', key: 'login.feature.recall' },
  { icon: 'globe', key: 'login.feature.scheduling' },
  { icon: 'doc', key: 'login.feature.repo' },
];

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-\[\];/\\`~+=]).{6,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const onlyDigits = (s) => (s || '').replace(/\D/g, '');
const identifierType = (s) => {
  const d = onlyDigits(s);
  if (d.length === 12) return 'aadhaar';
  if (d.length === 14) return 'abha';
  if (d.length >= 10 && d.length <= 15) return 'phone';
  return 'unknown';
};
const identifierLabel = () => 'Phone / Aadhaar / ABHA';

export default function Login() {
  const { t, lang, setLang, languages } = useTranslation();
  const [userKind, setUserKind] = useState('staff');
  const [mode, setMode] = useState('signin');
  const [role, setRole] = useState('agent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [patientPw, setPatientPw] = useState('');
  const [patientPw2, setPatientPw2] = useState('');
  const [patientStage, setPatientStage] = useState('lookup');
  const [patientName, setPatientName] = useState(null);
  const nav = useNavigate();

  const emailError =
    touched.email && !email ? t('validation.required') :
    touched.email && !EMAIL_RE.test(email) ? t('validation.invalid_email') : null;

  const passwordError =
    touched.password && !password ? t('validation.required') :
    touched.password && mode === 'signup' && !PASSWORD_RE.test(password) ? t('validation.password_rule') :
    touched.password && mode === 'signin' && password.length < 6 ? t('validation.password_short') : null;

  const nameError = touched.name && mode === 'signup' && !name ? t('validation.required') : null;

  const passwordRules = mode === 'signup' && password
    ? [
        { ok: /[A-Za-z]/.test(password), label: 'A-z' },
        { ok: /\d/.test(password), label: '0-9' },
        { ok: /[!@#$%^&*(),.?":{}|<>_\-\[\];/\\`~+=]/.test(password), label: '!@#' },
        { ok: password.length >= 6, label: '≥6' },
      ]
    : [];

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true, name: true });
    setError(null);
    setNotice(null);

    if (!EMAIL_RE.test(email)) return;
    if (mode === 'signup' && !PASSWORD_RE.test(password)) return;
    if (mode === 'signin' && password.length < 6) return;
    if (mode === 'signup' && !name) return;

    setBusy(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        await api('/auth/bootstrap', {
          method: 'POST',
          body: JSON.stringify({ name, role }),
        });
        await signOut(auth);
        setMode('signin');
        setPassword('');
        setName('');
        setTouched({});
        setNotice(t('login.account_created'));
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        nav('/');
      }
    } catch (err) {
      setError(prettifyAuthError(err.message, t));
    } finally {
      setBusy(false);
    }
  };

  const patientLookup = async (e) => {
    e?.preventDefault?.();
    setError(null);
    setNotice(null);
    const idType = identifierType(patientId);
    if (idType === 'unknown') {
      setError('Enter a valid 10-digit phone, 12-digit Aadhaar, or 14-digit ABHA number.');
      return;
    }
    setBusy(true);
    try {
      const r = await api('/patient-auth/lookup', {
        method: 'POST',
        body: JSON.stringify({ identifier: patientId }),
      });
      if (!r.exists) {
        setError('No patient record found for that number. Please contact your health worker to enrol you first.');
        return;
      }
      setPatientName(r.name || null);
      setPatientStage(r.has_password ? 'signin' : 'setup');
      setPatientPw('');
      setPatientPw2('');
    } catch (err) {
      setError(prettifyAuthError(err.message, t));
    } finally {
      setBusy(false);
    }
  };

  const patientSignIn = async (e) => {
    e?.preventDefault?.();
    setError(null);
    if (patientPw.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const prep = await api('/patient-auth/prepare-login', {
        method: 'POST',
        body: JSON.stringify({ identifier: patientId }),
      });
      if (prep.needs_init) {
        setPatientStage('setup');
        setError(null);
        setNotice('Your account is new. Please set a password to continue.');
        return;
      }
      await signInWithEmailAndPassword(auth, prep.email, patientPw);
      nav('/');
    } catch (err) {
      setError(prettifyAuthError(err.message, t));
    } finally {
      setBusy(false);
    }
  };

  const patientSetPassword = async (e) => {
    e?.preventDefault?.();
    setError(null);
    if (patientPw.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (patientPw !== patientPw2) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const r = await api('/patient-auth/init', {
        method: 'POST',
        body: JSON.stringify({ identifier: patientId, password: patientPw }),
      });
      await signInWithEmailAndPassword(auth, r.email, patientPw);
      nav('/');
    } catch (err) {
      setError(prettifyAuthError(err.message, t));
    } finally {
      setBusy(false);
    }
  };

  const resetPatientForm = () => {
    setPatientId('');
    setPatientPw('');
    setPatientPw2('');
    setPatientStage('lookup');
    setPatientName(null);
    setError(null);
    setNotice(null);
  };

  return (
    <div className="min-h-full relative p-3 sm:p-4 md:p-8 lg:p-10 lg:flex lg:items-center">
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 z-30">
        <LanguagePicker lang={lang} setLang={setLang} languages={languages} />
      </div>

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 lg:items-center">
        {/* LEFT — informational panel (desktop only) */}
        <aside
          className="hidden lg:flex lg:col-span-7 rounded-2xl p-12 xl:p-14 flex-col justify-between gap-10 min-h-[640px]"
          style={{ background: 'var(--brand)', color: '#ffffff' }}
        >
          <div>
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-md bg-white text-brand-700 grid place-items-center">
                <LargeLogo />
              </span>
              <div className="leading-tight">
                <div className="font-semibold tracking-wide text-base">TELE-LEPROSY</div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                  {t('brand.subtitle')}
                </div>
              </div>
            </div>

            <h1 className="mt-12 text-4xl xl:text-5xl font-semibold leading-[1.15] tracking-tight">
              AI-assisted triage for community health workers.
            </h1>
            <p className="mt-5 text-white/85 text-base max-w-lg leading-relaxed">
              Standardised screening, decision support, and a complete audit trail —
              from first contact in the field to specialist review.
            </p>

            <ul className="mt-10 space-y-3.5">
              {FEATURES.map((f) => (
                <li key={f.key} className="flex items-center gap-3.5 text-base text-white/90">
                  <span className="w-8 h-8 rounded-md bg-white/15 grid place-items-center text-white shrink-0">
                    <FeatureIcon name={f.icon} />
                  </span>
                  <span>{t(f.key)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-8 border-t border-white/15">
            <PartnerLogos onDark size="md" />
          </div>
        </aside>

        {/* RIGHT — form card (vertically centered against the hero) */}
        <section className="lg:col-span-5 lg:self-center w-full">
          <div className="card-elev !p-5 sm:!p-7 md:!p-9">
            {/* Mobile-only brand header */}
            <div className="lg:hidden flex items-center gap-2.5 mb-5">
              <span className="brand-mark"><Logo /></span>
              <div className="leading-tight">
                <div className="font-semibold tracking-wide text-sm t-ink">TELE-LEPROSY</div>
                <div className="text-[9px] uppercase tracking-[0.18em] t-muted">{t('brand.subtitle')}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight t-ink">
                  {userKind === 'patient'
                    ? 'Patient sign in'
                    : mode === 'signin' ? 'Sign in' : t('login.register')}
                </h2>
                <p className="text-sm t-muted mt-1.5">
                  {userKind === 'patient'
                    ? 'Use your phone, Aadhaar, or ABHA number.'
                    : mode === 'signin' ? t('login.welcome') : t('login.create_intro')}
                </p>
              </div>
              {userKind === 'staff' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setError(null);
                    setNotice(null);
                    setTouched({});
                  }}
                  className="neu-btn-ghost shrink-0"
                >
                  {mode === 'signin' ? t('login.register') : t('login.signin')}
                </button>
              )}
            </div>

            {/* Staff / Patient segmented control */}
            <div role="tablist" className="flex p-0.5 rounded-md mb-5 border border-[color:var(--border)] bg-[color:var(--surface-2)]">
              {[
                { k: 'staff', label: 'Health worker' },
                { k: 'patient', label: 'Patient' },
              ].map((opt) => {
                const active = userKind === opt.k;
                return (
                  <button
                    key={opt.k}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setUserKind(opt.k);
                      setError(null);
                      setNotice(null);
                      setTouched({});
                      if (opt.k === 'patient') resetPatientForm();
                    }}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                      active
                        ? 'bg-white text-[color:var(--text-ink)] shadow-sm border border-[color:var(--border)]'
                        : 't-soft hover:t-ink'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {userKind === 'staff' && (
              <form onSubmit={submit} noValidate className="space-y-4">
                {mode === 'signup' && (
                  <Field label={t('login.account_type')} required>
                    <div className="relative">
                      <select
                        className="neu-input appearance-none pr-10"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r.key} value={r.key}>{r.label}</option>
                        ))}
                      </select>
                      <Chevron />
                    </div>
                  </Field>
                )}

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
                      onClick={() => setShowPw((s) => !s)}
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

                {mode === 'signin' && (
                  <div className="flex justify-end -mt-1">
                    <span className="text-xs t-muted">Forgot password?</span>
                  </div>
                )}

                {notice && <Banner kind="info">{notice}</Banner>}
                {error && <Banner kind="error">{error}</Banner>}

                <button className="neu-btn-primary" disabled={busy}>
                  {busy ? (
                    <><Spinner /> {t('common.please_wait')}</>
                  ) : mode === 'signin' ? (
                    <>{t('login.signin')} <Arrow /></>
                  ) : (
                    <>{role === 'mo' ? t('login.create_mo') : t('login.create_agent')} <Arrow /></>
                  )}
                </button>
              </form>
            )}

            {userKind === 'patient' && (
              <PatientLoginForm
                stage={patientStage}
                identifier={patientId}
                setIdentifier={setPatientId}
                pw={patientPw}
                setPw={setPatientPw}
                pw2={patientPw2}
                setPw2={setPatientPw2}
                showPw={showPw}
                setShowPw={setShowPw}
                name={patientName}
                onLookup={patientLookup}
                onSignIn={patientSignIn}
                onSetPassword={patientSetPassword}
                onChangeNumber={resetPatientForm}
                busy={busy}
                notice={notice}
                error={error}
                t={t}
              />
            )}

            <div className="mt-5 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3.5 py-2.5 flex items-start gap-2.5">
              <ShieldIcon />
              <div>
                <div className="text-xs font-semibold t-ink">Secure & compliant platform</div>
                <p className="text-[11px] t-muted leading-relaxed mt-0.5">{t('login.note')}</p>
              </div>
            </div>

            <div className="lg:hidden mt-5 pt-4 border-t border-[color:var(--border)] flex justify-center">
              <PartnerLogos size="sm" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function inputCls(error) {
  return `neu-input${error ? ' border-red-400 focus:border-red-500' : ''}`;
}

function Banner({ kind, children }) {
  const cls = kind === 'error'
    ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40';
  return <div className={`text-sm rounded-md border px-3.5 py-2.5 ${cls}`}>{children}</div>;
}

function PatientLoginForm({
  stage, identifier, setIdentifier, pw, setPw, pw2, setPw2,
  showPw, setShowPw, name,
  onLookup, onSignIn, onSetPassword, onChangeNumber,
  busy, notice, error, t,
}) {
  const idType = identifierType(identifier);
  const idDigits = onlyDigits(identifier);
  const idTypeLabel =
    idType === 'aadhaar' ? 'Aadhaar (12 digits)' :
    idType === 'abha' ? 'ABHA (14 digits)' :
    idType === 'phone' ? 'Phone number' : null;

  if (stage === 'lookup') {
    return (
      <form onSubmit={onLookup} noValidate className="space-y-4">
        <Field label={identifierLabel(t)} required>
          <input
            className={inputCls(null)}
            inputMode="numeric"
            autoFocus
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Enter your phone, Aadhaar or ABHA"
            maxLength={20}
          />
          <p className="text-[11px] t-muted mt-1.5">
            10-digit phone, 12-digit Aadhaar, or 14-digit ABHA number.
            {idTypeLabel && (
              <span className="ml-1 text-[color:var(--brand)] font-semibold">
                Detected: {idTypeLabel} ({idDigits.length} digits)
              </span>
            )}
          </p>
        </Field>

        {notice && <Banner kind="info">{notice}</Banner>}
        {error && <Banner kind="error">{error}</Banner>}

        <button className="neu-btn-primary" disabled={busy || idType === 'unknown'}>
          {busy ? (<><Spinner /> {t('common.please_wait')}</>) : (<>Continue <Arrow /></>)}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={stage === 'signin' ? onSignIn : onSetPassword} noValidate className="space-y-4">
      <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3.5 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider t-muted font-semibold">Signing in as</div>
          <div className="text-sm font-semibold t-ink truncate">{name || 'Patient'}</div>
          <div className="text-[11px] t-muted font-mono truncate">{identifier}</div>
        </div>
        <button type="button" onClick={onChangeNumber} className="neu-btn-ghost shrink-0">
          Change
        </button>
      </div>

      {stage === 'setup' && (
        <Banner kind="info">
          <strong className="t-ink">First time signing in?</strong>{' '}
          Please set a password to secure your account.
        </Banner>
      )}

      <Field label={stage === 'setup' ? 'Choose a password' : 'Password'} required>
        <div className="relative">
          <input
            className={inputCls(null) + ' pr-10'}
            type={showPw ? 'text' : 'password'}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="••••••••"
            autoComplete={stage === 'signin' ? 'current-password' : 'new-password'}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 t-muted hover:t-ink"
            tabIndex={-1}
          >
            {showPw ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </Field>

      {stage === 'setup' && (
        <Field label="Confirm password" required>
          <input
            className={inputCls(null)}
            type={showPw ? 'text' : 'password'}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </Field>
      )}

      {error && <Banner kind="error">{error}</Banner>}
      {notice && stage === 'signin' && <Banner kind="info">{notice}</Banner>}

      <button className="neu-btn-primary" disabled={busy}>
        {busy
          ? <><Spinner /> {t('common.please_wait')}</>
          : stage === 'setup'
            ? <>Set password & sign in <Arrow /></>
            : <>{t('login.signin')} <Arrow /></>}
      </button>
    </form>
  );
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
        className="rounded-md pl-3 pr-7 py-1.5 text-xs font-medium appearance-none cursor-pointer border border-[color:var(--border)] bg-[color:var(--surface)] t-ink"
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
  );
}

function Chevron() {
  return (
    <svg className="absolute right-3 top-1/2 -translate-y-1/2 t-muted pointer-events-none" width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" clipRule="evenodd" />
    </svg>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v6" /><path d="M9 7h6" /><path d="M3 17h3l2-4 3 8 2-6 2 2h6" />
    </svg>
  );
}
function LargeLogo() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v6" /><path d="M9 7h6" /><path d="M3 17h3l2-4 3 8 2-6 2 2h6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <span className="w-7 h-7 rounded-md grid place-items-center shrink-0 bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    </span>
  );
}

function FeatureIcon({ name }) {
  const c = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
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
