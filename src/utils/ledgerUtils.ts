import {
  ADULTS_STORE_KEY,
  AnnualMonthRow,
  AnnualReportData,
  CURRENCIES,
  CurrencyCode,
  CurrencyConfig,
  DEFAULT_ADULT_STATE,
  DEFAULT_KIDS_STATE,
  EDITION_KEY,
  EditionMode,
  KIDS_STORE_KEY,
  LedgerState,
  MONTHS_FULL,
  MONTHS_SHORT,
} from '../types/ledger';

export function r2(n: number | string): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function getCurrencyConfig(code: CurrencyCode = 'USD'): CurrencyConfig {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

export function fmt(n: number | null | undefined, currency: CurrencyCode = 'USD'): string {
  const cfg = getCurrencyConfig(currency);
  const val = Number(n) || 0;
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  });
  return `${val < 0 ? '-' : ''}${cfg.symbol}${formatted}`;
}

export function getRankLabel(totalSavedAndWallet: number): string {
  if (totalSavedAndWallet >= 250) return 'Vault Master';
  if (totalSavedAndWallet >= 100) return 'Super Saver';
  if (totalSavedAndWallet >= 40) return 'Smart Builder';
  if (totalSavedAndWallet >= 10) return 'Penny Planner';
  return 'Coin Starter';
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function currentYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getNext16thLabel(): string {
  const now = new Date();
  let nextY = now.getFullYear();
  let nextM = now.getMonth();
  if (now.getDate() >= 16) {
    nextM += 1;
    if (nextM > 11) {
      nextM = 0;
      nextY += 1;
    }
  }
  return `${MONTHS_SHORT[nextM]} 16, ${nextY}`;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function loadActiveEdition(): EditionMode {
  try {
    const raw = localStorage.getItem(EDITION_KEY);
    return raw === 'kids' ? 'kids' : 'adults';
  } catch {
    return 'adults';
  }
}

export function saveActiveEdition(edition: EditionMode): void {
  try {
    localStorage.setItem(EDITION_KEY, edition);
  } catch {
    // Ignore storage errors cleanly
  }
}

export function loadLedgerState(edition: EditionMode): LedgerState {
  const key = edition === 'adults' ? ADULTS_STORE_KEY : KIDS_STORE_KEY;
  const fallback = edition === 'adults' ? DEFAULT_ADULT_STATE : DEFAULT_KIDS_STATE;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    const parsed = JSON.parse(raw) as Partial<LedgerState>;
    const base = structuredClone(fallback);
    return {
      ...base,
      ...parsed,
      categoryBudgets: {
        ...base.categoryBudgets,
        ...(parsed.categoryBudgets || {}),
      },
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
      pinnedPlaces: Array.isArray(parsed.pinnedPlaces) ? parsed.pinnedPlaces : [],
    };
  } catch {
    return structuredClone(fallback);
  }
}

export function saveLedgerState(state: LedgerState, edition: EditionMode): void {
  const key = edition === 'adults' ? ADULTS_STORE_KEY : KIDS_STORE_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage errors cleanly
  }
}

export function apply16thAutoSnapshot(state: LedgerState): LedgerState {
  const now = new Date();
  const day = now.getDate();
  const ym = currentYM();
  if (day >= 16 && state.lastAuto16Month !== ym) {
    const total = r2(state.wallet + state.saved + state.share);
    return {
      ...state,
      lastAuto16Month: ym,
      monthlySnapshots: {
        ...state.monthlySnapshots,
        [ym]: {
          wallet: r2(state.wallet),
          saved: r2(state.saved),
          share: r2(state.share),
          total,
          recordedDate: todayStr(),
          mode: 'Auto (16th Schedule)',
        },
      },
    };
  }
  return state;
}

