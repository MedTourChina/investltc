import type { Profile, Verdict } from './eligibility.ts';
import { pathFor } from './paths.ts';

/**
 * One renderer for the results list, used by the server (build time) and by the browser.
 *
 * The page used to build this DOM by hand in the client script, which meant the results — the
 * actual content of the page — did not exist in the HTML at all. Search engines and anyone
 * without JavaScript saw an empty div. Building the same markup from a string keeps the two
 * versions identical while letting the build ship a real page.
 */

const PLAYBOOK: Record<string, string> = {
  equity: 'a-shares',
  wealth: 'bank-wealth',
  fund: 'funds',
  bond: 'bonds-and-deposits',
  cash: 'bonds-and-deposits',
  route: 'inbound-funding',
};

const GROUP_LABEL: Record<string, string> = {
  open: 'Can open now',
  conditional: 'Conditional — one thing to fix',
  unknown: 'Not verified for your case',
  closed: 'Not available to you',
};

const BADGE_LABEL: Record<string, string> = {
  open: 'Open',
  conditional: 'Conditional',
  unknown: 'Not verified',
  closed: 'Not available',
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function line(text: string, kind: 'blocker' | 'need' | 'note'): string {
  const mark = kind === 'blocker' ? '✕ ' : kind === 'need' ? '! ' : '· ';
  const color =
    kind === 'blocker' ? 'var(--red)' : kind === 'need' ? 'var(--amber)' : 'var(--ink-muted)';
  return `<p class="result-item__why" style="margin:0.15rem 0;color:${color}">${escapeHtml(
    mark + text,
  )}</p>`;
}

function item(v: Verdict): string {
  const parts: string[] = [];
  parts.push('<div class="result-item">');
  parts.push('<div class="result-item__head">');
  parts.push(
    `<a class="result-item__name" href="/channels/${escapeHtml(v.channelId)}">${escapeHtml(v.name)}</a>`,
  );
  parts.push(
    `<span class="badge badge--${v.status} badge--sm">${escapeHtml(BADGE_LABEL[v.status] ?? v.status)}</span>`,
  );
  parts.push(`<span class="mono tiny muted">friction ${v.friction.toFixed(1)}</span>`);
  parts.push('</div>');

  for (const b of v.blockers ?? []) parts.push(line(b, 'blocker'));
  for (const n of v.needs ?? []) parts.push(line(n, 'need'));
  for (const n of v.notes ?? []) parts.push(line(n, 'note'));

  const pb = PLAYBOOK[v.type];
  if (pb) {
    parts.push(
      `<a class="tiny" href="/playbooks/${pb}" style="display:inline-block;margin-top:0.35rem">Open the playbook →</a>`,
    );
  }

  parts.push('</div>');
  return parts.join('');
}

function pathBanner(profile: Profile): string {
  const path = pathFor(profile.visa);
  if (!path) return '';

  const steps = path.next
    .map((step) => {
      const link =
        step.href && step.hrefLabel
          ? `<a class="tiny" href="${escapeHtml(step.href)}" style="display:inline-block;margin-top:0.15rem">${escapeHtml(
              step.hrefLabel,
            )} →</a>`
          : '';
      return `<li style="margin-bottom:0.6rem"><span style="display:block"><strong>${escapeHtml(
        step.title,
      )}</strong></span><span class="muted">${escapeHtml(step.body)}</span>${link}</li>`;
    })
    .join('');

  return [
    '<div class="card card--flat" style="margin-bottom:1.2rem">',
    '<span class="card__kicker">Your path</span>',
    `<p class="small" style="margin:0.5rem 0 0"><strong>${escapeHtml(path.label)}</strong> — ${escapeHtml(
      path.lede,
    )}</p>`,
    `<ol class="small" style="margin:0.8rem 0 0;padding-left:1.2rem">${steps}</ol>`,
    `<a class="tiny" href="${escapeHtml(path.href)}" style="display:inline-block;margin-top:0.3rem">Read the whole ${escapeHtml(
      path.label.toLowerCase(),
    )} →</a>`,
    '</div>',
  ].join('');
}

export function renderResults(verdicts: Verdict[], profile: Profile): string {
  const counts = {
    open: verdicts.filter((v) => v.status === 'open').length,
    conditional: verdicts.filter((v) => v.status === 'conditional').length,
    unknown: verdicts.filter((v) => v.status === 'unknown').length,
    closed: verdicts.filter((v) => v.status === 'closed').length,
  };

  const out: string[] = [];

  out.push('<div class="stack" style="margin-bottom:1.2rem">');
  out.push(
    `<h2 style="font-size:1.25rem">${counts.open + counts.conditional} of ${verdicts.length} channels look usable for you</h2>`,
  );
  out.push(
    `<p class="muted small">${counts.open} open · ${counts.conditional} conditional · ${counts.unknown} not verified · ${counts.closed} blocked</p>`,
  );
  out.push('</div>');

  if (profile.investor === 'resident-foreign-individual') {
    out.push(pathBanner(profile));
  }

  for (const status of ['open', 'conditional', 'unknown', 'closed'] as const) {
    const items = verdicts.filter((v) => v.status === status);
    if (items.length === 0) continue;
    out.push('<div class="result-group" style="margin-bottom:1rem">');
    out.push(
      `<div class="result-group__head"><span>${escapeHtml(GROUP_LABEL[status])}</span><span class="mono">${
        items.length
      }</span></div>`,
    );
    out.push('<div>');
    for (const v of items) out.push(item(v));
    out.push('</div>');
    out.push('</div>');
  }

  const offshore = verdicts.filter(
    (v) => v.status === 'closed' && (v.blockers ?? []).some((b) => /inbound route|arriving from outside/i.test(b)),
  );
  if (offshore.length > 0) {
    out.push(
      '<p class="small muted" style="margin-top:.6rem">Some channels are blocked because the money is still offshore. That is a transfer problem, not a product problem — read <a href="/playbooks/inbound-funding">how money gets into China</a> first.</p>',
    );
  }

  return out.join('');
}
