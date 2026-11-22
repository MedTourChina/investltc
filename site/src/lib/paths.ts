import type { Residency } from './eligibility.ts';

export type PathStep = {
  /** The instruction, in one line. */
  title: string;
  /** Why it matters, and the failure mode if it is skipped. */
  body: string;
  href?: string;
  hrefLabel?: string;
};

export type Path = {
  id: string;
  /** Matches the visa select on /check. */
  visa: Residency;
  label: string;
  /** Used in the banner: "You told us you are on the ...". */
  phrase: string;
  href: string;
  /** One sentence about what makes this path different. */
  lede: string;
  next: PathStep[];
};

export const PATHS: Path[] = [
  {
    id: 'student',
    visa: 'student',
    label: 'Student path',
    phrase: 'a student visa',
    href: '/paths/student',
    lede:
      'The bank account usually comes through the university, and the securities account is the step that most often fails.',
    next: [
      {
        title: 'Get a Class I bank account, not whatever is opened for you by default',
        body:
          'Universities often arrange a block account opening. Ask which tier it is: a Class II account caps daily movement at about CNY 10,000, which will silently fail once a scholarship or a family transfer lands in it.',
        href: '/paths/student',
        hrefLabel: 'Student path',
      },
      {
        title: 'Treat the securities account as an open question',
        body:
          'Brokers commonly ask for employment or income proof, which a student does not have. Being refused by one branch is not the rule everywhere, and buying an “account opening service” is a far worse idea than having no account.',
        href: '/explainers/risk-grades',
        hrefLabel: 'What the risk questionnaire does',
      },
      {
        title: 'Check whether you are paid legally',
        body:
          'Part-time work needs a notation on your residence permit. Any payroll that reaches a Chinese bank account also reaches the tax app, so an off-books arrangement surfaces at the worst possible moment.',
        href: '/explainers/tax-residency-183-days',
        hrefLabel: '183 days and tax residency',
      },
    ],
  },
  {
    id: 'work-permit',
    visa: 'work',
    label: 'Work permit path',
    phrase: 'a work permit',
    href: '/paths/work-permit',
    lede:
      'This is the default path on this site: payroll, social insurance and a housing fund, and the widest channel access.',
    next: [
      {
        title: 'Confirm the payroll bank before you open anything else',
        body:
          'Your employer has a bank it pays through. Opening elsewhere means a transfer and a fee every month; open where payroll lands, then add a second account for investing.',
        href: '/start',
        hrefLabel: 'First thirty days',
      },
      {
        title: 'Choose between the eight allowances and the additional deductions',
        body:
          'Foreign employees pick one, not both, and the choice is fixed for the tax year. Families with international-school fees usually come out ahead on the allowance route.',
        href: '/explainers/foreign-tax-allowances',
        hrefLabel: 'The allowance choice',
      },
      {
        title: 'Renew the residence permit before your investment horizon ends',
        body:
          'A permit expiring mid-holding freezes the bank and brokerage operations you need to sell or remit. Renewal takes weeks, so start well before expiry.',
        href: '/paths/work-permit',
        hrefLabel: 'Work permit path',
      },
    ],
  },
  {
    id: 'permanent-residence',
    visa: 'permanent',
    label: 'Permanent residence path',
    phrase: 'permanent residence',
    href: '/paths/permanent-residence',
    lede:
      'The permanent residence card removes document friction at every counter. It does not create investment rights that do not exist.',
    next: [
      {
        title: 'Use the card to shorten every counter visit',
        body:
          'One document instead of passport-plus-permit, fewer “system cannot read this” refusals, and no annual renewal to plan around. That is a real improvement, and it is the whole of it.',
        href: '/paths/permanent-residence',
        hrefLabel: 'Permanent residence path',
      },
      {
        title: 'Do not assume the card unlocks the capital account',
        body:
          'The USD 50,000 conversion quota still applies, and QFII and CIBM Direct remain institutional. “I hold the card, so I can invest like a local” is true administratively and false legally.',
        href: '/explainers/usd-50k-quota',
        hrefLabel: 'How the quota actually works',
      },
      {
        title: 'Re-run the check if your tax residency changes',
        body:
          'A permanent resident who leaves China becomes a non-resident for tax. The channels do not change, but the withholding on the way out does.',
        href: '/explainers/withholding-tax',
        hrefLabel: 'Withholding on the way out',
      },
    ],
  },
  {
    id: 'dependant',
    visa: 'family',
    label: 'Dependant path',
    phrase: 'a family or dependant visa',
    href: '/paths/dependant',
    lede:
      'There is no payroll and therefore no income record, and an income record is what the next counter asks for.',
    next: [
      {
        title: 'Plan around the fact that China has no joint account',
        body:
          'Household money sits in the working partner’s name. A power of attorney is often refused for investment products, so what works for a deposit may not work for a fund.',
        href: '/paths/dependant',
        hrefLabel: 'Dependant path',
      },
      {
        title: 'Ask the broker what it will accept, before queueing',
        body:
          'Many accept a spouse’s employment and income certificate plus a marriage certificate; some do not. Ask that specific question at that specific branch, and never present someone else’s certificate as your own.',
        href: '/channels/securities-account',
        hrefLabel: 'Securities account requirements',
      },
      {
        title: 'Keep your own bank account in your own name',
        body:
          'A spouse can transfer to you, but an account opened by someone else on your behalf is not yours. Own name, own phone number, own card.',
        href: '/playbooks/bank-account',
        hrefLabel: 'Opening a bank account',
      },
    ],
  },
];

/** The path a visitor is on, or undefined for a visitor visa and for anyone not resident. */
export function pathFor(visa: Residency): Path | undefined {
  return PATHS.find((p) => p.visa === visa);
}

/** The prefilled /check query string a path page links with. */
export function checkParamsFor(path: Path): string {
  const params = new URLSearchParams({
    investor: 'resident-foreign-individual',
    visa: path.visa,
    bank: path.id === 'student' ? 'no' : 'yes',
    phone: 'yes',
  });
  return params.toString();
}
