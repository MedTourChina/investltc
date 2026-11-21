/**
 * Live smoke test.
 *
 *   node scripts/check-live.mjs [baseUrl] [expectedChannelCount]
 *
 * Defaults to the production domain and 14 channels. Exits non-zero on the first
 * failed assertion, so it can be used after a deploy or in CI.
 */
const base = (process.argv[2] ?? 'https://invest.lifetourchina.com').replace(/\/$/, '');
const expected = Number(process.argv[3] ?? 19);

const pages = [
  '/',
  '/matrix/',
  '/check/',
  '/compare/',
  '/channels/',
  '/channels/a-share/',
  '/channels/exchange-bond/',
  '/channels/gold/',
  '/playbooks/inbound-funding/',
  '/playbooks/bonds-and-deposits/',
  '/playbooks/etf-and-index/',
  '/glossary/',
  '/explainers/capital-vs-current-account/',
  '/explainers/deposit-insurance/',
  '/explainers/risk-grades/',
  '/explainers/fund-share-classes/',
  '/explainers/treaty-relief/',
  '/explainers/equity-compensation/',
  '/playbooks/esop-and-rsu/',
  '/methodology/',
  '/about/',
  '/updates/',
  '/data/',
  '/api/channels.json',
  '/robots.txt',
  '/sitemap-index.xml',
];

const results = new Map();
let transportErrors = 0;

for (const path of pages) {
  try {
    const res = await fetch(base + path, { redirect: 'follow' });
    const body = await res.text();
    results.set(path, { status: res.status, body });
    console.log(`${String(res.status).padEnd(4)} ${String(body.length).padStart(7)}B  ${path}`);
  } catch (error) {
    transportErrors += 1;
    console.log(`ERR   ${path}  ${error.message}`);
  }
}

const body = (p) => results.get(p)?.body ?? '';
const status = (p) => results.get(p)?.status;

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const checks = [];
const check = (name, ok) => checks.push({ name, ok });

const home = body('/');
const matrix = body('/matrix/');
const channel = body('/channels/a-share/');
const checkPage = body('/check/');
const api = parseJson(body('/api/channels.json'));

check('home returns 200', status('/') === 200);
check('home title is the brand', /<title>Lifetourchina Invest<\/title>/.test(home));
check('canonical uses the custom domain', /rel="canonical" href="https:\/\/invest\.lifetourchina\.com/.test(home));
check('prototype banner present', /not yet field-verified/.test(home));
check('hero headline present', /Investing in China/.test(home));

check('matrix page 200', status('/matrix/') === 200);
check(
  `matrix has ${expected} channel rows`,
  (matrix.match(/<tr>/g) ?? []).length - 1 === expected,
  (matrix.match(/<tr>/g) ?? []).length - 1,
);
check('matrix has 4 investor columns', (matrix.match(/<th scope="col">/g) ?? []).length === 5);

check('channel page 200', status('/channels/a-share/') === 200);
check('channel page has statuses', /badge--(open|conditional|closed|unknown)/.test(channel));
check('channel page shows sources date', /Sources checked/.test(channel));

check('check page 200', status('/check/') === 200);
check('check page has embedded data', /id="channel-data"/.test(checkPage));
check('check page asks about a brokerage account', /name="brokerage"/.test(checkPage));
check('check page defaults to a resident individual', /<option value="resident-foreign-individual"[^>]*selected/.test(checkPage));

check('home says it is for individuals', /For individuals/.test(home));
check('home draws the institutional boundary', /Institutional routes appear on this site/.test(home));
check('matrix marks institutional columns as context', /The two right-hand columns are context/.test(matrix));
check('about states the consumer-only audience', /We do not sell to institutions/.test(body('/about/')));
check('bonds playbook is live', /deposit insurance/i.test(body('/playbooks/bonds-and-deposits/')));
check('deposit insurance explainer is live', /CNY 500,000/.test(body('/explainers/deposit-insurance/')));
check('new channel page renders', /Securities account first|securities \(brokerage\) account/.test(body('/channels/exchange-bond/')));
check('glossary renders terms', /面签/.test(body('/glossary/')) && /yī lèi hù/.test(body('/glossary/')));
check('glossary filter is wired', /id="q"/.test(body('/glossary/')));
check('treaty explainer is live', /certificate of tax residency/i.test(body('/explainers/treaty-relief/')));
check('employee equity channel renders', /股权激励/.test(body('/channels/employee-equity/')));
check('esop playbook is live', /Before you sign/i.test(body('/playbooks/esop-and-rsu/')));

check('api returns json', api !== null);
check(`api lists ${expected} channels`, api?.channels?.length === expected, api?.channels?.length);
check('api has friction scores', !!api?.channels?.every((c) => typeof c.frictionScore === 'number'));

check('robots.txt points at the sitemap', /Sitemap: https:\/\/invest\.lifetourchina\.com/.test(body('/robots.txt')));
check('sitemap index exists', /<sitemapindex/.test(body('/sitemap-index.xml')));

console.log('\nCHECKS');
for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail !== undefined ? ` (${c.detail})` : ''}`);
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} passed against ${base}`);
if (transportErrors > 0) console.log(`${transportErrors} request(s) failed at the transport layer`);

process.exit(failed > 0 || transportErrors > 0 ? 1 : 0);
