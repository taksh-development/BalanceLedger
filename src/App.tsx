import { useCallback, useEffect, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { FloatingTools } from './components/FloatingTools';
import { KpiStrip } from './components/KpiStrip';
import { TopNav } from './components/TopNav';
import { WelcomeGate } from './components/WelcomeGate';
import { AuthModal, AuthModalTab } from './components/modals/AuthModal';
import { CustomBalanceModal } from './components/modals/CustomBalanceModal';
import { ConfirmModal, PinModal } from './components/modals/DialogModals';
import {
  OperationType,
  auth,
  buildCloudLedgerPayload,
  db,
  googleProvider,
  handleFirestoreError,
} from './firebase';
import { AdminView } from './components/views/AdminView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { ChoresView, SettingsView } from './components/views/ManageViews';
import { OverviewView } from './components/views/OverviewView';
import {
  BoughtView,
  CountdownView,
  IOUView,
  PauseView,
  WishesView,
} from './components/views/PurchaseViews';
import { ReportView } from './components/views/ReportView';
import {
  InterestView,
  JarsView,
  SavedReserveView,
  ShareView,
} from './components/views/SavingsViews';
import { SpendMapView } from './components/views/SpendMapView';
import { SubscriptionsView } from './components/views/SubscriptionsView';
import {
  AccountRequestItem,
  ActivityEntry,
  BadgeTone,
  CurrencyCode,
  DEFAULT_ADULT_STATE,
  DEFAULT_KIDS_STATE,
  EditionMode,
  LedgerState,
  ViewId,
} from './types/ledger';
import {
  apply16thAutoSnapshot,
  buildBaselineState,
  currentYM,
  exportLedgerCSV,
  exportLedgerJSON,
  exportReportHTML,
  exportReportPDF,
  fmt,
  getRankLabel,
  loadActiveEdition,
  loadLedgerState,
  parseLedgerBackupJSON,
  r2,
  saveActiveEdition,
  saveLedgerState,
  todayStr,
  uid,
} from './utils/ledgerUtils';

interface PendingPinAction {
  label: string;
  run: () => void;
}

const REQUESTS_STORE_KEY = 'balanceledger_account_requests_v1';
const ADMIN_SESSION_KEY = 'balanceledger_admin_session_v1';

function loadLocalRequests(): AccountRequestItem[] {
  try {
    const raw = localStorage.getItem(REQUESTS_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalRequests(items: AccountRequestItem[]): void {
  try {
    localStorage.setItem(REQUESTS_STORE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors cleanly
  }
}

function loadAdminSession(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveAdminSession(active: boolean): void {
  try {
    if (active) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch {
    // Ignore storage errors cleanly
  }
}

export default function App() {
  const [edition, setEdition] = useState<EditionMode>(() => loadActiveEdition());
  const [state, setState] = useState<LedgerState>(() =>
    apply16thAutoSnapshot(loadLedgerState(loadActiveEdition()))
  );
  const [activeView, setActiveView] = useState<ViewId>('home');
  const [reportYear, setReportYear] = useState<number>(() => new Date().getFullYear());
  const [customBalanceOpen, setCustomBalanceOpen] = useState(false);
  const [coinOpen, setCoinOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [pendingPinAction, setPendingPinAction] = useState<PendingPinAction | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [gmpExceeded, setGmpExceeded] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<AuthModalTab>('signin');
  const [cloudSynced, setCloudSynced] = useState(false);
  const [verifiedTick, setVerifiedTick] = useState(0);
  const [adminUsernameActive, setAdminUsernameActive] = useState<boolean>(() => loadAdminSession());
  const [localRequests, setLocalRequests] = useState<AccountRequestItem[]>(() =>
    loadLocalRequests()
  );
  const [cloudRequests, setCloudRequests] = useState<AccountRequestItem[]>([]);

  const stateRef = useRef(state);
  stateRef.current = state;
  const adminSessionRef = useRef(adminUsernameActive);
  adminSessionRef.current = adminUsernameActive;
  const skipNextCloudPushRef = useRef(false);
  const ledgerDocCreatedRef = useRef(false);
  const didAutoPromptRef = useRef(false);

  const isAdults = edition === 'adults';
  const cur = state.currency;

  const notify = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const ensureUserProfileDoc = useCallback(
    async (u: User, activeEd: EditionMode) => {
      const userPath = `users/${u.uid}`;
      const userRef = doc(db, 'users', u.uid);
      let snap;
      try {
        snap = await getDoc(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, userPath);
      }
      if (!snap.exists()) {
        try {
          await setDoc(userRef, {
            ownerId: u.uid,
            email: (u.email || 'account@balanceledger.app').slice(0, 254),
            displayName: (u.displayName || u.email?.split('@')[0] || 'Account Holder').slice(0, 80),
            preferredEdition: activeEd,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, userPath);
        }
      } else {
        const existingData = snap.data();
        if (existingData.preferredEdition !== activeEd) {
          try {
            await updateDoc(userRef, {
              preferredEdition: activeEd,
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, userPath);
          }
        }
      }
    },
    []
  );

  const pushLedgerToCloud = useCallback(
    async (u: User, activeEd: EditionMode, ledger: LedgerState) => {
      await ensureUserProfileDoc(u, activeEd);
      const ledgerPath = `users/${u.uid}/ledgers/${activeEd}`;
      const ledgerRef = doc(db, 'users', u.uid, 'ledgers', activeEd);
      const payload = buildCloudLedgerPayload(ledger, activeEd, u.uid);

      if (!ledgerDocCreatedRef.current) {
        let existingSnap;
        try {
          existingSnap = await getDoc(ledgerRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, ledgerPath);
        }
        if (!existingSnap.exists()) {
          try {
            await setDoc(ledgerRef, {
              ...payload,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            ledgerDocCreatedRef.current = true;
            return;
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, ledgerPath);
          }
        }
        ledgerDocCreatedRef.current = true;
      }

      const { ownerId: _o, edition: _e, ...mutableFields } = payload;
      try {
        await updateDoc(ledgerRef, {
          ...mutableFields,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, ledgerPath);
      }
    },
    [ensureUserProfileDoc]
  );

  const isFirebaseAdmin = Boolean(
    user && user.emailVerified && user.email?.toLowerCase() === 'takshdevelopment@gmail.com'
  );
  const isAdmin = adminUsernameActive || isFirebaseAdmin;

  useEffect(() => {
    saveLocalRequests(localRequests);
  }, [localRequests]);

  useEffect(() => {
    saveAdminSession(adminUsernameActive);
  }, [adminUsernameActive]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setCloudSynced(false);
        ledgerDocCreatedRef.current = false;
        if (!didAutoPromptRef.current && !adminSessionRef.current) {
          didAutoPromptRef.current = true;
          setAuthInitialTab('signin');
          setAuthOpen(true);
        }
      } else {
        didAutoPromptRef.current = true;
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setCloudSynced(false);
      ledgerDocCreatedRef.current = false;
      return;
    }

    let cancelled = false;
    let unsubSnapshot: (() => void) | null = null;
    const ledgerPath = `users/${user.uid}/ledgers/${edition}`;
    const ledgerRef = doc(db, 'users', user.uid, 'ledgers', edition);

    const startSync = async () => {
      await ensureUserProfileDoc(user, edition);
      if (cancelled) return;

      unsubSnapshot = onSnapshot(
        ledgerRef,
        (snap) => {
          if (cancelled) return;
          if (snap.exists()) {
            ledgerDocCreatedRef.current = true;
            setCloudSynced(true);
            if (!snap.metadata.hasPendingWrites) {
              const raw = snap.data();
              const base = structuredClone(
                edition === 'adults' ? DEFAULT_ADULT_STATE : DEFAULT_KIDS_STATE
              );
              const merged = apply16thAutoSnapshot({
                ...base,
                name: typeof raw.name === 'string' ? raw.name : base.name,
                theme: raw.theme === 'dark' ? 'dark' : 'light',
                currency: raw.currency || base.currency,
                wallet: typeof raw.wallet === 'number' ? raw.wallet : base.wallet,
                saved: typeof raw.saved === 'number' ? raw.saved : base.saved,
                share: typeof raw.share === 'number' ? raw.share : base.share,
                allowance: typeof raw.allowance === 'number' ? raw.allowance : base.allowance,
                pinEnabled: Boolean(raw.pinEnabled),
                pinCode: typeof raw.pinCode === 'string' ? raw.pinCode : base.pinCode,
                skippedTotal:
                  typeof raw.skippedTotal === 'number' ? raw.skippedTotal : base.skippedTotal,
                lastAuto16Month:
                  typeof raw.lastAuto16Month === 'string'
                    ? raw.lastAuto16Month
                    : base.lastAuto16Month,
                monthlySnapshots: raw.monthlySnapshots || {},
                jars: Array.isArray(raw.jars) ? raw.jars : [],
                wishes: Array.isArray(raw.wishes) ? raw.wishes : [],
                paused: Array.isArray(raw.paused) ? raw.paused : [],
                bought: Array.isArray(raw.bought) ? raw.bought : [],
                ious: Array.isArray(raw.ious) ? raw.ious : [],
                chores: Array.isArray(raw.chores) ? raw.chores : [],
                shareLog: Array.isArray(raw.shareLog) ? raw.shareLog : [],
                activity: Array.isArray(raw.activity) ? raw.activity : [],
                categoryBudgets: raw.categoryBudgets || base.categoryBudgets,
                subscriptions: Array.isArray(raw.subscriptions) ? raw.subscriptions : [],
                pinnedPlaces: Array.isArray(raw.pinnedPlaces) ? raw.pinnedPlaces : [],
              });
              skipNextCloudPushRef.current = true;
              setState(merged);
            }
          } else {
            ledgerDocCreatedRef.current = false;
            void pushLedgerToCloud(user, edition, stateRef.current).then(() => {
              if (!cancelled) setCloudSynced(true);
            });
          }
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, ledgerPath);
        }
      );
    };

    void startSync();

    return () => {
      cancelled = true;
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [authReady, user, verifiedTick, edition, ensureUserProfileDoc, pushLedgerToCloud]);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified || !cloudSynced) return;
    if (skipNextCloudPushRef.current) {
      skipNextCloudPushRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void pushLedgerToCloud(user, edition, state);
    }, 650);
    return () => clearTimeout(timer);
  }, [authReady, user, verifiedTick, edition, state, cloudSynced, pushLedgerToCloud]);

  useEffect(() => {
    if (!authReady || !isFirebaseAdmin) {
      setCloudRequests([]);
      return;
    }

    const reqQuery = query(
      collection(db, 'accountRequests'),
      where('status', 'in', ['pending', 'approved', 'rejected'])
    );

    const unsub = onSnapshot(
      reqQuery,
      (snap) => {
        const items: (AccountRequestItem & { sortMs: number })[] = snap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt as { toDate?: () => Date } | undefined;
          const dateObj = ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
          return {
            id: d.id,
            fullName: typeof data.fullName === 'string' ? data.fullName : 'Unknown',
            email: typeof data.email === 'string' ? data.email : '',
            requestedEdition: data.requestedEdition === 'kids' ? 'kids' : 'adults',
            reason: typeof data.reason === 'string' ? data.reason : '',
            status:
              data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending',
            reviewedBy: typeof data.reviewedBy === 'string' ? data.reviewedBy : undefined,
            createdAtLabel: dateObj ? dateObj.toISOString().slice(0, 10) : todayStr(),
            source: 'cloud',
            sortMs: dateObj ? dateObj.getTime() : 0,
          };
        });
        items.sort((a, b) => b.sortMs - a.sortMs);
        setCloudRequests(items.map(({ sortMs: _ms, ...rest }) => rest));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'accountRequests');
      }
    );

    return () => unsub();
  }, [authReady, isFirebaseAdmin, verifiedTick]);

  useEffect(() => {
    const onQuotaExceeded = () => setGmpExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    saveActiveEdition(edition);
    document.title =
      edition === 'adults'
        ? 'BalanceLedger — Personal Finance & Annual Progress Tracker'
        : 'PiggyPal — Kids Pocket Money & Annual Progress Tracker';
  }, [edition]);

  useEffect(() => {
    saveLedgerState(state, edition);
  }, [state, edition]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.theme]);

  const handleChangeEdition = (nextEdition: EditionMode) => {
    if (nextEdition === edition) return;
    saveLedgerState(state, edition);
    setEdition(nextEdition);
    const loaded = apply16thAutoSnapshot(loadLedgerState(nextEdition));
    setState(loaded);
    setActiveView('home');
    notify(
      nextEdition === 'adults'
        ? 'Switched to Adults Edition (White Ledger).'
        : 'Switched to Kids Edition (PiggyPal).'
    );
  };

  const appendActivity = (
    list: ActivityEntry[],
    title: string,
    amountText: string,
    badgeType: BadgeTone
  ): ActivityEntry[] => [
    { id: uid(), title, amountText, badgeType, date: todayStr() },
    ...list,
  ].slice(0, 40);

  const withPinGuard = (label: string, action: () => void) => {
    if (!state.pinEnabled) {
      action();
      return;
    }
    setPendingPinAction({ label, run: action });
  };

  const handleSelectView = (view: ViewId) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChangeCurrency = (currency: CurrencyCode) => {
    setState((prev) => ({ ...prev, currency }));
    notify(`Currency changed to ${currency}`);
  };

  const handleOpenCustomBalance = () => {
    withPinGuard('Set Custom Balance', () => setCustomBalanceOpen(true));
  };

  const handleApplyCustomBalance = (payload: {
    wallet: number;
    saved: number;
    share: number;
    note: string;
    syncMonth: boolean;
  }) => {
    const total = r2(payload.wallet + payload.saved + payload.share);
    const ym = currentYM();
    setState((prev) => ({
      ...prev,
      wallet: payload.wallet,
      saved: payload.saved,
      share: payload.share,
      activity: appendActivity(prev.activity, payload.note, `Set to ${fmt(total, cur)}`, 'blue'),
      monthlySnapshots: payload.syncMonth
        ? {
            ...prev.monthlySnapshots,
            [ym]: {
              wallet: payload.wallet,
              saved: payload.saved,
              share: payload.share,
              total,
              recordedDate: todayStr(),
              mode: 'Custom Balance Sync',
            },
          }
        : prev.monthlySnapshots,
    }));
    setCustomBalanceOpen(false);
    notify(`Custom balance applied: ${fmt(total, cur)}`);
  };

  const handleCollectAllowance = () => {
    withPinGuard(isAdults ? 'Record Recurring Deposit' : 'Collect Allowance', () => {
      setState((prev) => ({
        ...prev,
        wallet: r2(prev.wallet + prev.allowance),
        activity: appendActivity(
          prev.activity,
          isAdults ? 'Recurring Income Deposit' : 'Weekly Allowance Deposit',
          `+${fmt(prev.allowance, cur)}`,
          'green'
        ),
      }));
      notify(`Recorded deposit: +${fmt(state.allowance, cur)}`);
    });
  };

  const handleLoadBaseline = () => {
    const next = buildBaselineState(edition, state.theme, state.currency);
    setState(next);
    setReportYear(new Date().getFullYear());
    notify(isAdults ? '12-month adult sample data loaded.' : 'Fun sample data loaded!');
  };

  const handleRecordTransaction = (payload: {
    type: 'earn' | 'spend' | 'save' | 'share';
    amount: number;
    description: string;
    category: string;
  }): string | null => {
    const { type, amount, description, category } = payload;

    if (type !== 'earn' && amount > state.wallet) {
      return `Insufficient liquid cash (${fmt(state.wallet, cur)}).`;
    }

    setState((prev) => {
      if (type === 'earn') {
        return {
          ...prev,
          wallet: r2(prev.wallet + amount),
          activity: appendActivity(prev.activity, description, `+${fmt(amount, cur)}`, 'green'),
        };
      }
      if (type === 'spend') {
        return {
          ...prev,
          wallet: r2(prev.wallet - amount),
          bought: [
            { id: uid(), name: description, price: amount, category, date: todayStr() },
            ...prev.bought,
          ],
          activity: appendActivity(
            prev.activity,
            isAdults ? `Expense: ${description}` : `Bought: ${description}`,
            `-${fmt(amount, cur)}`,
            'red'
          ),
        };
      }
      if (type === 'save') {
        return {
          ...prev,
          wallet: r2(prev.wallet - amount),
          saved: r2(prev.saved + amount),
          activity: appendActivity(
            prev.activity,
            isAdults ? `Transfer to Reserve: ${description}` : `Saved to Piggy Bank: ${description}`,
            fmt(amount, cur),
            'blue'
          ),
        };
      }
      return {
        ...prev,
        wallet: r2(prev.wallet - amount),
        share: r2(prev.share + amount),
        activity: appendActivity(
          prev.activity,
          `Allocated: ${description}`,
          fmt(amount, cur),
          'blue'
        ),
      };
    });

    notify('Transaction recorded.');
    return null;
  };

  const handleApplyCoinCount = (amount: number, dest: 'wallet' | 'saved') => {
    setState((prev) => {
      if (dest === 'wallet') {
        return {
          ...prev,
          wallet: r2(prev.wallet + amount),
          activity: appendActivity(
            prev.activity,
            'Cash Counter Deposit (Checking)',
            `+${fmt(amount, cur)}`,
            'green'
          ),
        };
      }
      return {
        ...prev,
        saved: r2(prev.saved + amount),
        activity: appendActivity(
          prev.activity,
          'Cash Counter Deposit (Reserve)',
          `+${fmt(amount, cur)}`,
          'blue'
        ),
      };
    });
    notify(`Added ${fmt(amount, cur)} from Cash Counter.`);
  };

  const handleMoveSavings = (dir: 'in' | 'out', amount: number, note: string): string | null => {
    if (dir === 'in' && amount > state.wallet) {
      return `Insufficient checking balance (${fmt(state.wallet, cur)}).`;
    }
    if (dir === 'out' && amount > state.saved) {
      return `Insufficient reserve balance (${fmt(state.saved, cur)}).`;
    }
    setState((prev) => {
      if (dir === 'in') {
        return {
          ...prev,
          wallet: r2(prev.wallet - amount),
          saved: r2(prev.saved + amount),
          activity: appendActivity(
            prev.activity,
            note || 'Transfer to Savings Reserve',
            `+${fmt(amount, cur)}`,
            'blue'
          ),
        };
      }
      return {
        ...prev,
        saved: r2(prev.saved - amount),
        wallet: r2(prev.wallet + amount),
        activity: appendActivity(
          prev.activity,
          note || 'Withdrawal from Savings Reserve',
          `${fmt(amount, cur)} to Checking`,
          'amber'
        ),
      };
    });
    notify('Savings Reserve updated.');
    return null;
  };

  const handleApplyInterest = (rate: number) => {
    const earned = r2(state.saved * (rate / 100));
    if (earned <= 0) {
      notify(`Reserve needs more than ${fmt(0, cur)} to apply yield.`);
      return;
    }
    withPinGuard('Credit Interest / Yield', () => {
      setState((prev) => {
        const calc = r2(prev.saved * (rate / 100));
        return {
          ...prev,
          saved: r2(prev.saved + calc),
          activity: appendActivity(
            prev.activity,
            `Reserve Yield (${rate}%)`,
            `+${fmt(calc, cur)}`,
            'green'
          ),
        };
      });
      notify(`Credited +${fmt(earned, cur)} return.`);
    });
  };

  const handlePrintReport = () => {
    setActiveView('report');
    setTimeout(() => window.print(), 120);
  };

  const handleCaptureCurrentMonth = () => {
    const ym = currentYM();
    const total = r2(state.wallet + state.saved + state.share);
    setState((prev) => ({
      ...prev,
      lastAuto16Month: new Date().getDate() >= 16 ? ym : prev.lastAuto16Month,
      monthlySnapshots: {
        ...prev.monthlySnapshots,
        [ym]: {
          wallet: r2(prev.wallet),
          saved: r2(prev.saved),
          share: r2(prev.share),
          total,
          recordedDate: todayStr(),
          mode: 'Manual Update',
        },
      },
    }));
    notify(`Monthly chart updated for ${ym}.`);
  };

  const handleBackfillMonth = (payload: {
    ym: string;
    wallet: number;
    saved: number;
    share: number;
  }) => {
    setState((prev) => ({
      ...prev,
      monthlySnapshots: {
        ...prev.monthlySnapshots,
        [payload.ym]: {
          wallet: payload.wallet,
          saved: payload.saved,
          share: payload.share,
          total: r2(payload.wallet + payload.saved + payload.share),
          recordedDate: `${payload.ym}-16`,
          mode: 'Manual Entry (16th)',
        },
      },
    }));
    setReportYear(Number(payload.ym.slice(0, 4)));
    notify(`Saved snapshot for ${payload.ym}.`);
  };

  const handleRefreshVerification = useCallback(async () => {
    const activeUser = auth.currentUser;
    if (!activeUser) return;
    await reload(activeUser);
    await activeUser.getIdToken(true);
    setUser(auth.currentUser);
    setVerifiedTick((t) => t + 1);
  }, []);

  const handleSubmitAccountRequest = useCallback(
    async (payload: {
      fullName: string;
      email: string;
      requestedEdition: EditionMode;
      reason: string;
    }) => {
      const reqId = uid();
      const createdAtLabel = todayStr();
      const localItem: AccountRequestItem = {
        id: reqId,
        fullName: payload.fullName.slice(0, 80),
        email: payload.email.slice(0, 254),
        requestedEdition: payload.requestedEdition,
        reason: payload.reason.slice(0, 300),
        status: 'pending',
        createdAtLabel,
        source: 'local',
      };
      setLocalRequests((prev) => [localItem, ...prev]);

      try {
        await setDoc(doc(db, 'accountRequests', reqId), {
          fullName: localItem.fullName,
          email: localItem.email,
          requestedEdition: localItem.requestedEdition,
          reason: localItem.reason,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Local mirror already persisted cleanly if network/Firestore is unavailable
      }
    },
    []
  );

  const handleUpdateAccountRequestStatus = useCallback(
    async (req: AccountRequestItem, status: 'approved' | 'rejected') => {
      const reviewer = user?.email || 'admin';
      setLocalRequests((prev) =>
        prev.map((item) =>
          item.id === req.id ? { ...item, status, reviewedBy: reviewer } : item
        )
      );

      if (req.source === 'cloud' && isFirebaseAdmin) {
        const reqPath = `accountRequests/${req.id}`;
        try {
          await updateDoc(doc(db, 'accountRequests', req.id), {
            status,
            reviewedBy: reviewer.slice(0, 254),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, reqPath);
        }
      }
      notify(`Account request ${status}.`);
    },
    [isFirebaseAdmin, notify, user]
  );

  const handleDeleteAccountRequest = useCallback(
    async (req: AccountRequestItem) => {
      setLocalRequests((prev) => prev.filter((item) => item.id !== req.id));
      if (req.source === 'cloud' && isFirebaseAdmin) {
        const reqPath = `accountRequests/${req.id}`;
        try {
          await deleteDoc(doc(db, 'accountRequests', req.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, reqPath);
        }
      }
      notify('Account request deleted.');
    },
    [isFirebaseAdmin, notify]
  );

  const allRequests: AccountRequestItem[] = [
    ...cloudRequests,
    ...localRequests.filter((local) => !cloudRequests.some((cloud) => cloud.id === local.id)),
  ];

  const handleSignOutAll = async () => {
    if (user) {
      await signOut(auth);
    }
    setAdminUsernameActive(false);
    setActiveView('home');
    notify('Signed out. Local data remains saved.');
  };

  const rankLabel = getRankLabel(state.wallet + state.saved);
  const netWorth = r2(state.wallet + state.saved + state.share);

  if (!user && !adminUsernameActive) {
    return (
      <>
        <WelcomeGate
          edition={edition}
          onOpenSignIn={() => {
            setAuthInitialTab('signin');
            setAuthOpen(true);
          }}
          onOpenRequestAccount={() => {
            setAuthInitialTab('request');
            setAuthOpen(true);
          }}
          onChangeEdition={handleChangeEdition}
        />

        <AuthModal
          edition={edition}
          open={authOpen}
          initialTab={authInitialTab}
          user={user}
          adminUsernameActive={adminUsernameActive}
          isAdmin={isAdmin}
          cloudSynced={cloudSynced}
          onClose={() => setAuthOpen(false)}
          onNotify={notify}
          onRefreshUser={handleRefreshVerification}
          onAdminSignIn={() => {
            setAdminUsernameActive(true);
            setActiveView('admin');
          }}
          onAdminSignOut={() => setAdminUsernameActive(false)}
          onOpenAdminPanel={() => setActiveView('admin')}
          onSubmitAccountRequest={handleSubmitAccountRequest}
        />

        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`no-print fixed bottom-5 left-1/2 z-50 -translate-x-1/2 px-4 py-2 text-xs font-semibold ${
              isAdults
                ? 'rounded-none border border-neutral-200 bg-white text-neutral-800 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100'
                : 'rounded-full bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-950'
            }`}
          >
            {toast}
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors ${
        isAdults
          ? 'bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-100'
          : 'bg-[#f4f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100'
      }`}
    >
      {gmpExceeded && (
        <div className="no-print bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {user && !user.emailVerified && (
        <div className="no-print border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
          <span>
            Signed in as <strong>{user.email}</strong>. Verify your email to activate Firestore cloud
            sync.{' '}
          </span>
          <button
            type="button"
            onClick={async () => {
              try {
                await sendEmailVerification(user);
                notify('Verification email sent.');
              } catch {
                notify('Please wait a moment before resending verification email.');
              }
            }}
            className="ml-2 font-semibold underline hover:text-amber-950"
          >
            Resend Email
          </button>
          <button
            type="button"
            onClick={async () => {
              await handleRefreshVerification();
              if (auth.currentUser?.emailVerified) {
                notify('Email verified! Cloud sync enabled.');
              } else {
                notify('Email not verified yet.');
              }
            }}
            className="ml-3 font-semibold underline hover:text-amber-950"
          >
            Refresh Status
          </button>
        </div>
      )}

      <TopNav
        edition={edition}
        state={state}
        activeView={activeView}
        user={user}
        adminUsernameActive={adminUsernameActive}
        isAdmin={isAdmin}
        cloudSynced={cloudSynced}
        onSelectView={handleSelectView}
        onChangeEdition={handleChangeEdition}
        onChangeCurrency={handleChangeCurrency}
        onChangeTheme={(theme) => setState((prev) => ({ ...prev, theme }))}
        onOpenCustomBalance={handleOpenCustomBalance}
        onOpenCoinWindow={() => setCoinOpen(true)}
        onOpenCalcWindow={() => setCalcOpen(true)}
        onDownloadPDF={() => {
          exportReportPDF(state, reportYear, edition);
          notify(`Downloaded report PDF for ${reportYear}.`);
        }}
        onDownloadHTML={() => {
          exportReportHTML(state, reportYear, edition);
          notify(`Downloaded report HTML for ${reportYear}.`);
        }}
        onPrintReport={handlePrintReport}
        onLoadBaseline={handleLoadBaseline}
        onExportCSV={() => {
          exportLedgerCSV(state, edition);
          notify('Exported ledger CSV.');
        }}
        onExportJSON={() => {
          exportLedgerJSON(state, edition);
          notify('Exported full JSON backup.');
        }}
        onRequestReset={() => setResetConfirmOpen(true)}
        onOpenAuth={(tab) => {
          setAuthInitialTab(tab);
          setAuthOpen(true);
        }}
        onSignInGoogle={async () => {
          try {
            const cred = await signInWithPopup(auth, googleProvider);
            notify(`Signed in as ${cred.user.displayName || cred.user.email || 'user'}.`);
          } catch {
            setAuthInitialTab('signin');
            setAuthOpen(true);
          }
        }}
        onSignOut={handleSignOutAll}
        onSyncCloudNow={async () => {
          if (!user || !user.emailVerified) {
            setAuthInitialTab('signin');
            setAuthOpen(true);
            return;
          }
          await pushLedgerToCloud(user, edition, state);
          notify('Ledger synced to Firestore cloud.');
        }}
        onQuickDeposit={handleCollectAllowance}
        onQuickReserveMove={(amount) => {
          const err = handleMoveSavings('in', amount, 'Quick Reserve Transfer');
          if (err) notify(err);
        }}
        onQuickApplyYield={handleApplyInterest}
        onCaptureCurrentMonth={handleCaptureCurrentMonth}
      />

      <main className="mx-auto max-w-[1320px] px-4 pb-20 pt-5 sm:px-6">
        {/* Top Action Header */}
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              {isAdults ? `${state.name} — Financial Ledger` : `Hey ${state.name}!`}
            </h1>
            <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {isAdults
                ? `Net Worth: ${fmt(netWorth, cur)} · Currency: ${cur} · Monthly snapshot updates every 16th`
                : `Rank: ${rankLabel} · Currency: ${cur} · Monthly chart updates every 16th`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCollectAllowance}
              className={`border px-3.5 py-2 text-xs font-semibold transition-colors ${
                isAdults
                  ? 'rounded-none border-neutral-200/80 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'
                  : 'rounded-xl border-emerald-600 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
              }`}
            >
              {isAdults ? 'Record Recurring Deposit' : 'Collect Allowance'}
            </button>
            <button
              type="button"
              onClick={handleOpenCustomBalance}
              className={`border px-3.5 py-2 text-xs font-semibold transition-colors ${
                isAdults
                  ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'
                  : 'rounded-xl border-slate-900 bg-slate-900 text-white shadow-xs hover:bg-slate-800 dark:bg-indigo-600'
              }`}
            >
              Set Custom Balance
            </button>
            <button
              type="button"
              onClick={() => handleSelectView('report')}
              className={`border px-3.5 py-2 text-xs font-semibold transition-colors ${
                isAdults
                  ? 'rounded-none border-neutral-200/80 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'
                  : 'rounded-xl border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400'
              }`}
            >
              Monthly Chart &amp; PDF
            </button>
            <button
              type="button"
              onClick={() => handleSelectView('analytics')}
              className={`border px-3.5 py-2 text-xs font-semibold transition-colors ${
                isAdults
                  ? 'rounded-none border-neutral-200/80 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'
                  : 'rounded-xl border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400'
              }`}
            >
              Budgets &amp; Statement
            </button>
            <button
              type="button"
              onClick={() => handleSelectView('map')}
              className={`border px-3.5 py-2 text-xs font-semibold transition-colors ${
                isAdults
                  ? 'rounded-none border-neutral-200/80 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'
                  : 'rounded-xl border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400'
              }`}
            >
              Spend Map
            </button>
            <button
              type="button"
              onClick={handleLoadBaseline}
              className={`border px-3.5 py-2 text-xs font-semibold transition-colors ${
                isAdults
                  ? 'rounded-none border-neutral-200/80 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'
                  : 'rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              {isAdults ? 'Load 12-Month Sample' : 'Load Fun Sample Data'}
            </button>
            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className={`border px-3.5 py-2 text-xs font-semibold transition-colors ${
                isAdults
                  ? 'rounded-none border-neutral-200/80 bg-white text-neutral-700 hover:border-red-200 hover:text-red-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'
                  : 'rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              Reset
            </button>
          </div>
        </div>

        <KpiStrip edition={edition} state={state} onSelectView={handleSelectView} />

        {/* Active View Content */}
        {activeView === 'home' && (
          <OverviewView
            edition={edition}
            state={state}
            onRecordTransaction={handleRecordTransaction}
            onOpenCustomBalance={handleOpenCustomBalance}
          />
        )}

        {activeView === 'report' && (
          <ReportView
            edition={edition}
            state={state}
            selectedYear={reportYear}
            onChangeYear={setReportYear}
            onCaptureCurrentMonth={handleCaptureCurrentMonth}
            onBackfillMonth={handleBackfillMonth}
            onPrintReport={handlePrintReport}
            onDownloadPDF={() => {
              exportReportPDF(state, reportYear, edition);
              notify(`Downloaded report PDF for ${reportYear}.`);
            }}
            onDownloadHTML={() => {
              exportReportHTML(state, reportYear, edition);
              notify(`Downloaded report HTML for ${reportYear}.`);
            }}
          />
        )}

        {activeView === 'analytics' && (
          <AnalyticsView
            edition={edition}
            state={state}
            onUpdateCategoryBudget={(category, limit) => {
              setState((prev) => ({
                ...prev,
                categoryBudgets: {
                  ...prev.categoryBudgets,
                  [category]: limit,
                },
              }));
              notify(`Updated budget cap for ${category}.`);
            }}
            onExportJSON={() => {
              exportLedgerJSON(state, edition);
              notify('Exported full JSON backup.');
            }}
            onImportJSON={(rawJson) => {
              const restored = parseLedgerBackupJSON(rawJson, edition);
              if (!restored) return 'Invalid backup JSON format.';
              setState(apply16thAutoSnapshot(restored));
              notify('Ledger backup restored.');
              return null;
            }}
            onSelectView={(v) => handleSelectView(v)}
          />
        )}

        {activeView === 'bills' && (
          <SubscriptionsView
            edition={edition}
            state={state}
            onAddBill={(payload) => {
              setState((prev) => ({
                ...prev,
                subscriptions: [
                  ...prev.subscriptions,
                  { id: uid(), active: true, ...payload },
                ],
              }));
              notify('Recurring bill added.');
            }}
            onToggleBill={(id) => {
              setState((prev) => ({
                ...prev,
                subscriptions: prev.subscriptions.map((b) =>
                  b.id === id ? { ...b, active: !b.active } : b
                ),
              }));
            }}
            onPayBill={(id) => {
              const bill = state.subscriptions.find((b) => b.id === id);
              if (!bill) return null;
              if (bill.amount > state.wallet) {
                return `Insufficient checking balance (${fmt(state.wallet, cur)}).`;
              }
              const today = todayStr();
              setState((prev) => ({
                ...prev,
                wallet: r2(prev.wallet - bill.amount),
                subscriptions: prev.subscriptions.map((b) =>
                  b.id === id ? { ...b, lastPaidDate: today } : b
                ),
                bought: [
                  {
                    id: uid(),
                    name: `${bill.name} (${bill.cycle})`,
                    price: bill.amount,
                    category: bill.category,
                    date: today,
                  },
                  ...prev.bought,
                ],
                activity: appendActivity(
                  prev.activity,
                  `Recurring Bill Paid: ${bill.name}`,
                  `-${fmt(bill.amount, cur)}`,
                  'red'
                ),
              }));
              notify(`Paid ${bill.name} (${fmt(bill.amount, cur)}).`);
              return null;
            }}
            onDeleteBill={(id) => {
              setState((prev) => ({
                ...prev,
                subscriptions: prev.subscriptions.filter((b) => b.id !== id),
              }));
            }}
          />
        )}

        {activeView === 'map' && (
          <SpendMapView
            edition={edition}
            state={state}
            onPinPlace={(place) => {
              setState((prev) => {
                const exists = prev.pinnedPlaces.some((p) => p.placeId === place.placeId);
                if (exists) return prev;
                return {
                  ...prev,
                  pinnedPlaces: [
                    {
                      id: uid(),
                      placeId: place.placeId,
                      name: place.name,
                      address: place.address,
                      lat: place.lat,
                      lng: place.lng,
                      category: place.category,
                      totalSpent: 0,
                      visitCount: 0,
                      notes: place.notes,
                      lastDate: todayStr(),
                    },
                    ...prev.pinnedPlaces,
                  ],
                };
              });
              notify(`Pinned ${place.name} to Spend Map.`);
            }}
            onRemovePinnedPlace={(id) => {
              setState((prev) => ({
                ...prev,
                pinnedPlaces: prev.pinnedPlaces.filter((p) => p.id !== id),
              }));
              notify('Removed pinned place.');
            }}
            onLogExpenseAtPlace={(payload) => {
              if (payload.source === 'wallet' && payload.amount > state.wallet) {
                return `Insufficient checking balance (${fmt(state.wallet, cur)}).`;
              }
              if (payload.source === 'saved' && payload.amount > state.saved) {
                return `Insufficient reserve balance (${fmt(state.saved, cur)}).`;
              }
              const today = todayStr();
              setState((prev) => {
                const existing = prev.pinnedPlaces.find(
                  (p) => p.placeId === payload.placeId
                );
                const updatedPins = existing
                  ? prev.pinnedPlaces.map((p) =>
                      p.placeId === payload.placeId
                        ? {
                            ...p,
                            category: payload.category,
                            totalSpent: r2(p.totalSpent + payload.amount),
                            visitCount: p.visitCount + 1,
                            notes: payload.notes || p.notes,
                            lastDate: today,
                          }
                        : p
                    )
                  : [
                      {
                        id: uid(),
                        placeId: payload.placeId,
                        name: payload.name,
                        address: payload.address,
                        lat: payload.lat,
                        lng: payload.lng,
                        category: payload.category,
                        totalSpent: payload.amount,
                        visitCount: 1,
                        notes: payload.notes,
                        lastDate: today,
                      },
                      ...prev.pinnedPlaces,
                    ];

                return {
                  ...prev,
                  wallet:
                    payload.source === 'wallet'
                      ? r2(prev.wallet - payload.amount)
                      : prev.wallet,
                  saved:
                    payload.source === 'saved'
                      ? r2(prev.saved - payload.amount)
                      : prev.saved,
                  pinnedPlaces: updatedPins,
                  bought: [
                    {
                      id: uid(),
                      name: payload.notes ? `${payload.name} — ${payload.notes}` : payload.name,
                      price: payload.amount,
                      category: payload.category,
                      date: today,
                      placeId: payload.placeId,
                      placeName: payload.name,
                    },
                    ...prev.bought,
                  ],
                  activity: appendActivity(
                    prev.activity,
                    `Expense @ ${payload.name}`,
                    `-${fmt(payload.amount, cur)}`,
                    'red'
                  ),
                };
              });
              notify(`Logged ${fmt(payload.amount, cur)} at ${payload.name}.`);
              return null;
            }}
          />
        )}

        {activeView === 'saved' && (
          <SavedReserveView
            edition={edition}
            saved={state.saved}
            currency={cur}
            onMoveSavings={handleMoveSavings}
          />
        )}

        {activeView === 'jars' && (
          <JarsView
            edition={edition}
            state={state}
            onAddJar={(name, goal) => {
              setState((prev) => ({
                ...prev,
                jars: [...prev.jars, { id: uid(), name, goal }],
              }));
              notify('Savings goal added.');
            }}
            onDeleteJar={(id) => {
              setState((prev) => ({
                ...prev,
                jars: prev.jars.filter((j) => j.id !== id),
              }));
            }}
          />
        )}

        {activeView === 'interest' && (
          <InterestView
            edition={edition}
            saved={state.saved}
            currency={cur}
            onApplyInterest={handleApplyInterest}
          />
        )}

        {activeView === 'share' && (
          <ShareView
            edition={edition}
            state={state}
            onAddShare={(amount, note) => {
              if (amount > state.wallet) {
                return `Insufficient liquid balance (${fmt(state.wallet, cur)}).`;
              }
              setState((prev) => ({
                ...prev,
                wallet: r2(prev.wallet - amount),
                share: r2(prev.share + amount),
                activity: appendActivity(
                  prev.activity,
                  `Allocated: ${note || 'Allocation fund'}`,
                  fmt(amount, cur),
                  'blue'
                ),
              }));
              notify('Allocation recorded.');
              return null;
            }}
            onGiveShare={(amount, note) => {
              if (amount > state.share) {
                return `Insufficient allocation fund (${fmt(state.share, cur)}).`;
              }
              const label = note || 'Disbursal';
              setState((prev) => ({
                ...prev,
                share: r2(prev.share - amount),
                shareLog: [
                  { id: uid(), note: label, amt: amount, date: todayStr() },
                  ...prev.shareLog,
                ],
                activity: appendActivity(
                  prev.activity,
                  `Disbursed: ${label}`,
                  `-${fmt(amount, cur)}`,
                  'amber'
                ),
              }));
              notify('Disbursal recorded.');
              return null;
            }}
          />
        )}

        {activeView === 'wishes' && (
          <WishesView
            edition={edition}
            state={state}
            onAddWish={(name, price, category) => {
              setState((prev) => ({
                ...prev,
                wishes: [...prev.wishes, { id: uid(), name, price, category }],
              }));
              notify('Planned purchase added.');
            }}
            onBuyWish={(id) => {
              const w = state.wishes.find((x) => x.id === id);
              if (!w) return;
              const avail = r2(state.wallet + state.saved);
              if (avail < w.price) return;
              setState((prev) => {
                let rem = w.price;
                let nw = prev.wallet;
                let ns = prev.saved;
                if (nw >= rem) {
                  nw = r2(nw - rem);
                } else {
                  rem = r2(rem - nw);
                  nw = 0;
                  ns = r2(ns - rem);
                }
                return {
                  ...prev,
                  wallet: nw,
                  saved: ns,
                  wishes: prev.wishes.filter((x) => x.id !== id),
                  bought: [
                    {
                      id: uid(),
                      name: w.name,
                      price: w.price,
                      category: w.category,
                      date: todayStr(),
                    },
                    ...prev.bought,
                  ],
                  activity: appendActivity(
                    prev.activity,
                    `Purchased: ${w.name}`,
                    `-${fmt(w.price, cur)}`,
                    'red'
                  ),
                };
              });
              notify(`Purchased: ${w.name}`);
            }}
            onDeleteWish={(id) => {
              setState((prev) => ({
                ...prev,
                wishes: prev.wishes.filter((x) => x.id !== id),
              }));
            }}
          />
        )}

        {activeView === 'pause' && (
          <PauseView
            edition={edition}
            state={state}
            onAddPaused={(name, price) => {
              setState((prev) => ({
                ...prev,
                paused: [...prev.paused, { id: uid(), name, price }],
              }));
              notify('Item placed in review queue.');
            }}
            onSkipPaused={(id) => {
              const item = state.paused.find((p) => p.id === id);
              if (!item) return;
              setState((prev) => ({
                ...prev,
                skippedTotal: r2(prev.skippedTotal + item.price),
                paused: prev.paused.filter((p) => p.id !== id),
                activity: appendActivity(
                  prev.activity,
                  `Declined Discretionary Spend: ${item.name}`,
                  `Avoided ${fmt(item.price, cur)}`,
                  'green'
                ),
              }));
              notify(`Avoided spending ${fmt(item.price, cur)}.`);
            }}
            onBuyPaused={(id) => {
              const item = state.paused.find((p) => p.id === id);
              if (!item) return null;
              if (item.price > state.wallet) {
                return `Insufficient checking cash (${fmt(state.wallet, cur)}).`;
              }
              setState((prev) => ({
                ...prev,
                wallet: r2(prev.wallet - item.price),
                paused: prev.paused.filter((p) => p.id !== id),
                bought: [
                  {
                    id: uid(),
                    name: item.name,
                    price: item.price,
                    category: 'Reviewed Purchase',
                    date: todayStr(),
                  },
                  ...prev.bought,
                ],
                activity: appendActivity(
                  prev.activity,
                  `Purchased (Post-Review): ${item.name}`,
                  `-${fmt(item.price, cur)}`,
                  'red'
                ),
              }));
              notify(`Purchased: ${item.name}`);
              return null;
            }}
          />
        )}

        {activeView === 'countdown' && <CountdownView edition={edition} state={state} />}

        {activeView === 'bought' && (
          <BoughtView
            edition={edition}
            state={state}
            onLogPurchase={({ name, price, source, category }) => {
              if (source === 'wallet' && price > state.wallet) {
                return `Insufficient checking balance (${fmt(state.wallet, cur)}).`;
              }
              if (source === 'saved' && price > state.saved) {
                return `Insufficient reserve balance (${fmt(state.saved, cur)}).`;
              }
              setState((prev) => ({
                ...prev,
                wallet: source === 'wallet' ? r2(prev.wallet - price) : prev.wallet,
                saved: source === 'saved' ? r2(prev.saved - price) : prev.saved,
                bought: [
                  { id: uid(), name, price, category, date: todayStr() },
                  ...prev.bought,
                ],
                activity: appendActivity(
                  prev.activity,
                  `Expense: ${name}`,
                  `-${fmt(price, cur)}`,
                  'red'
                ),
              }));
              notify('Expense recorded.');
              return null;
            }}
          />
        )}

        {activeView === 'iou' && (
          <IOUView
            edition={edition}
            state={state}
            onAddIOU={(payload) => {
              setState((prev) => ({
                ...prev,
                ious: [...prev.ious, { id: uid(), ...payload }],
              }));
              notify('IOU recorded.');
            }}
            onSettleIOU={(id) => {
              const item = state.ious.find((x) => x.id === id);
              if (!item) return null;
              if (item.type === 'iOwe' && item.amt > state.wallet) {
                return `Insufficient checking balance (${fmt(state.wallet, cur)}).`;
              }
              setState((prev) => ({
                ...prev,
                wallet:
                  item.type === 'owedToMe'
                    ? r2(prev.wallet + item.amt)
                    : r2(prev.wallet - item.amt),
                ious: prev.ious.filter((x) => x.id !== id),
                activity: appendActivity(
                  prev.activity,
                  item.type === 'owedToMe'
                    ? `Receivable Collected from ${item.person}`
                    : `Payable Paid to ${item.person}`,
                  item.type === 'owedToMe' ? `+${fmt(item.amt, cur)}` : `-${fmt(item.amt, cur)}`,
                  item.type === 'owedToMe' ? 'green' : 'red'
                ),
              }));
              notify('IOU settled.');
              return null;
            }}
          />
        )}

        {activeView === 'chores' && (
          <ChoresView
            edition={edition}
            state={state}
            onAddChore={(name, pay) => {
              setState((prev) => ({
                ...prev,
                chores: [...prev.chores, { id: uid(), name, pay }],
              }));
              notify('Item added.');
            }}
            onCompleteChore={(id) => {
              const chore = state.chores.find((c) => c.id === id);
              if (!chore) return;
              setState((prev) => ({
                ...prev,
                wallet: r2(prev.wallet + chore.pay),
                chores: prev.chores.filter((c) => c.id !== id),
                activity: appendActivity(
                  prev.activity,
                  `Paid: ${chore.name}`,
                  `+${fmt(chore.pay, cur)}`,
                  'green'
                ),
              }));
              notify(`Credited ${fmt(chore.pay, cur)}.`);
            }}
            onDeleteChore={(id) => {
              setState((prev) => ({
                ...prev,
                chores: prev.chores.filter((c) => c.id !== id),
              }));
            }}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            edition={edition}
            state={state}
            onChangeEdition={handleChangeEdition}
            onSaveAccountName={(name) => {
              setState((prev) => ({ ...prev, name }));
              notify('Account name updated.');
            }}
            onChangeCurrency={handleChangeCurrency}
            onChangeTheme={(theme) => {
              setState((prev) => ({ ...prev, theme }));
            }}
            onSaveControls={(controls) => {
              setState((prev) => ({
                ...prev,
                allowance: controls.allowance,
                pinCode: controls.pinCode,
                pinEnabled: controls.pinEnabled,
              }));
              notify('Settings saved.');
            }}
          />
        )}

        {activeView === 'admin' && isAdmin && (
          <AdminView
            edition={edition}
            state={state}
            user={user}
            adminUsernameActive={adminUsernameActive}
            isFirebaseAdmin={isFirebaseAdmin}
            requests={allRequests}
            onApproveRequest={(req) => {
              void handleUpdateAccountRequestStatus(req, 'approved');
            }}
            onRejectRequest={(req) => {
              void handleUpdateAccountRequestStatus(req, 'rejected');
            }}
            onDeleteRequest={(req) => {
              void handleDeleteAccountRequest(req);
            }}
            onConnectGoogleAdmin={async () => {
              try {
                const cred = await signInWithPopup(auth, googleProvider);
                notify(`Signed in as ${cred.user.displayName || cred.user.email || 'Admin'}.`);
              } catch {
                notify('Could not open Google Admin sign-in popup.');
              }
            }}
            onTogglePinLock={(enabled) => {
              setState((prev) => ({ ...prev, pinEnabled: enabled }));
              notify(enabled ? 'PIN protection enabled.' : 'PIN protection disabled.');
            }}
            onChangeEdition={handleChangeEdition}
            onLoadBaseline={handleLoadBaseline}
            onExportJSON={() => {
              exportLedgerJSON(state, edition);
              notify('Exported full JSON backup.');
            }}
            onOpenCustomBalance={handleOpenCustomBalance}
          />
        )}
      </main>

      <CustomBalanceModal
        edition={edition}
        open={customBalanceOpen}
        currency={cur}
        initialWallet={state.wallet}
        initialSaved={state.saved}
        initialShare={state.share}
        onClose={() => setCustomBalanceOpen(false)}
        onApply={handleApplyCustomBalance}
      />

      <PinModal
        edition={edition}
        open={pendingPinAction !== null}
        expectedPin={state.pinCode}
        actionLabel={pendingPinAction?.label || ''}
        onCancel={() => setPendingPinAction(null)}
        onSuccess={() => {
          const action = pendingPinAction?.run;
          setPendingPinAction(null);
          if (action) action();
        }}
      />

      <ConfirmModal
        edition={edition}
        open={resetConfirmOpen}
        title={`Reset ${isAdults ? 'Adults Edition' : 'Kids Edition'} Data`}
        message="This will clear all balances, transactions, planned purchases, and monthly chart snapshots for the active edition."
        confirmLabel="Reset Everything"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          setState(
            structuredClone(isAdults ? DEFAULT_ADULT_STATE : DEFAULT_KIDS_STATE)
          );
          setResetConfirmOpen(false);
          notify('All data reset.');
        }}
      />

      <FloatingTools
        edition={edition}
        currency={cur}
        coinOpen={coinOpen}
        calcOpen={calcOpen}
        onCloseCoin={() => setCoinOpen(false)}
        onCloseCalc={() => setCalcOpen(false)}
        onApplyCoinCount={handleApplyCoinCount}
        onNotify={notify}
      />

      <AuthModal
        edition={edition}
        open={authOpen}
        initialTab={authInitialTab}
        user={user}
        adminUsernameActive={adminUsernameActive}
        isAdmin={isAdmin}
        cloudSynced={cloudSynced}
        onClose={() => setAuthOpen(false)}
        onNotify={notify}
        onRefreshUser={handleRefreshVerification}
        onAdminSignIn={() => {
          setAdminUsernameActive(true);
          setActiveView('admin');
        }}
        onAdminSignOut={() => {
          setAdminUsernameActive(false);
          setActiveView('home');
        }}
        onOpenAdminPanel={() => setActiveView('admin')}
        onSubmitAccountRequest={handleSubmitAccountRequest}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`no-print fixed bottom-5 left-1/2 z-50 -translate-x-1/2 px-4 py-2 text-xs font-semibold ${
            isAdults
              ? 'rounded-none border border-neutral-200 bg-white text-neutral-800 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100'
              : 'rounded-full bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-950'
          }`}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
