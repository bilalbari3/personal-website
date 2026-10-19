import { useState } from 'react';
import { useStore } from '../state/AppState';
import type { GlucoseUnit, KetoneMethod, KetoneReading, UrineLevel } from '../types';
import { Button, Card, Field, LinkButton, PageHeader, Segmented, cx, inputClass } from '../components/ui';
import { ContactCareTeam, StatusPill } from '../components/KetoneStatus';
import { InfoIcon } from '../components/Icons';
import {
  computeGKI,
  formatGlucose,
  formatReading,
  METHOD_LABELS,
  readingStatus,
  STATUS_COPY,
  toMgDl,
  URINE_LABELS,
  URINE_LEVELS,
} from '../lib/ketones';
import { nowHHmm } from '../lib/dates';
import { useToast } from '../components/Toast';

const URINE_SWATCH: Record<UrineLevel, string> = {
  negative: '#efe6cf',
  trace: '#e8c9cf',
  small: '#d99bb0',
  moderate: '#b35b85',
  large: '#7a2a5c',
};

function parseNum(s: string) {
  const n = Number(s.replace(',', '.'));
  return s.trim() === '' || !Number.isFinite(n) ? undefined : n;
}

export function LogKetoneScreen() {
  const store = useStore();
  const { state, today } = store;
  const { settings } = state;
  const toast = useToast();

  const method = settings.ketoneMethod;
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(nowHHmm());
  const [bhb, setBhb] = useState('');
  const [glucose, setGlucose] = useState('');
  const [unit, setUnit] = useState<GlucoseUnit>(settings.glucoseUnit);
  const [ppm, setPpm] = useState('');
  const [urine, setUrine] = useState<UrineLevel | null>(null);
  const [saved, setSaved] = useState<KetoneReading | null>(null);
  const [touched, setTouched] = useState(false);

  const bhbN = parseNum(bhb);
  const gN = parseNum(glucose);
  const ppmN = parseNum(ppm);

  const bhbError = bhbN != null && (bhbN < 0 || bhbN > 10) ? 'Please check this number. Blood ketone meters read between 0 and about 8 mmol/L.' : null;
  const gRange = unit === 'mg/dL' ? [20, 600] : [1, 33];
  const gError = gN != null && (gN < gRange[0] || gN > gRange[1]) ? `Please check this number. It should be between ${gRange[0]} and ${gRange[1]} ${unit}.` : null;
  const ppmError = ppmN != null && (ppmN < 0 || ppmN > 200) ? 'Please check this number.' : null;

  const glucoseMgDl = gN != null && !gError ? toMgDl(gN, unit) : undefined;
  const gki = method === 'blood' && !bhbError ? computeGKI(glucoseMgDl, bhbN) : undefined;

  const canSave =
    method === 'blood' ? bhbN != null && !bhbError && !gError : method === 'breath' ? ppmN != null && !ppmError : urine != null;

  const save = () => {
    setTouched(true);
    if (!canSave) return;
    const r = store.addReading({
      date,
      time,
      method,
      ...(method === 'blood' && { bhb: bhbN, glucoseMgDl }),
      ...(method === 'breath' && { breathPpm: ppmN }),
      ...(method === 'urine' && { urine: urine! }),
    });
    setSaved(r);
    toast('Reading saved');
    window.scrollTo(0, 0);
  };

  if (saved) return <SavedReading reading={saved} onAnother={() => { setSaved(null); setBhb(''); setGlucose(''); setPpm(''); setUrine(null); setTouched(false); }} />;

  return (
    <div>
      <PageHeader title="Log ketones" subtitle="Enter the number from your meter or strip." back />

      <div className="space-y-5">
        <div>
          <p className="mb-2 font-semibold">How did you test?</p>
          <Segmented<KetoneMethod>
            label="Testing method"
            value={method}
            onChange={(m) => store.updateSettings({ ketoneMethod: m })}
            options={[
              { value: 'blood', label: 'Blood' },
              { value: 'breath', label: 'Breath' },
              { value: 'urine', label: 'Urine' },
            ]}
          />
          <p className="mt-1.5 text-sm text-ink-muted">Saved as your usual method. You can also change it in Settings.</p>
        </div>

        <Card>
          {method === 'blood' && (
            <div className="space-y-5">
              <Field
                label="Blood ketones (BHB)"
                htmlFor="bhb"
                hint={`Your target range: ${settings.ranges.blood.min.toFixed(1)}–${settings.ranges.blood.max.toFixed(1)} mmol/L`}
              >
                <div className="relative">
                  <input
                    id="bhb"
                    inputMode="decimal"
                    className={cx(inputClass, 'pr-20 text-xl font-semibold', (bhbError || (touched && bhbN == null)) && 'border-amber-500')}
                    placeholder="e.g. 1.6"
                    value={bhb}
                    onChange={(e) => setBhb(e.target.value)}
                    aria-invalid={!!bhbError}
                    aria-describedby={bhbError ? 'bhb-err' : undefined}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted">mmol/L</span>
                </div>
                {bhbError && <p id="bhb-err" className="text-sm font-medium text-amber-800">{bhbError}</p>}
                {touched && bhbN == null && <p className="text-sm font-medium text-amber-800">Please enter your ketone number.</p>}
              </Field>

              <div className="space-y-1.5">
                <div className="flex items-end justify-between gap-3">
                  <label htmlFor="glucose" className="font-semibold">
                    Blood glucose <span className="font-normal text-ink-muted">(optional)</span>
                  </label>
                  <Segmented<GlucoseUnit>
                    label="Glucose unit"
                    className="w-44"
                    value={unit}
                    onChange={setUnit}
                    options={[
                      { value: 'mg/dL', label: 'mg/dL' },
                      { value: 'mmol/L', label: 'mmol/L' },
                    ]}
                  />
                </div>
                <input
                  id="glucose"
                  inputMode="decimal"
                  className={cx(inputClass, 'text-xl font-semibold', gError && 'border-amber-500')}
                  placeholder={unit === 'mg/dL' ? 'e.g. 82' : 'e.g. 4.6'}
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                  aria-invalid={!!gError}
                />
                {gError && <p className="text-sm font-medium text-amber-800">{gError}</p>}
                <p className="text-sm text-ink-muted">If your meter checks glucose too, adding it lets the app work out your GKI.</p>
              </div>

              <div className="rounded-xl bg-brand-50 p-4" aria-live="polite">
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-800">Glucose-Ketone Index (GKI)</p>
                {gki != null ? (
                  <>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-brand-900">{gki.toFixed(1)}</p>
                    <p className="mt-1 text-sm text-brand-900">
                      {formatGlucose(glucoseMgDl!, 'mmol/L')} glucose ÷ {bhbN!.toFixed(1)} mmol/L ketones
                      {unit === 'mg/dL' && ` (${Math.round(glucoseMgDl!)} mg/dL ÷ 18 = ${(glucoseMgDl! / 18).toFixed(1)} mmol/L)`}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-brand-900">Enter both ketones and glucose to see your GKI.</p>
                )}
                <p className="mt-2 flex gap-1.5 text-sm text-brand-900">
                  <InfoIcon size={18} className="shrink-0" />
                  GKI shows glucose and ketones together. A lower number generally means deeper ketosis. Your care team will help you
                  understand what's right for you.
                </p>
              </div>
            </div>
          )}

          {method === 'breath' && (
            <Field
              label="Breath acetone"
              htmlFor="ppm"
              hint={`Your target range: ${settings.ranges.breath.min}–${settings.ranges.breath.max} ppm. Breath meters vary by brand, so compare readings from the same device.`}
            >
              <div className="relative">
                <input
                  id="ppm"
                  inputMode="decimal"
                  className={cx(inputClass, 'pr-16 text-xl font-semibold', ppmError && 'border-amber-500')}
                  placeholder="e.g. 12"
                  value={ppm}
                  onChange={(e) => setPpm(e.target.value)}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted">ppm</span>
              </div>
              {ppmError && <p className="text-sm font-medium text-amber-800">{ppmError}</p>}
            </Field>
          )}

          {method === 'urine' && (
            <fieldset>
              <legend className="mb-2 font-semibold">Which color does your strip match?</legend>
              <div className="grid gap-2" role="radiogroup">
                {URINE_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    role="radio"
                    aria-checked={urine === lvl}
                    onClick={() => setUrine(lvl)}
                    className={cx(
                      'flex min-h-[56px] items-center gap-3 rounded-xl border-2 px-4 text-left text-lg font-semibold',
                      urine === lvl ? 'border-brand-600 bg-brand-50' : 'border-stone-200 bg-white hover:border-brand-300',
                    )}
                  >
                    <span className="h-7 w-7 rounded-md ring-1 ring-black/10" style={{ background: URINE_SWATCH[lvl] }} aria-hidden="true" />
                    {URINE_LABELS[lvl]}
                  </button>
                ))}
              </div>
              <p className="mt-4 flex gap-2 rounded-xl bg-stone-100 p-3 text-ink-soft">
                <InfoIcon size={20} className="mt-0.5 shrink-0" />
                Urine strips are a helpful way to start. After a few weeks on keto, your body uses ketones more efficiently, so strips
                may read lower even when you're still in ketosis. If that happens, ask your care team whether blood or breath testing
                would suit you better.
              </p>
            </fieldset>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" htmlFor="k-date">
            <input id="k-date" type="date" className={inputClass} value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </Field>
          <Field label="Time" htmlFor="k-time">
            <input id="k-time" type="time" className={inputClass} value={time} onChange={(e) => e.target.value && setTime(e.target.value)} />
          </Field>
        </div>

        <Button block className="min-h-[56px] text-lg" onClick={save} disabled={touched && !canSave}>
          Save reading
        </Button>
        <p className="text-center text-sm text-ink-muted">{METHOD_LABELS[method]} · stored only on this device</p>
      </div>
    </div>
  );
}

