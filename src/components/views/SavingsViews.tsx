import React, { useState } from 'react';
import { CurrencyCode, EditionMode, LedgerState } from '../../types/ledger';
import { fmt, getCurrencyConfig, r2 } from '../../utils/ledgerUtils';

interface SavedReserveViewProps {
  edition: EditionMode;
  saved: number;
  currency: CurrencyCode;
  onMoveSavings: (dir: 'in' | 'out', amount: number, note: string) => string | null;
}

export const SavedReserveView: React.FC<SavedReserveViewProps> = ({
  edition,
  saved,
  currency,
  onMoveSavings,
}) => {
  const isAdults = edition === 'adults';
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const sym = getCurrencyConfig(currency).symbol;
  const radius = isAdults ? 'rounded-none' : 'rounded-xl';

  const handleMove = (dir: 'in' | 'out') => {
    setError('');
    const num = r2(parseFloat(amt));
    if (Number.isNaN(num) || num <= 0) {
      setError('Enter a valid positive amount.');
      return;
    }
    const err = onMoveSavings(dir, num, note.trim());
    if (err) {
      setError(err);
      return;
    }
    setAmt('');
    setNote('');
  };

  return (
    <div
      className={`max-w-2xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
        isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
      }`}
    >
      <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
        <h2 className="text-base font-bold text-neutral-950 dark:text-white">
          {isAdults ? 'Savings & Reserve Transfers' : 'Piggy Bank Vault (What I Saved)'}
        </h2>
        <span className="font-num text-xs font-semibold text-neutral-900 dark:text-neutral-200">
          {fmt(saved, currency)} {isAdults ? 'Reserved' : 'Saved'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Amount ({sym})
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Reference Note
          </label>
          <input
            type="text"
            placeholder="Reason for transfer"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
          />
        </div>
      </div>

      {error && <p className="mt-2 text-xs font-medium text-red-700 dark:text-red-400">{error}</p>}

      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => handleMove('in')}
          className={`flex-1 border px-4 py-2 text-sm font-semibold ${
            isAdults
              ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
              : 'rounded-xl border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isAdults ? 'Transfer Checking to Reserve' : 'Move Wallet to Piggy Bank'}
        </button>
        <button
          type="button"
          onClick={() => handleMove('out')}
          className={`flex-1 border border-neutral-200/80 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${radius}`}
        >
          {isAdults ? 'Withdraw Reserve to Checking' : 'Take Out to Wallet'}
        </button>
      </div>
    </div>
  );
};

interface JarsViewProps {
  edition: EditionMode;
  state: LedgerState;
  onAddJar: (name: string, goal: number) => void;
  onDeleteJar: (id: string) => void;
}

export const JarsView: React.FC<JarsViewProps> = ({
  edition,
  state,
  onAddJar,
  onDeleteJar,
}) => {
  const isAdults = edition === 'adults';
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const cur = state.currency;
  const sym = getCurrencyConfig(cur).symbol;
  const radius = isAdults ? 'rounded-none' : 'rounded-xl';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = r2(parseFloat(goal));
    if (!name.trim() || Number.isNaN(num) || num <= 0) return;
    onAddJar(name.trim(), num);
    setName('');
    setGoal('');
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
            {isAdults ? 'New Savings / Capital Goal' : 'New Savings Goal'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Goal Name
            </label>
            <input
              type="text"
              required
              placeholder={isAdults ? 'e.g., 6-Month Emergency Fund, Home Repair' : 'e.g., New Bike Fund'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Target Amount ({sym})
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              placeholder="1000.00"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
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
            Create Goal
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
            Active Savings Goals
          </h2>
        </div>

        {state.jars.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No savings goals created yet.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {state.jars.map((j) => {
              const pct = Math.min(100, Math.round((state.saved / j.goal) * 100));
              return (
                <div key={j.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {j.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-num text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        {fmt(state.saved, cur)} / {fmt(j.goal, cur)} ({pct}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteJar(j.id)}
                        className={`border border-neutral-200/80 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 ${
                          isAdults ? 'rounded-none' : 'rounded-lg'
                        }`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div
                    className={`mt-2 h-2 w-full overflow-hidden ${
                      isAdults
                        ? 'rounded-none border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-950'
                        : 'rounded-full bg-neutral-200 dark:bg-neutral-800'
                    }`}
                  >
                    <div
                      className={`h-full ${isAdults ? 'bg-neutral-200 dark:bg-neutral-600' : 'bg-indigo-600'}`}
                      style={{ width: `${pct}%` }}
                    />
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

interface InterestViewProps {
  edition: EditionMode;
  saved: number;
  currency: CurrencyCode;
  onApplyInterest: (rate: number) => void;
}

export const InterestView: React.FC<InterestViewProps> = ({
  edition,
  saved,
  currency,
  onApplyInterest,
}) => {
  const isAdults = edition === 'adults';
  const [rateStr, setRateStr] = useState('4.5');
  const rate = parseFloat(rateStr) || 0;
  const preview = r2(saved * (rate / 100));
  const base = saved || (isAdults ? 1000 : 10);
  const radius = isAdults ? 'rounded-none' : 'rounded-xl';

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            {isAdults ? 'Yield & Interest Calculator' : 'Piggy Bank Interest Calculator'}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Interest / Yield Rate (%)
            </label>
            <input
              type="number"
              min="0.1"
              max="50"
              step="0.25"
              value={rateStr}
              onChange={(e) => setRateStr(e.target.value)}
              className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Calculated Return
            </div>
            <div className="font-num py-2 text-lg font-bold text-emerald-700 dark:text-emerald-400">
              +{fmt(preview, currency)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onApplyInterest(rate)}
          className={`mt-4 w-full border px-4 py-2 text-sm font-semibold ${
            isAdults
              ? 'rounded-none border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-emerald-800 dark:bg-neutral-900 dark:text-emerald-400'
              : 'rounded-xl border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800'
          }`}
        >
          {isAdults ? 'Credit Yield to Reserve' : 'Add Interest to Piggy Bank'}
        </button>
      </div>

      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            Compounding Projection
          </h2>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {[1, 3, 6, 12].map((m) => (
            <div key={m} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-neutral-700 dark:text-neutral-300">
                {m} Period{m > 1 ? 's' : ''}{' '}
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  (base {fmt(base, currency)} at {rate}%)
                </span>
              </span>
              <span className="font-num font-semibold text-emerald-700 dark:text-emerald-400">
                {fmt(base * Math.pow(1 + rate / 100, m), currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ShareViewProps {
  edition: EditionMode;
  state: LedgerState;
  onAddShare: (amount: number, note: string) => string | null;
  onGiveShare: (amount: number, note: string) => string | null;
}

export const ShareView: React.FC<ShareViewProps> = ({
  edition,
  state,
  onAddShare,
  onGiveShare,
}) => {
  const isAdults = edition === 'adults';
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const cur = state.currency;
  const sym = getCurrencyConfig(cur).symbol;
  const radius = isAdults ? 'rounded-none' : 'rounded-xl';

  const handleAction = (mode: 'add' | 'give') => {
    setError('');
    const num = r2(parseFloat(amt));
    if (Number.isNaN(num) || num <= 0) {
      setError('Enter a valid positive amount.');
      return;
    }
    const err = mode === 'add' ? onAddShare(num, note.trim()) : onGiveShare(num, note.trim());
    if (err) {
      setError(err);
      return;
    }
    setAmt('');
    setNote('');
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            {isAdults ? 'Tax / Giving Allocation Fund' : 'Giving & Share Jar'}
          </h2>
          <span className="font-num text-xs font-semibold text-neutral-900 dark:text-neutral-200">
            {fmt(state.share, cur)} Allocated
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Amount ({sym})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Recipient / Purpose
            </label>
            <input
              type="text"
              placeholder={isAdults ? 'e.g., Quarterly tax, Charity' : 'e.g., Birthday Gift'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
        </div>

        {error && <p className="mt-2 text-xs font-medium text-red-700 dark:text-red-400">{error}</p>}

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => handleAction('add')}
            className={`flex-1 border px-4 py-2 text-sm font-semibold ${
              isAdults
                ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                : 'rounded-xl border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isAdults ? 'Allocate from Checking' : 'Put in Share Jar'}
          </button>
          <button
            type="button"
            onClick={() => handleAction('give')}
            className={`flex-1 border border-neutral-200/80 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${radius}`}
          >
            {isAdults ? 'Record Disbursal' : 'Give Gift / Donate'}
          </button>
        </div>
      </div>

      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">Disbursal Log</h2>
        </div>

        {state.shareLog.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No disbursals logged yet.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {state.shareLog.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {s.note}
                  </div>
                  <div className="font-num text-xs text-neutral-500 dark:text-neutral-400">
                    {s.date}
                  </div>
                </div>
                <span className="font-num text-sm font-semibold text-neutral-900 dark:text-neutral-200">
                  {fmt(s.amt, cur)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
