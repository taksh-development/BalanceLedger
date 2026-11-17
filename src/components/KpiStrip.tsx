import React from 'react';
import { EditionMode, LedgerState, ViewId } from '../types/ledger';
import { fmt, r2 } from '../utils/ledgerUtils';

interface KpiStripProps {
  edition: EditionMode;
  state: LedgerState;
  onSelectView: (view: ViewId) => void;
}

export const KpiStrip: React.FC<KpiStripProps> = ({
  edition,
  state,
  onSelectView,
}) => {
  const isAdults = edition === 'adults';
  const cur = state.currency;
  const spentTotal = state.bought.reduce((s, b) => s + b.price, 0);
  const avail = r2(state.wallet + state.saved);
  const nextWish = state.wishes[0] || null;
  const wishSubtext = nextWish
    ? avail >= nextWish.price
      ? `Funded: ${nextWish.name}`
      : `${fmt(nextWish.price - avail, cur)} remaining for ${nextWish.name}`
    : isAdults
    ? 'No planned purchases logged'
    : 'Add an item to your wishlist';

  if (isAdults) {
    return (
      <section
        aria-label="Account summary boxes"
        className="no-print mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {/* 1. Checking / Liquid Cash */}
        <button
          type="button"
          onClick={() => onSelectView('home')}
          className="rounded-none border border-neutral-200/80 bg-white p-5 text-left transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Checking / Liquid Cash
            </span>
            <span className="font-medium text-neutral-400 dark:text-neutral-500">Available</span>
          </div>
          <div className="font-num mt-2 text-3xl font-bold tracking-tight text-neutral-950 dark:text-white">
            {fmt(state.wallet, cur)}
          </div>
          <div className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            Immediate operating funds
          </div>
        </button>

        {/* 2. Savings & Reserve */}
        <button
          type="button"
          onClick={() => onSelectView('saved')}
          className="rounded-none border border-neutral-200/80 bg-white p-5 text-left transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Savings &amp; Reserve
            </span>
            <span className="font-medium text-neutral-400 dark:text-neutral-500">Protected</span>
          </div>
          <div className="font-num mt-2 text-3xl font-bold tracking-tight text-neutral-950 dark:text-white">
            {fmt(state.saved, cur)}
          </div>
          <div className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            Dedicated reserve balance
          </div>
        </button>

        {/* 3. Planned Purchases */}
        <button
          type="button"
          onClick={() => onSelectView('wishes')}
          className="rounded-none border border-neutral-200/80 bg-white p-5 text-left transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Planned Purchases
            </span>
            <span className="font-medium text-neutral-400 dark:text-neutral-500">Budgeted</span>
          </div>
          <div className="font-num mt-2 text-3xl font-bold tracking-tight text-neutral-950 dark:text-white">
            {state.wishes.length}
          </div>
          <div className="mt-1.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
            {wishSubtext}
          </div>
        </button>

        {/* 4. Total Expenses */}
        <button
          type="button"
          onClick={() => onSelectView('bought')}
          className="rounded-none border border-neutral-200/80 bg-white p-5 text-left transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Total Expenses
            </span>
            <span className="font-medium text-neutral-400 dark:text-neutral-500">Outflow</span>
          </div>
          <div className="font-num mt-2 text-3xl font-bold tracking-tight text-neutral-950 dark:text-white">
            {fmt(spentTotal, cur)}
          </div>
          <div className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            {state.bought.length} recorded transaction{state.bought.length === 1 ? '' : 's'}
          </div>
        </button>
      </section>
    );
  }

  // Kids Edition cards
  return (
    <section
      aria-label="Kids wallet summary cards"
      className="no-print mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4"
    >
      <button
        type="button"
        onClick={() => onSelectView('home')}
        className="rounded-2xl border border-emerald-200 bg-white p-5 text-left shadow-xs transition-colors hover:border-emerald-300 dark:border-emerald-900/60 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            My Wallet
          </span>
          <span className="font-medium text-slate-400 dark:text-slate-500">Spendable</span>
        </div>
        <div className="font-num mt-2 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
          {fmt(state.wallet, cur)}
        </div>
        <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          Money ready to spend or save
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectView('saved')}
        className="rounded-2xl border border-pink-200 bg-white p-5 text-left shadow-xs transition-colors hover:border-pink-300 dark:border-pink-900/60 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            What I Saved
          </span>
          <span className="font-medium text-slate-400 dark:text-slate-500">Piggy Bank</span>
        </div>
        <div className="font-num mt-2 text-3xl font-bold tracking-tight text-pink-600 dark:text-pink-400">
          {fmt(state.saved, cur)}
        </div>
        <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          Safe inside your Piggy Bank
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectView('wishes')}
        className="rounded-2xl border border-amber-200 bg-white p-5 text-left shadow-xs transition-colors hover:border-amber-300 dark:border-amber-900/60 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            What I Wanna Buy
          </span>
          <span className="font-medium text-slate-400 dark:text-slate-500">Wishlist</span>
        </div>
        <div className="font-num mt-2 text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
          {state.wishes.length}
        </div>
        <div className="mt-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
          {wishSubtext}
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelectView('bought')}
        className="rounded-2xl border border-indigo-200 bg-white p-5 text-left shadow-xs transition-colors hover:border-indigo-300 dark:border-indigo-900/60 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            What I Bought
          </span>
          <span className="font-medium text-slate-400 dark:text-slate-500">Purchases</span>
        </div>
        <div className="font-num mt-2 text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
          {fmt(spentTotal, cur)}
        </div>
        <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {state.bought.length} item{state.bought.length === 1 ? '' : 's'} bought
        </div>
      </button>
    </section>
  );
};
