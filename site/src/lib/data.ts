import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { channelSchema, type Channel } from './schema';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../../data/channels');

const TYPE_ORDER: Record<string, number> = {
  bank: 1,
  cash: 2,
  wealth: 3,
  fund: 4,
  equity: 5,
  bond: 6,
  route: 7,
};

let cache: Channel[] | null = null;

export function getChannels(): Channel[] {
  if (cache) return cache;

  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort();

  const channels = files.map((file) => {
    const raw = YAML.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
    const parsed = channelSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `   - ${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('\n');
      throw new Error(`Invalid channel data in data/channels/${file}:\n${issues}`);
    }
    return parsed.data;
  });

  const seen = new Set<string>();
  for (const c of channels) {
    if (seen.has(c.id)) throw new Error(`Duplicate channel id: ${c.id}`);
    seen.add(c.id);
  }

  cache = channels.sort(
    (a, b) => (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99) || a.name.localeCompare(b.name),
  );
  return cache;
}

export function getChannel(id: string): Channel | undefined {
  return getChannels().find((c) => c.id === id);
}

export function channelsFor(investorType: string): Channel[] {
  return getChannels().filter((c) => c.access.some((a) => a.investorType === investorType));
}
