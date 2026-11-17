import React, { useEffect, useState } from 'react';
import { CURRENCIES, CurrencyCode, EditionMode, LedgerState } from '../../types/ledger';
import { fmt, getCurrencyConfig, r2 } from '../../utils/ledgerUtils';

interface ChoresViewProps {
  edition: EditionMode;
  state: LedgerState;
  onAddChore: (name: string, pay: number) => void;
  onCompleteChore: (id: string) => void;
  onDeleteChore: (id: string) => void;
}

export const ChoresView: React.FC<ChoresViewProps> = ({
  edition,
  state,
  onAddChore,
  onCompleteChore,
  onDeleteChore,
}) => {
  const isAdults = edition === 'adults';
  const [name, setName] = useState('');
  const [pay, setPay] = useState('');
  const cur = state.currency;
  const sym = getCurrencyConfig(cur).symbol;
  const radius = isAdults ? 'rounded-none' : 'rounded-xl';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = r2(parseFloat(pay));
    if (!name.trim() || Number.isNaN(num) || num <= 0) return;
    onAddChore(name.trim(), num);
    setName('');
    setPay('');
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            {isAdults ? 'Add Invoice / Side Income Task' : 'Add Chore / Task'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {isAdults ? 'Invoice or Task Description' : 'Chore / Task Description'}
            </label>
            <input
              type="text"
              required
              placeholder={
                isAdults ? 'e.g., Freelance consulting, Expense reimbursement' : 'e.g., Clean bedroom, Wash dishes'
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {isAdults ? `Expected Payout (${sym})` : `Reward (${sym})`}
            </label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              required
              placeholder={isAdults ? '150.00' : '2.00'}
              value={pay}
              onChange={(e) => setPay(e.target.value)}
              className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
          <button
            type="submit"
            className={`w-full border px-4 py-2 text-sm font-semibold ${
              isAdults
                ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                : 'rounded-xl border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isAdults ? 'Add Pending Item' : 'Add Chore'}
          </button>
        </form>
      </div>

      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            {isAdults ? 'Pending Receivables & Tasks' : 'Pending Chores'}
          </h2>
        </div>

        {state.chores.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No pending items right now.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {state.chores.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {c.name}
                  </div>
                  <div className="font-num text-xs text-neutral-500 dark:text-neutral-400">
                    {isAdults ? 'Amount:' : 'Reward:'} {fmt(c.pay, cur)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onCompleteChore(c.id)}
                    className={`border px-2.5 py-1 text-xs font-semibold ${
                      isAdults
                        ? 'rounded-none border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-emerald-800 dark:bg-neutral-900 dark:text-emerald-400'
                        : 'rounded-lg border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800'
                    }`}
                  >
                    {isAdults ? 'Mark Paid' : 'Done & Pay'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteChore(c.id)}
                    className={`border border-neutral-200/80 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 ${
                      isAdults ? 'rounded-none' : 'rounded-lg'
                    }`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface SettingsViewProps {
  edition: EditionMode;
  state: LedgerState;
  onChangeEdition: (edition: EditionMode) => void;
  onSaveAccountName: (name: string) => void;
  onChangeCurrency: (currency: CurrencyCode) => void;
  onChangeTheme: (theme: 'light' | 'dark') => void;
  onSaveControls: (payload: {
    allowance: number;
    pinCode: string;
    pinEnabled: boolean;
  }) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  edition,
  state,
  onChangeEdition,
  onSaveAccountName,
  onChangeCurrency,
  onChangeTheme,
  onSaveControls,
}) => {
  const isAdults = edition === 'adults';
  const [name, setName] = useState(state.name);
  const [allowance, setAllowance] = useState(String(state.allowance));
  const [pinCode, setPinCode] = useState(state.pinCode);
  const [pinEnabled, setPinEnabled] = useState(state.pinEnabled);
  const sym = getCurrencyConfig(state.currency).symbol;
  const radius = isAdults ? 'rounded-none' : 'rounded-xl';

  useEffect(() => {
    setName(state.name);
    setAllowance(String(state.allowance));
    setPinCode(state.pinCode);
    setPinEnabled(state.pinEnabled);
  }, [state.name, state.allowance, state.pinCode, state.pinEnabled]);

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            Account, Edition, Currency &amp; Display
          </h2>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Separate Edition
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeEdition('adults')}
                className={`border px-3 py-2 text-xs font-semibold ${radius} ${
                  edition === 'adults'
                    ? 'border-neutral-400 bg-neutral-50 text-neutral-950 dark:border-neutral-500 dark:bg-neutral-800 dark:text-white'
                    : 'border-neutral-200/80 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                }`}
              >
                Adults Edition (White &amp; Boxes)
              </button>
              <button
                type="button"
                onClick={() => onChangeEdition('kids')}
                className={`border px-3 py-2 text-xs font-semibold ${radius} ${
                  edition === 'kids'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-neutral-200/80 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                }`}
              >
                Kids Edition (PiggyPal)
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {isAdults ? 'Account Name' : 'Saver Name'}
            </label>
            <input
              type="text"
              placeholder="Account name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Currency (also available in Settings hover menu)
            </label>
            <select
              value={state.currency}
              onChange={(e) => onChangeCurrency(e.target.value as CurrencyCode)}
              className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Interface Theme
            </label>
            <select
              value={state.theme}
              onChange={(e) => onChangeTheme(e.target.value as 'light' | 'dark')}
              className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            >
              <option value="light">Crisp White</option>
              <option value="dark">High-Contrast Dark</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              if (name.trim()) onSaveAccountName(name.trim());
            }}
            className={`border px-4 py-2 text-sm font-semibold ${
              isAdults
                ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                : 'rounded-xl border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            Save Name
          </button>
        </div>
      </div>

      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            {isAdults ? 'Recurring Deposit & Security PIN' : 'Allowance & Parent PIN Control'}
          </h2>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {isAdults ? `Weekly Deposit / Paycheck (${sym})` : `Weekly Allowance (${sym})`}
              </label>
              <input
                type="number"
                step="0.50"
                min="0.50"
                value={allowance}
                onChange={(e) => setAllowance(e.target.value)}
                className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                PIN Code (Default: 1234)
              </label>
              <input
                type="text"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={pinEnabled}
              onChange={(e) => setPinEnabled(e.target.checked)}
              className="h-4 w-4 border-neutral-300"
            />
            <span>Require PIN for Deposits, Interest &amp; Custom Balance</span>
          </label>

          <button
            type="button"
            onClick={() => {
              const al = r2(parseFloat(allowance));
              onSaveControls({
                allowance: !Number.isNaN(al) && al > 0 ? al : state.allowance,
                pinCode: pinCode.trim() || state.pinCode,
                pinEnabled,
              });
            }}
            className={`border px-4 py-2 text-sm font-semibold ${
              isAdults
                ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                : 'rounded-xl border-slate-900 bg-slate-900 text-white hover:bg-slate-800 dark:bg-indigo-600'
            }`}
          >
            Save Controls
          </button>
        </div>
      </div>
    </div>
  );
};
