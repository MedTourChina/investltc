import type { Channel, FundSource, InvestorType, Status } from './schema';
import { frictionScore } from './friction.ts';

export const RESIDENCY = ['work', 'student', 'family', 'permanent', 'visitor'] as const;
export type Residency = (typeof RESIDENCY)[number];

export const MONTHS = ['none', 'lt6', '6to12', '1to3', '3plus'] as const;
export type Months = (typeof MONTHS)[number];

export const CHINESE = ['none', 'basic', 'fluent'] as const;
export type ChineseLevel = (typeof CHINESE)[number];

export type Profile = {
  investor: InvestorType;
  source: FundSource;
  months: Months;
  visa: Residency;
  amount: number;
  canVisit: boolean;
  chinese: ChineseLevel;
  hasBank: boolean;
  hasPhone: boolean;
};

export type Verdict = {
  channelId: string;
  name: string;
  type: Channel['type'];
  status: Status;
  /** Hard stops. If anything is here, the answer is "not available to you". */
  blockers: string[];
  /** Things you can satisfy. The answer is "possible, but". */
  needs: string[];
  /** Context that does not change the status. */
  notes: string[];
  friction: number;
};

/** The subset of a channel the engine needs, so the same code runs on the server and in the browser. */
export type ChannelLike = {
  id: string;
  name: string;
  type: Channel['type'];
  access: Array<{
    investorType: InvestorType;
    status: Status;
    fundSources: FundSource[];
    requirements?: readonly string[];
    conditions: string[];
    denialReasons: string[];
  }>;
  minimums: { amount: number | null; currency: string };
  friction: Channel['friction'];
};

export const DEFAULT_PROFILE: Profile = {
  investor: 'resident-foreign-individual',
  source: 'onshore-rmb-income',
  months: '1to3',
  visa: 'work',
  amount: 300_000,
  canVisit: true,
  chinese: 'basic',
  hasBank: true,
  hasPhone: true,
};

const RESIDENCE_PERMIT_HOLDERS: Residency[] = ['work', 'student', 'family', 'permanent'];
const EMPLOYMENT_OR_STUDY: Residency[] = ['work', 'student'];

const SOURCE_LABEL: Record<FundSource, string> = {
  'offshore-fx': 'money held abroad in foreign currency',
  'offshore-cnh': 'offshore RMB',
  'onshore-rmb-income': 'RMB earned in China',
  'onshore-rmb-asset-sale': 'RMB from selling an asset in China',
};

const RESIDENCY_LABEL: Record<Residency, string> = {
  work: 'a work permit',
  student: 'a student visa',
  family: 'a family or dependent visa',
  permanent: 'permanent residence',
  visitor: 'a visitor or no visa',
};

export function isOnshore(source: FundSource): boolean {
  return source === 'onshore-rmb-income' || source === 'onshore-rmb-asset-sale';
}

function sourceBlocker(source: FundSource, accepted: FundSource[], type: Channel['type']): string {
  if (isOnshore(source) && !accepted.some(isOnshore)) {
    return 'This route is for money arriving from outside China, not RMB already onshore.';
  }
  if (!isOnshore(source) && accepted.some(isOnshore)) {
    return `This channel settles RMB that is already in China. Your money is ${SOURCE_LABEL[source]} — it has to come in through an inbound route first.`;
  }
  if (!isOnshore(source) && !accepted.some(isOnshore)) {
    return `This route does not accept ${SOURCE_LABEL[source]}.`;
  }
  return 'This channel does not accept money from your selected source.';
}

/**
 * The single decision function behind /check and /compare.
 *
 * Order matters: a hard blocker beats a conditional need beats the published status.
 * When the data has no entry for this investor type the answer is "unknown", never "closed".
 */
