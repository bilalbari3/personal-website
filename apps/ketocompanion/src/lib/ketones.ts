import type { GlucoseUnit, KetoneMethod, KetoneReading, Settings, UrineLevel } from '../types';

export const MGDL_PER_MMOL = 18;

export const URINE_LEVELS: UrineLevel[] = ['negative', 'trace', 'small', 'moderate', 'large'];
export const URINE_LABELS: Record<UrineLevel, string> = {
  negative: 'Negative',
  trace: 'Trace',
  small: 'Small',
  moderate: 'Moderate',
  large: 'Large',
};

export const METHOD_LABELS: Record<KetoneMethod, string> = {
  blood: 'Blood (BHB)',
  breath: 'Breath (acetone)',
  urine: 'Urine strips',
};

export const METHOD_UNITS: Record<KetoneMethod, string> = {
  blood: 'mmol/L',
  breath: 'ppm',
  urine: '',
};

export function toMgDl(value: number, unit: GlucoseUnit) {
  return unit === 'mg/dL' ? value : value * MGDL_PER_MMOL;
}

export function fromMgDl(mgdl: number, unit: GlucoseUnit) {
  return unit === 'mg/dL' ? mgdl : mgdl / MGDL_PER_MMOL;
}

export function formatGlucose(mgdl: number, unit: GlucoseUnit) {
  return unit === 'mg/dL' ? `${Math.round(mgdl)} mg/dL` : `${(mgdl / MGDL_PER_MMOL).toFixed(1)} mmol/L`;
}

/**
 * Glucose-Ketone Index = glucose (mmol/L) ÷ BHB (mmol/L).
 * Returns undefined when either value is missing or BHB is zero.
 */
export function computeGKI(glucoseMgDl: number | undefined, bhb: number | undefined): number | undefined {
  if (glucoseMgDl == null || bhb == null || !(bhb > 0) || !(glucoseMgDl > 0)) return undefined;
  return glucoseMgDl / MGDL_PER_MMOL / bhb;
}

export function readingGKI(r: KetoneReading) {
  return r.method === 'blood' ? computeGKI(r.glucoseMgDl, r.bhb) : undefined;
}

export type KetoneStatus = 'below' | 'in' | 'above' | 'contact';

export function readingStatus(r: KetoneReading, s: Settings): KetoneStatus | undefined {
  switch (r.method) {
    case 'blood': {
      if (r.bhb == null) return undefined;
      if (r.bhb > s.bhbContactThreshold) return 'contact';
      if (r.bhb < s.ranges.blood.min) return 'below';
      if (r.bhb > s.ranges.blood.max) return 'above';
      return 'in';
    }
    case 'breath': {
      if (r.breathPpm == null) return undefined;
      if (r.breathPpm < s.ranges.breath.min) return 'below';
      if (r.breathPpm > s.ranges.breath.max) return 'above';
      return 'in';
    }
    case 'urine': {
      if (!r.urine) return undefined;
      return URINE_LEVELS.indexOf(r.urine) >= URINE_LEVELS.indexOf(s.ranges.urineMin) ? 'in' : 'below';
    }
  }
}

export const STATUS_SHORT: Record<KetoneStatus, string> = {
  in: 'In range',
  below: 'Below range',
  above: 'Above range',
  contact: 'Contact care team',
};

export const STATUS_COPY: Record<KetoneStatus, { label: string; detail: string }> = {
  in: {
    label: 'In your target range',
    detail: 'Your reading is right where your care team is aiming.',
  },
  below: {
    label: 'Below your target range',
    detail: 'Readings go up and down. Keep going with your plan, and check again later or tomorrow.',
  },
  above: {
    label: 'Above your target range',
    detail: 'Mention this at your next check-in so your care team knows. Keep drinking fluids.',
  },
  contact: {
    label: 'Please contact your care team',
    detail: '',
  },
};

/** Primary numeric value of a reading for charting (urine mapped to an ordinal 0–4). */
export function readingValue(r: KetoneReading): number | undefined {
  if (r.method === 'blood') return r.bhb;
  if (r.method === 'breath') return r.breathPpm;
  if (r.method === 'urine' && r.urine) return URINE_LEVELS.indexOf(r.urine);
  return undefined;
}

export function formatReading(r: KetoneReading): string {
  if (r.method === 'blood') return r.bhb != null ? `${r.bhb.toFixed(1)} mmol/L` : '—';
  if (r.method === 'breath') return r.breathPpm != null ? `${Math.round(r.breathPpm)} ppm` : '—';
  return r.urine ? URINE_LABELS[r.urine] : '—';
}

export function sortReadings(readings: KetoneReading[]) {
  return [...readings].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