export function getAnnualReportData(state: LedgerState, year: number): AnnualReportData {
  const rows: AnnualMonthRow[] = [];
  let prevTotal: number | null = null;

  for (let m = 0; m < 12; m += 1) {
    const ym = `${year}-${String(m + 1).padStart(2, '0')}`;
    const snap = state.monthlySnapshots[ym] || null;
    let change: number | null = null;
    let pct: string | null = null;

    if (snap && prevTotal !== null) {
      change = r2(snap.total - prevTotal);
      pct = prevTotal > 0 ? ((change / prevTotal) * 100).toFixed(1) : '0.0';
    }
    if (snap) {
      prevTotal = snap.total;
    }

    rows.push({
      idx: m,
      short: MONTHS_SHORT[m],
      full: MONTHS_FULL[m],
      ym,
      snap,
      change,
      pct,
    });
  }

  const recorded = rows.filter((r) => r.snap !== null);
  const latest = recorded.length ? recorded[recorded.length - 1] : null;
  const first = recorded.length ? recorded[0] : null;
  const prev = recorded.length >= 2 ? recorded[recorded.length - 2] : null;

  const ytdDiff =
    latest && first && latest.snap && first.snap
      ? r2(latest.snap.total - first.snap.total)
      : 0;
  const momDiff =
    latest && prev && latest.snap && prev.snap
      ? r2(latest.snap.total - prev.snap.total)
      : 0;
  const momPct =
    latest && prev && prev.snap && prev.snap.total > 0
      ? ((momDiff / prev.snap.total) * 100).toFixed(1)
      : '0.0';

  return { year, rows, recorded, latest, first, ytdDiff, momDiff, momPct };
}