export function evaluateChannel(channel: ChannelLike, profile: Profile): Verdict {
  const base = {
    channelId: channel.id,
    name: channel.name,
    type: channel.type,
    friction: frictionScore(channel.friction),
  };

  const access = channel.access.find((a) => a.investorType === profile.investor);
  if (!access) {
    return {
      ...base,
      status: 'unknown',
      blockers: [],
      needs: [],
      notes: ['We have not documented this channel for your investor type yet. That is a gap in our data, not a no.'],
    };
  }

  const requirements = new Set(access.requirements ?? []);

  if (access.status === 'closed') {
    const reasons = access.denialReasons.length > 0 ? access.denialReasons : access.conditions;
    return {
      ...base,
      status: 'closed',
      blockers: reasons.length > 0 ? reasons : ['No general route for this investor type.'],
      needs: [],
      notes: [],
    };
  }

  const blockers: string[] = [];
  const needs: string[] = [];
  const notes: string[] = [];

  if (requirements.has('residence-permit') && !RESIDENCE_PERMIT_HOLDERS.includes(profile.visa)) {
    blockers.push(
      `Requires a residence permit. With ${RESIDENCY_LABEL[profile.visa]} you are treated as a non-resident for this channel.`,
    );
  }

  if (
    requirements.has('employment-or-study-proof') &&
    !EMPLOYMENT_OR_STUDY.includes(profile.visa)
  ) {
    needs.push('Requires an employment letter or proof of study at the counter.');
  }

  if (requirements.has('local-bank-account') && !profile.hasBank) {
    blockers.push('Requires a local bank account first. Open one before you try this.');
  }

  if (requirements.has('chinese-phone') && !profile.hasPhone) {
    blockers.push('Requires a Chinese mobile number registered in your own name.');
  }

  if (requirements.has('in-person') && !profile.canVisit) {
    needs.push('Normally needs at least one branch visit.');
  }

  if (access.fundSources.length > 0 && !access.fundSources.includes(profile.source)) {
    blockers.push(sourceBlocker(profile.source, access.fundSources, channel.type));
  }

  if (
    channel.minimums.amount !== null &&
    channel.minimums.currency === 'CNY' &&
    profile.amount < channel.minimums.amount
  ) {
    needs.push(
      `Minimum is CNY ${channel.minimums.amount.toLocaleString('en-US')}; you selected less than that.`,
    );
  }

  if (profile.chinese === 'none' && channel.friction.language >= 4) {
    notes.push('Forms and counters are usually Chinese-only. Bring someone who can read them.');
  }

  if (profile.months === 'none' && profile.investor === 'resident-foreign-individual') {
    notes.push('You said you are not in China. The “living in China” rules may not apply to you.');
  }

  if (profile.months === 'lt6' && profile.investor === 'resident-foreign-individual') {
    notes.push('Under six months in China can affect both onboarding and your tax position.');
  }

  const status: Status = blockers.length > 0 ? 'closed' : needs.length > 0 ? 'conditional' : access.status;

  return { ...base, status, blockers, needs, notes };
}

const STATUS_RANK: Record<Status, number> = { open: 0, conditional: 1, unknown: 2, closed: 3 };

/** Open first, then cheapest friction first. Never by expected return. */
export function rankVerdicts(verdicts: Verdict[]): Verdict[] {
  return [...verdicts].sort(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.friction - b.friction,
  );
}

export function summarise(verdicts: Verdict[]) {
  return {
    open: verdicts.filter((v) => v.status === 'open').length,
    conditional: verdicts.filter((v) => v.status === 'conditional').length,
    unknown: verdicts.filter((v) => v.status === 'unknown').length,
    closed: verdicts.filter((v) => v.status === 'closed').length,
  };
}

const INVESTOR_VALUES: InvestorType[] = [
  'non-resident-individual',
  'resident-foreign-individual',
  'offshore-institution',
  'onshore-fie',
];

export function profileFromParams(params: URLSearchParams): Profile {
  const pick = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const value = params.get(key);
    return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : fallback;
  };

  const investor = params.get('investor');
  const amount = Number(params.get('amount'));

  return {
    investor:
      investor && (INVESTOR_VALUES as string[]).includes(investor)
        ? (investor as InvestorType)
        : DEFAULT_PROFILE.investor,
    source: pick('source', ['offshore-fx', 'offshore-cnh', 'onshore-rmb-income', 'onshore-rmb-asset-sale'] as const, DEFAULT_PROFILE.source),
    months: pick('months', MONTHS, DEFAULT_PROFILE.months),
    visa: pick('visa', RESIDENCY, DEFAULT_PROFILE.visa),
    amount: Number.isFinite(amount) && amount > 0 ? amount : DEFAULT_PROFILE.amount,
    canVisit: pick('visit', ['yes', 'no'] as const, 'yes') === 'yes',
    chinese: pick('chinese', CHINESE, DEFAULT_PROFILE.chinese),
    hasBank: pick('bank', ['yes', 'no'] as const, 'yes') === 'yes',
    hasPhone: pick('phone', ['yes', 'no'] as const, 'yes') === 'yes',
  };
}

export function profileToParams(profile: Profile): URLSearchParams {
  const params = new URLSearchParams();
  params.set('investor', profile.investor);
  params.set('source', profile.source);
  params.set('months', profile.months);
  params.set('visa', profile.visa);
  params.set('amount', String(profile.amount));
  params.set('visit', profile.canVisit ? 'yes' : 'no');
  params.set('chinese', profile.chinese);
  params.set('bank', profile.hasBank ? 'yes' : 'no');
  params.set('phone', profile.hasPhone ? 'yes' : 'no');
  return params;
}
