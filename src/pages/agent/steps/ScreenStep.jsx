import { useRef, useState } from 'react';
import { uploadImage } from '../../../lib/api';
import { useTranslation } from '../../../i18n/I18nContext';
import GeoCaptureButton from '../../../components/GeoCaptureButton';

// ---- Suspect diseases (SHAKTHI Active Screening form) ----
const DISEASES = [
  { key: 'leprosy', label: 'Leprosy' },
  { key: 'lymphatic_filariasis', label: 'Lymphatic Filariasis' },
  { key: 'tuberculosis', label: 'Tuberculosis' },
  { key: 'scabies', label: 'Scabies' },
  { key: 'japanese_encephalitis', label: 'Japanese Encephalitis' },
  { key: 'malaria', label: 'Malaria' },
  { key: 'sickle_cell', label: 'Sickle Cell Disease' },
];

const LEPROSY_CHECKLIST = [
  { key: 'skin_patches', label: 'Light-colored or reddish skin patch(es)' },
  { key: 'patch_loss_of_sensation', label: 'Reduced or loss of sensation over skin patch(es)' },
  { key: 'numb_tingling_burning', label: 'Tingling, numbness, or burning sensation in hands/feet' },
  { key: 'weakness_in_hands_or_feet', label: 'Weakness in hands or feet' },
  { key: 'weak_grip', label: 'Weak grip or objects slipping from hands' },
  { key: 'painless_wounds', label: 'Painless wounds, burns, or ulcers on hands/feet' },
  { key: 'nerve_tenderness', label: 'Pain or tenderness near elbow, wrist, knee, or ankle' },
  { key: 'foot_drop', label: 'Foot slipping out of slippers/chappals or dragging while walking' },
  { key: 'eye_closure_difficulty', label: 'Difficulty closing eyes completely or reduced blinking' },
  { key: 'eyebrow_loss_nasal_collapse', label: 'Loss of eyebrows, collapsed nose' },
  { key: 'nodules_or_earlobe_swelling', label: 'Lumps/nodules on skin or swelling of earlobes' },
];

// Per-disease default sub-form state.
const DEFAULTS = {
  leprosy: {
    has_skin_patches: false, patch_count: 0, patch_loss_of_sensation: false,
    enlarged_nerves: false, weakness_in_hands_or_feet: false,
    glove_stocking_anesthesia: false, family_history: false,
    duration_weeks: 0, duration_months: 0, symptoms_checklist: [],
  },
  lymphatic_filariasis: {
    history_of_mda: null, affected_body_parts: [], lymphedema_grade: null,
    entry_lesions: null, acute_attacks: null, eva_footwear: null,
    self_care_kit: null, swelling_limb_or_genitals: null,
  },
  tuberculosis: {
    status_of_case: '', type_of_tb: '', nikshay_id: '',
    cough_2_weeks_or_more: null, fever_evening_rise: null, weight_loss: null,
    night_sweats: null, blood_in_sputum: null,
  },
  scabies: {
    status_of_case: '', affected_body_parts: [], skin_burrows: null,
    itching_worse_at_night: null, household_members_affected: null,
  },
  japanese_encephalitis: {
    status_of_case: '', history_of_vaccination: null,
    fever_with_altered_consciousness: null, seizures: null,
    neck_stiffness_or_headache: null,
  },
  malaria: {
    status_of_case: '', pathogen_type: '', insecticidal_net: null,
    indoor_residual_spray: '', fever_with_chills_rigor: null, fever_periodic: null,
  },
  sickle_cell: {
    status_of_case: '', card_number: '', sickle_cell_type: '',
    recurrent_pain_episodes: null, anaemia_or_fatigue: null, jaundice: null,
  },
};

const FILARIASIS_PARTS = [
  ['right_hand', 'Right Hand'], ['right_leg', 'Right Leg'], ['right_breast', 'Right Breast'],
  ['right_scrotum', 'Right Scrotum'], ['left_hand', 'Left Hand'], ['left_leg', 'Left Leg'],
  ['left_breast', 'Left Breast'], ['left_scrotum', 'Left Scrotum'],
];
const SCABIES_PARTS = [
  ['hands', 'Hands'], ['groin', 'Groin'], ['genitalia', 'Genitalia'], ['buttocks', 'Buttocks'],
  ['axillae', 'Axillae'], ['breasts', 'Breasts'], ['torso', 'Torso'],
];
const TB_STATUS = [
  ['new_untreated', 'New Untreated'], ['under_treatment', 'Under treatment'],
  ['already_treated', 'Already treated'], ['defaulter', 'Defaulter'],
  ['retreatment', 'Retreatment'], ['relapse', 'Relapse'], ['drug_resistant', 'Drug Resistant'],
];

