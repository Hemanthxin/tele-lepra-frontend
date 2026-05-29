import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, uploadImage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const CHRONIC = ['Diabetes', 'Hypertension', 'TB', 'HIV', 'Pregnancy', 'None'];
const STEPS = [
  { key: 'about', label: 'About you' },
  { key: 'history', label: 'Health history' },
  { key: 'symptoms', label: 'Symptoms' },
];

export default function Onboarding() {
  const { profile } = useAuth();
  const nav = useNavigate();

  const [step, setStep] = useState('about');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [about, setAbout] = useState({
    name: profile?.name || '',
    age: '',
    sex: 'male',
    phone: '',
    location: '',
    abha_id: '',
    consent_given: false,
  });
  const [chronic, setChronic] = useState([]);
  const [symptoms, setSymptoms] = useState({
    has_skin_patches: false,
    patch_count: 0,
    duration_weeks: 0,
    numb_or_tingling_in_hands_or_feet: false,
    weakness_in_hands_or_feet: false,
    family_history: false,
    image_urls: [],
    notes: '',
  });

  const toggleChronic = (c) =>
    setChronic((arr) => (arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c]));

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const { url } = await uploadImage(f);
      setSymptoms((s) => ({ ...s, image_urls: [...s.image_urls, url] }));
    }
  };

  const aboutValid =
    about.name.trim() && about.phone.trim() && about.location.trim() && about.consent_given;

  const goNext = () => {
    setError(null);
    if (step === 'about') {
      if (!aboutValid) {
        setError('Please fill name, phone, location and tick the consent box.');
        return;
      }
      setStep('history');
    } else if (step === 'history') {
      setStep('symptoms');
    }
  };

  const goBack = () => {
    setError(null);
    if (step === 'history') setStep('about');
    else if (step === 'symptoms') setStep('history');
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/patients/self-enroll', {
        method: 'POST',
        body: JSON.stringify({
          ...about,
          chronic_conditions: chronic,
          symptoms,
        }),
      });
      nav('/patient');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="section-title">Patient enrollment</div>
        <h1 className="text-2xl font-semibold tracking-tight t-ink">Welcome — let's get to know you</h1>
        <p className="text-sm t-muted mt-1">
          Answer a few quick questions so a health worker can help you.
        </p>
      </div>

      <ol className="flex items-center gap-2 mb-5">
        {STEPS.map((s, i) => {
          const active = s.key === step;
          const done = stepIndex > i;
          return (
            <li key={s.key} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap border ${
                  active
                    ? 'border-brand-600 text-brand-700 bg-brand-50'
                    : done
                      ? 'border-[color:var(--border)] text-brand-700 bg-brand-50'
                      : 'border-[color:var(--border)] t-muted bg-[color:var(--surface)]'
                }`}
              >
                <span className="font-mono">{i + 1}</span>
                <span>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <span className="h-px flex-1 bg-[color:var(--border)]" />
              )}
            </li>
          );
        })}
      </ol>

      {step === 'about' && (
        <section className="card-elev">
          <div className="mb-4">
            <div className="section-title">Step 1</div>
            <h2 className="text-lg font-semibold t-ink">About you</h2>
            <p className="text-xs t-muted mt-1">Demographics and consent. ABHA optional.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Full name">
              <input className="neu-input" value={about.name} onChange={(e) => setAbout({ ...about, name: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="neu-input" value={about.phone} onChange={(e) => setAbout({ ...about, phone: e.target.value })} />
            </Field>
            <Field label="Age">
              <input type="number" min={0} max={120} required className="neu-input" value={about.age} onChange={(e) => setAbout({ ...about, age: e.target.value === '' ? '' : +e.target.value })} />
            </Field>
            <Field label="Sex">
              <select className="neu-input" value={about.sex} onChange={(e) => setAbout({ ...about, sex: e.target.value })}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Location (village / mandal / district)" wide>
              <input className="neu-input" value={about.location} onChange={(e) => setAbout({ ...about, location: e.target.value })} />
            </Field>
            <Field label="ABHA ID (optional)">
              <input className="neu-input" value={about.abha_id} onChange={(e) => setAbout({ ...about, abha_id: e.target.value })} />
            </Field>
            <div className="md:col-span-2 flex items-start gap-2 mt-2">
              <input
                id="consent"
                type="checkbox"
                checked={about.consent_given}
                onChange={(e) => setAbout({ ...about, consent_given: e.target.checked })}
                className="mt-1"
              />
              <label htmlFor="consent" className="text-sm t-soft">
                I give informed consent for tele-consultation and storage of my health data.
              </label>
            </div>
          </div>
        </section>
      )}

      {step === 'history' && (
        <section className="card-elev">
          <div className="mb-4">
            <div className="section-title">Step 2</div>
            <h2 className="text-lg font-semibold t-ink">Health history</h2>
            <p className="text-xs t-muted mt-1">Existing conditions and past treatment.</p>
          </div>
          <label className="label">Chronic conditions (select all that apply)</label>
          <div className="flex flex-wrap gap-2">
            {CHRONIC.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => toggleChronic(c)}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  chronic.includes(c)
                    ? 'bg-brand-50 text-brand-700 border-brand-600'
                    : 'bg-[color:var(--surface)] t-soft border-[color:var(--border)] hover:border-[color:var(--border-strong)]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'symptoms' && (
        <section className="card-elev space-y-4">
          <div>
            <div className="section-title">Step 3</div>
            <h2 className="text-lg font-semibold t-ink">Symptoms</h2>
            <p className="text-xs t-muted mt-1">
              Tell us what you're experiencing. A trained health worker will follow up.
            </p>
          </div>

          <YesNo
            label="Do you have skin patches (lighter or darker than surrounding skin)?"
            value={symptoms.has_skin_patches}
            onChange={(v) => setSymptoms({ ...symptoms, has_skin_patches: v })}
          />

          {symptoms.has_skin_patches && (
            <NumberField
              label="Roughly how many patches?"
              value={symptoms.patch_count}
              onChange={(v) => setSymptoms({ ...symptoms, patch_count: v })}
            />
          )}

          <NumberField
            label="How many weeks have you had these symptoms?"
            value={symptoms.duration_weeks}
            onChange={(v) => setSymptoms({ ...symptoms, duration_weeks: v })}
          />

          <YesNo
            label="Numbness or tingling in your hands or feet?"
            value={symptoms.numb_or_tingling_in_hands_or_feet}
            onChange={(v) => setSymptoms({ ...symptoms, numb_or_tingling_in_hands_or_feet: v })}
          />

          <YesNo
            label="Weakness in your hands or feet?"
            value={symptoms.weakness_in_hands_or_feet}
            onChange={(v) => setSymptoms({ ...symptoms, weakness_in_hands_or_feet: v })}
          />

          <YesNo
            label="Any family member with leprosy?"
            value={symptoms.family_history}
            onChange={(v) => setSymptoms({ ...symptoms, family_history: v })}
          />

          <div>
            <label className="label">Photos of skin patches (optional)</label>
            <input type="file" multiple accept="image/*" capture="environment" onChange={handleUpload} />
            <div className="flex flex-wrap gap-2 mt-2">
              {symptoms.image_urls.map((u, i) => (
                <img key={i} src={u} alt="" className="w-20 h-20 object-cover rounded-md border border-[color:var(--border)]" />
              ))}
            </div>
          </div>

          <div>
            <label className="label">Anything else you'd like the doctor to know?</label>
            <textarea
              className="neu-input"
              rows={3}
              value={symptoms.notes}
              onChange={(e) => setSymptoms({ ...symptoms, notes: e.target.value })}
              placeholder="e.g. itching at night, previous treatment, when symptoms started…"
            />
          </div>
        </section>
      )}

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="flex justify-between mt-5">
        <button
          className="btn-ghost"
          disabled={step === 'about' || busy}
          onClick={goBack}
        >
          Back
        </button>
        {step !== 'symptoms' ? (
          <button className="btn-primary" onClick={goNext} disabled={busy}>
            Continue
          </button>
        ) : (
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Submitting…' : 'Submit'}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, wide, children }) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function YesNo({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        {[
          ['Yes', true],
          ['No', false],
        ].map(([l, v]) => (
          <button
            key={l}
            type="button"
            onClick={() => onChange(v)}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              value === v
                ? 'bg-brand-50 text-brand-700 border-brand-600'
                : 'bg-[color:var(--surface)] t-soft border-[color:var(--border)] hover:border-[color:var(--border-strong)]'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        min={0}
        className="neu-input max-w-xs"
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </div>
  );
}
