import React, { useMemo, useRef, useState } from 'react';
import { Download, Printer, Upload } from 'lucide-react';
import {
  ADULT_CATEGORIES,
  EditionMode,
  KIDS_CATEGORIES,
  LedgerState,
} from '../../types/ledger';
import {
  calcMonthlyBurn,
  fmt,
  getCurrencyConfig,
  r2,
  todayStr,
} from '../../utils/ledgerUtils';

interface AnalyticsViewProps {
  edition: EditionMode;
  state: LedgerState;
  onUpdateCategoryBudget: (category: string, limit: number) => void;
  onExportJSON: () => void;
  onImportJSON: (rawJson: string) => string | null;
  onSelectView: (view: 'bills' | 'report' | 'map') => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  edition,
  state,
  onUpdateCategoryBudget,
  onExportJSON,
  onImportJSON,
  onSelectView,
}) => {
  const isAdults = edition === 'adults';
  const cur = state.currency;
  const sym = getCurrencyConfig(cur).symbol;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<{ tone: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState('');

  const netWorth = r2(state.wallet + state.saved + state.share);
  const reserveRatio = netWorth > 0 ? Math.round((state.saved / netWorth) * 100) : 0;
  const monthlyBurn = calcMonthlyBurn(state.subscriptions);
  const totalOutflow = r2(state.bought.reduce((s, b) => s + b.price, 0));
  const baselineMonthlySpend = Math.max(monthlyBurn, totalOutflow, 1);
  const runwayMonths =
    state.saved > 0 ? (state.saved / baselineMonthlySpend).toFixed(1) : '0.0';

  const receivables = r2(
    state.ious.filter((i) => i.type === 'owedToMe').reduce((s, i) => s + i.amt, 0)
  );
  const payables = r2(
    state.ious.filter((i) => i.type === 'iOwe').reduce((s, i) => s + i.amt, 0)
  );
  const netIOU = r2(receivables - payables);

  const categoryRows = useMemo(() => {
    const baseList: string[] = [
      ...(isAdults ? ADULT_CATEGORIES : KIDS_CATEGORIES),
    ];
    const spentMap: Record<string, number> = {};

    state.bought.forEach((b) => {
      const cat = b.category || 'Other';
      spentMap[cat] = r2((spentMap[cat] || 0) + b.price);
      if (!baseList.includes(cat)) baseList.push(cat);
    });

    Object.keys(state.categoryBudgets).forEach((cat) => {
      if (!baseList.includes(cat)) baseList.push(cat);
    });

    return baseList.map((category) => {
      const actual = spentMap[category] || 0;
      const cap = state.categoryBudgets[category] || 0;
      const variance = cap > 0 ? r2(cap - actual) : 0;
      const pct = cap > 0 ? Math.min(100, Math.round((actual / cap) * 100)) : 0;
      const over = cap > 0 && actual > cap;
      return { category, actual, cap, variance, pct, over };
    });
  }, [state.bought, state.categoryBudgets, isAdults]);

  const totalBudgetCap = r2(
    categoryRows.reduce((sum, r) => sum + (r.cap > 0 ? r.cap : 0), 0)
  );

  const boxClass = isAdults
    ? 'rounded-none border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900'
    : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900';

  const statBoxClass = isAdults
    ? 'rounded-none border border-neutral-200/80 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950'
    : 'rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950';

  const radius = isAdults ? 'rounded-none' : 'rounded-lg';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const err = onImportJSON(String(reader.result || ''));
      if (err) {
        setImportStatus({ tone: 'err', text: err });
      } else {
        setImportStatus({ tone: 'ok', text: `Restored backup from ${file.name}.` });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5">
      {/* Print Header */}
      <div className="print-only hidden border-b border-neutral-300 pb-3">
        <h1 className="text-xl font-bold text-neutral-900">
          {state.name} — Formatted Financial Statement
        </h1>
        <p className="mt-1 text-xs text-neutral-600">
          Currency: {cur} · Statement Date: {todayStr()}
        </p>
      </div>

      {/* 1. Financial Health Ratio Strip */}
      <div className="no-print grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={statBoxClass}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Reserve Ratio
          </div>
          <div className="font-num mt-1.5 text-2xl font-bold text-neutral-950 dark:text-white">
            {reserveRatio}%
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {fmt(state.saved, cur)} protected of {fmt(netWorth, cur)}
          </div>
        </div>

        <div className={statBoxClass}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Reserve Runway
          </div>
          <div className="font-num mt-1.5 text-2xl font-bold text-neutral-950 dark:text-white">
            {runwayMonths} mo
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Monthly burn baseline: {fmt(baselineMonthlySpend, cur)}
          </div>
        </div>

        <div className={statBoxClass}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Net IOU Position
          </div>
          <div
            className={`font-num mt-1.5 text-2xl font-bold ${
              netIOU >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-700 dark:text-red-400'
            }`}
          >
            {netIOU >= 0 ? '+' : ''}
            {fmt(netIOU, cur)}
          </div>
          <div className="font-num mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            In {fmt(receivables, cur)} / Out {fmt(payables, cur)}
          </div>
        </div>

        <div className={statBoxClass}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Avoided Impulse Spend
          </div>
          <div className="font-num mt-1.5 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {fmt(state.skippedTotal, cur)}
          </div>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Saved via 72-Hour Review Queue
          </div>
        </div>
      </div>

      {/* 2. Formatted Category Budget & Spend Matrix */}
      <div className={`print-surface ${boxClass}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-bold text-neutral-950 dark:text-white">
              Formatted Category Budget &amp; Spend Breakdown
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Compare recorded category outflows against editable monthly budget caps.
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSelectView('bills')}
              className={`border border-neutral-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${radius}`}
            >
              Recurring Bills ({fmt(monthlyBurn, cur)}/mo)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={`inline-flex items-center gap-1.5 border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white ${radius}`}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-y border-neutral-200 bg-white text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5 text-right">Actual Spend</th>
                <th className="px-3 py-2.5 text-right">Monthly Budget Cap</th>
                <th className="px-3 py-2.5 text-right">Variance</th>
                <th className="w-44 px-3 py-2.5">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {categoryRows.map((row) => (
                <tr key={row.category} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                  <td className="px-3 py-2.5 font-semibold text-neutral-900 dark:text-neutral-100">
                    {row.category}
                  </td>
                  <td className="font-num px-3 py-2.5 text-right text-neutral-800 dark:text-neutral-200">
                    {fmt(row.actual, cur)}
                  </td>
                  <td className="font-num px-3 py-2.5 text-right">
                    {editingCat === row.category ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = Math.max(0, r2(parseFloat(editingVal) || 0));
                          onUpdateCategoryBudget(row.category, val);
                          setEditingCat(null);
                        }}
                        className="inline-flex items-center justify-end gap-1"
                      >
                        <input
                          type="number"
                          step="1"
                          min="0"
                          autoFocus
                          value={editingVal}
                          onChange={(e) => setEditingVal(e.target.value)}
                          className={`font-num w-24 border border-neutral-300 bg-white px-2 py-0.5 text-right text-xs text-neutral-900 outline-none dark:border-neutral-600 dark:bg-neutral-950 dark:text-white ${radius}`}
                        />
                        <button
                          type="submit"
                          className={`border border-neutral-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-900 ${radius}`}
                        >
                          Save
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCat(row.category);
                          setEditingVal(String(row.cap));
                        }}
                        title="Click to edit budget cap"
                        className="border-b border-dashed border-neutral-300 text-neutral-700 hover:text-neutral-950 dark:border-neutral-600 dark:text-neutral-300"
                      >
                        {row.cap > 0 ? fmt(row.cap, cur) : `Set Cap (${sym})`}
                      </button>
                    )}
                  </td>
                  <td
                    className={`font-num px-3 py-2.5 text-right font-semibold ${
                      row.cap <= 0
                        ? 'text-neutral-400'
                        : row.over
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {row.cap <= 0
                      ? '--'
                      : `${row.variance >= 0 ? '+' : ''}${fmt(row.variance, cur)}`}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2.5 flex-1 overflow-hidden border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-950 ${
                          isAdults ? 'rounded-none' : 'rounded-full'
                        }`}
                      >
                        <div
                          className={`h-full ${
                            row.over
                              ? 'bg-red-600'
                              : isAdults
                              ? 'bg-neutral-400 dark:bg-neutral-300'
                              : 'bg-indigo-600'
                          }`}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="font-num w-9 text-right text-[11px] text-neutral-500">
                        {row.cap > 0 ? `${row.pct}%` : '--'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-200 bg-neutral-50/40 font-bold dark:border-neutral-800 dark:bg-neutral-950">
                <td className="px-3 py-2.5 text-neutral-950 dark:text-white">Total</td>
                <td className="font-num px-3 py-2.5 text-right text-neutral-950 dark:text-white">
                  {fmt(totalOutflow, cur)}
                </td>
                <td className="font-num px-3 py-2.5 text-right text-neutral-950 dark:text-white">
                  {fmt(totalBudgetCap, cur)}
                </td>
                <td className="font-num px-3 py-2.5 text-right text-neutral-950 dark:text-white">
                  {totalBudgetCap > 0
                    ? `${totalBudgetCap - totalOutflow >= 0 ? '+' : ''}${fmt(
                        r2(totalBudgetCap - totalOutflow),
                        cur
                      )}`
                    : '--'}
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-normal text-neutral-500">
                  {state.bought.length} items
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 3. Formatted Account Statement Summary + Portable JSON Backup */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className={`print-surface ${boxClass}`}>
          <div className="mb-3 border-b border-neutral-100 pb-2.5 dark:border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
              Formatted Balance Sheet Summary
            </h3>
          </div>
          <dl className="divide-y divide-neutral-100 text-xs sm:text-sm dark:divide-neutral-800">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-neutral-600 dark:text-neutral-400">
                {isAdults ? 'Checking / Liquid Cash' : 'Spendable Wallet'}
              </dt>
              <dd className="font-num font-semibold text-neutral-950 dark:text-white">
                {fmt(state.wallet, cur)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-neutral-600 dark:text-neutral-400">
                {isAdults ? 'Savings & Protected Reserve' : 'Piggy Bank Savings'}
              </dt>
              <dd className="font-num font-semibold text-neutral-950 dark:text-white">
                {fmt(state.saved, cur)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-neutral-600 dark:text-neutral-400">
                {isAdults ? 'Tax / Giving Allocation' : 'Share & Giving Jar'}
              </dt>
              <dd className="font-num font-semibold text-neutral-950 dark:text-white">
                {fmt(state.share, cur)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="font-bold text-neutral-950 dark:text-white">Total Net Holdings</dt>
              <dd className="font-num font-bold text-neutral-950 dark:text-white">
                {fmt(netWorth, cur)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-neutral-600 dark:text-neutral-400">
                Active Recurring Commitments (Monthly)
              </dt>
              <dd className="font-num font-semibold text-amber-700 dark:text-amber-400">
                {fmt(monthlyBurn, cur)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-neutral-600 dark:text-neutral-400">
                Geotagged Expense Places
              </dt>
              <dd className="font-num font-semibold text-neutral-800 dark:text-neutral-200">
                <button
                  type="button"
                  onClick={() => onSelectView('map')}
                  className="underline hover:text-neutral-950"
                >
                  {state.pinnedPlaces.length} pinned
                </button>
              </dd>
            </div>
          </dl>
        </div>

        <div className={`no-print ${boxClass}`}>
          <div className="mb-3 border-b border-neutral-100 pb-2.5 dark:border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
              Portable Ledger Backup &amp; Restore (.json)
            </h3>
          </div>
          <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
            Download a complete snapshot of your balances, 12-month history, category budgets,
            recurring bills, and pinned map locations, or restore a saved backup file.
          </p>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onExportJSON}
              className={`inline-flex items-center gap-1.5 border px-3.5 py-2 text-xs font-semibold ${
                isAdults
                  ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                  : 'rounded-xl border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Full JSON Backup</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`inline-flex items-center gap-1.5 border border-neutral-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${radius}`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Restore From JSON</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {importStatus && (
            <p
              className={`mt-3 text-xs font-medium ${
                importStatus.tone === 'ok'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {importStatus.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
