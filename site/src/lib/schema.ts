import { z } from 'zod';

export const INVESTOR_TYPES = [
  'non-resident-individual',
  'resident-foreign-individual',
  'offshore-institution',
  'onshore-fie',
] as const;

export const FUND_SOURCES = [
  'offshore-fx',
  'offshore-cnh',
  'onshore-rmb-income',
  'onshore-rmb-asset-sale',
] as const;

export const STATUSES = ['open', 'conditional', 'closed', 'unknown'] as const;

export const CHANNEL_TYPES = [
  'bank',
  'cash',
  'wealth',
  'fund',
  'equity',
  'bond',
  'route',
] as const;

const accessSchema = z.object({
  investorType: z.enum(INVESTOR_TYPES),
  status: z.enum(STATUSES),
  fundSources: z.array(z.enum(FUND_SOURCES)).default([]),
  conditions: z.array(z.string()).default([]),
  denialReasons: z.array(z.string()).default([]),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const channelSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  nameZh: z.string().min(1),
  type: z.enum(CHANNEL_TYPES),
  summary: z.string().min(20),
  whatYouCanBuy: z.array(z.string()).default([]),
  access: z.array(accessSchema).min(1),
  documents: z.array(z.string()).default([]),
  process: z
    .array(
      z.object({
        step: z.string(),
        where: z.enum(['online', 'branch', 'both', 'n/a']),
        note: z.string().optional(),
      }),
    )
    .default([]),
  minimums: z.object({
    amount: z.number().nullable(),
    currency: z.string(),
    note: z.string().optional(),
  }),
  fees: z.array(
    z.object({ label: z.string(), amount: z.string(), note: z.string().optional() }),
  ),
  quota: z
    .object({ label: z.string(), amount: z.string().optional(), note: z.string().optional() })
    .optional(),
  liquidity: z.object({ settlement: z.string(), note: z.string().optional() }),
  taxNote: z.string().optional(),
  friction: z.object({
    documents: z.number().int().min(1).max(5),
    inPerson: z.number().int().min(1).max(5),
    language: z.number().int().min(1).max(5),
    minimum: z.number().int().min(1).max(5),
    exit: z.number().int().min(1).max(5),
  }),
  lastVerified: isoDate,
  verifiedBy: z.enum(['phone', 'branch', 'official-site', 'app', 'document']),
  verifiedCity: z.string().optional(),
  sources: z
    .array(z.object({ label: z.string(), url: z.string().url().optional(), date: isoDate }))
    .min(1),
  caveats: z.array(z.string()).default([]),
  fieldNotes: z.array(z.string()).default([]),
});

export type Channel = z.infer<typeof channelSchema>;
export type Access = z.infer<typeof accessSchema>;
export type InvestorType = (typeof INVESTOR_TYPES)[number];
export type FundSource = (typeof FUND_SOURCES)[number];
export type Status = (typeof STATUSES)[number];
export type ChannelType = (typeof CHANNEL_TYPES)[number];
