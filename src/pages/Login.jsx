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

// Classify a patient identifier by digit count
const onlyDigits = (s) => (s || '').replace(/\D/g, '');
const identifierType = (s) => {
  const d = onlyDigits(s);
  if (d.length === 12) return 'aadhaar';
  if (d.length === 14) return 'abha';
  if (d.length >= 10 && d.length <= 15) return 'phone';
  return 'unknown';
};
const identifierLabel = (t) => 'Phone / Aadhaar / ABHA';

export default function Login() {
  const { t, lang, setLang, languages } = useTranslation();
  // userKind: 'staff' (agent/MO email-based) | 'patient' (identifier-based)
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

  // Patient-login state
  const [patientId, setPatientId] = useState('');        // identifier input
  const [patientPw, setPatientPw] = useState('');
  const [patientPw2, setPatientPw2] = useState('');      // confirm (first-time)
  const [patientStage, setPatientStage] = useState('lookup'); // lookup | signin | setup
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

  // ---------- Patient login flow ----------
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
        setError(
          'No patient record found for that number. Please contact your health worker to enrol you first.',
        );
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
    <div className="relative overflow-hidden p-3 md:p-6 lg:p-8 min-h-full lg:flex lg:items-stretch">
      <BackgroundShapes />

      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-30">
        <LanguagePicker lang={lang} setLang={setLang} languages={languages} />
      </div>

      <div className="anim-fade-up w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 lg:my-auto lg:items-stretch">
        {/* LEFT HERO */}
        <aside
          className="hidden lg:flex lg:col-span-7 relative rounded-3xl overflow-hidden text-white p-8 xl:p-12 flex-col justify-between gap-8 min-h-[640px] anim-float-hero"
          style={{ background: 'linear-gradient(135deg, #047857 0%, #064e3b 60%, #022c22 100%)' }}
        >
          <DotGrid className="absolute top-6 left-6 text-white/20" />
          <DotGrid className="absolute bottom-10 right-10 text-white/10" />
          <div className="absolute -top-32 -right-24 w-80 h-80 rounded-full bg-white/10 anim-float-slow" />
          <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-emerald-300/10 anim-float" style={{ animationDelay: '1.5s' }} />

          {/* Brand */}
          <div className="relative z-10 flex items-center gap-3 anim-fade-right">
            <span className="w-11 h-11 rounded-2xl bg-white text-emerald-700 grid place-items-center anim-pulse-glow shadow-lg">
              <Logo />
            </span>
            <div className="leading-tight">
              <div className="font-bold tracking-wide text-base">
                TELE<span className="text-emerald-200">-</span>LEPROSY
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100">
                {t('brand.subtitle')}
              </div>
            </div>
          </div>

          {/* Hero text + AI motif */}
          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-5 gap-8 items-center">
            <div className="xl:col-span-3 anim-fade-up" style={{ animationDelay: '180ms' }}>
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
                AI-Powered Triage.<br />
                <span className="bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
                  Better Care.
                </span>{' '}Closer to<br />
                Every Community.
              </h2>
              <p className="text-emerald-50/85 text-sm mt-4 max-w-md leading-relaxed">
                Intelligent screening, faster decisions, and safer outcomes for leprosy patients.
              </p>

              <ul className="mt-7 space-y-3 anim-stagger">
                {FEATURES.map((f) => (
                  <li key={f.key} className="flex items-center gap-3 text-sm">
                    <span className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 grid place-items-center text-white">
                      <FeatureIcon name={f.icon} />
                    </span>
                    <span className="text-emerald-50">{t(f.key)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI orbit motif */}
            <div className="hidden xl:flex xl:col-span-2 items-center justify-center relative">
              <AIOrbit />
            </div>
          </div>

          {/* Partner logos pinned to bottom of hero */}
          <div className="relative z-10 pt-4 border-t border-white/15">
            <PartnerLogos onDark size="md" />
          </div>

        </aside>

        {/* RIGHT FORM — floating card */}
        <section className="lg:col-span-5 flex">
          <div className="w-full neu-raised rounded-3xl p-6 md:p-9 relative anim-float-card flex flex-col lg:justify-center">
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <span className="brand-mark anim-pulse-glow"><Logo /></span>
              <div className="leading-tight">
                <div className="font-bold tracking-wide text-[14px] t-ink">
                  TELE<span className="text-brand-700">-</span>LEPROSY
                </div>
                <div className="text-[9px] uppercase tracking-[0.18em] t-muted">{t('brand.subtitle')}</div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="anim-fade-up">
                <h1 className="text-2xl font-bold tracking-tight t-ink flex items-center gap-2">
                  {userKind === 'patient'
                    ? <>Patient sign in <span aria-hidden>🩺</span></>
                    : mode === 'signin'
                      ? <>Welcome back <span aria-hidden>👋</span></>
                      : t('login.register')}
                </h1>
                <p className="text-sm t-muted mt-0.5">
                  {userKind === 'patient'
                    ? 'Use your phone, Aadhaar, or ABHA number to access your tele-consults.'
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
                  className="neu-btn-ghost"
                >
                  {mode === 'signin' ? t('login.register') : t('login.signin')}
                </button>
              )}
            </div>

            {/* Staff vs Patient tab toggle */}
            <div className="flex p-1 rounded-2xl neu-inset mb-5 gap-1">
              {[
                { k: 'staff', label: 'Health worker' },
                { k: 'patient', label: 'Patient' },
              ].map((opt) => (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => {
                    setUserKind(opt.k);
                    setError(null);
                    setNotice(null);
                    setTouched({});
                    if (opt.k === 'patient') resetPatientForm();
                  }}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                    userKind === opt.k
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow'
                      : 't-soft hover:t-ink'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {userKind === 'staff' && (
            <form onSubmit={submit} noValidate className="space-y-4 anim-stagger">
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
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide transition ${
                          r.ok
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-ink-100 t-muted dark:bg-ink-700/50'
                        }`}
                      >
                        {r.ok ? '✓ ' : '· '}{r.label}
                      </span>
                    ))}
                  </div>
                )}
              </Field>

              {mode === 'signin' && (
                <div className="flex justify-end -mt-2">
                  <span className="text-xs t-muted">Forgot password?</span>
                </div>
              )}

              {notice && (
                <div className="text-sm text-emerald-800 dark:text-emerald-300 rounded-xl px-4 py-3 neu-inset anim-fade-in">
                  {notice}
                </div>
              )}
              {error && (
                <div className="text-sm text-red-700 dark:text-red-300 rounded-xl px-4 py-3 neu-inset anim-fade-in">
                  {error}
                </div>
              )}

              <button className="neu-btn-primary mt-1" disabled={busy}>
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

            <div className="mt-5 rounded-xl neu-inset px-4 py-3 flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 grid place-items-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" /><path d="M9 12l2 2 4-4" /></svg>
              </span>
              <div>
                <div className="text-xs font-semibold t-ink">Secure & compliant platform</div>
                <p className="text-[11px] t-muted leading-relaxed mt-0.5">{t('login.note')}</p>
              </div>
            </div>

            {/* Mobile-only partner strip — hero (with logos) is hidden below lg */}
            <div className="lg:hidden mt-4 pt-4 border-t border-ink-200/60 dark:border-ink-700/40 flex justify-center">
              <PartnerLogos size="sm" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function inputCls(error) {
  return `neu-input ${error ? 'ring-2 ring-red-400 dark:ring-red-500' : ''}`;
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
      <form onSubmit={onLookup} noValidate className="space-y-4 anim-stagger">
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
            {idTypeLabel && <span className="ml-1 text-emerald-600 font-semibold">Detected: {idTypeLabel} ({idDigits.length} digits)</span>}
          </p>
        </Field>

        {notice && (
          <div className="text-sm text-emerald-800 dark:text-emerald-300 rounded-xl px-4 py-3 neu-inset">
            {notice}
          </div>
        )}
        {error && (
          <div className="text-sm text-red-700 dark:text-red-300 rounded-xl px-4 py-3 neu-inset">
            {error}
          </div>
        )}

        <button className="neu-btn-primary mt-1" disabled={busy || idType === 'unknown'}>
          {busy ? (<><Spinner /> {t('common.please_wait')}</>) : (<>Continue <Arrow /></>)}
        </button>
      </form>
    );
  }

  // signin OR setup — both show the number + name above the password field
  return (
    <form onSubmit={stage === 'signin' ? onSignIn : onSetPassword} noValidate className="space-y-4 anim-stagger">
      <div className="rounded-xl neu-inset px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider t-muted font-bold">Signing in as</div>
          <div className="text-sm font-bold t-ink truncate">{name || 'Patient'}</div>
          <div className="text-[11px] t-muted font-mono truncate">{identifier}</div>
        </div>
        <button type="button" onClick={onChangeNumber} className="neu-btn-ghost !px-3 !py-1.5 !text-xs shrink-0">
          Change
        </button>
      </div>

      {stage === 'setup' && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 px-3 py-2.5 text-xs t-soft">
          <strong className="t-ink">First time signing in?</strong> Please set a password to secure your account.
        </div>
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

      {error && (
        <div className="text-sm text-red-700 dark:text-red-300 rounded-xl px-4 py-3 neu-inset">
          {error}
        </div>
      )}
      {notice && stage === 'signin' && (
        <div className="text-sm text-emerald-800 dark:text-emerald-300 rounded-xl px-4 py-3 neu-inset">
          {notice}
        </div>
      )}

      <button className="neu-btn-primary mt-1" disabled={busy}>
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

function AIOrbit() {
  return (
    <div className="relative w-64 h-64">
      <div className="absolute inset-0 rounded-full border border-white/20 anim-float-slow" />
      <div className="absolute inset-6 rounded-full border border-white/15" />
      <div className="absolute inset-12 rounded-full border border-white/10" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="w-24 h-24 rounded-full bg-white text-emerald-700 grid place-items-center font-bold text-2xl shadow-2xl anim-pulse-glow">
          AI
        </div>
      </div>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        const x = 50 + Math.cos(angle) * 38;
        const y = 50 + Math.sin(angle) * 38;
        return (
          <span
            key={i}
            className="absolute w-9 h-9 rounded-xl bg-white/15 border border-white/20 grid place-items-center text-white"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              animation: `float-y 6s ease-in-out ${i * 0.4}s infinite`,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="4" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" /></svg>
          </span>
        );
      })}
    </div>
  );
}

function LanguagePicker({ lang, setLang, languages }) {
  return (
    <div className="relative">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="neu-raised-sm rounded-xl pl-3 pr-7 py-2 text-xs font-semibold appearance-none cursor-pointer t-ink"
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

function BackgroundShapes() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Base mesh gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 700px at 8% 12%, rgba(45,212,191,0.28), transparent 60%),' +
            'radial-gradient(900px 600px at 92% 18%, rgba(99,102,241,0.18), transparent 60%),' +
            'radial-gradient(1000px 800px at 50% 110%, rgba(16,185,129,0.20), transparent 55%),' +
            'radial-gradient(700px 500px at 20% 90%, rgba(20,184,166,0.22), transparent 60%)',
        }}
      />

      {/* Subtle grid overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.18]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="loginGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="rgba(15,118,110,0.35)" strokeWidth="0.6" />
          </pattern>
          <radialGradient id="loginGridFade" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="loginGridMask">
            <rect width="100%" height="100%" fill="url(#loginGridFade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#loginGrid)" mask="url(#loginGridMask)" />
      </svg>

      {/* Floating blurred blobs */}
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-emerald-300/35 blur-3xl anim-float-slow" />
      <div className="absolute -bottom-48 -right-40 w-[560px] h-[560px] rounded-full bg-indigo-300/30 blur-3xl anim-float-slow" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/3 right-[8%] w-[300px] h-[300px] rounded-full bg-teal-300/30 blur-3xl anim-float" style={{ animationDelay: '0.8s' }} />
      <div className="absolute bottom-[20%] left-[35%] w-[260px] h-[260px] rounded-full bg-cyan-300/25 blur-3xl anim-float-slow" style={{ animationDelay: '3.2s' }} />

      {/* Geometric accents */}
      <svg className="absolute top-[12%] right-[20%] w-24 h-24 text-emerald-500/30 anim-float" style={{ animationDelay: '1.2s' }} viewBox="0 0 100 100" fill="none">
        <polygon points="50,5 95,30 95,70 50,95 5,70 5,30" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <svg className="absolute bottom-[18%] right-[12%] w-16 h-16 text-teal-500/40 anim-float-slow" style={{ animationDelay: '2.5s' }} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <svg className="absolute top-[55%] left-[6%] w-20 h-20 text-indigo-500/25 anim-float" style={{ animationDelay: '1.8s' }} viewBox="0 0 100 100" fill="none">
        <path d="M 10 50 Q 50 10, 90 50 T 10 50" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <path d="M 10 50 Q 50 90, 90 50 T 10 50" stroke="currentColor" strokeWidth="1.2" fill="none" />
      </svg>
      <svg className="absolute top-[8%] left-[40%] w-12 h-12 text-emerald-600/40 anim-float-slow" style={{ animationDelay: '0.4s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" />
      </svg>

      {/* Small floating dots */}
      {[
        { top: '20%', left: '10%', delay: '0s' },
        { top: '35%', left: '85%', delay: '0.6s' },
        { top: '70%', left: '15%', delay: '1.2s' },
        { top: '80%', left: '70%', delay: '1.8s' },
        { top: '15%', left: '60%', delay: '2.4s' },
        { top: '55%', left: '92%', delay: '3.0s' },
        { top: '90%', left: '50%', delay: '0.9s' },
      ].map((d, i) => (
        <span
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500/60 anim-float"
          style={{ top: d.top, left: d.left, animationDelay: d.delay }}
        />
      ))}

      {/* Connection lines (medical/network feel) */}
      <svg className="absolute inset-0 w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <line x1="10%" y1="20%" x2="35%" y2="55%" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="3 6" />
        <line x1="85%" y1="35%" x2="60%" y2="60%" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="3 6" />
        <line x1="50%" y1="90%" x2="70%" y2="80%" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="3 6" />
      </svg>
    </div>
  );
}

function Chevron() {
  return (
    <svg className="absolute right-4 top-1/2 -translate-y-1/2 t-muted pointer-events-none" width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" clipRule="evenodd" />
    </svg>
  );
}

function DotGrid({ className = '' }) {
  const dots = [];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++)
      dots.push(<circle key={`${r}-${c}`} cx={4 + c * 10} cy={4 + r * 10} r="1.5" fill="currentColor" />);
  return <svg width="64" height="64" viewBox="0 0 64 64" className={className}>{dots}</svg>;
}

function Logo() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v6" /><path d="M9 7h6" /><path d="M3 17h3l2-4 3 8 2-6 2 2h6" />
    </svg>
  );
}

function FeatureIcon({ name }) {
  const c = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
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
