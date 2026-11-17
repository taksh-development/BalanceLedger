import React, { useState } from 'react';
import {
  ADULT_CATEGORIES,
  EditionMode,
  KIDS_CATEGORIES,
  LedgerState,
  RecurringBill,
} from '../../types/ledger';
import { calcMonthlyBurn, fmt, getCurrencyConfig, r2 } from '../../utils/ledgerUtils';

interface SubscriptionsViewProps {
  edition: EditionMode;
  state: LedgerState;
  onAddBill: (payload: Omit<RecurringBill, 'id' | 'active'>) => void;
  onToggleBill: (id: string) => void;
  onPayBill: (id: string) => string | null;
  onDeleteBill: (id: string) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  edition,
  state,
  onAddBill,
  onToggleBill,
  onPayBill,
  onDeleteBill,
}) => {
  const isAdults = edition === 'adults';
  const cur = state.currency;
  const sym = getCurrencyConfig(cur).symbol;
  const categories = isAdults ? ADULT_CATEGORIES : KIDS_CATEGORIES;

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [dueDay, setDueDay] = useState('1');
  const [category, setCategory] = useState<string>(
    isAdults ? 'Subscriptions & Bills' : 'Other'
  );
  const [error, setError] = useState('');

  const monthlyBurn = calcMonthlyBurn(state.subscriptions);
  const annualBurn = r2(monthlyBurn * 12);
  const activeCount = state.subscriptions.filter((s) => s.active).length;

  const boxClass = isAdults
    ? 'rounded-none border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900'
    : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900';

  const statBoxClass = isAdults
    ? 'rounded-none border border-neutral-200/80 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950'
    : 'rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950';

  const inputClass = isAdults
    ? 'w-full rounded-none border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white'
    : 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

  const radius = isAdults ? 'rounded-none' : 'rounded-xl';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = r2(parseFloat(amount));
    const day = Math.min(31, Math.max(1, parseInt(dueDay, 10) || 1));
    if (!name.trim() || Number.isNaN(num) || num <= 0) return;

    onAddBill({
      name: name.trim(),
      amount: num,
      cycle,
      dueDay: day,
      category,
    });
    setName('');
    setAmount('');
  };

  return (
    <div className="space-y-5">
      {/* Burn Rate Summary Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={statBoxClass}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Monthly Recurring Burn
          </div>
          <div className="font-num mt-1.5 text-2xl font-bold text-neutral-950 dark:text-white">
            {fmt(monthlyBurn, cur)}
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Normalized across active bills
          </div>
        </div>

        <div className={statBoxClass}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Annualized Obligation
          </div>
          <div className="font-num mt-1.5 text-2xl font-bold text-neutral-950 dark:text-white">
            {fmt(annualBurn, cur)}
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            12-month projected total
          </div>
        </div>

        <div className={statBoxClass}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Active Subscriptions &amp; Bills
          </div>
          <div className="font-num mt-1.5 text-2xl font-bold text-neutral-950 dark:text-white">
            {activeCount} / {state.subscriptions.length}
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {state.allowance > 0
              ? `${Math.round((monthlyBurn / (state.allowance * 4.33)) * 100)}% of monthly recurring deposit`
              : 'Set recurring deposit in Settings'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Left: Add Form */}
        <div className={`lg:col-span-5 ${boxClass}`}>
          <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
            <h2 className="text-base font-bold text-neutral-950 dark:text-white">
              Add Recurring Bill / Subscription
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Service or Bill Name
              </label>
              <input
                type="text"
                required
                placeholder={isAdults ? 'e.g., Fiber Internet, Rent, Gym' : 'e.g., Game Pass, Music'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Amount ({sym})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="15.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`font-num ${inputClass}`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Billing Cycle
                </label>
                <select
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                  className={inputClass}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Due Day (1–31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  className={`font-num ${inputClass}`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full border px-4 py-2 text-sm font-semibold ${
                isAdults
                  ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                  : 'rounded-xl border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Add Recurring Item
            </button>
          </form>
        </div>

        {/* Right: Formatted Schedule Table */}
        <div className={`lg:col-span-7 ${boxClass}`}>
          <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
            <h2 className="text-base font-bold text-neutral-950 dark:text-white">
              Scheduled Bills &amp; Subscriptions
            </h2>
          </div>

          {error && <p className="mb-3 text-xs font-medium text-red-700 dark:text-red-400">{error}</p>}

          {state.subscriptions.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No recurring bills added yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-y border-neutral-200 bg-white text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
                    <th className="px-2.5 py-2">Service</th>
                    <th className="px-2.5 py-2 text-right">Amount</th>
                    <th className="px-2.5 py-2">Cycle / Day</th>
                    <th className="px-2.5 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {state.subscriptions.map((bill) => (
                    <tr
                      key={bill.id}
                      className={bill.active ? '' : 'opacity-50'}
                    >
                      <td className="px-2.5 py-2.5">
                        <div className="font-semibold text-neutral-900 dark:text-white">
                          {bill.name}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {bill.category}
                          {bill.lastPaidDate ? ` · Last paid ${bill.lastPaidDate}` : ''}
                        </div>
                      </td>
                      <td className="font-num px-2.5 py-2.5 text-right font-semibold text-neutral-900 dark:text-white">
                        {fmt(bill.amount, cur)}
                      </td>
                      <td className="px-2.5 py-2.5 text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="capitalize">{bill.cycle}</span> · Day {bill.dueDay}
                      </td>
                      <td className="px-2.5 py-2.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setError('');
                              const err = onPayBill(bill.id);
                              if (err) setError(err);
                            }}
                            className={`border px-2 py-1 text-[11px] font-semibold ${
                              isAdults
                                ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                                : 'rounded-lg border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            Pay Now
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleBill(bill.id)}
                            className={`border border-neutral-200/80 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 ${radius}`}
                          >
                            {bill.active ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteBill(bill.id)}
                            className={`border border-neutral-200/80 bg-white px-2 py-1 text-[11px] font-medium text-red-700 hover:border-red-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-red-400 ${radius}`}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
