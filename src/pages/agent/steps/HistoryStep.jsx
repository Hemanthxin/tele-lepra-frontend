import { useState } from 'react';
import { uploadImage } from '../../../lib/api';
import { useTranslation } from '../../../i18n/I18nContext';

const CHRONIC = ['Diabetes', 'Hypertension', 'TB', 'HIV', 'Pregnancy', 'None'];

export default function HistoryStep({ patient, onDone, initial }) {
  const { t } = useTranslation();
  const [chronic, setChronic] = useState(initial?.chronic_conditions || []);
  const [notes, setNotes] = useState(initial?.past_visits_notes || '');
  const [rxUrls, setRxUrls] = useState(initial?.prior_prescriptions_urls || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const toggleChronic = (c) =>
    setChronic((arr) => (arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c]));

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const { url } = await uploadImage(f);
      setRxUrls((u) => [...u, url]);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const draft = {
        chronic_conditions: chronic,
        prior_prescriptions_urls: rxUrls,
        prior_labs_urls: [],
        past_visits_notes: notes,
      };
      onDone(draft, draft);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4 anim-fade-up">
      <div>
        <h2 className="font-semibold t-ink">{t('history.title')}</h2>
        <p className="text-xs t-muted mt-0.5">
          {patient?.name} · {patient?.age}y · {patient?.sex}
        </p>
      </div>

      <div>
        <label className="label">{t('history.chronic')}</label>
        <div className="flex flex-wrap gap-2.5">
          {CHRONIC.map((c) => {
            const selected = chronic.includes(c);
            return (
              <button
                type="button"
                key={c}
                onClick={() => toggleChronic(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selected
                    ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-700/30 scale-[1.03]'
                    : 'neu-raised-sm t-soft hover:scale-[1.03] hover:text-brand-700 dark:hover:text-brand-300'
                }`}
              >
                {selected && <span className="mr-1">✓</span>}
                {t('chronic.' + c, c)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">{t('history.priorRx')}</label>
        <input type="file" multiple accept="image/*" onChange={handleUpload} className="text-sm t-soft" />
        {rxUrls.length > 0 && (
          <p className="text-xs t-muted mt-1">
            {t('history.files').replace('{n}', rxUrls.length)}
          </p>
        )}
      </div>

      <div>
        <label className="label">{t('history.notes')}</label>
        <textarea
          className="input"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('history.notes_ph')}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" disabled={busy}>
        {busy ? '…' : t('history.submit')}
      </button>
    </form>
  );
}
