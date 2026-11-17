import React, { useMemo, useState } from 'react';
import { EditionMode, LedgerState } from '../../types/ledger';
import {
  currentYM,
  fmt,
  getAnnualReportData,
  getCurrencyConfig,
  getNext16thLabel,
  r2,
  todayStr,
} from '../../utils/ledgerUtils';

interface ReportViewProps {
  edition: EditionMode;
  state: LedgerState;
  selectedYear: number;
  onChangeYear: (year: number) => void;
  onCaptureCurrentMonth: () => void;
  onBackfillMonth: (payload: {
    ym: string;
    wallet: number;
    saved: number;
    share: number;
  }) => void;
  onPrintReport: () => void;
  onDownloadPDF: () => void;
  onDownloadHTML: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
  edition,
  state,
  selectedYear,
  onChangeYear,
  onCaptureCurrentMonth,
  onBackfillMonth,
  onPrintReport,
  onDownloadPDF,
  onDownloadHTML,
}) => {
  const isAdults = edition === 'adults';
  const [bfMonth, setBfMonth] = useState(currentYM());
  const [bfWallet, setBfWallet] = useState('');
  const [bfSaved, setBfSaved] = useState('');
  const [bfShare, setBfShare] = useState('0');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const cur = state.currency;
  const sym = getCurrencyConfig(cur).symbol;
  const curYear = new Date().getFullYear();

  const availableYears = useMemo(() => {
    const years = new Set<number>([curYear]);
    Object.keys(state.monthlySnapshots).forEach((k) => {
      const y = Number(k.slice(0, 4));
      if (!Number.isNaN(y) && y > 1990) years.add(y);
    });
    return [...years].sort((a, b) => b - a);
  }, [curYear, state.monthlySnapshots]);

  const report = useMemo(
    () => getAnnualReportData(state, selectedYear),
    [state, selectedYear]
  );

  const next16th = getNext16thLabel();

  const handleBackfillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bfMonth) return;
    onBackfillMonth({
      ym: bfMonth,
      wallet: Math.max(0, r2(parseFloat(bfWallet) || 0)),
      saved: Math.max(0, r2(parseFloat(bfSaved) || 0)),
      share: Math.max(0, r2(parseFloat(bfShare) || 0)),
    });
    setBfWallet('');
    setBfSaved('');
    setBfShare('0');
  };

  const W = 760;
  const H = 260;
  const padL = 58;
  const padR = 20;
  const padT = 30;
  const padB = 34;
  const cw = W - padL - padR;
  const ch = H - padT - padB;
  const maxVal = Math.max(10, ...report.rows.map((r) => (r.snap ? r.snap.total : 0)));
  const colW = cw / 12;

  const trendPoints = report.rows
    .map((r, idx) => {
      if (!r.snap) return null;
      const cx = padL + colW * idx + colW / 2;
      const totalH = (r.snap.total / maxVal) * ch;
      const by = padT + ch - totalH;
      return { idx, cx, by, row: r };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const hoveredRow = hoveredIdx !== null ? report.rows[hoveredIdx] : null;

  const boxClass = isAdults
    ? 'rounded-none border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900'
    : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900';

  const statBoxClass = isAdults
    ? 'rounded-none border border-neutral-200/80 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-950'
    : 'rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950';

  const radius = isAdults ? 'rounded-none' : 'rounded-lg';

  return (
    <div className="space-y-5">
      <div className="print-only hidden border-b border-neutral-300 pb-3">
        <h1 className="text-xl font-bold text-neutral-900">
          {isAdults ? 'BalanceLedger Annual Financial Report' : 'PiggyPal Annual Savings Report'} ({report.year})
        </h1>
        <p className="mt-1 text-xs text-neutral-600">
          Account: {state.name} · Currency: {cur} · Auto-Update Schedule: 16th of each month · Printed: {todayStr()}
        </p>
      </div>

      <div className={`print-surface ${boxClass}`}>
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Monthly Balance Chart &amp; Year-Long Improvement
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Schedule: Automatically records snapshot on the 16th of every month.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Report Year"
              value={selectedYear}
              onChange={(e) => onChangeYear(Number(e.target.value))}
              className={`font-num border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-800 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 ${radius}`}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onCaptureCurrentMonth}
              className={`border border-neutral-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${radius}`}
            >
              Update Current Month Now
            </button>
            <button
              type="button"
              onClick={onPrintReport}
              className={`border border-neutral-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${radius}`}
            >
              Print Report
            </button>
            <button
              type="button"
              onClick={onDownloadPDF}
              className={`border px-3 py-1.5 text-xs font-semibold ${
                isAdults
                  ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                  : 'rounded-lg border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={onDownloadHTML}
              className={`border px-3 py-1.5 text-xs font-semibold ${
                isAdults
                  ? 'rounded-none border-neutral-200/80 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white'
                  : 'rounded-lg border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              Download HTML
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={statBoxClass}>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Latest Recorded Month
            </div>
            <div className="font-num mt-1 text-xl font-bold text-neutral-950 dark:text-white">
              {report.latest && report.latest.snap ? fmt(report.latest.snap.total, cur) : fmt(0, cur)}
            </div>
            <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {report.latest ? `${report.latest.full} ${report.year}` : 'No entries yet'}
            </div>
          </div>

          <div className={statBoxClass}>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Month-Over-Month Change
            </div>
            <div
              className={`font-num mt-1 text-xl font-bold ${
                report.momDiff >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {report.momDiff >= 0 ? '+' : ''}
              {fmt(report.momDiff, cur)}
            </div>
            <div className="font-num mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {report.momPct}% vs. prior recorded month
            </div>
          </div>

          <div className={statBoxClass}>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Year-to-Date Improvement
            </div>
            <div
              className={`font-num mt-1 text-xl font-bold ${
                report.ytdDiff >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {report.ytdDiff >= 0 ? '+' : ''}
              {fmt(report.ytdDiff, cur)}
            </div>
            <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {report.first && report.latest
                ? `${report.first.short} to ${report.latest.short} ${report.year}`
                : 'Insufficient months'}
            </div>
          </div>

          <div className={statBoxClass}>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Next 16th Auto-Update
            </div>
            <div className="font-num mt-1 text-lg font-bold text-neutral-950 dark:text-white">
              {next16th}
            </div>
            <div className="font-num mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {state.lastAuto16Month
                ? `Last auto-run: ${state.lastAuto16Month}-16`
                : 'Last auto-run: Pending'}
            </div>
          </div>
        </div>

        <div className="relative mb-5 overflow-x-auto">
          {hoveredRow && hoveredRow.snap && (
            <div
              className={`no-print mb-2 flex flex-wrap items-center gap-3 border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 ${radius}`}
            >
              <span className="font-semibold">
                {hoveredRow.full} {report.year}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-num">Total: {fmt(hoveredRow.snap.total, cur)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-num">Reserve: {fmt(hoveredRow.snap.saved, cur)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-num">Checking: {fmt(hoveredRow.snap.wallet, cur)}</span>
              {hoveredRow.change !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-num font-semibold ${
                      hoveredRow.change >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    MoM: {hoveredRow.change >= 0 ? '+' : ''}
                    {fmt(hoveredRow.change, cur)} ({hoveredRow.pct}%)
                  </span>
                </>
              )}
            </div>
          )}

          <div className="min-w-[680px]">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className={`block max-h-[280px] w-full border border-neutral-200/80 bg-white dark:border-neutral-800 ${
                isAdults ? 'rounded-none' : 'rounded-xl'
              }`}
              role="img"
              aria-label={`Monthly balance bar chart for ${report.year}`}
            >
              {[0, 1, 2, 3, 4].map((i) => {
                const y = padT + ch - (ch * i) / 4;
                const val = ((maxVal * i) / 4).toFixed(0);
                return (
                  <g key={i}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={W - padR}
                      y2={y}
                      stroke="#d4d4d8"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                    <text
                      x={padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="11"
                      fill="#52525b"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {sym}
                      {val}
                    </text>
                  </g>
                );
              })}

              {report.rows.map((r, idx) => {
                const cx = padL + colW * idx + colW / 2;
                const barW = 28;
                const bx = cx - barW / 2;
                const totalH = r.snap ? (r.snap.total / maxVal) * ch : 0;
                const savedH = r.snap ? (r.snap.saved / maxVal) * ch : 0;
                const by = padT + ch - totalH;
                const barRx = isAdults ? 0 : 4;
                const primaryFill = isAdults ? '#f5f5f5' : '#4f46e5';
                const secondaryFill = isAdults ? '#ffffff' : '#93c5fd';
                const primaryStroke = isAdults ? '#a3a3a3' : 'none';
                const secondaryStroke = isAdults ? '#d4d4d8' : 'none';

                return (
                  <g
                    key={r.ym}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={padL + colW * idx}
                      y={padT}
                      width={colW}
                      height={ch}
                      fill={hoveredIdx === idx ? 'rgba(0, 0, 0, 0.02)' : 'transparent'}
                    />
                    <text
                      x={cx}
                      y={H - 10}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="600"
                      fill="#52525b"
                      fontFamily="DM Sans, sans-serif"
                    >
                      {r.short}
                    </text>
                    {r.snap && (
                      <>
                        <rect
                          x={bx}
                          y={by}
                          width={barW}
                          height={Math.max(1, totalH)}
                          rx={barRx}
                          fill={secondaryFill}
                          stroke={secondaryStroke}
                          strokeWidth={isAdults ? 1 : 0}
                        />
                        <rect
                          x={bx}
                          y={padT + ch - savedH}
                          width={barW}
                          height={Math.max(0, savedH)}
                          rx={barRx}
                          fill={primaryFill}
                          stroke={primaryStroke}
                          strokeWidth={isAdults ? 1 : 0}
                        />
                        <text
                          x={cx}
                          y={by - 6}
                          textAnchor="middle"
                          fontSize="10.5"
                          fontWeight="600"
                          fill="#27272a"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {sym}
                          {r.snap.total.toFixed(0)}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}

              {trendPoints.length >= 2 && (
                <>
                  <polyline
                    fill="none"
                    stroke={isAdults ? '#71717a' : '#15803d'}
                    strokeWidth="1.75"
                    points={trendPoints.map((p) => `${p.cx},${p.by}`).join(' ')}
                  />
                  {trendPoints.map((p) =>
                    isAdults ? (
                      <rect
                        key={p.row.ym}
                        x={p.cx - 3.5}
                        y={p.by - 3.5}
                        width="7"
                        height="7"
                        fill="#ffffff"
                        stroke="#71717a"
                        strokeWidth="1.5"
                      />
                    ) : (
                      <circle
                        key={p.row.ym}
                        cx={p.cx}
                        cy={p.by}
                        r="3.5"
                        fill="#15803d"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )
                  )}
                </>
              )}

              <rect
                x={W - 236}
                y={9}
                width="10"
                height="10"
                fill={isAdults ? '#f5f5f5' : '#4f46e5'}
                stroke={isAdults ? '#a3a3a3' : 'none'}
                strokeWidth={isAdults ? 1 : 0}
              />
              <text x={W - 221} y={18} fontSize="10.5" fill="#52525b" fontFamily="DM Sans, sans-serif">
                Reserve
              </text>
              <rect
                x={W - 166}
                y={9}
                width="10"
                height="10"
                fill={isAdults ? '#ffffff' : '#93c5fd'}
                stroke={isAdults ? '#d4d4d8' : 'none'}
                strokeWidth={isAdults ? 1 : 0}
              />
              <text x={W - 151} y={18} fontSize="10.5" fill="#52525b" fontFamily="DM Sans, sans-serif">
                Liquid/Alloc
              </text>
              <rect
                x={W - 64}
                y={10}
                width="8"
                height="8"
                fill={isAdults ? '#ffffff' : '#15803d'}
                stroke={isAdults ? '#71717a' : 'none'}
                strokeWidth={isAdults ? 1.5 : 0}
              />
              <text x={W - 51} y={18} fontSize="10.5" fill="#52525b" fontFamily="DM Sans, sans-serif">
                Trend
              </text>
            </svg>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-y border-neutral-200 bg-white text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
                <th className="px-3 py-2.5">Month</th>
                <th className="px-3 py-2.5 text-right">
                  {isAdults ? 'Checking' : 'Wallet'}
                </th>
                <th className="px-3 py-2.5 text-right">
                  {isAdults ? 'Reserve' : 'Saved'}
                </th>
                <th className="px-3 py-2.5 text-right">Alloc.</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5 text-right">Change</th>
                <th className="px-3 py-2.5 text-right">Growth %</th>
                <th className="px-3 py-2.5">Recorded / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {report.rows.map((r) => {
                if (!r.snap) {
                  return (
                    <tr key={r.ym} className="text-neutral-400 dark:text-neutral-500">
                      <td className="px-3 py-2.5 font-medium text-neutral-600 dark:text-neutral-400">
                        {r.full} {report.year}
                      </td>
                      <td className="font-num px-3 py-2.5 text-right">--</td>
                      <td className="font-num px-3 py-2.5 text-right">--</td>
                      <td className="font-num px-3 py-2.5 text-right">--</td>
                      <td className="font-num px-3 py-2.5 text-right">--</td>
                      <td className="font-num px-3 py-2.5 text-right">--</td>
                      <td className="font-num px-3 py-2.5 text-right">--</td>
                      <td className="px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                        Pending (16th)
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={r.ym} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="px-3 py-2.5 font-semibold text-neutral-900 dark:text-neutral-100">
                      {r.full} {report.year}
                    </td>
                    <td className="font-num px-3 py-2.5 text-right text-neutral-700 dark:text-neutral-300">
                      {fmt(r.snap.wallet, cur)}
                    </td>
                    <td className="font-num px-3 py-2.5 text-right text-neutral-700 dark:text-neutral-300">
                      {fmt(r.snap.saved, cur)}
                    </td>
                    <td className="font-num px-3 py-2.5 text-right text-neutral-700 dark:text-neutral-300">
                      {fmt(r.snap.share, cur)}
                    </td>
                    <td className="font-num px-3 py-2.5 text-right font-bold text-neutral-950 dark:text-white">
                      {fmt(r.snap.total, cur)}
                    </td>
                    <td
                      className={`font-num px-3 py-2.5 text-right font-semibold ${
                        r.change === null
                          ? 'text-neutral-400'
                          : r.change >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {r.change === null
                        ? '--'
                        : `${r.change >= 0 ? '+' : ''}${fmt(r.change, cur)}`}
                    </td>
                    <td
                      className={`font-num px-3 py-2.5 text-right font-semibold ${
                        r.pct === null
                          ? 'text-neutral-400'
                          : Number(r.pct) >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {r.pct === null
                        ? '--'
                        : `${Number(r.pct) >= 0 ? '+' : ''}${r.pct}%`}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="font-num">{r.snap.recordedDate}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{r.snap.mode}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`no-print ${boxClass}`}>
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            Edit or Backfill a Specific Month
          </h3>
        </div>
        <form
          onSubmit={handleBackfillSubmit}
          className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Month
            </label>
            <input
              type="month"
              required
              value={bfMonth}
              onChange={(e) => setBfMonth(e.target.value)}
              className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {isAdults ? `Checking (${sym})` : `Wallet (${sym})`}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={bfWallet}
              onChange={(e) => setBfWallet(e.target.value)}
              placeholder="0.00"
              className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {isAdults ? `Reserve (${sym})` : `Saved (${sym})`}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={bfSaved}
              onChange={(e) => setBfSaved(e.target.value)}
              placeholder="0.00"
              className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Allocation ({sym})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={bfShare}
              onChange={(e) => setBfShare(e.target.value)}
              className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
          <button
            type="submit"
            className={`border border-neutral-200/80 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white ${radius}`}
          >
            Save Month Entry
          </button>
        </form>
      </div>
    </div>
  );
};
