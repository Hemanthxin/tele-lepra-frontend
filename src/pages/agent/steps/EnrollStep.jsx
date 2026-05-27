import { useMemo, useState } from 'react';
import { api } from '../../../lib/api';
import { useTranslation } from '../../../i18n/I18nContext';
import { STATES, STATES_DISTRICTS } from '../../../data/districts';

export default function EnrollStep({ onDone }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    age: '',
    sex: 'male',
    phone: '',
    state: '',
    district: '',
    village: '',
    abha_id: '',
    referred_by: '',
    consent_given: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const districts = useMemo(
    () => (form.state ? STATES_DISTRICTS[form.state] || [] : []),
    [form.state],
  );

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const location = [form.village, form.district, form.state]
        .map((s) => (s || '').trim())
        .filter(Boolean)
        .join(', ');
      const payload = { ...form, location };
      const p = await api('/patients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onDone(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const f = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const onStateChange = (v) => setForm((s) => ({ ...s, state: v, district: '' }));

  return (
    <form onSubmit={submit} className="card space-y-4 anim-fade-up !p-4 md:!p-5">
      <header className="border-b border-ink-200/60 dark:border-ink-700/40 pb-3">
        <h2 className="text-base font-bold t-ink">{t('enroll.title')}</h2>
        <p className="text-[11px] t-muted mt-0.5">{t('enroll.subtitle')}</p>
      </header>

      <Section title="Patient Identity" icon="user">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={t('enroll.fullName')} required>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => f('name', e.target.value)}
              placeholder="Enter full name"
            />
          </Field>
          <Field label={t('enroll.age')} required>
            <input
              className="input"
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
            <select className="input" value={form.sex} onChange={(e) => f('sex', e.target.value)}>
              <option value="male">{t('enroll.sex.male')}</option>
              <option value="female">{t('enroll.sex.female')}</option>
              <option value="other">{t('enroll.sex.other')}</option>
            </select>
          </Field>
          <Field label={t('enroll.phone')}>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => f('phone', e.target.value)}
              placeholder="Enter phone number"
            />
          </Field>
        </div>
      </Section>

      <Section title="Contact & Location" icon="map">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={t('enroll.state')} required>
            <select
              className="input"
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
              className="input"
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
              className="input"
              value={form.village}
              onChange={(e) => f('village', e.target.value)}
              placeholder="Enter village or area"
            />
          </Field>
        </div>
      </Section>

      <Section title="Health Metadata" icon="health">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={t('enroll.abha')}>
            <input
              className="input"
              value={form.abha_id}
              onChange={(e) => f('abha_id', e.target.value)}
              placeholder="Enter ABHA ID"
            />
          </Field>
          <Field label="Referred by (optional)">
            <input
              className="input"
              value={form.referred_by}
              onChange={(e) => f('referred_by', e.target.value)}
              placeholder="ASHA / PHC name"
            />
          </Field>
        </div>
      </Section>

      <div className="flex items-start gap-2.5 rounded-xl neu-inset px-4 py-3">
        <input
          type="checkbox"
          id="consent"
          checked={form.consent_given}
          onChange={(e) => f('consent_given', e.target.checked)}
          className="mt-1 accent-emerald-600"
        />
        <label htmlFor="consent" className="text-sm t-soft">
          {t('enroll.consent')} <span className="text-red-500">*</span>
        </label>
      </div>

      {error && (
        <div className="text-sm text-red-700 dark:text-red-300 rounded-xl neu-inset px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button className="btn-primary px-5 py-2.5" disabled={busy}>
          {busy ? '…' : (
            <>
              {t('enroll.submit')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="ml-1.5">
                <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Section({ title, icon, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 grid place-items-center">
          <SectionIcon name={icon} />
        </span>
        <h3 className="text-xs font-bold t-ink uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function SectionIcon({ name }) {
  const c = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'user': return <svg {...c}><circle cx="12" cy="7" r="4" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" /></svg>;
    case 'map': return <svg {...c}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
    case 'health': return <svg {...c}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
    default: return null;
  }
}

function Field({ label, required, wide, children }) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="label flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-red-500" aria-hidden>*</span>}
      </label>
      {children}
    </div>
  );
}
