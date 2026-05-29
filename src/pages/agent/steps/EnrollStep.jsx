import { useMemo, useState } from 'react';
import { api } from '../../../lib/api';
import { useTranslation } from '../../../i18n/I18nContext';
import { STATES, STATES_DISTRICTS } from '../../../data/districts';

const onlyDigits = (s) => (s || '').replace(/\D/g, '');

export default function EnrollStep({ onDone, initial }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => ({
    name: '',
    age: '',
    sex: 'male',
    phone: '',
    state: '',
    district: '',
    village: '',
    aadhaar_id: '',
    abha_id: '',
    referred_by: '',
    consent_given: true,
    ...(initial || {}),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});

  const districts = useMemo(
    () => (form.state ? STATES_DISTRICTS[form.state] || [] : []),
    [form.state],
  );

  const phoneDigits = onlyDigits(form.phone);
  const aadhaarDigits = onlyDigits(form.aadhaar_id);
  const abhaDigits = onlyDigits(form.abha_id);

  const phoneError =
    touched.phone && !form.phone.trim()
      ? 'Phone number is required'
      : touched.phone && phoneDigits.length < 10
        ? 'Phone must be at least 10 digits'
        : null;

  const aadhaarError =
    touched.aadhaar_id && aadhaarDigits.length > 0 && aadhaarDigits.length !== 12
      ? 'Aadhaar must be exactly 12 digits'
      : null;

  const abhaError =
    touched.abha_id && abhaDigits.length > 0 && abhaDigits.length !== 14
      ? 'ABHA ID must be exactly 14 digits'
      : null;

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ phone: true, aadhaar_id: true, abha_id: true });
    if (!form.phone.trim() || phoneDigits.length < 10) return;
    if (aadhaarDigits.length > 0 && aadhaarDigits.length !== 12) return;
    if (abhaDigits.length > 0 && abhaDigits.length !== 14) return;

    setBusy(true);
    setError(null);
    try {
      const location = [form.village, form.district, form.state]
        .map((s) => (s || '').trim())
        .filter(Boolean)
        .join(', ');
      const payload = {
        ...form,
        phone: form.phone.trim(),
        aadhaar_id: aadhaarDigits || null,
        abha_id: abhaDigits || null,
        location,
      };
      const p = await api('/patients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onDone(p, form);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const f = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const onStateChange = (v) => setForm((s) => ({ ...s, state: v, district: '' }));

  return (
    <form onSubmit={submit} className="card-elev">
      <header className="mb-5">
        <h2 className="text-lg font-semibold t-ink">{t('enroll.title')}</h2>
        <p className="text-sm t-muted mt-1">{t('enroll.subtitle')}</p>
      </header>

      <section>
        <div className="section-title mb-3">Patient Identity</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t('enroll.fullName')} required>
            <input
              className="neu-input"
              required
              value={form.name}
              onChange={(e) => f('name', e.target.value)}
              placeholder="Enter full name"
            />
          </Field>
          <Field label={t('enroll.age')} required>
            <input
              className="neu-input"
              type="number"
              min={0}
              max={120}
              required
              value={form.age}
              onChange={(e) => f('age', e.target.value === '' ? '' : +e.target.value)}
              placeholder="Enter age"
            />
          </Field>
          <Field label={t('enroll.sex')} required>
            <select className="neu-input" value={form.sex} onChange={(e) => f('sex', e.target.value)}>
              <option value="male">{t('enroll.sex.male')}</option>
              <option value="female">{t('enroll.sex.female')}</option>
              <option value="other">{t('enroll.sex.other')}</option>
            </select>
          </Field>
          <Field label={t('enroll.phone')} required error={phoneError}>
            <input
              className="neu-input"
              required
              inputMode="tel"
              value={form.phone}
              onChange={(e) => f('phone', e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, phone: true }))}
              placeholder="10-digit mobile number"
            />
          </Field>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">Contact &amp; Location</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t('enroll.state')} required>
            <select
              className="neu-input"
              required
              value={form.state}
              onChange={(e) => onStateChange(e.target.value)}
            >
              <option value="">{t('enroll.state_placeholder')}</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label={t('enroll.district')} required>
            <select
              className="neu-input"
              required
              disabled={!form.state}
              value={form.district}
              onChange={(e) => f('district', e.target.value)}
            >
              <option value="">
                {form.state ? t('enroll.district_placeholder') : t('enroll.district_locked')}
              </option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label={t('enroll.village')} wide>
            <input
              className="neu-input"
              value={form.village}
              onChange={(e) => f('village', e.target.value)}
              placeholder="Enter village or area"
            />
          </Field>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">Health Identifiers</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Aadhaar number (12 digits)"
            hint={aadhaarDigits ? `${aadhaarDigits.length}/12` : '12 digits'}
            error={aadhaarError}
          >
            <input
              className="neu-input"
              inputMode="numeric"
              value={form.aadhaar_id}
              onChange={(e) => f('aadhaar_id', e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, aadhaar_id: true }))}
              placeholder="XXXX XXXX XXXX"
              maxLength={14}
            />
          </Field>
          <Field
            label="ABHA ID (14 digits)"
            hint={abhaDigits ? `${abhaDigits.length}/14` : '14 digits'}
            error={abhaError}
          >
            <input
              className="neu-input"
              inputMode="numeric"
              value={form.abha_id}
              onChange={(e) => f('abha_id', e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, abha_id: true }))}
              placeholder="XX-XXXX-XXXX-XXXX"
              maxLength={17}
            />
          </Field>
          <Field label="Referred by (optional)" wide>
            <input
              className="neu-input"
              value={form.referred_by}
              onChange={(e) => f('referred_by', e.target.value)}
              placeholder="ASHA / PHC name"
            />
          </Field>
        </div>
      </section>

      <div className="border-t border-[color:var(--border)] pt-5 mt-5">
        <label htmlFor="consent" className="flex items-start gap-2.5 text-sm t-soft cursor-pointer">
          <input
            type="checkbox"
            id="consent"
            checked={form.consent_given}
            onChange={(e) => f('consent_given', e.target.checked)}
            className="mt-0.5 accent-brand-600"
          />
          <span>
            {t('enroll.consent')} <span className="text-red-600">*</span>
          </span>
        </label>
      </div>

      {error && (
        <div className="text-sm text-red-700 border border-red-200 bg-red-50 rounded-md px-3 py-2 mt-4">
          {error}
        </div>
      )}

      <div className="flex justify-end mt-6">
        <button className="btn-primary inline-flex items-center gap-1.5" disabled={busy}>
          {busy ? '…' : (
            <>
              {t('enroll.submit')}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({ label, required, wide, hint, error, children }) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-xs font-medium t-soft">
          {label}
          {required && <span className="text-red-600 ml-0.5" aria-hidden>*</span>}
        </span>
        {hint && <span className="text-[11px] t-muted">{hint}</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
