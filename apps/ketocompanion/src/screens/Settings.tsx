import { useEffect, useState } from 'react';
import { useStore } from '../state/AppState';
import type { GlucoseUnit, KetoneMethod, Range, UrineLevel } from '../types';
import { Button, Card, Dialog, Field, PageHeader, SectionTitle, Segmented, cx, inputClass } from '../components/ui';
import { InfoIcon } from '../components/Icons';
import { fatPercent, fmt } from '../lib/macros';
import { URINE_LABELS, URINE_LEVELS } from '../lib/ketones';
import { useToast } from '../components/Toast';
import { navigate } from '../lib/router';

/** Number input that keeps its own text while typing and commits valid values on blur. */
function NumberInput({
  id,
  value,
  onCommit,
  min,
  max,
  step = 1,
  unit,
}: {
  id: string;
  value: number;
  onCommit: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const [text, setText] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const v = Number(text.replace(',', '.'));
    if (text.trim() === '' || !Number.isFinite(v) || v < min || v > max) {
      setError(`Enter a number from ${min} to ${max}.`);
      return;
    }
    setError(null);
    if (v !== value) onCommit(v);
  };

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          className={cx(inputClass, unit && 'pr-20', error && 'border-amber-500')}
          value={text}
          step={step}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          aria-invalid={!!error}
        />
        {unit && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted">{unit}</span>}
      </div>
      {error && <p className="mt-1 text-sm font-medium text-amber-800">{error}</p>}
    </div>
  );
}

function RangeInputs({
  idPrefix,
  label,
  range,
  unit,
  limits,
  step,
  onChange,
}: {
  idPrefix: string;
  label: string;
  range: Range;
  unit: string;
  limits: [number, number];
  step: number;
  onChange: (r: Range) => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const set = (r: Range) => {
    if (r.min >= r.max) {
      setErr('The lower number needs to be smaller than the upper number.');
      return;
    }
    setErr(null);
    onChange(r);
  };
  return (
    <fieldset>
      <legend className="mb-1.5 font-semibold">{label}</legend>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-min`} className="mb-1 block text-sm text-ink-muted">
            From
          </label>
          <NumberInput id={`${idPrefix}-min`} value={range.min} min={limits[0]} max={limits[1]} step={step} unit={unit} onCommit={(v) => set({ ...range, min: v })} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-max`} className="mb-1 block text-sm text-ink-muted">
            To
          </label>
          <NumberInput id={`${idPrefix}-max`} value={range.max} min={limits[0]} max={limits[1]} step={step} unit={unit} onCommit={(v) => set({ ...range, max: v })} />
        </div>
      </div>
      {err && <p className="mt-1 text-sm font-medium text-amber-800">{err}</p>}
    </fieldset>
  );
}

