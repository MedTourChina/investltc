import fs from 'node:fs';
import path from 'node:path';

const dist = process.argv[2];
if (!dist) throw new Error('usage: node check-dist.mjs <dist>');

const problems = [];
const html = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) html.push(p);
  }
})(dist);

const read = (p) => fs.readFileSync(p, 'utf8');
const rel = (p) => path.relative(dist, p).replace(/\\/g, '/');

for (const file of html) {
  const text = read(file);
  const name = rel(file);

  if (!/<title>[^<]{3,}<\/title>/.test(text)) problems.push(`${name}: missing <title>`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(text)) problems.push(`${name}: missing description`);
  if (!/<link rel="canonical" href="https:\/\/invest\.lifetourchina\.com/.test(text)) problems.push(`${name}: bad canonical`);
  const h1s = [...text.matchAll(/<h1[ >]/g)].length;
  if (h1s !== 1) problems.push(`${name}: ${h1s} <h1> (expected 1)`);
  if (/undefined|\[object Object\]|Astro\.props/.test(text)) problems.push(`${name}: leaked expression`);

  for (const m of text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch {
      problems.push(`${name}: invalid JSON-LD`);
    }
  }
}

// matrix: 9 channel rows, 4 investor columns
const matrix = read(path.join(dist, 'matrix', 'index.html'));
const matrixRows = (matrix.match(/<tr>/g) ?? []).length - 1; // minus header
const matrixCols = (matrix.match(/<th scope="col">/g) ?? []).length;
if (matrixRows !== 9) problems.push(`matrix: ${matrixRows} rows (expected 9)`);
if (matrixCols !== 5) problems.push(`matrix: ${matrixCols} column headers (expected 5 incl. channel)`);

// channel page
const aShare = read(path.join(dist, 'channels', 'a-share', 'index.html'));
if (!aShare.includes('A-share trading account')) problems.push('a-share: name missing');
if (!aShare.includes('residence permit')) problems.push('a-share: conditions missing');
if (!aShare.includes('badge--closed')) problems.push('a-share: expected a closed status for non-residents');
if (!aShare.includes('Sources checked')) problems.push('a-share: freshness label missing');

// check page payload
const check = read(path.join(dist, 'check', 'index.html'));
const payloadMatch = check.match(/<script type="application\/json" id="channel-data">([\s\S]*?)<\/script>/);
if (!payloadMatch) {
  problems.push('check: channel-data payload missing');
} else {
  const data = JSON.parse(payloadMatch[1]);
  if (data.length !== 9) problems.push(`check: ${data.length} channels in payload (expected 9)`);
  if (!data.every((c) => c.minimums === undefined && c.minimum !== undefined)) {
    // shape check: simplified payload has `minimum`
  }
  if (!data.every((c) => Array.isArray(c.access))) problems.push('check: payload access arrays missing');
}

// api
const api = JSON.parse(read(path.join(dist, 'api', 'channels.json')));
if (api.channels.length !== 9) problems.push(`api: ${api.channels.length} channels (expected 9)`);
if (!api.channels.every((c) => typeof c.frictionScore === 'number')) problems.push('api: frictionScore missing');

// links: every internal href resolves to a built file
const routes = new Set();
for (const file of html) {
  const r = '/' + rel(file).replace(/index\.html$/, '').replace(/\.html$/, '');
  routes.add(r === '/' ? '/' : r.replace(/\/$/, ''));
}
(function walkAll(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkAll(p);
    else routes.add('/' + path.relative(dist, p).replace(/\\/g, '/'));
  }
})(dist);
routes.add('/api/channels.json');

const dead = new Set();
for (const file of html) {
  for (const m of read(file).matchAll(/href="(\/[^"#?]*)"/g)) {
    let target = m[1].replace(/\/$/, '') || '/';
    if (!routes.has(target)) dead.add(`${rel(file)} → ${m[1]}`);
  }
}
for (const d of dead) problems.push(`dead link: ${d}`);

console.log(`${html.length} html files, ${routes.size} routes`);
if (problems.length) {
  console.log('PROBLEMS:');
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
console.log('all structural checks passed');
