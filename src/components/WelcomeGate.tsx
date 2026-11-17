import React, { useState } from 'react';
import { ArrowRight, BarChart3, Globe, MapPin, ShieldCheck } from 'lucide-react';
import { EditionMode } from '../types/ledger';

interface WelcomeGateProps {
  edition: EditionMode;
  onOpenSignIn: () => void;
  onOpenRequestAccount: () => void;
  onChangeEdition: (edition: EditionMode) => void;
}

const CAPABILITY_ITEMS = [
  {
    num: '01',
    title: 'Exact Balance Calibration & Annual 16th-of-Month Chart',
    summary:
      'Enter your exact liquid cash, savings reserve, and tax or giving allocation in one click. BalanceLedger records your position on the 16th of every month to measure January-through-December improvement and exports printable PDF and standalone HTML statements.',
    details:
      'Includes custom balance sync, monthly backfill entries, year-over-year bar charts, CSV ledger exports, and JSON backups.',
    icon: BarChart3,
  },
  {
    num: '02',
    title: 'Google Maps Spend Map',
    summary:
      'Search real-world merchants, pin favorite stores, and log purchases directly from checking or reserve with automatic visit counts and place totals.',
    details:
      'Powered by Google Places search and custom interactive markers so every expense stays linked to where it happened.',
    icon: MapPin,
  },
  {
    num: '03',
    title: 'Subscriptions, Budgets & 72-Hour Wait Queue',
    summary:
      'Monitor recurring bills and monthly burn rate, set category spending caps, track IOUs, and pause impulse purchases for 72 hours before spending.',
    details:
      'One-click bill payment deductions, receivables/payables settlement, and savings goal tracking.',
    icon: ShieldCheck,
  },
  {
    num: '04',
    title: '9 Currencies, Cascading Hover Menus & Dual Editions',
    summary:
      'Navigate every account, reserve goal, report export, and currency (USD, PAB, EUR, GBP, CAD, AUD, MXN, INR, JPY) from structured cascading menus.',
    details:
      'Adults Edition uses a pure white rectangular ledger; Kids Edition (PiggyPal) tracks allowance, chores, and pocket-money goals.',
    icon: Globe,
  },
];