export function SettingsScreen() {
  const store = useStore();
  const { settings } = store.state;
  const toast = useToast();
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null);

  const saved = () => toast('Saved');
  const t = settings.targets;
  const fatPct = fatPercent({ netCarbs: t.netCarbsMax, fat: t.fat, protein: t.protein, calories: 0 });

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Changes save automatically and stay on this device." back />

      <div className="flex gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-brand-900">
        <InfoIcon className="mt-0.5 shrink-0" />
        <p>Your care team sets your targets. Please change them only with their guidance.</p>
      </div>

      <Card aria-labelledby="targets-title">
        <SectionTitle id="targets-title">Daily targets</SectionTitle>
        <div className="space-y-4">
          <Field label="Net carbs: daily limit" htmlFor="t-carbs" hint="Net carbs = total carbs minus fiber. Many plans use 20–50 g a day.">
            <NumberInput id="t-carbs" value={t.netCarbsMax} min={5} max={100} unit="g" onCommit={(v) => { store.updateSettings({ targets: { ...t, netCarbsMax: v } }); saved(); }} />
          </Field>
          <Field label="Fat: daily target" htmlFor="t-fat">
            <NumberInput id="t-fat" value={t.fat} min={20} max={400} unit="g" onCommit={(v) => { store.updateSettings({ targets: { ...t, fat: v } }); saved(); }} />
          </Field>
          <Field label="Protein: daily target" htmlFor="t-protein">
            <NumberInput id="t-protein" value={t.protein} min={20} max={250} unit="g" onCommit={(v) => { store.updateSettings({ targets: { ...t, protein: v } }); saved(); }} />
          </Field>
          <p className="rounded-xl bg-stone-50 p-3 text-ink-soft">
            At these targets, about <b className="text-ink">{fmt(fatPct)}%</b> of energy comes from fat.
          </p>
        </div>
      </Card>

      <Card aria-labelledby="ketone-settings-title">
        <SectionTitle id="ketone-settings-title">Ketone testing</SectionTitle>
        <div className="space-y-5">
          <div>
            <p className="mb-1.5 font-semibold">Testing method</p>
            <Segmented<KetoneMethod>
              label="Testing method"
              value={settings.ketoneMethod}
              onChange={(m) => { store.updateSettings({ ketoneMethod: m }); saved(); }}
              options={[
                { value: 'blood', label: 'Blood' },
                { value: 'breath', label: 'Breath' },
                { value: 'urine', label: 'Urine' },
              ]}
            />
            <p className="mt-1.5 text-sm text-ink-muted">You can switch any time. Earlier readings are kept.</p>
          </div>

          <RangeInputs
            idPrefix="blood"
            label="Blood ketone (BHB) target range"
            range={settings.ranges.blood}
            unit="mmol/L"
            limits={[0.1, 8]}
            step={0.1}
            onChange={(r) => { store.updateSettings({ ranges: { ...settings.ranges, blood: r } }); saved(); }}
          />

          <Field
            label="Contact your care team when BHB is above"
            htmlFor="threshold"
            hint="Above this level, the app shows a calm message asking you to contact your care team."
          >
            <NumberInput id="threshold" value={settings.bhbContactThreshold} min={1} max={10} step={0.1} unit="mmol/L" onCommit={(v) => { store.updateSettings({ bhbContactThreshold: v }); saved(); }} />
          </Field>

          <div>
            <p className="mb-1.5 font-semibold">Glucose unit</p>
            <Segmented<GlucoseUnit>
              label="Glucose unit"
              value={settings.glucoseUnit}
              onChange={(u) => { store.updateSettings({ glucoseUnit: u }); saved(); }}
              options={[
                { value: 'mg/dL', label: 'mg/dL' },
                { value: 'mmol/L', label: 'mmol/L' },
              ]}
            />
          </div>

          <RangeInputs
            idPrefix="breath"
            label="Breath acetone target range"
            range={settings.ranges.breath}
            unit="ppm"
            limits={[0, 200]}
            step={1}
            onChange={(r) => { store.updateSettings({ ranges: { ...settings.ranges, breath: r } }); saved(); }}
          />

          <Field label="Urine strips: lowest level that counts as in range" htmlFor="urine-min">
            <select
              id="urine-min"
              className={inputClass}
              value={settings.ranges.urineMin}
              onChange={(e) => { store.updateSettings({ ranges: { ...settings.ranges, urineMin: e.target.value as UrineLevel } }); saved(); }}
            >
              {URINE_LEVELS.filter((l) => l !== 'negative').map((l) => (
                <option key={l} value={l}>
                  {URINE_LABELS[l]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card aria-labelledby="profile-title">
        <SectionTitle id="profile-title">Profile and reminders</SectionTitle>
        <div className="space-y-4">
          <Field label="Name shown in the app" htmlFor="name">
            <input
              id="name"
              className={inputClass}
              value={settings.patientName}
              onChange={(e) => store.updateSettings({ patientName: e.target.value })}
            />
          </Field>
          <Field label="Plan start date" htmlFor="start">
            <input
              id="start"
              type="date"
              className={inputClass}
              value={settings.startDate}
              onChange={(e) => e.target.value && store.updateSettings({ startDate: e.target.value })}
            />
          </Field>
          <label className="flex min-h-[48px] cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-6 w-6 shrink-0 accent-brand-600"
              checked={settings.showHydrationReminder}
              onChange={(e) => store.updateSettings({ showHydrationReminder: e.target.checked })}
            />
            <span>
              <span className="block font-semibold">Show fluids and electrolytes reminder</span>
              <span className="text-sm text-ink-muted">A gentle daily note on the Today screen. You can hide it for the day.</span>
            </span>
          </label>
        </div>
      </Card>

      <Card aria-labelledby="data-title">
        <SectionTitle id="data-title">Your data</SectionTitle>
        <p className="text-ink-soft">
          Everything you enter stays in this browser on this device. Nothing is sent to a server, and there are no accounts or tracking.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => setConfirm('reset')}>
            Reset demo data
          </Button>
          <Button variant="quiet" onClick={() => setConfirm('clear')}>
            Start with a blank log
          </Button>
        </div>
      </Card>

      <Card aria-labelledby="about-title">
        <SectionTitle id="about-title">About KetoCompanion</SectionTitle>
        <div className="space-y-2 text-ink-soft">
          <p>
            KetoCompanion is a demonstration tool for people following a ketogenic diet prescribed and monitored by their care team. It
            helps with day-to-day tracking. It does not diagnose, treat, or replace medical advice.
          </p>
          <p>
            It does not give medication or dosing advice. Talk with your care team before changing any medication or your treatment
            plan.
          </p>
          <p className="font-semibold text-ink">Demo version: all data is fictional and not for clinical use.</p>
        </div>
      </Card>

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'reset' ? 'Reset demo data?' : 'Start with a blank log?'}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="quiet" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (confirm === 'reset') store.resetDemo();
                else store.clearAll();
                setConfirm(null);
                toast(confirm === 'reset' ? 'Demo data restored' : 'Log cleared');
                navigate('today');
              }}
            >
              {confirm === 'reset' ? 'Reset' : 'Clear log'}
            </Button>
          </div>
        }
      >
        <p className="text-ink-soft">
          {confirm === 'reset'
            ? "This replaces everything with the original fictional patient (Alex) and resets all settings. Anything you've entered will be removed."
            : 'This removes all meals, readings, notes and saved meals but keeps your settings. The plan start date becomes today.'}
        </p>
      </Dialog>
    </div>
  );
}
