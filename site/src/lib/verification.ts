/**
 * How each channel record was checked, in words.
 *
 * The site's whole claim is that it tells you what is documented and what is not. That claim is
 * worth nothing unless the evidence level behind every record is public, so this file is the
 * single place that defines the levels and says plainly what each one does and does not prove.
 */

export const EVIDENCE = ['branch', 'phone', 'official-site', 'app', 'document'] as const;
export type Evidence = (typeof EVIDENCE)[number];

export type EvidenceInfo = {
  level: Evidence;
  /** Shown as a heading: the action that produced the evidence. */
  label: string;
  /** What was actually done. */
  done: string;
  /** What it proves, and what it does not. */
  limits: string;
  /** True when a human at an institution answered, rather than a document. */
  field: boolean;
};

export const EVIDENCE_INFO: Record<Evidence, EvidenceInfo> = {
  branch: {
    level: 'branch',
    label: 'Asked at a counter',
    done: 'Someone went to a branch and asked the person who would process the application.',
    limits:
      'The strongest level on this site, and still one branch in one city: Chinese banks let branches interpret thin rules differently, so a refusal elsewhere is not necessarily the rule.',
    field: true,
  },
  phone: {
    level: 'phone',
    label: 'Called the institution',
    done: 'Someone called the published number and asked an employee.',
    limits:
      'Call centres quote the written rule and do not see your documents. Useful for hours and minimums; weaker than a counter for anything that depends on discretion.',
    field: true,
  },
  'official-site': {
    level: 'official-site',
    label: 'Read the institution’s own terms',
    done: 'Read the fee schedule, minimums, eligibility wording or product list published by the institution.',
    limits:
      'Proves what the institution says in writing. It does not prove that the nearest branch will agree, or that the wording applies to a foreign passport holder.',
    field: false,
  },
  app: {
    level: 'app',
    label: 'Seen in the app',
    done: 'The product or entry point was visible in a banking, brokerage or fund app.',
    limits:
      'Proves the product exists and is on sale. It proves nothing about who may open it: the app filters by eligibility after you identify yourself, not before.',
    field: false,
  },
  document: {
    level: 'document',
    label: 'Read the rule',
    done: 'Read a law, regulator notice, tax rule or official guidance.',
    limits:
      'The rule, not the practice. This is what a complaint would rest on, and it is also the level most often contradicted by a branch that has not read it.',
    field: false,
  },
};

export function evidenceInfo(level: string): EvidenceInfo {
  return EVIDENCE_INFO[(level as Evidence) ?? 'document'] ?? EVIDENCE_INFO.document;
}

export function isFieldVerified(level: string): boolean {
  return evidenceInfo(level).field;
}

/** What would move this record up a level. */
export function upgradeFor(level: string): string {
  const info = evidenceInfo(level);
  if (info.level === 'branch') return 'Already field-verified. A rule change is what would make it stale.';
  if (info.level === 'phone') return 'A counter visit at one branch would make it branch-verified.';
  return 'One phone call to one branch would make it phone-verified; a counter visit would make it branch-verified.';
}

/** The question to ask about this kind of channel, which is not the product question. */
export function questionFor(type: string): string {
  switch (type) {
    case 'bank':
      return 'Ask which account tier they would open (Class I or Class II) and what the daily limit is.';
    case 'cash':
      return 'Ask whether the product is a deposit — covered by deposit insurance — or a wealth-management product that is not.';
    case 'wealth':
      return 'Ask for the minimum holding, the cooling-off period, and what happens if you surrender early.';
    case 'fund':
      return 'Ask which share class they would sell you (A or C), and what the subscription and redemption fees are.';
    case 'equity':
      return 'Ask, in these words: “Can I open a securities account with a foreign passport and a residence permit at this branch?”';
    case 'bond':
      return 'Ask the lot size, and whether the product needs a securities account before it can be bought.';
    case 'route':
      return 'Ask which regulator approves the route and who the counterparty is on the other side of the transfer.';
    default:
      return 'Ask the eligibility question, not the product question: can I, with these documents, open this?';
  }
}

export type EvidenceRow = {
  channelId: string;
  name: string;
  type: string;
  lastVerified: string;
  level: string;
  field: boolean;
};

export function evidenceRows(
  channels: { id: string; name: string; type: string; lastVerified: string; verifiedBy: string }[],
): EvidenceRow[] {
  return channels.map((c) => ({
    channelId: c.id,
    name: c.name,
    type: c.type,
    lastVerified: c.lastVerified,
    level: c.verifiedBy,
    field: isFieldVerified(c.verifiedBy),
  }));
}

/** How many records have been checked by a human at an institution. */
export function fieldCount(rows: { field: boolean }[]): number {
  return rows.filter((r) => r.field).length;
}
