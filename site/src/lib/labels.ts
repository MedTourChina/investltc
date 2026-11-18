import type { ChannelType, FundSource, InvestorType, Status } from './schema';

export const INVESTOR_LABEL: Record<InvestorType, string> = {
  'non-resident-individual': 'Individual living abroad',
  'resident-foreign-individual': 'Foreign individual living in China',
  'offshore-institution': 'Institution outside China',
  'onshore-fie': 'Foreign-invested company in China',
};

export const INVESTOR_SHORT: Record<InvestorType, string> = {
  'non-resident-individual': 'Living abroad',
  'resident-foreign-individual': 'Living in China',
  'offshore-institution': 'Offshore institution',
  'onshore-fie': 'Company here (FIE)',
};

export const INVESTOR_HINT: Record<InvestorType, string> = {
  'non-resident-individual':
    'You do not live in mainland China, or you are here only briefly. Your money sits outside the mainland.',
  'resident-foreign-individual':
    'You hold a Chinese residence permit and earn RMB here. This is the group with the widest onshore access.',
  'offshore-institution':
    'A fund, family office or company outside China investing into the mainland.',
  'onshore-fie':
    'A foreign-invested enterprise registered in China with idle RMB on its books.',
};

export const FUND_SOURCE_LABEL: Record<FundSource, string> = {
  'offshore-fx': 'Foreign currency held abroad',
  'offshore-cnh': 'Offshore RMB (CNH)',
  'onshore-rmb-income': 'RMB earned in China',
  'onshore-rmb-asset-sale': 'RMB from selling an asset in China',
};

export const STATUS_LABEL: Record<Status, string> = {
  open: 'Open',
  conditional: 'Conditional',
  closed: 'Not available',
  unknown: 'Not verified',
};

export const STATUS_HINT: Record<Status, string> = {
  open: 'We found a published route for this investor type.',
  conditional: 'Possible, but only if specific conditions are met.',
  closed: 'No general route for this investor type.',
  unknown: 'We have not verified this combination yet. Treat as unknown, not as "no".',
};

export const TYPE_LABEL: Record<ChannelType, string> = {
  bank: 'Bank account',
  cash: 'Cash & deposits',
  wealth: 'Wealth products',
  fund: 'Funds',
  equity: 'Equities',
  bond: 'Bonds',
  route: 'Inbound route',
};

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function daysSince(iso: string): number {
  const then = Date.parse(`${iso}T00:00:00Z`);
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

export type Freshness = 'fresh' | 'stale' | 'expired';

export function freshness(iso: string): Freshness {
  const days = daysSince(iso);
  if (days > 180) return 'expired';
  if (days > 90) return 'stale';
  return 'fresh';
}

export function freshnessLabel(iso: string): string {
  const days = daysSince(iso);
  if (days === 0) return 'verified today';
  if (days === 1) return 'verified yesterday';
  if (days < 60) return `verified ${days} days ago`;
  return `verified ${formatDate(iso)}`;
}

export function formatAmount(amount: number | null, currency: string): string {
  if (amount === null) return 'No published minimum';
  if (amount === 0) return 'No minimum';
  return `${currency} ${amount.toLocaleString('en-US')}`;
}
