import type { Channel } from './schema';

const WEIGHTS = {
  documents: 0.25,
  inPerson: 0.2,
  language: 0.2,
  minimum: 0.2,
  exit: 0.15,
} as const;

export type Friction = Channel['friction'];

/** Weighted 1.00–5.00 friction score. Higher = harder to get in or out. */
export function frictionScore(f: Friction): number {
  const raw =
    f.documents * WEIGHTS.documents +
    f.inPerson * WEIGHTS.inPerson +
    f.language * WEIGHTS.language +
    f.minimum * WEIGHTS.minimum +
    f.exit * WEIGHTS.exit;
  return Math.round(raw * 100) / 100;
}

export function frictionLabel(score: number): string {
  if (score < 2) return 'Low';
  if (score < 3) return 'Moderate';
  if (score < 4) return 'High';
  return 'Very high';
}

export function frictionTone(score: number): 'open' | 'conditional' | 'closed' {
  if (score < 2.5) return 'open';
  if (score < 3.75) return 'conditional';
  return 'closed';
}