export function buildBaselineState(
  edition: EditionMode,
  currentTheme: 'light' | 'dark',
  currentCurrency: CurrencyCode
): LedgerState {
  const yr = new Date().getFullYear();
  const sampleSnaps: LedgerState['monthlySnapshots'] = {};
  const today = todayStr();

  if (edition === 'adults') {
    const progression: Array<[number, number, number]> = [
      [820, 1400, 150],
      [910, 1750, 200],
      [780, 2100, 240],
      [1050, 2450, 280],
      [1120, 2800, 320],
      [960, 3200, 360],
      [1240, 3550, 410],
      [1180, 3900, 450],
      [1310, 4250, 500],
      [1390, 4600, 580],
      [1420, 4850, 650],
    ];
    const maxMonth = Math.min(11, new Date().getMonth() + 1);
    for (let i = 0; i < maxMonth; i += 1) {
      const ym = `${yr}-${String(i + 1).padStart(2, '0')}`;
      const [w, s, sh] = progression[i];
      sampleSnaps[ym] = {
        wallet: w,
        saved: s,
        share: sh,
        total: r2(w + s + sh),
        recordedDate: `${ym}-16`,
        mode: 'Auto (16th Schedule)',
      };
    }
    const last = progression[maxMonth - 1];

    return {
      ...structuredClone(DEFAULT_ADULT_STATE),
      name: 'Primary Account',
      theme: currentTheme,
      currency: currentCurrency,
      wallet: last[0],
      saved: last[1],
      share: last[2],
      allowance: 250,
      skippedTotal: 340,
      lastAuto16Month: currentYM(),
      monthlySnapshots: sampleSnaps,
      jars: [
        { id: 'j1', name: 'Emergency Reserve (6 Mo)', goal: 6000 },
        { id: 'j2', name: 'Annual Travel & Maintenance', goal: 2500 },
      ],
      wishes: [
        { id: 'w1', name: 'Ergonomic Office Chair', price: 420.0, category: 'Equipment' },
        { id: 'w2', name: '27-inch 4K Monitor', price: 540.0, category: 'Electronics' },
      ],
      paused: [{ id: 'p1', name: 'Discretionary Gadget Upgrade', price: 185.0 }],
      bought: [
        { id: 'b1', name: 'Monthly Groceries', price: 142.5, category: 'Groceries & Dining', date: today },
        { id: 'b2', name: 'Electric & Fiber Utility', price: 118.0, category: 'Housing & Utilities', date: today },
      ],
      ious: [
        { id: 'i1', type: 'owedToMe', person: 'Jordan M.', amt: 48.0, reason: 'Split dinner bill' },
      ],
      chores: [
        { id: 'c1', name: 'Contract Design Review Invoice', pay: 320.0 },
        { id: 'c2', name: 'Reimburse Travel Receipt', pay: 85.0 },
      ],
      subscriptions: [
        {
          id: 'sub1',
          name: 'Fiber Internet Service',
          amount: 65.0,
          cycle: 'monthly',
          dueDay: 5,
          category: 'Housing & Utilities',
          active: true,
        },
        {
          id: 'sub2',
          name: 'Cloud Storage & Backup',
          amount: 12.0,
          cycle: 'monthly',
          dueDay: 14,
          category: 'Subscriptions & Bills',
          active: true,
        },
        {
          id: 'sub3',
          name: 'Annual Domain & Hosting',
          amount: 144.0,
          cycle: 'yearly',
          dueDay: 20,
          category: 'Subscriptions & Bills',
          active: true,
        },
      ],
      activity: [
        {
          id: 'a1',
          title: 'Monthly 16th Snapshot Recorded',
          amountText: fmt(r2(last[0] + last[1] + last[2]), currentCurrency),
          badgeType: 'blue',
          date: today,
        },
        {
          id: 'a2',
          title: 'Savings Reserve Transfer',
          amountText: `+${fmt(250, currentCurrency)}`,
          badgeType: 'blue',
          date: today,
        },
      ],
    };
  }

  // Kids Edition sample data
  const progression: Array<[number, number, number]> = [
    [4.0, 10.0, 1.0],
    [5.5, 14.0, 1.5],
    [6.0, 18.5, 2.0],
    [5.0, 24.0, 2.0],
    [7.5, 27.0, 2.5],
    [8.0, 32.0, 3.0],
    [6.5, 38.0, 3.0],
    [9.0, 42.0, 3.5],
    [10.0, 48.0, 4.0],
    [11.5, 54.0, 4.5],
    [14.0, 62.0, 5.0],
  ];
  const maxMonth = Math.min(11, new Date().getMonth() + 1);
  for (let i = 0; i < maxMonth; i += 1) {
    const ym = `${yr}-${String(i + 1).padStart(2, '0')}`;
    const [w, s, sh] = progression[i];
    sampleSnaps[ym] = {
      wallet: w,
      saved: s,
      share: sh,
      total: r2(w + s + sh),
      recordedDate: `${ym}-16`,
      mode: 'Auto (16th Schedule)',
    };
  }
  const last = progression[maxMonth - 1];

  return {
    ...structuredClone(DEFAULT_KIDS_STATE),
    name: 'Saver',
    theme: currentTheme,
    currency: currentCurrency,
    wallet: last[0],
    saved: last[1],
    share: last[2],
    allowance: 5.0,
    skippedTotal: 12.5,
    lastAuto16Month: currentYM(),
    monthlySnapshots: sampleSnaps,
    jars: [
      { id: 'j1', name: 'Rainy Day Jar', goal: 50 },
      { id: 'j2', name: 'New Bike Fund', goal: 120 },
    ],
    wishes: [
      { id: 'w1', name: 'LEGO Technic Set', price: 28.0, category: 'Toys & Games' },
      { id: 'w2', name: 'Wireless Headphones', price: 65.0, category: 'Electronics' },
    ],
    paused: [{ id: 'p1', name: 'Impulse Candy Box', price: 6.5 }],
    bought: [
      { id: 'b1', name: 'Sketchbook & Markers', price: 7.5, category: 'Art & Books', date: today },
      { id: 'b2', name: 'Board Game', price: 14.0, category: 'Toys & Games', date: today },
    ],
    ious: [
      { id: 'i1', type: 'owedToMe', person: 'Brother', amt: 4.0, reason: 'Ice cream treat' },
    ],
    chores: [
      { id: 'c1', name: 'Organize study desk', pay: 2.0 },
      { id: 'c2', name: 'Help wash the car', pay: 3.0 },
    ],
    activity: [
      {
        id: 'a1',
        title: 'Monthly 16th Snapshot Recorded',
        amountText: fmt(r2(last[0] + last[1] + last[2]), currentCurrency),
        badgeType: 'blue',
        date: today,
      },
      {
        id: 'a2',
        title: 'Saved to Piggy Bank',
        amountText: `+${fmt(8, currentCurrency)}`,
        badgeType: 'blue',
        date: today,
      },
    ],
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStandaloneSVG(report: AnnualReportData, currency: CurrencyCode, edition: EditionMode): string {
  const cfg = getCurrencyConfig(currency);
  const W = 760;
  const H = 250;
  const padL = 58;
  const padR = 20;
  const padT = 26;
  const padB = 34;
  const cw = W - padL - padR;
  const ch = H - padT - padB;
  const maxVal = Math.max(10, ...report.rows.map((r) => (r.snap ? r.snap.total : 0)));

  let grid = '';
  for (let i = 0; i <= 4; i += 1) {
    const y = padT + ch - (ch * i) / 4;
    const val = ((maxVal * i) / 4).toFixed(0);
    grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#d4d4d8" stroke-width="1" stroke-dasharray="3,3" />`;
    grid += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#52525b" font-family="sans-serif">${escapeHtml(cfg.symbol)}${val}</text>`;
  }

  let bars = '';
  const pts: string[] = [];
  const colW = cw / 12;

  report.rows.forEach((r, idx) => {
    const cx = padL + colW * idx + colW / 2;
    bars += `<text x="${cx}" y="${H - 10}" text-anchor="middle" font-size="11" font-weight="600" fill="#3f3f46" font-family="sans-serif">${r.short}</text>`;
    if (r.snap) {
      const totalH = (r.snap.total / maxVal) * ch;
      const savedH = (r.snap.saved / maxVal) * ch;
      const barW = 28;
      const bx = cx - barW / 2;
      const by = padT + ch - totalH;
      const primaryColor = edition === 'adults' ? '#18181b' : '#4f46e5';
      const secondaryColor = edition === 'adults' ? '#a1a1aa' : '#93c5fd';
      bars += `<rect x="${bx}" y="${by}" width="${barW}" height="${Math.max(1, totalH)}" fill="${secondaryColor}" />`;
      bars += `<rect x="${bx}" y="${padT + ch - savedH}" width="${barW}" height="${Math.max(0, savedH)}" fill="${primaryColor}" />`;
      bars += `<text x="${cx}" y="${by - 6}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#09090b" font-family="sans-serif">${escapeHtml(cfg.symbol)}${r.snap.total.toFixed(0)}</text>`;
      pts.push(`${cx},${by}`);
    }
  });

  let trend = '';
  if (pts.length >= 2) {
    trend = `<polyline fill="none" stroke="#15803d" stroke-width="2" points="${pts.join(' ')}" />`;
    pts.forEach((p) => {
      const [px, py] = p.split(',');
      trend += `<rect x="${Number(px) - 3}" y="${Number(py) - 3}" width="6" height="6" fill="#15803d" stroke="#ffffff" stroke-width="1" />`;
    });
  }

  const primaryColor = edition === 'adults' ? '#18181b' : '#4f46e5';
  const secondaryColor = edition === 'adults' ? '#a1a1aa' : '#93c5fd';

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-height:270px; display:block; background:#ffffff; border:1px solid #d4d4d8;">${grid}${bars}${trend}<rect x="${W - 230}" y="8" width="10" height="10" fill="${primaryColor}" /><text x="${W - 216}" y="17" font-size="10.5" fill="#27272a" font-family="sans-serif">Reserve / Saved</text><rect x="${W - 130}" y="8" width="10" height="10" fill="${secondaryColor}" /><text x="${W - 116}" y="17" font-size="10.5" fill="#27272a" font-family="sans-serif">Liquid</text><rect x="${W - 60}" y="9" width="7" height="7" fill="#15803d" /><text x="${W - 49}" y="17" font-size="10.5" fill="#27272a" font-family="sans-serif">Trend</text></svg>`;
}

export function calcMonthlyBurn(subscriptions: LedgerState['subscriptions']): number {
  return r2(
    subscriptions
      .filter((s) => s.active)
      .reduce((sum, s) => {
        if (s.cycle === 'weekly') return sum + (s.amount * 52) / 12;
        if (s.cycle === 'yearly') return sum + s.amount / 12;
        return sum + s.amount;
      }, 0)
  );
}

export function exportLedgerJSON(state: LedgerState, edition: EditionMode): void {
  const payload = {
    app: edition === 'adults' ? 'BalanceLedger' : 'PiggyPal',
    edition,
    exportedAt: new Date().toISOString(),
    state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${edition === 'adults' ? 'balanceledger' : 'piggypal'}-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function parseLedgerBackupJSON(
  rawJson: string,
  edition: EditionMode
): LedgerState | null {
  try {
    const parsed = JSON.parse(rawJson) as { state?: Partial<LedgerState> } & Partial<LedgerState>;
    const candidate = parsed.state && typeof parsed.state === 'object' ? parsed.state : parsed;
    if (typeof candidate.wallet !== 'number' || typeof candidate.saved !== 'number') {
      return null;
    }
    const base = structuredClone(
      edition === 'adults' ? DEFAULT_ADULT_STATE : DEFAULT_KIDS_STATE
    );
    return {
      ...base,
      ...candidate,
      categoryBudgets: {
        ...base.categoryBudgets,
        ...(candidate.categoryBudgets || {}),
      },
      subscriptions: Array.isArray(candidate.subscriptions) ? candidate.subscriptions : [],
      pinnedPlaces: Array.isArray(candidate.pinnedPlaces) ? candidate.pinnedPlaces : [],
    };
  } catch {
    return null;
  }
}

export function exportLedgerCSV(state: LedgerState, edition: EditionMode): void {
  const rows = [['Date', 'Description', `Amount (${state.currency})`]];
  state.activity.forEach((a) => {
    rows.push([
      a.date,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.amountText.replace(/"/g, '""')}"`,
    ]);
  });
  const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${edition === 'adults' ? 'balanceledger' : 'piggypal'}-ledger-${todayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportReportHTML(state: LedgerState, year: number, edition: EditionMode): void {
  const rep = getAnnualReportData(state, year);
  const cur = state.currency;
  const svg = buildStandaloneSVG(rep, cur, edition);
  const titlePrefix = edition === 'adults' ? 'BalanceLedger Annual Financial Report' : 'PiggyPal Annual Savings Report';

  const tableRows = rep.rows
    .map((r) => {
      if (!r.snap) {
        return `<tr><td>${r.full} ${year}</td><td>--</td><td>--</td><td>--</td><td>--</td><td>--</td><td>--</td><td>Pending (16th)</td></tr>`;
      }
      const ch = r.change === null ? '--' : `${r.change >= 0 ? '+' : ''}${fmt(r.change, cur)}`;
      const pc = r.pct === null ? '--' : `${Number(r.pct) >= 0 ? '+' : ''}${r.pct}%`;
      return `<tr><td>${r.full} ${year}</td><td>${fmt(r.snap.wallet, cur)}</td><td>${fmt(r.snap.saved, cur)}</td><td>${fmt(r.snap.share, cur)}</td><td><strong>${fmt(r.snap.total, cur)}</strong></td><td>${ch}</td><td>${pc}</td><td>${escapeHtml(r.snap.recordedDate)} (${escapeHtml(r.snap.mode)})</td></tr>`;
    })
    .join('');

  const htmlDoc = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${titlePrefix} ${year}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #09090b; max-width: 920px; margin: 28px auto; padding: 0 16px; background: #ffffff; }
  h1 { font-size: 1.5rem; margin-bottom: 4px; }
  .sub { color: #52525b; font-size: 0.9rem; margin-bottom: 18px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi { border: 1px solid #d4d4d8; padding: 12px; background: #ffffff; }
  .kpi label { font-size: 0.72rem; text-transform: uppercase; color: #52525b; font-weight: 700; display: block; }
  .kpi div { font-size: 1.25rem; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 0.86rem; font-variant-numeric: tabular-nums; }
  th, td { border-bottom: 1px solid #e4e4e7; padding: 8px 10px; text-align: left; }
  th { background: #fafafa; font-size: 0.74rem; text-transform: uppercase; color: #52525b; border-top: 1px solid #d4d4d8; border-bottom: 1px solid #d4d4d8; }
</style></head><body>
  <h1>${titlePrefix} (${year})</h1>
  <div class="sub">Account: ${escapeHtml(state.name)} | Currency: ${cur} | Auto-update schedule: 16th of each month | Generated: ${todayStr()}</div>
  <div class="kpis">
    <div class="kpi"><label>Current Net Worth</label><div>${fmt(state.wallet + state.saved + state.share, cur)}</div></div>
    <div class="kpi"><label>Latest Month (${rep.latest ? rep.latest.short : 'None'})</label><div>${rep.latest && rep.latest.snap ? fmt(rep.latest.snap.total, cur) : fmt(0, cur)}</div></div>
    <div class="kpi"><label>Month-Over-Month</label><div>${rep.momDiff >= 0 ? '+' : ''}${fmt(rep.momDiff, cur)} (${rep.momPct}%)</div></div>
    <div class="kpi"><label>YTD Improvement</label><div>${rep.ytdDiff >= 0 ? '+' : ''}${fmt(rep.ytdDiff, cur)}</div></div>
  </div>
  ${svg}
  <table><thead><tr><th>Month</th><th>Checking/Liquid</th><th>Savings/Reserve</th><th>Allocation</th><th>Total</th><th>Change</th><th>Growth %</th><th>Status</th></tr></thead><tbody>${tableRows}</tbody></table>
</body></html>`;

  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${edition === 'adults' ? 'balanceledger' : 'piggypal'}-report-${year}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportReportPDF(state: LedgerState, year: number, edition: EditionMode): void {
  const rep = getAnnualReportData(state, year);
  const cur = state.currency;
  const cfg = getCurrencyConfig(cur);
  const pdfSym = /^[\x20-\x7E]+$/.test(cfg.symbol) ? cfg.symbol : `${cur} `;
  const fmtPdf = (n: number) => {
    const abs = Math.abs(n || 0).toFixed(cfg.decimals);
    return `${n < 0 ? '-' : ''}${pdfSym}${abs}`;
  };

  const titlePrefix = edition === 'adults' ? 'BalanceLedger Annual Financial Report' : 'PiggyPal Annual Savings Report';
  const ops: string[] = [];

  const safe = (s: string) =>
    String(s)
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

  const addText = (
    x: number,
    y: number,
    s: string,
    font = 'F1',
    size = 10,
    rgb: [number, number, number] = [0.06, 0.09, 0.16]
  ) => {
    ops.push(
      `${rgb[0]} ${rgb[1]} ${rgb[2]} rg BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${safe(s)}) Tj ET`
    );
  };

  const addRect = (x: number, y: number, w: number, h: number, rgb: [number, number, number]) => {
    ops.push(
      `${rgb[0]} ${rgb[1]} ${rgb[2]} rg ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`
    );
  };

  const addLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    rgb: [number, number, number] = [0.8, 0.84, 0.88],
    lw = 0.6
  ) => {
    ops.push(
      `${rgb[0]} ${rgb[1]} ${rgb[2]} RG ${lw} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`
    );
  };

  addRect(0, 728, 612, 64, edition === 'adults' ? [0.09, 0.09, 0.11] : [0.24, 0.28, 0.78]);
  addText(42, 760, `${titlePrefix} (${year})`, 'F2', 15, [1, 1, 1]);
  addText(
    42,
    742,
    `Account: ${state.name}  |  Currency: ${cur}  |  Auto-Updates Every 16th  |  Generated: ${todayStr()}`,
    'F1',
    8.5,
    [0.85, 0.85, 0.9]
  );

  addRect(42, 672, 125, 42, [0.96, 0.96, 0.97]);
  addText(50, 700, 'CURRENT NET WORTH', 'F2', 7.5, [0.35, 0.35, 0.4]);
  addText(50, 682, fmtPdf(state.wallet + state.saved + state.share), 'F2', 12);

  addRect(174, 672, 125, 42, [0.96, 0.96, 0.97]);
  addText(182, 700, 'LATEST MONTH', 'F2', 7.5, [0.35, 0.35, 0.4]);
  addText(182, 682, rep.latest && rep.latest.snap ? fmtPdf(rep.latest.snap.total) : fmtPdf(0), 'F2', 12);

  addRect(306, 672, 125, 42, [0.96, 0.96, 0.97]);
  addText(314, 700, 'MONTH-OVER-MONTH', 'F2', 7.5, [0.35, 0.35, 0.4]);
  addText(314, 682, `${rep.momDiff >= 0 ? '+' : ''}${fmtPdf(rep.momDiff)} (${rep.momPct}%)`, 'F2', 11);

  addRect(438, 672, 132, 42, [0.96, 0.96, 0.97]);
  addText(446, 700, 'YTD IMPROVEMENT', 'F2', 7.5, [0.35, 0.35, 0.4]);
  addText(446, 682, `${rep.ytdDiff >= 0 ? '+' : ''}${fmtPdf(rep.ytdDiff)}`, 'F2', 12);

  addText(42, 650, `Monthly Progress Chart (Jan - Dec ${year})`, 'F2', 11);
  const maxVal = Math.max(10, ...rep.rows.map((r) => (r.snap ? r.snap.total : 0)));
  const cx = 62;
  const cy = 485;
  const cw = 505;
  const ch = 142;

  for (let g = 0; g <= 4; g += 1) {
    const gy = cy + (ch * g) / 4;
    addLine(cx, gy, cx + cw, gy);
    addText(28, gy - 3, `${pdfSym}${((maxVal * g) / 4).toFixed(0)}`, 'F1', 7.5, [0.4, 0.4, 0.45]);
  }

  rep.rows.forEach((r, i) => {
    const bx = cx + 10 + i * 41.5;
    addText(bx + 3, cy - 12, r.short, 'F1', 8, [0.25, 0.25, 0.3]);
    if (r.snap) {
      const totH = Math.max(2, (r.snap.total / maxVal) * ch);
      const savH = (r.snap.saved / maxVal) * ch;
      addRect(bx, cy, 22, totH, edition === 'adults' ? [0.68, 0.68, 0.72] : [0.58, 0.77, 0.99]);
      if (savH > 0) addRect(bx, cy, 22, savH, edition === 'adults' ? [0.12, 0.12, 0.14] : [0.31, 0.27, 0.9]);
      addText(bx - 1, cy + totH + 4, `${pdfSym}${r.snap.total.toFixed(0)}`, 'F2', 7.5, [0.06, 0.06, 0.08]);
    }
  });

  const ty = 438;
  addRect(42, ty, 528, 20, [0.94, 0.94, 0.95]);
  addText(48, ty + 6, 'Month', 'F2', 8.5);
  addText(125, ty + 6, 'Checking', 'F2', 8.5);
  addText(195, ty + 6, 'Reserve', 'F2', 8.5);
  addText(260, ty + 6, 'Alloc.', 'F2', 8.5);
  addText(320, ty + 6, 'Total', 'F2', 8.5);
  addText(385, ty + 6, 'Change', 'F2', 8.5);
  addText(445, ty + 6, 'Growth', 'F2', 8.5);
  addText(495, ty + 6, 'Status', 'F2', 8.5);

  rep.rows.forEach((r, i) => {
    const ry = ty - 22 - i * 21;
    if (i % 2 === 1) addRect(42, ry, 528, 21, [0.98, 0.98, 0.99]);
    addText(48, ry + 6, `${r.short} ${year}`, 'F2', 8.5);
    if (r.snap) {
      addText(125, ry + 6, fmtPdf(r.snap.wallet), 'F1', 8.5);
      addText(195, ry + 6, fmtPdf(r.snap.saved), 'F1', 8.5);
      addText(260, ry + 6, fmtPdf(r.snap.share), 'F1', 8.5);
      addText(320, ry + 6, fmtPdf(r.snap.total), 'F2', 8.5);
      addText(
        385,
        ry + 6,
        r.change === null ? '--' : `${r.change >= 0 ? '+' : ''}${fmtPdf(r.change)}`,
        'F1',
        8.5
      );
      addText(
        445,
        ry + 6,
        r.pct === null ? '--' : `${Number(r.pct) >= 0 ? '+' : ''}${r.pct}%`,
        'F1',
        8.5
      );
      addText(495, ry + 6, r.snap.recordedDate, 'F1', 7.5, [0.35, 0.35, 0.4]);
    } else {
      addText(125, ry + 6, '--', 'F1', 8.5, [0.55, 0.55, 0.6]);
      addText(495, ry + 6, 'Pending (16th)', 'F1', 7.5, [0.55, 0.55, 0.6]);
    }
  });

  addText(
    42,
    42,
    `${edition === 'adults' ? 'BalanceLedger' : 'PiggyPal'} Annual Report  |  Snapshots update automatically on the 16th of every month.`,
    'F1',
    8,
    [0.45, 0.45, 0.5]
  );

  const streamStr = ops.join('\n');
  const objs = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamStr.length} >>\nstream\n${streamStr}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objs.forEach((o) => {
    offsets.push(pdf.length);
    pdf += o;
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  const bytes = new TextEncoder().encode(pdf);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${edition === 'adults' ? 'balanceledger' : 'piggypal'}-report-${year}.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);
}