export const WelcomeGate: React.FC<WelcomeGateProps> = ({
  edition,
  onOpenSignIn,
  onOpenRequestAccount,
  onChangeEdition,
}) => {
  const isAdults = edition === 'adults';
  const boxShape = isAdults ? 'rounded-none' : 'rounded-2xl';
  const btnShape = isAdults ? 'rounded-none' : 'rounded-xl';
  const [selectedTopic, setSelectedTopic] = useState<string>('01');

  return (
    <div
      className={`min-h-screen transition-colors ${
        isAdults
          ? 'bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-100'
          : 'bg-[#f4f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100'
      }`}
    >
      {/* Top Bar */}
      <header
        className={`border-b ${
          isAdults
            ? 'border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-950'
            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
        }`}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-6 py-4">
          <span
            className={`font-display whitespace-nowrap shrink-0 text-lg font-bold tracking-tight ${
              isAdults
                ? 'text-neutral-950 dark:text-white'
                : 'text-indigo-700 dark:text-indigo-400'
            }`}
          >
            {isAdults ? 'BalanceLedger' : 'PiggyPal'}
          </span>

          <nav className="hidden items-center gap-6 text-xs font-semibold text-neutral-600 md:flex dark:text-neutral-300">
            <a href="#capabilities" className="whitespace-nowrap hover:text-neutral-950 dark:hover:text-white">
              Capabilities
            </a>
            <a href="#workflow" className="whitespace-nowrap hover:text-neutral-950 dark:hover:text-white">
              How It Works
            </a>
            <a href="#editions" className="whitespace-nowrap hover:text-neutral-950 dark:hover:text-white">
              Editions
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenSignIn}
              className={`whitespace-nowrap shrink-0 border px-4 py-2 text-xs font-semibold transition-colors ${btnShape} ${
                isAdults
                  ? 'border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onOpenRequestAccount}
              className={`whitespace-nowrap shrink-0 border px-4 py-2 text-xs font-semibold transition-colors ${btnShape} ${
                isAdults
                  ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-white dark:bg-white dark:text-neutral-900'
                  : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Request an Account
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-12 sm:py-16">
        {/* Hero Proposition */}
        <section className="grid grid-cols-1 items-stretch gap-8 border-b border-neutral-200/80 pb-12 lg:grid-cols-12 dark:border-neutral-800">
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                <span>Personal Financial Ledger</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span>Annual 16th-of-Month Tracking</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span>Admin-Approved Access</span>
              </p>

              <h1
                className="font-display mt-4 max-w-2xl font-bold tracking-tight text-neutral-950 dark:text-white"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.35rem)', lineHeight: 1.08, textWrap: 'balance' }}
              >
                {isAdults
                  ? 'Structured money discipline, exact balances, and annual proof.'
                  : 'Clear pocket money tracking for kids and families.'}
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base dark:text-neutral-300">
                {isAdults
                  ? 'BalanceLedger separates spendable cash, savings reserves, and tax or giving allocations into a disciplined ledger. Track expenses by place on Google Maps, manage recurring bills, and export 12-month progress reports to PDF, HTML, or CSV.'
                  : 'PiggyPal helps young savers split allowance between spending, saving goals, and sharing—complete with a 72-hour wait shelf, cash counter, and printable monthly charts.'}
              </p>
            </div>

            {/* Strictly 2 Primary Buttons: Sign In & Request an Account */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onOpenSignIn}
                className={`inline-flex items-center gap-2 border px-6 py-3 text-sm font-semibold transition-colors ${btnShape} ${
                  isAdults
                    ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-white dark:bg-white dark:text-neutral-950'
                    : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onOpenRequestAccount}
                className={`inline-flex items-center gap-2 border px-6 py-3 text-sm font-semibold transition-colors ${btnShape} ${
                  isAdults
                    ? 'border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'
                    : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                }`}
              >
                <span>Request an Account</span>
              </button>
            </div>
          </div>

          {/* Right Structural Ledger Summary */}
          <div
            className={`flex flex-col justify-between border p-6 lg:col-span-5 ${boxShape} ${
              isAdults
                ? 'border-neutral-200/90 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                : 'border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div>
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  What Your Account Unlocks
                </span>
                <span className="font-num text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Cloud Sync
                </span>
              </div>

              <dl className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
                <div className="flex items-baseline justify-between py-3">
                  <dt className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    Auto Snapshot Cadence
                  </dt>
                  <dd className="font-num text-xs font-bold text-neutral-950 dark:text-white">
                    16th of Every Month
                  </dd>
                </div>
                <div className="flex items-baseline justify-between py-3">
                  <dt className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    Supported Currencies
                  </dt>
                  <dd className="font-num text-xs font-bold text-neutral-950 dark:text-white">
                    USD · PAB · EUR · GBP · +5
                  </dd>
                </div>
                <div className="flex items-baseline justify-between py-3">
                  <dt className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    Standalone Exports
                  </dt>
                  <dd className="font-num text-xs font-bold text-neutral-950 dark:text-white">
                    PDF · HTML · CSV · JSON
                  </dd>
                </div>
                <div className="flex items-baseline justify-between py-3">
                  <dt className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    Location Spend Tracking
                  </dt>
                  <dd className="font-num text-xs font-bold text-neutral-950 dark:text-white">
                    Google Maps Places
                  </dd>
                </div>
                <div className="flex items-baseline justify-between py-3">
                  <dt className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    Access Model
                  </dt>
                  <dd className="font-num text-xs font-bold text-neutral-950 dark:text-white">
                    Admin-Reviewed Accounts
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 border-t border-neutral-100 pt-4 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              Sign in with Google or existing credentials, or submit an account request for
              administrator review.
            </div>
          </div>
        </section>

        {/* Core Capabilities Bento Grid */}
        <section id="capabilities" className="border-b border-neutral-200/80 py-12 dark:border-neutral-800">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Built for Clarity Across Every Account
            </h2>
            <p className="mt-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Select any capability below to inspect how it works before signing in.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {CAPABILITY_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              const active = selectedTopic === item.num;
              const colSpan = idx === 0 || idx === 3 ? 'md:col-span-7' : 'md:col-span-5';
              return (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => setSelectedTopic(item.num)}
                  className={`border p-6 text-left transition-colors ${colSpan} ${boxShape} ${
                    active
                      ? isAdults
                        ? 'border-neutral-400 bg-neutral-50/50 dark:border-neutral-600 dark:bg-neutral-900'
                        : 'border-indigo-400 bg-indigo-50/30 dark:border-indigo-600 dark:bg-slate-900'
                      : isAdults
                      ? 'border-neutral-200/80 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-num text-xs font-bold text-neutral-400">{item.num}</span>
                    <Icon className="h-4 w-4 text-neutral-500" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-neutral-950 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                    {item.summary}
                  </p>
                  {active && (
                    <p className="mt-3 border-t border-neutral-200/70 pt-3 text-xs font-medium text-neutral-800 dark:border-neutral-800 dark:text-neutral-200">
                      {item.details}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* How It Works & Edition Selector */}
        <section id="workflow" className="grid grid-cols-1 gap-8 py-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-display text-xl font-bold tracking-tight text-neutral-950 dark:text-white">
              How Your Ledger Works After Signing In
            </h2>
            <ol className="mt-5 space-y-4">
              <li className="border-b border-neutral-100 pb-4 dark:border-neutral-800">
                <div className="text-xs font-bold text-neutral-950 dark:text-white">
                  01. Sign In or Request an Account
                </div>
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                  Existing users and administrators can sign in directly; new users can submit an
                  account request for administrator approval.
                </p>
              </li>
              <li className="border-b border-neutral-100 pb-4 dark:border-neutral-800">
                <div className="text-xs font-bold text-neutral-950 dark:text-white">
                  02. Calibrate Your Exact Current Balance
                </div>
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                  Use Set Custom Balance to declare what you hold right now across Checking,
                  Savings Reserve, and Allocation Fund.
                </p>
              </li>
              <li>
                <div className="text-xs font-bold text-neutral-950 dark:text-white">
                  03. Track Activity, Locations &amp; Annual Progress
                </div>
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                  Every deposit, expense, bill payment, reserve transfer, and map pin updates your
                  balances and monthly improvement report automatically.
                </p>
              </li>
            </ol>
          </div>

          <div
            id="editions"
            className={`flex flex-col justify-between border p-6 lg:col-span-5 ${boxShape} ${
              isAdults
                ? 'border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div>
              <h3 className="text-base font-bold text-neutral-950 dark:text-white">
                Choose Your Preferred Edition
              </h3>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                Select an edition before signing in—you can switch editions anytime inside the
                Settings menu.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeEdition('adults')}
                  className={`border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${btnShape} ${
                    edition === 'adults'
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                      : 'border-neutral-200/80 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200'
                  }`}
                >
                  <div>Adults Edition</div>
                  <div className="mt-0.5 text-[10px] font-normal opacity-80">
                    White rectangular ledger
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeEdition('kids')}
                  className={`border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${btnShape} ${
                    edition === 'kids'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-neutral-200/80 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200'
                  }`}
                >
                  <div>Kids Edition</div>
                  <div className="mt-0.5 text-[10px] font-normal opacity-80">
                    PiggyPal pocket tracker
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <button
                type="button"
                onClick={onOpenSignIn}
                className={`flex-1 border px-4 py-2.5 text-xs font-semibold transition-colors ${btnShape} ${
                  isAdults
                    ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-white dark:bg-white dark:text-neutral-900'
                    : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={onOpenRequestAccount}
                className={`flex-1 border px-4 py-2.5 text-xs font-semibold transition-colors ${btnShape} ${
                  isAdults
                    ? 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'
                    : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                }`}
              >
                Request an Account
              </button>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200/80 pt-6 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <span>
            {isAdults ? 'BalanceLedger' : 'PiggyPal'} · Personal Money &amp; Annual Progress
            Tracker
          </span>
          <div className="flex items-center gap-4">
            <button type="button" onClick={onOpenSignIn} className="hover:text-neutral-900 dark:hover:text-white">
              Sign In
            </button>
            <button type="button" onClick={onOpenRequestAccount} className="hover:text-neutral-900 dark:hover:text-white">
              Request an Account
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};
