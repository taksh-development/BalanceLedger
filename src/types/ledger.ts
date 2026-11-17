export type EditionMode = 'adults' | 'kids';

export type ViewId =
  | 'home'
  | 'report'
  | 'analytics'
  | 'bills'
  | 'map'
  | 'saved'
  | 'jars'
  | 'interest'
  | 'share'
  | 'wishes'
  | 'pause'
  | 'countdown'
  | 'bought'
  | 'iou'
  | 'chores'
  | 'settings'
  | 'admin';

export interface AccountRequestItem {
  id: string;
  fullName: string;
  email: string;
  requestedEdition: EditionMode;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  createdAtLabel: string;
  source: 'cloud' | 'local';
}

export type BadgeTone = 'green' | 'red' | 'blue' | 'amber';

export type CurrencyCode =
  | 'USD'
  | 'PAB'
  | 'EUR'
  | 'GBP'
  | 'CAD'
  | 'AUD'
  | 'MXN'
  | 'INR'
  | 'JPY';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  decimals: number;
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', label: 'US Dollar ($)', decimals: 2 },
  { code: 'PAB', symbol: 'B/.', label: 'Balboa (B/.)', decimals: 2 },
  { code: 'EUR', symbol: '€', label: 'Euro (€)', decimals: 2 },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)', decimals: 2 },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)', decimals: 2 },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)', decimals: 2 },
  { code: 'MXN', symbol: 'MX$', label: 'Mexican Peso (MX$)', decimals: 2 },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)', decimals: 2 },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (¥)', decimals: 0 },
];

export interface MonthlySnapshot {
  wallet: number;
  saved: number;
  share: number;
  total: number;
  recordedDate: string;
  mode: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  goal: number;
}

export interface PlannedPurchase {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface PausedItem {
  id: string;
  name: string;
  price: number;
}

export interface PurchaseEntry {
  id: string;
  name: string;
  price: number;
  category: string;
  date: string;
  placeId?: string;
  placeName?: string;
}

export interface IOUEntry {
  id: string;
  type: 'owedToMe' | 'iOwe';
  person: string;
  amt: number;
  reason: string;
}

export interface ChoreTask {
  id: string;
  name: string;
  pay: number;
}

export interface ShareDisbursal {
  id: string;
  note: string;
  amt: number;
  date: string;
}

export interface ActivityEntry {
  id: string;
  title: string;
  amountText: string;
  badgeType: BadgeTone;
  date: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  cycle: 'weekly' | 'monthly' | 'yearly';
  dueDay: number;
  category: string;
  active: boolean;
  lastPaidDate?: string;
}

export interface SavedLocationPin {
  id: string;
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  totalSpent: number;
  visitCount: number;
  notes: string;
  lastDate: string;
}

export interface LedgerState {
  name: string;
  theme: 'light' | 'dark';
  currency: CurrencyCode;
  wallet: number;
  saved: number;
  share: number;
  allowance: number;
  pinEnabled: boolean;
  pinCode: string;
  skippedTotal: number;
  lastAuto16Month: string;
  monthlySnapshots: Record<string, MonthlySnapshot>;
  jars: SavingsGoal[];
  wishes: PlannedPurchase[];
  paused: PausedItem[];
  bought: PurchaseEntry[];
  ious: IOUEntry[];
  chores: ChoreTask[];
  shareLog: ShareDisbursal[];
  activity: ActivityEntry[];
  categoryBudgets: Record<string, number>;
  subscriptions: RecurringBill[];
  pinnedPlaces: SavedLocationPin[];
}

export interface AnnualMonthRow {
  idx: number;
  short: string;
  full: string;
  ym: string;
  snap: MonthlySnapshot | null;
  change: number | null;
  pct: string | null;
}

export interface AnnualReportData {
  year: number;
  rows: AnnualMonthRow[];
  recorded: AnnualMonthRow[];
  latest: AnnualMonthRow | null;
  first: AnnualMonthRow | null;
  ytdDiff: number;
  momDiff: number;
  momPct: string;
}

export const EDITION_KEY = 'balanceledger_active_edition_v1';
export const ADULTS_STORE_KEY = 'balanceledger_adults_v1';
export const KIDS_STORE_KEY = 'piggypal_kids_ledger_v1';

export const ADULT_CATEGORIES = [
  'Groceries & Dining',
  'Housing & Utilities',
  'Transportation',
  'Subscriptions & Bills',
  'Healthcare',
  'Equipment',
  'Electronics',
  'Other',
] as const;

export const KIDS_CATEGORIES = [
  'Toys & Games',
  'Snacks & Treats',
  'Art & Books',
  'Clothing',
  'Electronics',
  'Other',
] as const;

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const DEFAULT_ADULT_STATE: LedgerState = {
  name: 'Primary Account',
  theme: 'light',
  currency: 'USD',
  wallet: 0,
  saved: 0,
  share: 0,
  allowance: 250,
  pinEnabled: false,
  pinCode: '1234',
  skippedTotal: 0,
  lastAuto16Month: '',
  monthlySnapshots: {},
  jars: [],
  wishes: [],
  paused: [],
  bought: [],
  ious: [],
  chores: [],
  shareLog: [],
  activity: [],
  categoryBudgets: {
    'Groceries & Dining': 450,
    'Housing & Utilities': 1200,
    'Transportation': 180,
    'Subscriptions & Bills': 120,
    'Healthcare': 100,
  },
  subscriptions: [],
  pinnedPlaces: [],
};

export const DEFAULT_KIDS_STATE: LedgerState = {
  name: 'Saver',
  theme: 'light',
  currency: 'USD',
  wallet: 0,
  saved: 0,
  share: 0,
  allowance: 5,
  pinEnabled: false,
  pinCode: '1234',
  skippedTotal: 0,
  lastAuto16Month: '',
  monthlySnapshots: {},
  jars: [],
  wishes: [],
  paused: [],
  bought: [],
  ious: [],
  chores: [],
  shareLog: [],
  activity: [],
  categoryBudgets: {
    'Toys & Games': 25,
    'Snacks & Treats': 10,
    'Art & Books': 15,
  },
  subscriptions: [],
  pinnedPlaces: [],
};
