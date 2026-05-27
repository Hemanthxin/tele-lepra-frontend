import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, uploadImage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const CHRONIC = ['Diabetes', 'Hypertension', 'TB', 'HIV', 'Pregnancy', 'None'];
const STEPS = [
  { key: 'about', label: '1. About you' },
  { key: 'history', label: '2. Health history' },
  { key: 'symptoms', label: '3. Symptoms' },
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

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Welcome — let's get to know you</h1>
      <p className="text-sm text-slate-500 mb-4">
        Answer a few quick questions so an agent can help you.
      </p>

      <ol className="flex gap-2 mb-6 overflow-x-auto">
        {STEPS.map((s, i) => {
          const active = s.key === step;
          const done = STEPS.findIndex((x) => x.key === step) > i;
          return (
            <li
              key={s.key}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap
                ${active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
            >
              {s.label}
            </li>
          );
        })}
      </ol>

      {step === 'about' && (
        <div className="card grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <h2 className="font-semibold">Step 1 · About you</h2>
            <p className="text-xs text-slate-500">Demographics + consent. ABHA optional.</p>
          </div>
          <Field label="Full name">
            <input className="input" value={about.name} onChange={(e) => setAbout({ ...about, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="input" value={about.phone} onChange={(e) => setAbout({ ...about, phone: e.target.value })} />
          </Field>
          <Field label="Age">
            <input type="number" min={0} max={120} required className="input" value={about.age} onChange={(e) => setAbout({ ...about, age: e.target.value === '' ? '' : +e.target.value })} />
          </Field>
          <Field label="Sex">
            <select className="input" value={about.sex} onChange={(e) => setAbout({ ...about, sex: e.target.value })}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Location (village / mandal / district)" wide>
            <input className="input" value={about.location} onChange={(e) => setAbout({ ...about, location: e.target.value })} />
          </Field>
          <Field label="ABHA ID (optional)">
            <input className="input" value={about.abha_id} onChange={(e) => setAbout({ ...about, abha_id: e.target.value })} />
          </Field>
          <div className="md:col-span-2 flex items-start gap-2 mt-1">
            <input
              id="consent"
              type="checkbox"
              checked={about.consent_given}
              onChange={(e) => setAbout({ ...about, consent_given: e.target.checked })}
              className="mt-1"
            />
            <label htmlFor="consent" className="text-sm">
              I give informed consent for tele-consultation and storage of my health data.
            </label>
          </div>
        </div>
      )}

      {step === 'history' && (
        <div className="card space-y-4">
          <div>
            <h2 className="font-semibold">Step 2 · Health history</h2>
            <p className="text-xs text-slate-500">Existing conditions and past treatment.</p>
          </div>
          <div>
            <label className="label">Chronic conditions (select all that apply)</label>
            <div className="flex flex-wrap gap-2">
              {CHRONIC.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => toggleChronic(c)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    chronic.includes(c)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'symptoms' && (
        <div className="card space-y-4">
          <div>
            <h2 className="font-semibold">Step 3 · Symptoms</h2>
            <p className="text-xs text-slate-500">
              Tell us what you're experiencing. A trained agent will follow up.
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
                <img key={i} src={u} alt="" className="w-20 h-20 object-cover rounded-md" />
              ))}
            </div>
          </div>

          <div>
            <label className="label">Anything else you'd like the doctor to know?</label>
            <textarea
              className="input"
              rows={3}
              value={symptoms.notes}
              onChange={(e) => setSymptoms({ ...symptoms, notes: e.target.value })}
              placeholder="e.g. itching at night, previous treatment, when symptoms started…"
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="flex justify-between mt-4">
        <button
          className="px-4 py-2 rounded-md text-sm bg-slate-100 text-slate-700 disabled:opacity-50"
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
            className={`px-3 py-1 rounded-md text-sm border ${
              value === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300'
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
        className="input max-w-xs"
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </div>
  );
}
