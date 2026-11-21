import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { channelSchema } from '../src/lib/schema.ts';
import {
  DEFAULT_PROFILE,
  evaluateChannel,
  rankVerdicts,
  summarise,
} from '../src/lib/eligibility.ts';

const dir = path.join(import.meta.dirname, '..', 'data', 'channels');
const channels = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => channelSchema.parse(YAML.parse(fs.readFileSync(path.join(dir, f), 'utf8'))));
const by = (id) => channels.find((c) => c.id === id);
const withProfile = (patch) => ({ ...DEFAULT_PROFILE, ...patch });

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('resident work visa, onshore RMB: A-share is possible', () => {
  const v = evaluateChannel(by('a-share'), withProfile({}));
  assert.equal(v.status, 'conditional');
  assert.deepEqual(v.blockers, []);
});

test('visitor without a residence permit: A-share is blocked', () => {
  const v = evaluateChannel(by('a-share'), withProfile({ visa: 'visitor' }));
  assert.equal(v.status, 'closed');
  assert.match(v.blockers.join(' '), /residence permit/i);
});

test('offshore money: A-share is blocked, and points at inbound routes', () => {
  const v = evaluateChannel(by('a-share'), withProfile({ source: 'offshore-fx' }));
  assert.equal(v.status, 'closed');
  assert.match(v.blockers.join(' '), /inbound route/i);
});

test('no local bank account: funds channel is blocked', () => {
  const v = evaluateChannel(by('public-fund'), withProfile({ hasBank: false }));
  assert.equal(v.status, 'closed');
  assert.match(v.blockers.join(' '), /bank account/i);
});

test('below the minimum: bank wealth becomes conditional', () => {
  const v = evaluateChannel(by('bank-wealth'), withProfile({ amount: 5_000 }));
  assert.equal(v.status, 'conditional');
  assert.match(v.needs.join(' '), /Minimum is CNY 10,000/i);
});

test('cannot visit a branch: wealth products become conditional', () => {
  const v = evaluateChannel(by('bank-wealth'), withProfile({ canVisit: false }));
  assert.equal(v.status, 'conditional');
  assert.match(v.needs.join(' '), /branch visit/i);
});

test('non-resident with offshore money: Northbound is open to them', () => {
  const v = evaluateChannel(
    by('northbound'),
    withProfile({ investor: 'non-resident-individual', source: 'offshore-fx', visa: 'visitor', months: 'none' }),
  );
  assert.equal(v.status, 'conditional');
  assert.deepEqual(v.blockers, []);
});

test('onshore RMB into an inbound route is rejected', () => {
  const v = evaluateChannel(by('personal-inbound'), withProfile({ source: 'onshore-rmb-income' }));
  assert.equal(v.status, 'closed');
  assert.match(v.blockers.join(' '), /arriving from outside China/i);
});

test('undocumented combination is unknown, never closed', () => {
  const synthetic = {
    ...by('a-share'),
    access: by('a-share').access.filter((a) => a.investorType !== 'onshore-fie'),
  };
  const v = evaluateChannel(synthetic, withProfile({ investor: 'onshore-fie' }));
  assert.equal(v.status, 'unknown');
  assert.match(v.notes.join(' '), /not documented/i);
});

test('closed data entries carry their denial reasons', () => {
  const v = evaluateChannel(
    by('a-share'),
    withProfile({ investor: 'non-resident-individual', source: 'offshore-fx', visa: 'visitor', months: 'none' }),
  );
  assert.equal(v.status, 'closed');
  assert.ok(v.blockers.length > 0);
});

test('no securities account: exchange bonds and REITs name the account they need', () => {
  const bond = evaluateChannel(by('exchange-bond'), withProfile({ hasBrokerage: false }));
  assert.equal(bond.status, 'closed');
  assert.match(bond.blockers.join(' '), /securities \(brokerage\) account/i);

  const reit = evaluateChannel(by('public-reit'), withProfile({ hasBrokerage: false }));
  assert.equal(reit.status, 'closed');
  assert.match(reit.blockers.join(' '), /securities \(brokerage\) account/i);

  const withAccount = evaluateChannel(
    by('exchange-bond'),
    withProfile({ hasBrokerage: true, visa: 'work', months: '1to3' }),
  );
  assert.doesNotMatch(withAccount.blockers.join(' '), /securities \(brokerage\) account/i);
  assert.equal(withAccount.status, 'conditional');
});

test('private funds are closed to non-resident individuals', () => {
  const v = evaluateChannel(
    by('private-fund'),
    withProfile({ investor: 'non-resident-individual', source: 'offshore-fx', visa: 'visitor', months: 'none' }),
  );
  assert.equal(v.status, 'closed');
  assert.match(v.blockers.join(' '), /closed to non-resident|sold to onshore|offshore/i);
});

test('employee equity is conditional for a resident and unknown for a non-resident', () => {
  const resident = evaluateChannel(by('employee-equity'), withProfile({ investor: 'resident-foreign-individual' }));
  assert.equal(resident.status, 'conditional');
  const access = by('employee-equity').access.find((a) => a.investorType === 'resident-foreign-individual');
  assert.match(access.conditions.join(' '), /plan/i);

  const nonResident = evaluateChannel(
    by('employee-equity'),
    withProfile({ investor: 'non-resident-individual', source: 'offshore-fx', visa: 'visitor', months: 'none' }),
  );
  assert.equal(nonResident.status, 'unknown');
});

test('ranking: open, then conditional, then unknown, then closed', () => {
  const verdicts = [
    { channelId: 'c', name: 'c', type: 'fund', status: 'closed', blockers: [], needs: [], notes: [], friction: 1 },
    { channelId: 'a', name: 'a', type: 'fund', status: 'open', blockers: [], needs: [], notes: [], friction: 4 },
    { channelId: 'b', name: 'b', type: 'fund', status: 'conditional', blockers: [], needs: [], notes: [], friction: 2 },
    { channelId: 'd', name: 'd', type: 'fund', status: 'open', blockers: [], needs: [], notes: [], friction: 1.5 },
    { channelId: 'e', name: 'e', type: 'fund', status: 'unknown', blockers: [], needs: [], notes: [], friction: 1 },
  ];
  assert.deepEqual(
    rankVerdicts(verdicts).map((v) => v.channelId),
    ['d', 'a', 'b', 'e', 'c'],
  );
});

test('every real channel evaluates for every investor type without throwing', () => {
  const investors = ['non-resident-individual', 'resident-foreign-individual', 'offshore-institution', 'onshore-fie'];
  for (const channel of channels) {
    for (const investor of investors) {
      const v = evaluateChannel(channel, withProfile({ investor }));
      assert.ok(['open', 'conditional', 'closed', 'unknown'].includes(v.status));
    }
  }
});

test('a full profile yields a sane summary', () => {
  const verdicts = channels.map((c) => evaluateChannel(c, DEFAULT_PROFILE));
  const s = summarise(verdicts);
  assert.equal(s.open + s.conditional + s.unknown + s.closed, channels.length);
  assert.ok(s.open + s.conditional >= 1, 'at least one actionable channel for a resident');
});

let failed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`PASS  ${t.name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL  ${t.name}\n      ${error.message}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
