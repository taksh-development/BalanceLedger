import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CurrencyCode, EditionMode } from '../types/ledger';
import { fmt, getCurrencyConfig, r2 } from '../utils/ledgerUtils';

interface FloatingToolsProps {
  edition: EditionMode;
  currency: CurrencyCode;
  coinOpen: boolean;
  calcOpen: boolean;
  onCloseCoin: () => void;
  onCloseCalc: () => void;
  onApplyCoinCount: (amount: number, dest: 'wallet' | 'saved') => void;
  onNotify: (msg: string) => void;
}

const COIN_VALS_KIDS = [0.01, 0.05, 0.1, 0.25, 1, 5, 10, 20];
const BILL_VALS_ADULTS = [1, 5, 10, 20, 50, 100, 0.25, 0.1];

export const FloatingTools: React.FC<FloatingToolsProps> = ({
  edition,
  currency,
  coinOpen,
  calcOpen,
  onCloseCoin,
  onCloseCalc,
  onApplyCoinCount,
  onNotify,
}) => {
  const isAdults = edition === 'adults';
  const [coinSum, setCoinSum] = useState(0);
  const [calcExpr, setCalcExpr] = useState('');
  const [calcDisplay, setCalcDisplay] = useState('0');
  const sym = getCurrencyConfig(currency).symbol;
  const denoms = isAdults ? BILL_VALS_ADULTS : COIN_VALS_KIDS;
  const radius = isAdults ? 'rounded-none' : 'rounded-lg';

  const handleApplyCoin = (dest: 'wallet' | 'saved') => {
    if (coinSum <= 0) {
      onNotify('Add denominations first.');
      return;
    }
    onApplyCoinCount(coinSum, dest);
    setCoinSum(0);
  };

  const handleCalcKey = (key: string) => {
    const next = calcExpr + key;
    setCalcExpr(next);
    setCalcDisplay(next);
  };

  const handleCalcClear = () => {
    setCalcExpr('');
    setCalcDisplay('0');
  };

  const handleCalcEval = () => {
    try {
      if (!calcExpr || !/^[0-9+\-*/. ]+$/.test(calcExpr)) {
        throw new Error('Invalid expression');
      }
      const res = Function(`"use strict"; return (${calcExpr})`)() as number;
      if (!Number.isFinite(res)) throw new Error('Non-finite');
      const rounded = String(r2(res));
      setCalcExpr(rounded);
      setCalcDisplay(rounded);
    } catch {
      setCalcDisplay('Error');
      setCalcExpr('');
    }
  };

  return (
    <>
      {coinOpen && (
        <div
          role="region"
          aria-label="Cash and Denomination Counter"
          className={`no-print fixed bottom-5 right-5 z-40 w-80 max-w-[calc(100vw-24px)] overflow-hidden border border-neutral-200 bg-white shadow-md dark:border-neutral-700 dark:bg-neutral-900 ${
            isAdults ? 'rounded-none' : 'rounded-xl'
          }`}
        >
          <div
            className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold ${
              isAdults
                ? 'border-b border-neutral-100 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white'
                : 'bg-indigo-700 text-white'
            }`}
          >
            <span>
              {isAdults ? `Cash & Bill Counter (${currency})` : `Coin & Cash Counter (${currency})`}
            </span>
            <button
              type="button"
              aria-label="Close Cash Counter"
              onClick={onCloseCoin}
              className={`p-0.5 ${
                isAdults
                  ? 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  : 'text-neutral-200 hover:text-white'
              }`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-3.5">
            <div
              className={`font-num mb-2.5 border border-neutral-200/80 bg-white px-3 py-2 text-right text-xl font-bold text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white ${radius}`}
            >
              {fmt(coinSum, currency)}
            </div>
            <div className="mb-3 grid grid-cols-4 gap-1.5">
              {denoms.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCoinSum((prev) => r2(prev + val))}
                  className={`font-num border border-neutral-200/80 bg-white py-2 text-xs font-semibold text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 ${radius}`}
                >
                  +{sym}
                  {val < 1 ? val.toFixed(2) : val}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyCoin('wallet')}
                className={`flex-1 border px-2.5 py-1.5 text-xs font-semibold ${
                  isAdults
                    ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                    : 'rounded-lg border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {isAdults ? 'To Checking' : 'Add to Wallet'}
              </button>
              <button
                type="button"
                onClick={() => handleApplyCoin('saved')}
                className={`flex-1 border px-2.5 py-1.5 text-xs font-semibold ${
                  isAdults
                    ? 'rounded-none border-neutral-200/80 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white'
                    : 'rounded-lg border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isAdults ? 'To Reserve' : 'Add to Piggy Bank'}
              </button>
              <button
                type="button"
                onClick={() => setCoinSum(0)}
                className={`border border-neutral-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${radius}`}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {calcOpen && (
        <div
          role="region"
          aria-label="Calculator"
          className={`no-print fixed bottom-5 left-5 z-40 w-72 max-w-[calc(100vw-24px)] overflow-hidden border border-neutral-200 bg-white shadow-md dark:border-neutral-700 dark:bg-neutral-900 ${
            isAdults ? 'rounded-none' : 'rounded-xl'
          }`}
        >
          <div
            className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold ${
              isAdults
                ? 'border-b border-neutral-100 bg-white text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white'
                : 'bg-slate-900 text-white'
            }`}
          >
            <span>{isAdults ? 'Financial Calculator' : 'Kid Calculator'}</span>
            <button
              type="button"
              aria-label="Close Calculator"
              onClick={onCloseCalc}
              className={`p-0.5 ${
                isAdults
                  ? 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-3.5">
            <div
              className={`font-num mb-2.5 truncate border border-neutral-200/80 bg-white px-3 py-2 text-right text-xl font-bold text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white ${radius}`}
            >
              {calcDisplay}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+'].map(
                (key) => {
                  const isOp = ['/', '*', '-', '+', '='].includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => (key === '=' ? handleCalcEval() : handleCalcKey(key))}
                      className={`font-num border py-2.5 text-sm font-bold transition-colors ${radius} ${
                        isOp
                          ? isAdults
                            ? 'border-neutral-300 bg-neutral-50/70 text-neutral-900 hover:border-neutral-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                            : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'border-neutral-200/80 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100'
                      }`}
                    >
                      {key}
                    </button>
                  );
                }
              )}
            </div>
            <button
              type="button"
              onClick={handleCalcClear}
              className={`mt-2 w-full border border-neutral-200/80 bg-white py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${radius}`}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  );
};
