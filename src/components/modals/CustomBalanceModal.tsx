import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CurrencyCode, EditionMode } from '../../types/ledger';
import { getCurrencyConfig, r2 } from '../../utils/ledgerUtils';

interface CustomBalanceModalProps {
  open: boolean;
  edition: EditionMode;
  currency: CurrencyCode;
  initialWallet: number;
  initialSaved: number;
  initialShare: number;
  onClose: () => void;
  onApply: (payload: {
    wallet: number;
    saved: number;
    share: number;
    note: string;
    syncMonth: boolean;
  }) => void;
}

export const CustomBalanceModal: React.FC<CustomBalanceModalProps> = ({
  open,
  edition,
  currency,
  initialWallet,
  initialSaved,
  initialShare,
  onClose,
  onApply,
}) => {
  const isAdults = edition === 'adults';
  const [wallet, setWallet] = useState(initialWallet.toFixed(2));
  const [saved, setSaved] = useState(initialSaved.toFixed(2));
  const [share, setShare] = useState(initialShare.toFixed(2));
  const [note, setNote] = useState('Manual balance verification');
  const [syncMonth, setSyncMonth] = useState(true);

  const sym = getCurrencyConfig(currency).symbol;

  useEffect(() => {
    if (open) {
      setWallet(r2(initialWallet).toFixed(2));
      setSaved(r2(initialSaved).toFixed(2));
      setShare(r2(initialShare).toFixed(2));
      setNote(isAdults ? 'Manual balance verification' : 'Manual balance check');
      setSyncMonth(true);
    }
  }, [open, initialWallet, initialSaved, initialShare, isAdults]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply({
      wallet: Math.max(0, r2(parseFloat(wallet) || 0)),
      saved: Math.max(0, r2(parseFloat(saved) || 0)),
      share: Math.max(0, r2(parseFloat(share) || 0)),
      note: note.trim() || 'Custom balance calibration',
      syncMonth,
    });
  };

  const radius = isAdults ? 'rounded-none' : 'rounded-xl';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-balance-title"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-[2px]"
    >
      <div
        className={`w-full max-w-md border border-neutral-200 bg-white p-6 shadow-md dark:border-neutral-700 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl'
        }`}
      >
        <div className="mb-3 flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 id="custom-balance-title" className="text-base font-bold text-neutral-900 dark:text-white">
            Set Custom Balance ({currency})
          </h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="p-1 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          Enter the exact amount of money you hold right now across your accounts. This sets your current balances directly.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {isAdults ? `Checking / Liquid Cash (${sym})` : `My Wallet (${sym})`}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {isAdults ? `Savings & Reserve (${sym})` : `Piggy Bank (${sym})`}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={saved}
              onChange={(e) => setSaved(e.target.value)}
              className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {isAdults ? `Tax / Giving Allocation (${sym})` : `Giving / Share Jar (${sym})`}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={share}
              onChange={(e) => setShare(e.target.value)}
              className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Calibration Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={syncMonth}
              onChange={(e) => setSyncMonth(e.target.checked)}
              className="h-4 w-4 border-neutral-200"
            />
            <span>Update current month on the Monthly Chart now</span>
          </label>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className={`border border-neutral-200/80 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${radius}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`border px-4 py-2 text-xs font-semibold ${
                isAdults
                  ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                  : 'rounded-xl border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Apply Current Balance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
