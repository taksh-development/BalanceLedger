import React, { useMemo, useState } from 'react';
import { EditionMode, LedgerState } from '../../types/ledger';
import { fmt, getCurrencyConfig, r2 } from '../../utils/ledgerUtils';

interface OverviewViewProps {
  edition: EditionMode;
  state: LedgerState;
  onRecordTransaction: (payload: {
    type: 'earn' | 'spend' | 'save' | 'share';
    amount: number;
    description: string;
    category: string;
  }) => string | null;
  onOpenCustomBalance: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  edition,
  state,
  onRecordTransaction,
  onOpenCustomBalance,
}) => {
  const isAdults = edition === 'adults';
  const [type, setType] = useState<'earn' | 'spend' | 'save' | 'share'>('earn');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(
    isAdults ? 'Salary / Income' : 'Gift / Allowance'
  );
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const cur = state.currency;
  const curSymbol = getCurrencyConfig(cur).symbol;
  const totalNet = r2(state.wallet + state.saved + state.share);

  const filteredActivity = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? state.activity.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.date.includes(q) ||
            a.amountText.toLowerCase().includes(q)
        )
      : state.activity;
    return list.slice(0, 10);
  }, [state.activity, search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const num = r2(parseFloat(amount));
    if (!description.trim() || Number.isNaN(num) || num <= 0) {
      setError('Enter a valid description and positive amount.');
      return;
    }
    const err = onRecordTransaction({
      type,
      amount: num,
      description: description.trim(),
      category,
    });
    if (err) {
      setError(err);
      return;
    }
    setAmount('');
    setDescription('');
  };

  const boxClass = isAdults
    ? 'rounded-none border border-neutral-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900'
    : 'rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900';

  const inputClass = isAdults
    ? 'w-full rounded-none border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white'
    : 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      {/* Left: Record Entry */}
      <div className={boxClass}>
        <div className="mb-4 flex items-center justify-between gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
            {isAdults ? 'Record Ledger Transaction' : 'Quick Money Actions'}
          </h2>
          <button
            type="button"
            onClick={onOpenCustomBalance}
            className={`border px-3 py-1.5 text-xs font-semibold ${
              isAdults
                ? 'rounded-none border-neutral-200/80 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                : 'rounded-lg border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            Set Exact Balance
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAdults ? 'Transaction Type' : 'What happened?'}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'earn' | 'spend' | 'save' | 'share')}
                className={inputClass}
              >
                <option value="earn">
                  {isAdults ? 'Income / Deposit to Checking' : 'I Got Money! (Gift / Job)'}
                </option>
                <option value="spend">
                  {isAdults ? 'Expense / Payment from Checking' : 'I Bought Something!'}
                </option>
                <option value="save">
                  {isAdults ? 'Transfer: Checking to Savings' : 'Put in Piggy Bank (Save)'}
                </option>
                <option value="share">
                  {isAdults ? 'Allocate: Checking to Tax / Giving' : 'Put in Share / Giving Jar'}
                </option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAdults ? `Amount (${curSymbol})` : `How much (${curSymbol})`}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder={isAdults ? '100.00' : '2.50'}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`font-num ${inputClass}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAdults ? 'Description' : 'What was it for?'}
              </label>
              <input
                type="text"
                placeholder={
                  isAdults ? 'e.g., Paycheck, Groceries, Rent' : 'e.g., Grandma gift, Ice cream'
                }
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {isAdults ? (
                  <>
                    <option value="Salary / Income">Salary / Income</option>
                    <option value="Housing & Utilities">Housing &amp; Utilities</option>
                    <option value="Groceries & Dining">Groceries &amp; Dining</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Subscriptions & Bills">Subscriptions &amp; Bills</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Savings Transfer">Savings Transfer</option>
                    <option value="Other">Other</option>
                  </>
                ) : (
                  <>
                    <option value="Gift / Allowance">Gift / Allowance</option>
                    <option value="Toys & Games">Toys &amp; Games</option>
                    <option value="Snacks & Treats">Snacks &amp; Treats</option>
                    <option value="Art & Books">Art &amp; Books</option>
                    <option value="Chores & Tasks">Chores &amp; Tasks</option>
                    <option value="Savings Transfer">Savings Transfer</option>
                    <option value="Other">Other</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-700 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            className={`w-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
              isAdults
                ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700'
                : 'rounded-xl border-transparent bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs hover:opacity-95'
            }`}
          >
            {isAdults ? 'Record Transaction' : 'Save Action!'}
          </button>
        </form>
      </div>

      {/* Right: Recent Activity */}
      <div className={boxClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
            {isAdults ? 'Recent Ledger Entries' : 'Recent Money Activity'}
          </h2>
          <span className="font-num text-xs font-bold text-neutral-800 dark:text-neutral-200">
            {isAdults ? 'Net Worth:' : 'Total Net:'} {fmt(totalNet, cur)}
          </span>
        </div>

        {state.activity.length > 0 && (
          <div className="mb-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries by description or date..."
              aria-label="Search recent ledger activity"
              className={
                isAdults
                  ? 'w-full rounded-none border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white'
                  : 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white'
              }
            />
          </div>
        )}

        {filteredActivity.length === 0 ? (
          <div className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {state.activity.length === 0
              ? isAdults
                ? 'No entries recorded. Record a transaction or load 12-month sample data.'
                : 'No activity yet! Add money or click "Load Fun Sample Data".'
              : 'No entries match your search.'}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredActivity.map((item) => {
              const amountColor =
                item.badgeType === 'green'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : item.badgeType === 'red'
                  ? 'text-red-700 dark:text-red-400'
                  : item.badgeType === 'amber'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-neutral-900 dark:text-neutral-100';

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {item.title}
                    </div>
                    <div className="font-num text-xs text-neutral-500 dark:text-neutral-400">
                      {item.date}
                    </div>
                  </div>
                  <div className={`font-num shrink-0 text-sm font-semibold ${amountColor}`}>
                    {item.amountText}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
