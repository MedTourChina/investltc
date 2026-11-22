/**
 * Local-only data + link validation.
 *
 * Mirrors the zod rules in src/lib/schema.ts closely enough to catch mistakes
 * before pushing. The authoritative check still runs inside `astro build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'channels');

const INVESTORS = [
  'non-resident-individual',
  'resident-foreign-individual',
  'offshore-institution',
  'onshore-fie',
];
const SOURCES = ['offshore-fx', 'offshore-cnh', 'onshore-rmb-income', 'onshore-rmb-asset-sale'];
const STATUSES = ['open', 'conditional', 'closed', 'unknown'];
const TYPES = ['bank', 'cash', 'wealth', 'fund', 'equity', 'bond', 'route'];
const REQUIREMENTS = [
  'residence-permit',
  'employment-or-study-proof',
  'local-bank-account',
  'securities-account',
  'chinese-phone',
  'in-person',
];
const VERIFIED_BY = ['phone', 'branch', 'official-site', 'app', 'document'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const problems = [];
const ids = new Set();
const channels = [];

for (const file of fs.readdirSync(dataDir).filter((f) => f.endsWith('.yaml'))) {
  const where = `data/channels/${file}`;
  let doc;
  try {
    doc = YAML.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  } catch (error) {
    problems.push(`${where}: YAML parse error — ${error.message}`);
    continue;
  }

  const need = (key, test, label) => {
    if (!(key in doc)) return problems.push(`${where}: missing "${label}"`);
    if (!test(doc[key])) problems.push(`${where}: invalid "${label}"`);
  };

  need('id', (v) => typeof v === 'string' && /^[a-z0-9-]+$/.test(v), 'id');
  need('name', (v) => typeof v === 'string' && v.length > 1, 'name');
  need('nameZh', (v) => typeof v === 'string' && v.length > 1, 'nameZh');
  need('type', (v) => TYPES.includes(v), 'type');
  need('summary', (v) => typeof v === 'string' && v.length >= 20, 'summary');
  need('lastVerified', (v) => typeof v === 'string' && ISO.test(v), 'lastVerified');
  need('verifiedBy', (v) => VERIFIED_BY.includes(v), 'verifiedBy');
  need('access', (v) => Array.isArray(v) && v.length > 0, 'access');
  need('sources', (v) => Array.isArray(v) && v.length > 0, 'sources');
  need('minimums', (v) => v && typeof v === 'object' && 'amount' in v && 'currency' in v, 'minimums');
  need('liquidity', (v) => v && typeof v === 'object' && typeof v.settlement === 'string', 'liquidity');
  need('friction', (v) => v && typeof v === 'object', 'friction');
  need('fees', (v) => Array.isArray(v), 'fees');

  if (doc.id) {
    if (ids.has(doc.id)) problems.push(`${where}: duplicate id "${doc.id}"`);
    ids.add(doc.id);
  }

  if (Array.isArray(doc.access)) {
    for (const [i, a] of doc.access.entries()) {
      if (!INVESTORS.includes(a.investorType)) problems.push(`${where}: access[${i}] bad investorType`);
      if (!STATUSES.includes(a.status)) problems.push(`${where}: access[${i}] bad status`);
      if (a.fundSources && !Array.isArray(a.fundSources)) problems.push(`${where}: access[${i}] fundSources must be a list`);
      for (const s of a.fundSources ?? []) {
        if (!SOURCES.includes(s)) problems.push(`${where}: access[${i}] bad fundSource "${s}"`);
      }
      if (a.requirements !== undefined && !Array.isArray(a.requirements)) {
        problems.push(`${where}: access[${i}] requirements must be a list`);
      }
      for (const r of a.requirements ?? []) {
        if (!REQUIREMENTS.includes(r)) problems.push(`${where}: access[${i}] bad requirement "${r}"`);
      }
      if (!Array.isArray(a.conditions)) problems.push(`${where}: access[${i}] conditions must be a list`);
    }
  }

  if (doc.friction) {
    for (const key of ['documents', 'inPerson', 'language', 'minimum', 'exit']) {
      const v = doc.friction[key];
      if (!Number.isInteger(v) || v < 1 || v > 5) {
        problems.push(`${where}: friction.${key} must be an integer 1–5 (got ${v})`);
      }
    }
  }

  if (Array.isArray(doc.sources)) {
    for (const [i, s] of doc.sources.entries()) {
      if (typeof s.label !== 'string' || !s.label) problems.push(`${where}: sources[${i}] missing label`);
      if (!ISO.test(s.date ?? '')) problems.push(`${where}: sources[${i}] bad date`);
      if (s.url !== undefined && !/^https?:\/\//.test(s.url)) problems.push(`${where}: sources[${i}] bad url`);
    }
  }

  if (Array.isArray(doc.fees)) {
    for (const [i, f] of doc.fees.entries()) {
      if (typeof f.label !== 'string' || typeof f.amount !== 'string') {
        problems.push(`${where}: fees[${i}] needs label and amount`);
      }
    }
  }

  channels.push({ id: doc.id, ...doc });
}

// ---- routes -------------------------------------------------------------
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const pages = walk(path.join(root, 'src', 'pages'));
const routes = new Set(['/']);

for (const file of pages) {
  const rel = path.relative(path.join(root, 'src', 'pages'), file).replace(/\\/g, '/');
  if (rel.startsWith('api/')) {
    routes.add('/' + rel.replace(/\.ts$/, ''));
    continue;
  }
  if (rel.includes('[')) continue; // dynamic, handled below
  routes.add('/' + rel.replace(/\.(astro|md)$/, '').replace(/\/index$/, ''));
}
for (const c of channels) routes.add(`/channels/${c.id}`);

const filesToScan = [
  ...walk(path.join(root, 'src', 'pages')).filter((f) => /\.(astro|md)$/.test(f)),
  ...walk(path.join(root, 'src', 'components')).filter((f) => f.endsWith('.astro')),
];

const linkProblems = [];

// Markdown pages declare their layout by relative path; a wrong depth still parses
// and only fails at build time, so check that the file resolves.
for (const file of filesToScan.filter((f) => f.endsWith('.md'))) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  const layout = m[1].match(/^layout:\s*(.+)$/m);
  if (!layout) continue;
  const rel = layout[1].trim().replace(/^['"]|['"]$/g, '');
  const resolved = path.resolve(path.dirname(file), rel);
  if (!fs.existsSync(resolved)) {
    linkProblems.push(`${path.relative(root, file)}: layout not found ${rel}`);
  }
}

for (const file of filesToScan) {
  const text = fs.readFileSync(file, 'utf8');
  const literals = [
    ...text.matchAll(/href="(\/[^"#]*)"/g),
    ...text.matchAll(/\]\((\/[^)#]*)\)/g),
  ];
  for (const m of literals) {
    let target = m[1];
    if (target.includes('${')) continue;
    if (target.length > 1 && target.endsWith('/')) target = target.slice(0, -1);
    if (target.startsWith('/#')) continue;
    if (!routes.has(target)) {
      linkProblems.push(`${path.relative(root, file)}: dead link ${target}`);
    }
  }
}

// ---- report -------------------------------------------------------------
if (problems.length) {
  console.log('DATA PROBLEMS');
  for (const p of problems) console.log('  ' + p);
}
if (linkProblems.length) {
  console.log('LINK PROBLEMS');
  for (const p of [...new Set(linkProblems)]) console.log('  ' + p);
}

console.log(
  `\n${channels.length} channels, ${routes.size} routes, ${problems.length} data issues, ${linkProblems.length} dead links`,
);
process.exit(problems.length + linkProblems.length > 0 ? 1 : 0);
