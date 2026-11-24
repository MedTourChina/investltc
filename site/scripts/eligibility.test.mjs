import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { channelSchema } from '../src/lib/schema.ts';
import {
  DEFAULT_PROFILE,
  evaluateChannel,
  profileFromParams,
  rankVerdicts,
  summarise,
} from '../src/lib/eligibility.ts';
import { PATHS, checkParamsFor, pathFor } from '../src/lib/paths.ts';
import { escapeHtml, renderResults } from '../src/lib/render.ts';
import {
  EVIDENCE,
  EVIDENCE_INFO,
  evidenceInfo,
  evidenceRows,
  fieldCount,
  isFieldVerified,
  questionFor,
  upgradeFor,
} from '../src/lib/verification.ts';

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

test('every path maps from a real visa value', () => {
  for (const p of PATHS) {
    assert.equal(pathFor(p.visa)?.id, p.id);
  }
  assert.equal(pathFor('visitor'), undefined);
});

test('path check links prefill the investor type and visa', () => {
  for (const p of PATHS) {
    const prof = profileFromParams(new URLSearchParams(checkParamsFor(p)));
    assert.equal(prof.investor, 'resident-foreign-individual');
    assert.equal(prof.visa, p.visa);
  }
});

test('the results markup carries the actual answer, not an empty div', () => {
  const html = renderResults(
    rankVerdicts(channels.map((c) => evaluateChannel(c, DEFAULT_PROFILE))),
    DEFAULT_PROFILE,
  );
  assert.match(html, /channels look usable for you/);
  assert.match(html, /class="result-item"/);
  assert.match(html, /Your path/);
  assert.match(html, /Work permit path/);
  assert.match(html, /href="\/channels\/a-share"/);
});

test('the path block is only shown to holders of a residence permit', () => {
  const base = rankVerdicts(channels.map((c) => evaluateChannel(c, DEFAULT_PROFILE)));
  assert.doesNotMatch(renderResults(base, withProfile({ visa: 'visitor' })), /Your path/);
  assert.doesNotMatch(
    renderResults(base, withProfile({ visa: 'work', investor: 'offshore-institution' })),
    /Your path/,
  );
});

test('markup from the data is escaped', () => {
  assert.equal(escapeHtml('a & b <c> "d"'), 'a &amp; b &lt;c&gt; &quot;d&quot;');
});

test('every evidence level used by the data has a description', () => {
  for (const c of channels) {
    const info = evidenceInfo(c.verifiedBy);
    assert.equal(info.level, c.verifiedBy);
    assert.ok(info.label.length > 0 && info.limits.length > 0);
    assert.equal(isFieldVerified(c.verifiedBy), info.field);
  }
});

test('exactly two of the five levels count as field verification', () => {
  assert.equal(EVIDENCE.length, 5);
  assert.deepEqual(
    EVIDENCE.filter((level) => EVIDENCE_INFO[level].field),
    ['branch', 'phone'],
  );
});

test('the evidence table covers every channel and counts field checks honestly', () => {
  const rows = evidenceRows(channels);
  assert.equal(rows.length, channels.length);
  assert.equal(fieldCount(rows), channels.filter((c) => isFieldVerified(c.verifiedBy)).length);
  for (const row of rows) assert.ok(row.channelId && row.name && row.level);
});

test('every channel type has a question to ask at the counter', () => {
  const questions = new Set(channels.map((c) => questionFor(c.type)));
  assert.equal(questions.size, new Set(channels.map((c) => c.type)).size);
  assert.ok([...questions].every((q) => q.length > 20));
});

test('each level names a concrete way to upgrade it', () => {
  for (const level of EVIDENCE) assert.match(upgradeFor(level), /branch|counter|field-verified/i);
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
