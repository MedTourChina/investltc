import type { Channel } from './schema';

export type ChannelPayload = {
  id: string;
  name: string;
  type: Channel['type'];
  minimums: { amount: number | null; currency: string };
  friction: Channel['friction'];
  lastVerified: string;
  access: {
    investorType: Channel['access'][number]['investorType'];
    status: Channel['access'][number]['status'];
    fundSources: Channel['access'][number]['fundSources'];
    requirements: readonly string[];
    conditions: string[];
    denialReasons: string[];
  }[];
};

/** The browser only needs the fields the engine reads — not the prose. */
export function toPayload(channels: Channel[]): ChannelPayload[] {
  return channels.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    minimums: { amount: c.minimums.amount, currency: c.minimums.currency },
    friction: c.friction,
    lastVerified: c.lastVerified,
    access: c.access.map((a) => ({
      investorType: a.investorType,
      status: a.status,
      fundSources: a.fundSources,
      requirements: a.requirements,
      conditions: a.conditions,
      denialReasons: a.denialReasons,
    })),
  }));
}
