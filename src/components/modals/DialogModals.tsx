import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { EditionMode } from '../../types/ledger';

interface PinModalProps {
  edition: EditionMode;
  open: boolean;
  expectedPin: string;
  actionLabel: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  edition,
  open,
  expectedPin,
  actionLabel,
  onCancel,
  onSuccess,
}) => {
  const isAdults = edition === 'adults';
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const radius = isAdults ? 'rounded-none' : 'rounded-lg';

  useEffect(() => {
    if (open) {
      setPin('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === expectedPin) {
      onSuccess();
    } else {
      setError('Incorrect PIN. Please try again.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-[2px]"
    >
      <div
        className={`w-full max-w-sm border border-neutral-200 bg-white p-5 shadow-md dark:border-neutral-700 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-xl'
        }`}
      >
        <div className="mb-3 flex items-center justify-between border-b border-neutral-100 pb-2.5 dark:border-neutral-800">
          <h2 id="pin-modal-title" className="text-sm font-bold text-neutral-900 dark:text-white">
            PIN Verification Required
          </h2>
          <button
            type="button"
            aria-label="Close PIN prompt"
            onClick={onCancel}
            className="p-1 text-neutral-500 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
          Enter the PIN code to authorize:{' '}
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">{actionLabel}</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            maxLength={6}
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError('');
            }}
            className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm tracking-widest text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
          />
          {error && (
            <p className="text-xs font-medium text-red-700 dark:text-red-400">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className={`border border-neutral-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${radius}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`border px-3.5 py-1.5 text-xs font-semibold ${
                isAdults
                  ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                  : 'rounded-lg border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Verify PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  edition: EditionMode;
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  edition,
  open,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}) => {
  const isAdults = edition === 'adults';
  const radius = isAdults ? 'rounded-none' : 'rounded-lg';

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-[2px]"
    >
      <div
        className={`w-full max-w-sm border border-neutral-200 bg-white p-5 shadow-md dark:border-neutral-700 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-xl'
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 id="confirm-modal-title" className="text-sm font-bold text-neutral-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close confirmation dialog"
            onClick={onCancel}
            className="p-1 text-neutral-500 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={`border border-neutral-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${radius}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`border px-3.5 py-1.5 text-xs font-semibold ${
              isAdults
                ? 'rounded-none border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50/40 dark:border-red-900 dark:bg-neutral-900 dark:text-red-400'
                : 'rounded-lg border-red-700 bg-red-700 text-white hover:bg-red-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