function YesNo({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="inline-flex rounded-md border border-[color:var(--border)] overflow-hidden">
      {[{ v: true, label: t('common.yes') }, { v: false, label: t('common.no') }].map(({ v, label }, idx) => {
        const selected = value === v;
        return (
          <button
            key={String(v)} type="button" onClick={() => onChange(v)}
            className={(selected ? 'bg-brand-600 text-white' : 'bg-[color:var(--surface)] t-soft hover:bg-[color:var(--surface-2)]')
              + ' px-4 py-1.5 text-sm font-medium' + (idx === 0 ? ' border-r border-[color:var(--border)]' : '')}
          >{label}</button>
        );
      })}
    </div>
  );
}

function NumberInput({ value, onChange, max = 999, min = 0, suffix }) {
  return (
    <div className="inline-flex items-center border border-[color:var(--border)] rounded-md overflow-hidden bg-[color:var(--surface)]">
      <button type="button" tabIndex={-1} onClick={() => onChange(Math.max(min, (value || 0) - 1))}
        className="w-8 h-8 grid place-items-center t-soft hover:bg-[color:var(--surface-2)] border-r border-[color:var(--border)]">−</button>
      <input type="number" min={min} max={max} value={value ?? 0} onChange={(e) => onChange(+e.target.value)}
        className="w-16 bg-transparent text-center text-sm font-medium t-ink outline-none" />
      <button type="button" tabIndex={-1} onClick={() => onChange(Math.min(max, (value || 0) + 1))}
        className="w-8 h-8 grid place-items-center t-soft hover:bg-[color:var(--surface-2)] border-l border-[color:var(--border)]">+</button>
      {suffix && <span className="text-xs t-muted ml-2 mr-2">{suffix}</span>}
    </div>
  );
}

function Select({ value, onChange, options, placeholder = 'Select…' }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}
      className="neu-input !py-1.5 text-sm max-w-[14rem]">
      <option value="">{placeholder}</option>
      {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  );
}

function Chips({ value, onToggle, options }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([key, label]) => {
        const on = value.includes(key);
        return (
          <button key={key} type="button" onClick={() => onToggle(key)}
            className={on
              ? 'px-2.5 py-1 rounded-md border text-xs font-medium bg-brand-50 text-brand-700 border-brand-300'
              : 'px-2.5 py-1 rounded-md border text-xs bg-[color:var(--surface)] t-soft border-[color:var(--border)] hover:border-[color:var(--border-strong)]'}
          >{on ? '☑ ' : '☐ '}{label}</button>
        );
      })}
    </div>
  );
}