function SavedReading({ reading, onAnother }: { reading: KetoneReading; onAnother: () => void }) {
  const { state } = useStore();
  const { settings } = state;
  const status = readingStatus(reading, settings);
  const gki = reading.method === 'blood' ? computeGKI(reading.glucoseMgDl, reading.bhb) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader title="Reading saved" />
      <Card>
        <p className="text-ink-muted">{METHOD_LABELS[reading.method]}</p>
        <p className="mt-1 text-5xl font-bold tabular-nums tracking-tight">{formatReading(reading)}</p>
        {status && status !== 'contact' && (
          <div className="mt-4 space-y-2">
            <StatusPill status={status} />
            <p className="text-ink-soft">{STATUS_COPY[status].detail}</p>
          </div>
        )}
        {status === 'contact' && (
          <div className="mt-4">
            <ContactCareTeam threshold={settings.bhbContactThreshold} />
          </div>
        )}
        {(reading.glucoseMgDl != null || gki != null) && (
          <dl className="mt-5 grid grid-cols-2 gap-3">
            {reading.glucoseMgDl != null && (
              <div className="rounded-xl bg-stone-50 p-3">
                <dt className="text-sm text-ink-muted">Glucose</dt>
                <dd className="text-xl font-semibold tabular-nums">{formatGlucose(reading.glucoseMgDl, settings.glucoseUnit)}</dd>
              </div>
            )}
            {gki != null && (
              <div className="rounded-xl bg-brand-50 p-3">
                <dt className="text-sm text-brand-800">GKI</dt>
                <dd className="text-xl font-semibold tabular-nums text-brand-900">{gki.toFixed(1)}</dd>
              </div>
            )}
          </dl>
        )}
        {reading.method === 'urine' && (
          <p className="mt-4 text-sm text-ink-muted">
            Reminder: urine strips can read lower once your body has adapted to keto. That's expected.
          </p>
        )}
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <LinkButton href="#/ketones" variant="secondary">
          See my trend
        </LinkButton>
        <LinkButton href="#/">Done</LinkButton>
      </div>
      <button type="button" onClick={onAnother} className="w-full py-2 font-semibold text-brand-700 underline underline-offset-2">
        Log another reading
      </button>
    </div>
  );
}