function QuestionRow({ label, hint, required, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium t-ink">{label}{required && <span className="text-red-600 ml-0.5">*</span>}</div>
        {hint && <div className="text-xs t-muted mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SubForm({ title, children }) {
  return (
    <div className="border border-[color:var(--border)] rounded-md mt-4 overflow-hidden">
      <div className="bg-[color:var(--surface-2)] px-4 py-2 border-b border-[color:var(--border)]">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">{title}</span>
      </div>
      <div className="divide-y divide-[color:var(--border)]">{children}</div>
    </div>
  );
}

export default function ScreenStep({ onDone, initial, busy: parentBusy }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [s, setS] = useState({
    suspected_diseases: [],
    leprosy: { ...DEFAULTS.leprosy },
    lymphatic_filariasis: { ...DEFAULTS.lymphatic_filariasis },
    tuberculosis: { ...DEFAULTS.tuberculosis },
    scabies: { ...DEFAULTS.scabies },
    japanese_encephalitis: { ...DEFAULTS.japanese_encephalitis },
    malaria: { ...DEFAULTS.malaria },
    sickle_cell: { ...DEFAULTS.sickle_cell },
    image_urls: [], image_blobs: [], lab_urls: [], lab_blobs: [],
    notes: '', screened_at: '', geolocation: null,
    ...(initial || {}),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submitBusy = busy || parentBusy;

  const suspected = s.suspected_diseases;
  const has = (d) => suspected.includes(d);
  const setShared = (k, v) => setS((cur) => ({ ...cur, [k]: v }));
  const setField = (disease, k, v) =>
    setS((cur) => ({ ...cur, [disease]: { ...cur[disease], [k]: v } }));
  const toggleDisease = (d) =>
    setS((cur) => ({
      ...cur,
      suspected_diseases: cur.suspected_diseases.includes(d)
        ? cur.suspected_diseases.filter((x) => x !== d)
        : [...cur.suspected_diseases, d],
    }));
  const toggleArr = (disease, key, val) =>
    setS((cur) => {
      const arr = cur[disease][key] || [];
      return { ...cur, [disease]: { ...cur[disease], [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] } };
    });
  const toggleSymptom = (key) =>
    setS((cur) => {
      const arr = cur.leprosy.symptoms_checklist;
      return { ...cur, leprosy: { ...cur.leprosy, symptoms_checklist: arr.includes(key) ? arr.filter((x) => x !== key) : [...arr, key] } };
    });

  const uploadInto = (field, blobField, fallbackName) => async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      try {
        const { url } = await uploadImage(f);
        setS((cur) => ({ ...cur, [field]: [...cur[field], url] }));
      } catch (err) {
        if (err.offline) {
          const localUrl = URL.createObjectURL(f);
          const id = crypto.randomUUID();
          setS((cur) => ({ ...cur, [blobField]: [...cur[blobField], { id, blob: f, filename: f.name || fallbackName, localUrl }] }));
        } else { throw err; }
      }
    }
  };
  const handleUpload = uploadInto('image_urls', 'image_blobs', 'image.jpg');
  const handleLabUpload = uploadInto('lab_urls', 'lab_blobs', 'lab.jpg');
  const removeAt = (field, idx) => setS((cur) => ({ ...cur, [field]: cur[field].filter((_, i) => i !== idx) }));
  const removeBlob = (field, id) => setS((cur) => ({ ...cur, [field]: cur[field].filter((b) => b.id !== id) }));

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    if (suspected.length === 0) {
      setError('Select at least one suspected disease.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        suspected_diseases: suspected,
        screened_at: s.screened_at ? new Date(s.screened_at).toISOString() : new Date().toISOString(),
        geolocation: s.geolocation,
        image_urls: s.image_urls, image_blobs: s.image_blobs,
        lab_urls: s.lab_urls, lab_blobs: s.lab_blobs,
        notes: s.notes,
      };
      if (has('leprosy')) {
        const lep = s.leprosy;
        payload.leprosy = {
          ...lep,
          duration_weeks: lep.duration_months > 0 ? Math.max(lep.duration_weeks, lep.duration_months * 4) : lep.duration_weeks,
        };
      }
      for (const d of ['lymphatic_filariasis', 'tuberculosis', 'scabies', 'japanese_encephalitis', 'malaria', 'sickle_cell']) {
        if (has(d)) payload[d] = s[d];
      }
      onDone(payload, s);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card-elev">
      <header className="mb-5">
        <h2 className="text-lg font-semibold t-ink">{t('screen.title')}</h2>
        <p className="text-sm t-muted mt-1">{t('screen.subtitle')}</p>
      </header>

      {/* Screening context */}
      <section>
        <div className="section-title mb-3">Screening Context</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium t-soft mb-1.5">Date of screening</label>
            <input type="datetime-local" className="neu-input" value={s.screened_at} onChange={(e) => setShared('screened_at', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium t-soft mb-1.5">Location (GPS)</label>
            <GeoCaptureButton value={s.geolocation} onCapture={(g) => setShared('geolocation', g)} />
          </div>
        </div>
      </section>

      {/* Suspected disease selection */}
      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-1">Suspected disease(s) <span className="text-red-600">*</span></div>
        <p className="text-xs t-muted mb-3">Tick every condition you suspect. A symptomatic form appears below for each.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DISEASES.map((d) => {
            const on = has(d.key);
            return (
              <button key={d.key} type="button" onClick={() => toggleDisease(d.key)}
                className={on
                  ? 'text-left px-3 py-2.5 rounded-md border text-sm font-medium bg-brand-50 text-brand-700 border-brand-300'
                  : 'text-left px-3 py-2.5 rounded-md border text-sm bg-[color:var(--surface)] t-soft border-[color:var(--border)] hover:border-[color:var(--border-strong)]'}>
                <span className="flex items-center gap-2"><span>{on ? '☑' : '☐'}</span><span>{d.label}</span></span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Per-disease symptomatic forms */}
      {has('leprosy') && (
        <section className="border-t border-[color:var(--border)] pt-5 mt-5">
          <div className="section-title mb-3">Leprosy — clinical screening</div>
          <SubForm title="Cardinal signs (Y/N)">
            <QuestionRow label={t('screen.has_patches')} required>
              <YesNo value={s.leprosy.has_skin_patches} onChange={(v) => setField('leprosy', 'has_skin_patches', v)} />
            </QuestionRow>
            {s.leprosy.has_skin_patches && (
              <>
                <QuestionRow label={t('screen.patch_count')} required>
                  <NumberInput value={s.leprosy.patch_count} onChange={(v) => setField('leprosy', 'patch_count', v)} max={50} />
                </QuestionRow>
                <QuestionRow label={t('screen.patch_los')} hint={t('screen.patch_los_hint')} required>
                  <YesNo value={s.leprosy.patch_loss_of_sensation} onChange={(v) => setField('leprosy', 'patch_loss_of_sensation', v)} />
                </QuestionRow>
              </>
            )}
            <QuestionRow label={t('screen.nerves')} required>
              <YesNo value={s.leprosy.enlarged_nerves} onChange={(v) => setField('leprosy', 'enlarged_nerves', v)} />
            </QuestionRow>
            <QuestionRow label={t('screen.weakness')} required>
              <YesNo value={s.leprosy.weakness_in_hands_or_feet} onChange={(v) => setField('leprosy', 'weakness_in_hands_or_feet', v)} />
            </QuestionRow>
            <QuestionRow label={t('screen.glove')} required>
              <YesNo value={s.leprosy.glove_stocking_anesthesia} onChange={(v) => setField('leprosy', 'glove_stocking_anesthesia', v)} />
            </QuestionRow>
            <QuestionRow label={t('screen.family')}>
              <YesNo value={s.leprosy.family_history} onChange={(v) => setField('leprosy', 'family_history', v)} />
            </QuestionRow>
            <QuestionRow label="Duration of symptoms">
              <NumberInput value={s.leprosy.duration_months} onChange={(v) => setField('leprosy', 'duration_months', v)} max={120} suffix="months" />
            </QuestionRow>
          </SubForm>

          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wider t-muted mb-2">Symptoms checklist</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LEPROSY_CHECKLIST.map((sym) => {
                const sel = s.leprosy.symptoms_checklist.includes(sym.key);
                return (
                  <button key={sym.key} type="button" onClick={() => toggleSymptom(sym.key)}
                    className={sel
                      ? 'text-left px-3 py-2.5 rounded-md border text-sm font-medium bg-brand-50 text-brand-700 border-brand-300'
                      : 'text-left px-3 py-2.5 rounded-md border text-sm bg-[color:var(--surface)] t-soft border-[color:var(--border)] hover:border-[color:var(--border-strong)]'}>
                    <span className="flex items-start gap-2"><span className={sel ? 'text-brand-700 mt-0.5' : 't-muted mt-0.5'}>{sel ? '☑' : '☐'}</span><span className="flex-1">{sym.label}</span></span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {has('lymphatic_filariasis') && (
        <section className="border-t border-[color:var(--border)] pt-5 mt-5">
          <div className="section-title mb-1">Lymphatic Filariasis</div>
          <SubForm title="Symptomatic form">
            <QuestionRow label="Swelling of limb or genitals?"><YesNo value={s.lymphatic_filariasis.swelling_limb_or_genitals} onChange={(v) => setField('lymphatic_filariasis', 'swelling_limb_or_genitals', v)} /></QuestionRow>
            <QuestionRow label="Recurrent acute attacks?"><YesNo value={s.lymphatic_filariasis.acute_attacks} onChange={(v) => setField('lymphatic_filariasis', 'acute_attacks', v)} /></QuestionRow>
            <QuestionRow label="Entry lesions present?"><YesNo value={s.lymphatic_filariasis.entry_lesions} onChange={(v) => setField('lymphatic_filariasis', 'entry_lesions', v)} /></QuestionRow>
            <QuestionRow label="Lymphedema grade"><NumberInput value={s.lymphatic_filariasis.lymphedema_grade || 0} min={0} max={4} onChange={(v) => setField('lymphatic_filariasis', 'lymphedema_grade', v || null)} /></QuestionRow>
            <QuestionRow label="History of Mass Drug Administration?"><YesNo value={s.lymphatic_filariasis.history_of_mda} onChange={(v) => setField('lymphatic_filariasis', 'history_of_mda', v)} /></QuestionRow>
            <QuestionRow label="Affected body part(s)"><Chips value={s.lymphatic_filariasis.affected_body_parts} onToggle={(k) => toggleArr('lymphatic_filariasis', 'affected_body_parts', k)} options={FILARIASIS_PARTS} /></QuestionRow>
            <QuestionRow label="EVA footwear available?"><YesNo value={s.lymphatic_filariasis.eva_footwear} onChange={(v) => setField('lymphatic_filariasis', 'eva_footwear', v)} /></QuestionRow>
            <QuestionRow label="Self-care kit available?"><YesNo value={s.lymphatic_filariasis.self_care_kit} onChange={(v) => setField('lymphatic_filariasis', 'self_care_kit', v)} /></QuestionRow>
          </SubForm>
        </section>
      )}

      {has('tuberculosis') && (
        <section className="border-t border-[color:var(--border)] pt-5 mt-5">
          <div className="section-title mb-1">Tuberculosis</div>
          <SubForm title="Symptomatic form">
            <QuestionRow label="Cough for 2 weeks or more?"><YesNo value={s.tuberculosis.cough_2_weeks_or_more} onChange={(v) => setField('tuberculosis', 'cough_2_weeks_or_more', v)} /></QuestionRow>
            <QuestionRow label="Blood in sputum?"><YesNo value={s.tuberculosis.blood_in_sputum} onChange={(v) => setField('tuberculosis', 'blood_in_sputum', v)} /></QuestionRow>
            <QuestionRow label="Evening-rise fever?"><YesNo value={s.tuberculosis.fever_evening_rise} onChange={(v) => setField('tuberculosis', 'fever_evening_rise', v)} /></QuestionRow>
            <QuestionRow label="Significant weight loss?"><YesNo value={s.tuberculosis.weight_loss} onChange={(v) => setField('tuberculosis', 'weight_loss', v)} /></QuestionRow>
            <QuestionRow label="Night sweats?"><YesNo value={s.tuberculosis.night_sweats} onChange={(v) => setField('tuberculosis', 'night_sweats', v)} /></QuestionRow>
            <QuestionRow label="Status of case"><Select value={s.tuberculosis.status_of_case} onChange={(v) => setField('tuberculosis', 'status_of_case', v)} options={TB_STATUS} /></QuestionRow>
            <QuestionRow label="Type of TB"><Select value={s.tuberculosis.type_of_tb} onChange={(v) => setField('tuberculosis', 'type_of_tb', v)} options={[['pulmonary', 'Pulmonary'], ['extra_pulmonary', 'Extra-pulmonary']]} /></QuestionRow>
            <QuestionRow label="Nikshay ID">
              <input className="neu-input !py-1.5 text-sm max-w-[14rem]" value={s.tuberculosis.nikshay_id} onChange={(e) => setField('tuberculosis', 'nikshay_id', e.target.value)} placeholder="Optional" />
            </QuestionRow>
          </SubForm>
        </section>
      )}

      {has('scabies') && (
        <section className="border-t border-[color:var(--border)] pt-5 mt-5">
          <div className="section-title mb-1">Scabies</div>
          <SubForm title="Symptomatic form">
            <QuestionRow label="Itching worse at night?"><YesNo value={s.scabies.itching_worse_at_night} onChange={(v) => setField('scabies', 'itching_worse_at_night', v)} /></QuestionRow>
            <QuestionRow label="Other household members affected?"><YesNo value={s.scabies.household_members_affected} onChange={(v) => setField('scabies', 'household_members_affected', v)} /></QuestionRow>
            <QuestionRow label="Skin burrows seen?"><YesNo value={s.scabies.skin_burrows} onChange={(v) => setField('scabies', 'skin_burrows', v)} /></QuestionRow>
            <QuestionRow label="Affected body part(s)"><Chips value={s.scabies.affected_body_parts} onToggle={(k) => toggleArr('scabies', 'affected_body_parts', k)} options={SCABIES_PARTS} /></QuestionRow>
            <QuestionRow label="Status of case"><Select value={s.scabies.status_of_case} onChange={(v) => setField('scabies', 'status_of_case', v)} options={[['new_untreated', 'New Untreated'], ['under_treatment', 'Under treatment'], ['already_treated', 'Already treated']]} /></QuestionRow>
          </SubForm>
        </section>
      )}

      {has('japanese_encephalitis') && (
        <section className="border-t border-[color:var(--border)] pt-5 mt-5">
          <div className="section-title mb-1">Japanese Encephalitis</div>
          <SubForm title="Symptomatic form">
            <QuestionRow label="Fever with altered consciousness?" hint="Acute emergency — escalate."><YesNo value={s.japanese_encephalitis.fever_with_altered_consciousness} onChange={(v) => setField('japanese_encephalitis', 'fever_with_altered_consciousness', v)} /></QuestionRow>
            <QuestionRow label="Seizures?"><YesNo value={s.japanese_encephalitis.seizures} onChange={(v) => setField('japanese_encephalitis', 'seizures', v)} /></QuestionRow>
            <QuestionRow label="Neck stiffness / severe headache?"><YesNo value={s.japanese_encephalitis.neck_stiffness_or_headache} onChange={(v) => setField('japanese_encephalitis', 'neck_stiffness_or_headache', v)} /></QuestionRow>
            <QuestionRow label="History of vaccination?"><YesNo value={s.japanese_encephalitis.history_of_vaccination} onChange={(v) => setField('japanese_encephalitis', 'history_of_vaccination', v)} /></QuestionRow>
            <QuestionRow label="Status of case"><Select value={s.japanese_encephalitis.status_of_case} onChange={(v) => setField('japanese_encephalitis', 'status_of_case', v)} options={[['new_untreated', 'New Untreated'], ['under_treatment', 'Under Treatment']]} /></QuestionRow>
          </SubForm>
        </section>
      )}

      {has('malaria') && (
        <section className="border-t border-[color:var(--border)] pt-5 mt-5">
          <div className="section-title mb-1">Malaria</div>
          <SubForm title="Symptomatic form">
            <QuestionRow label="Fever with chills / rigor?"><YesNo value={s.malaria.fever_with_chills_rigor} onChange={(v) => setField('malaria', 'fever_with_chills_rigor', v)} /></QuestionRow>
            <QuestionRow label="Periodic fever pattern?"><YesNo value={s.malaria.fever_periodic} onChange={(v) => setField('malaria', 'fever_periodic', v)} /></QuestionRow>
            <QuestionRow label="Pathogen type"><Select value={s.malaria.pathogen_type} onChange={(v) => setField('malaria', 'pathogen_type', v)} options={[['falciparum', 'Falciparum'], ['vivax', 'Vivax'], ['mixed', 'Mixed']]} /></QuestionRow>
            <QuestionRow label="Insecticidal net available?"><YesNo value={s.malaria.insecticidal_net} onChange={(v) => setField('malaria', 'insecticidal_net', v)} /></QuestionRow>
            <QuestionRow label="Indoor residual spray done?"><Select value={s.malaria.indoor_residual_spray} onChange={(v) => setField('malaria', 'indoor_residual_spray', v)} options={[['yes', 'Yes'], ['no', 'No'], ['dont_know', "Don't know"]]} /></QuestionRow>
            <QuestionRow label="Status of case"><Select value={s.malaria.status_of_case} onChange={(v) => setField('malaria', 'status_of_case', v)} options={[['new_untreated', 'New Untreated'], ['under_treatment', 'Under treatment'], ['already_treated', 'Already treated']]} /></QuestionRow>
          </SubForm>
        </section>
      )}

      {has('sickle_cell') && (
        <section className="border-t border-[color:var(--border)] pt-5 mt-5">
          <div className="section-title mb-1">Sickle Cell Disease</div>
          <SubForm title="Symptomatic form">
            <QuestionRow label="Recurrent pain episodes?"><YesNo value={s.sickle_cell.recurrent_pain_episodes} onChange={(v) => setField('sickle_cell', 'recurrent_pain_episodes', v)} /></QuestionRow>
            <QuestionRow label="Anaemia / chronic fatigue?"><YesNo value={s.sickle_cell.anaemia_or_fatigue} onChange={(v) => setField('sickle_cell', 'anaemia_or_fatigue', v)} /></QuestionRow>
            <QuestionRow label="Jaundice?"><YesNo value={s.sickle_cell.jaundice} onChange={(v) => setField('sickle_cell', 'jaundice', v)} /></QuestionRow>
            <QuestionRow label="Sickle cell type"><Select value={s.sickle_cell.sickle_cell_type} onChange={(v) => setField('sickle_cell', 'sickle_cell_type', v)} options={[['trait', 'Trait / Carrier'], ['disease', 'Disease / Sufferer']]} /></QuestionRow>
            <QuestionRow label="Status of case"><Select value={s.sickle_cell.status_of_case} onChange={(v) => setField('sickle_cell', 'status_of_case', v)} options={[['new_untreated', 'New Untreated'], ['under_treatment', 'Under treatment']]} /></QuestionRow>
            <QuestionRow label="Sickle cell card number">
              <input className="neu-input !py-1.5 text-sm max-w-[14rem]" value={s.sickle_cell.card_number} onChange={(e) => setField('sickle_cell', 'card_number', e.target.value)} placeholder="Optional" />
            </QuestionRow>
          </SubForm>
        </section>
      )}

      {/* Images */}
      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">{t('screen.images')}</div>
        <div onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-[color:var(--border-strong)] rounded-md p-6 text-center cursor-pointer hover:bg-[color:var(--surface-2)]">
          <div className="w-10 h-10 rounded-md bg-brand-50 grid place-items-center mx-auto mb-2 text-brand-700"><UploadIcon /></div>
          <div className="text-sm font-medium t-ink">Click to upload or take photo</div>
          <div className="text-xs t-muted mt-0.5">PNG, JPG · up to 10MB each</div>
          <input ref={fileInputRef} type="file" multiple accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
        </div>
        <Thumbs urls={s.image_urls} blobs={s.image_blobs} onRemoveUrl={(i) => removeAt('image_urls', i)} onRemoveBlob={(id) => removeBlob('image_blobs', id)} />
      </section>

      {/* Lab investigations */}
      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">Lab investigations</div>
        <p className="text-xs t-muted mb-3">Upload prior lab reports (skin smear, biopsy, blood work) if available.</p>
        <input type="file" multiple accept="image/*" onChange={handleLabUpload} className="text-sm t-soft" />
        <Thumbs urls={s.lab_urls} blobs={s.lab_blobs} onRemoveUrl={(i) => removeAt('lab_urls', i)} onRemoveBlob={(id) => removeBlob('lab_blobs', id)} />
      </section>

      {/* Notes */}
      <section className="border-t border-[color:var(--border)] pt-5 mt-5">
        <div className="section-title mb-3">{t('screen.notes')}</div>
        <textarea className="neu-input" rows={3} value={s.notes} onChange={(e) => setShared('notes', e.target.value)} placeholder={t('screen.notes_ph')} />
      </section>

      {error && <div className="text-sm text-red-700 border border-red-200 bg-red-50 rounded-md px-3 py-2 mt-4">{error}</div>}

      <div className="flex justify-end mt-6">
        <button className="btn-primary" disabled={submitBusy}>{submitBusy ? '…' : t('screen.submit')}</button>
      </div>
    </form>
  );
}

function Thumbs({ urls, blobs, onRemoveUrl, onRemoveBlob }) {
  if (urls.length === 0 && blobs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {urls.map((u, i) => (
        <div key={`url-${i}`} className="relative group">
          <img src={u} alt="" className="w-24 h-24 object-cover rounded-md border border-[color:var(--border)]" />
          <RemoveBtn onClick={() => onRemoveUrl(i)} />
        </div>
      ))}
      {blobs.map((item) => (
        <div key={item.id} className="relative group">
          <img src={item.localUrl} alt="" className="w-24 h-24 object-cover rounded-md border border-amber-300" />
          <span className="absolute bottom-0 left-0 right-0 text-[9px] font-semibold text-center bg-amber-100/90 text-amber-800 py-0.5 rounded-b-md">Pending upload</span>
          <RemoveBtn onClick={() => onRemoveBlob(item.id)} />
        </div>
      ))}
    </div>
  );
}

function RemoveBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Remove"
      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white grid place-items-center text-xs opacity-0 group-hover:opacity-100">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
    </button>
  );
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
