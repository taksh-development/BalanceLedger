import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  CURRENCIES,
  CurrencyCode,
  EditionMode,
  LedgerState,
  ViewId,
} from '../types/ledger';
import { currentYM, fmt, getCurrencyConfig } from '../utils/ledgerUtils';

interface TopNavProps {
  edition: EditionMode;
  state: LedgerState;
  activeView: ViewId;
  user: User | null;
  cloudSynced: boolean;
  onSelectView: (view: ViewId) => void;
  onChangeEdition: (edition: EditionMode) => void;
  onChangeCurrency: (currency: CurrencyCode) => void;
  onChangeTheme: (theme: 'light' | 'dark') => void;
  onOpenCustomBalance: () => void;
  onOpenCoinWindow: () => void;
  onOpenCalcWindow: () => void;
  onDownloadPDF: () => void;
  onDownloadHTML: () => void;
  onPrintReport: () => void;
  onLoadBaseline: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onRequestReset: () => void;
  onOpenAuth: (tab: 'signin' | 'signup') => void;
  onSignInGoogle: () => void;
  onSignOut: () => void;
  onSyncCloudNow: () => void;
  onQuickDeposit: () => void;
  onQuickReserveMove: (amount: number) => void;
  onQuickApplyYield: (rate: number) => void;
  onCaptureCurrentMonth: () => void;
}

interface SubMenuAction {
  label: string;
  hint?: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}

const VIEW_TO_GROUP: Record<ViewId, string> = {
  home: 'home',
  saved: 'saved',
  jars: 'saved',
  interest: 'saved',
  share: 'saved',
  wishes: 'wishes',
  pause: 'wishes',
  countdown: 'wishes',
  bought: 'bought',
  bills: 'bought',
  iou: 'bought',
  report: 'report',
  analytics: 'report',
  map: 'map',
  chores: 'more',
  settings: 'settings',
};

export const TopNav: React.FC<TopNavProps> = ({
  edition,
  state,
  activeView,
  user,
  cloudSynced,
  onSelectView,
  onChangeEdition,
  onChangeCurrency,
  onChangeTheme,
  onOpenCustomBalance,
  onOpenCoinWindow,
  onOpenCalcWindow,
  onDownloadPDF,
  onDownloadHTML,
  onPrintReport,
  onLoadBaseline,
  onExportCSV,
  onExportJSON,
  onRequestReset,
  onOpenAuth,
  onSignInGoogle,
  onSignOut,
  onSyncCloudNow,
  onQuickDeposit,
  onQuickReserveMove,
  onQuickApplyYield,
  onCaptureCurrentMonth,
}) => {
  const isAdults = edition === 'adults';
  const totalHoldings = state.wallet + state.saved + state.share;
  const spentTotal = state.bought.reduce((sum, item) => sum + item.price, 0);
  const mappedSpendTotal = state.pinnedPlaces.reduce((sum, p) => sum + p.totalSpent, 0);
  const activeGroup = VIEW_TO_GROUP[activeView] || 'home';
  const is16thRecorded = state.lastAuto16Month === currentYM();
  const curCfg = getCurrencyConfig(state.currency);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  const handleEnterMenu = (menuKey: string) => {
    clearCloseTimer();
    if (openMenu !== menuKey) {
      setOpenSub(null);
    }
    setOpenMenu(menuKey);
  };

  const handleLeaveMenu = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpenMenu(null);
      setOpenSub(null);
    }, 140);
  };

  const closeAllMenus = () => {
    clearCloseTimer();
    setOpenMenu(null);
    setOpenSub(null);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const runAction = (fn: () => void) => {
    closeAllMenus();
    fn();
  };

  const navBtnClass = (group: string) => {
    if (isAdults) {
      return `flex shrink-0 items-center gap-1 whitespace-nowrap rounded-none border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
        activeGroup === group
          ? 'border-neutral-300 bg-neutral-50/70 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
          : 'border-neutral-200/80 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/50 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600'
      }`;
    }
    return `flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-all ${
      activeGroup === group
        ? 'border-indigo-600 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
    }`;
  };

  const dropdownBoxClass = isAdults
    ? 'rounded-none border border-neutral-200 bg-white p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900'
    : 'rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl dark:border-slate-700 dark:bg-slate-900';

  const previewBoxClass = isAdults
    ? 'mb-2 rounded-none border border-neutral-200/70 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950'
    : 'mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950';

  const accountLabel = user
    ? (user.displayName || user.email?.split('@')[0] || 'Account').slice(0, 14)
    : 'Sign In / Up';

  const renderMenuWrapper = (
    menuKey: string,
    align: 'left' | 'right',
    content: React.ReactNode
  ) => {
    const isOpen = openMenu === menuKey;
    return (
      <div
        className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full z-50 w-72 pt-2 transition-all duration-150 ${
          isOpen
            ? 'pointer-events-auto visible translate-y-0 opacity-100'
            : 'pointer-events-none invisible translate-y-1 opacity-0'
        }`}
      >
        <div className={dropdownBoxClass}>{content}</div>
      </div>
    );
  };

  return (
    <header
      className={`no-print sticky top-0 z-40 border-b ${
        isAdults
          ? 'border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-950'
          : 'border-slate-200 bg-white/95 shadow-xs backdrop-blur dark:border-slate-800 dark:bg-slate-900/95'
      }`}
    >
      <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 sm:px-6">
        {/* Brand Wordmark */}
        <button
          type="button"
          onClick={() => runAction(() => onSelectView('home'))}
          className="font-display flex shrink-0 items-center gap-2 whitespace-nowrap text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        >
          <span
            className={`text-lg font-bold tracking-tight ${
              isAdults
                ? 'text-neutral-950 dark:text-white'
                : 'text-indigo-700 dark:text-indigo-400'
            }`}
          >
            {isAdults ? 'BalanceLedger' : 'PiggyPal'}
          </span>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isAdults
                ? 'text-neutral-500 dark:text-neutral-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {isAdults ? 'Adults Edition' : 'Kids Edition'}
          </span>
        </button>

        {/* Always-Visible Hover Menu */}
        <nav aria-label="Main Hover Menu" className="flex flex-wrap items-center gap-1.5">
          {/* 1. Cash & Accounts */}
          <div
            className="relative"
            onMouseEnter={() => handleEnterMenu('home')}
            onMouseLeave={handleLeaveMenu}
          >
            <button
              type="button"
              onClick={() => runAction(() => onSelectView('home'))}
              className={navBtnClass('home')}
            >
              <span>{isAdults ? 'Cash & Accounts' : 'My Wallet'}</span>
              <ChevronDown className="h-3 w-3 opacity-75" />
            </button>
            {renderMenuWrapper(
              'home',
              'left',
              <>
                <div className={previewBoxClass}>
                  <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                    {isAdults ? 'Liquid Checking' : 'Spendable Wallet'} · Total{' '}
                    {fmt(totalHoldings, state.currency)}
                  </div>
                  <div className="font-num mt-0.5 text-base font-bold text-neutral-950 dark:text-white">
                    {fmt(state.wallet, state.currency)}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <CascadeItem
                    subKey="home-overview"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label={isAdults ? 'Account Overview' : 'Wallet Dashboard'}
                    hint="Window"
                    onClick={() => runAction(() => onSelectView('home'))}
                    subItems={[
                      {
                        label: isAdults ? 'Transaction Entry & Ledger' : 'Wallet & Quick Actions',
                        hint: 'Open',
                        onClick: () => runAction(() => onSelectView('home')),
                      },
                      {
                        label: isAdults ? 'Quick Deposit (+Recurring)' : 'Collect Allowance',
                        hint: `+${fmt(state.allowance, state.currency)}`,
                        onClick: () =>
                          runAction(() => {
                            onQuickDeposit();
                            onSelectView('home');
                          }),
                      },
                      {
                        label: 'Budgets & Health Statement',
                        hint: 'Window',
                        onClick: () => runAction(() => onSelectView('analytics')),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="home-custom"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label="Set Custom Balance"
                    hint="Window"
                    onClick={() => runAction(onOpenCustomBalance)}
                    subItems={[
                      {
                        label: 'Open Custom Balance Window',
                        hint: 'Exact',
                        onClick: () => runAction(onOpenCustomBalance),
                      },
                      {
                        label: 'Update Monthly Chart & Open',
                        hint: currentYM(),
                        onClick: () =>
                          runAction(() => {
                            onCaptureCurrentMonth();
                            onSelectView('report');
                          }),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="home-cash"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label={isAdults ? 'Cash & Bill Counter' : 'Coin & Cash Counter'}
                    hint="Window"
                    onClick={() => runAction(onOpenCoinWindow)}
                    subItems={[
                      {
                        label: 'Open Cash Counter Window',
                        hint: 'Counter',
                        onClick: () => runAction(onOpenCoinWindow),
                      },
                      {
                        label: 'Open Financial Calculator',
                        hint: 'Calc',
                        onClick: () => runAction(onOpenCalcWindow),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="home-calc"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label={isAdults ? 'Financial Calculator' : 'Kid Calculator'}
                    hint="Window"
                    onClick={() => runAction(onOpenCalcWindow)}
                    subItems={[
                      {
                        label: 'Open Calculator Window',
                        hint: 'Calc',
                        onClick: () => runAction(onOpenCalcWindow),
                      },
                      {
                        label: isAdults ? 'Open Yield Calculator Window' : 'Interest Growth Window',
                        hint: 'Yield',
                        onClick: () => runAction(() => onSelectView('interest')),
                      },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          {/* 2. Savings & Reserve */}
          <div
            className="relative"
            onMouseEnter={() => handleEnterMenu('saved')}
            onMouseLeave={handleLeaveMenu}
          >
            <button
              type="button"
              onClick={() => runAction(() => onSelectView('saved'))}
              className={navBtnClass('saved')}
            >
              <span>{isAdults ? 'Savings & Reserve' : 'What I Saved'}</span>
              <ChevronDown className="h-3 w-3 opacity-75" />
            </button>
            {renderMenuWrapper(
              'saved',
              'left',
              <>
                <div className={previewBoxClass}>
                  <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                    {isAdults ? 'Reserve + Allocated Fund' : 'Piggy Bank + Share'}
                  </div>
                  <div className="font-num mt-0.5 text-base font-bold text-neutral-950 dark:text-white">
                    {fmt(state.saved + state.share, state.currency)}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <CascadeItem
                    subKey="saved-reserve"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label={isAdults ? 'Reserve Transfers' : 'Piggy Bank Vault'}
                    hint="Window"
                    onClick={() => runAction(() => onSelectView('saved'))}
                    subItems={[
                      {
                        label: 'Open Reserve Transfer Window',
                        hint: fmt(state.saved, state.currency),
                        onClick: () => runAction(() => onSelectView('saved')),
                      },
                      {
                        label: `Move ${fmt(25, state.currency)} & View Reserve`,
                        hint: '+25',
                        onClick: () =>
                          runAction(() => {
                            onQuickReserveMove(25);
                            onSelectView('saved');
                          }),
                      },
                      {
                        label: `Move ${fmt(100, state.currency)} & View Reserve`,
                        hint: '+100',
                        onClick: () =>
                          runAction(() => {
                            onQuickReserveMove(100);
                            onSelectView('saved');
                          }),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="saved-jars"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label={isAdults ? 'Savings & Capital Goals' : 'Savings Goals'}
                    hint={`${state.jars.length} goals`}
                    onClick={() => runAction(() => onSelectView('jars'))}
                    subItems={[
                      {
                        label: 'Open Savings Goals Window',
                        hint: `${state.jars.length} active`,
                        onClick: () => runAction(() => onSelectView('jars')),
                      },
                      {
                        label: 'Open Reserve Transfers Window',
                        hint: 'Fund',
                        onClick: () => runAction(() => onSelectView('saved')),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="saved-interest"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label={isAdults ? 'Yield & Interest Calculator' : 'Interest Growth'}
                    hint="Window"
                    onClick={() => runAction(() => onSelectView('interest'))}
                    subItems={[
                      {
                        label: 'Open Yield Calculator Window',
                        hint: 'Project',
                        onClick: () => runAction(() => onSelectView('interest')),
                      },
                      {
                        label: 'Credit 5% Return & View',
                        hint: '+5%',
                        onClick: () =>
                          runAction(() => {
                            onQuickApplyYield(5);
                            onSelectView('interest');
                          }),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="saved-share"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label={isAdults ? 'Tax / Giving Allocation' : 'Giving & Share Jar'}
                    hint={fmt(state.share, state.currency)}
                    onClick={() => runAction(() => onSelectView('share'))}
                    subItems={[
                      {
                        label: 'Open Allocation Fund Window',
                        hint: fmt(state.share, state.currency),
                        onClick: () => runAction(() => onSelectView('share')),
                      },
                      {
                        label: 'View Disbursal Records',
                        hint: `${state.shareLog.length} logs`,
                        onClick: () => runAction(() => onSelectView('share')),
                      },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          {/* 3. Planned Purchases */}
          <div
            className="relative"
            onMouseEnter={() => handleEnterMenu('wishes')}
            onMouseLeave={handleLeaveMenu}
          >
            <button
              type="button"
              onClick={() => runAction(() => onSelectView('wishes'))}
              className={navBtnClass('wishes')}
            >
              <span>{isAdults ? 'Planned Purchases' : 'What I Wanna Buy'}</span>
              <ChevronDown className="h-3 w-3 opacity-75" />
            </button>
            {renderMenuWrapper(
              'wishes',
              'left',
              <>
                <div className={previewBoxClass}>
                  <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                    {isAdults ? 'Budgeted Targets' : 'Wishlist Goals'}
                  </div>
                  <div className="font-num mt-0.5 text-base font-bold text-neutral-950 dark:text-white">
                    {state.wishes.length} item{state.wishes.length === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <CascadeItem
                    subKey="wishes-targets"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label={isAdults ? 'Target Purchases' : 'Wishlist Items'}
                    hint={`${state.wishes.length}`}
                    onClick={() => runAction(() => onSelectView('wishes'))}
                    subItems={[
                      {
                        label: 'Open Target Purchases Window',
                        hint: 'Affordability',
                        onClick: () => runAction(() => onSelectView('wishes')),
                      },
                      {
                        label: 'Open Funding Timeline Window',
                        hint: 'Weeks',
                        onClick: () => runAction(() => onSelectView('countdown')),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="wishes-pause"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label={isAdults ? '72-Hour Cooling-Off Queue' : '72-Hour Wait Shelf'}
                    hint={`${state.paused.length} held`}
                    onClick={() => runAction(() => onSelectView('pause'))}
                    subItems={[
                      {
                        label: 'Open Cooling-Off Queue Window',
                        hint: `${state.paused.length} held`,
                        onClick: () => runAction(() => onSelectView('pause')),
                      },
                      {
                        label: 'View Planned Purchases',
                        hint: `${state.wishes.length} items`,
                        onClick: () => runAction(() => onSelectView('wishes')),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="wishes-countdown"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label={isAdults ? 'Income Funding Timeline' : 'Allowance Countdown'}
                    hint="Window"
                    onClick={() => runAction(() => onSelectView('countdown'))}
                    subItems={[
                      {
                        label: 'Open Funding Timeline Window',
                        hint: 'Forecast',
                        onClick: () => runAction(() => onSelectView('countdown')),
                      },
                      {
                        label: 'Open Recurring Deposit Settings',
                        hint: fmt(state.allowance, state.currency),
                        onClick: () => runAction(() => onSelectView('settings')),
                      },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          {/* 4. Expenses & IOUs */}
          <div
            className="relative"
            onMouseEnter={() => handleEnterMenu('bought')}
            onMouseLeave={handleLeaveMenu}
          >
            <button
              type="button"
              onClick={() => runAction(() => onSelectView('bought'))}
              className={navBtnClass('bought')}
            >
              <span>{isAdults ? 'Expenses & IOUs' : 'What I Bought'}</span>
              <ChevronDown className="h-3 w-3 opacity-75" />
            </button>
            {renderMenuWrapper(
              'bought',
              'left',
              <>
                <div className={previewBoxClass}>
                  <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                    {isAdults ? 'Recorded Outflows' : 'Purchases Logged'}
                  </div>
                  <div className="font-num mt-0.5 text-base font-bold text-neutral-950 dark:text-white">
                    {fmt(spentTotal, state.currency)}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <CascadeItem
                    subKey="bought-history"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label={isAdults ? 'Expense History' : 'Purchase History'}
                    hint={`${state.bought.length}`}
                    onClick={() => runAction(() => onSelectView('bought'))}
                    subItems={[
                      {
                        label: 'Open Expense History Window',
                        hint: `${state.bought.length} rows`,
                        onClick: () => runAction(() => onSelectView('bought')),
                      },
                      {
                        label: 'Open Category Budgets Window',
                        hint: 'Caps',
                        onClick: () => runAction(() => onSelectView('analytics')),
                      },
                      {
                        label: 'Open Google Spend Map Window',
                        hint: 'Map',
                        onClick: () => runAction(() => onSelectView('map')),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="bought-bills"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label={isAdults ? 'Subscriptions & Bills' : 'Recurring Bills'}
                    hint={`${state.subscriptions.filter((s) => s.active).length} active`}
                    onClick={() => runAction(() => onSelectView('bills'))}
                    subItems={[
                      {
                        label: 'Open Subscriptions & Bills Window',
                        hint: `${state.subscriptions.length} total`,
                        onClick: () => runAction(() => onSelectView('bills')),
                      },
                      {
                        label: 'Open Monthly Statement Window',
                        hint: 'Burn rate',
                        onClick: () => runAction(() => onSelectView('analytics')),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="bought-iou"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="right"
                    label={isAdults ? 'Receivables & Payables' : 'Borrowed & Lent (IOUs)'}
                    hint={`${state.ious.length} open`}
                    onClick={() => runAction(() => onSelectView('iou'))}
                    subItems={[
                      {
                        label: 'Open IOU Ledger Window',
                        hint: `${state.ious.length} open`,
                        onClick: () => runAction(() => onSelectView('iou')),
                      },
                      {
                        label: isAdults ? 'Open Tasks & Invoices Window' : 'Open Chores Window',
                        hint: `${state.chores.length} due`,
                        onClick: () => runAction(() => onSelectView('chores')),
                      },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          {/* 5. Charts & Statements */}
          <div
            className="relative"
            onMouseEnter={() => handleEnterMenu('report')}
            onMouseLeave={handleLeaveMenu}
          >
            <button
              type="button"
              onClick={() => runAction(() => onSelectView('report'))}
              className={navBtnClass('report')}
            >
              <span>{isAdults ? 'Charts & Statements' : 'Monthly Chart'}</span>
              <ChevronDown className="h-3 w-3 opacity-75" />
            </button>
            {renderMenuWrapper(
              'report',
              'right',
              <>
                <div className={previewBoxClass}>
                  <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                    Auto-Updates Every 16th
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-neutral-950 dark:text-white">
                    {is16thRecorded ? '16th Recorded' : 'Scheduled 16th'}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <CascadeItem
                    subKey="report-annual"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="left"
                    label="Annual Progress Chart"
                    hint="Window"
                    onClick={() => runAction(() => onSelectView('report'))}
                    subItems={[
                      {
                        label: 'Open Annual Chart Window',
                        hint: 'Jan–Dec',
                        onClick: () => runAction(() => onSelectView('report')),
                      },
                      {
                        label: 'Capture This Month & Open Chart',
                        hint: currentYM(),
                        onClick: () =>
                          runAction(() => {
                            onCaptureCurrentMonth();
                            onSelectView('report');
                          }),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="report-analytics"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="left"
                    label="Statement & Category Budgets"
                    hint="Window"
                    onClick={() => runAction(() => onSelectView('analytics'))}
                    subItems={[
                      {
                        label: 'Open Statement & Ratios Window',
                        hint: 'Health',
                        onClick: () => runAction(() => onSelectView('analytics')),
                      },
                      {
                        label: 'Open Subscriptions & Bills Window',
                        hint: 'Burn',
                        onClick: () => runAction(() => onSelectView('bills')),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="report-export"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="left"
                    label="Export & Print Reports"
                    hint="PDF/HTML"
                    onClick={() =>
                      runAction(() => {
                        onSelectView('report');
                        onDownloadPDF();
                      })
                    }
                    subItems={[
                      {
                        label: 'Open Chart & Download PDF',
                        hint: '.pdf',
                        onClick: () =>
                          runAction(() => {
                            onSelectView('report');
                            onDownloadPDF();
                          }),
                      },
                      {
                        label: 'Open Chart & Download HTML',
                        hint: '.html',
                        onClick: () =>
                          runAction(() => {
                            onSelectView('report');
                            onDownloadHTML();
                          }),
                      },
                      {
                        label: 'Open Chart & Print Report',
                        hint: 'Printer',
                        onClick: () => runAction(onPrintReport),
                      },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          {/* 6. Spend Map */}
          <div
            className="relative"
            onMouseEnter={() => handleEnterMenu('map')}
            onMouseLeave={handleLeaveMenu}
          >
            <button
              type="button"
              onClick={() => runAction(() => onSelectView('map'))}
              className={navBtnClass('map')}
            >
              <span>Spend Map</span>
              <ChevronDown className="h-3 w-3 opacity-75" />
            </button>
            {renderMenuWrapper(
              'map',
              'right',
              <>
                <div className={previewBoxClass}>
                  <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                    Pinned Locations · {state.pinnedPlaces.length} saved
                  </div>
                  <div className="font-num mt-0.5 text-base font-bold text-neutral-950 dark:text-white">
                    {fmt(mappedSpendTotal, state.currency)}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <CascadeItem
                    subKey="map-places"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="left"
                    label="Interactive Places & Spend Map"
                    hint="Window"
                    onClick={() => runAction(() => onSelectView('map'))}
                    subItems={[
                      {
                        label: 'Open Google Spend Map Window',
                        hint: `${state.pinnedPlaces.length} pins`,
                        onClick: () => runAction(() => onSelectView('map')),
                      },
                      {
                        label: 'Open Purchase History Window',
                        hint: `${state.bought.length} items`,
                        onClick: () => runAction(() => onSelectView('bought')),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="map-budgets"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="left"
                    label="Category Budgets & Ratios"
                    hint="Window"
                    onClick={() => runAction(() => onSelectView('analytics'))}
                    subItems={[
                      {
                        label: 'Open Category Budgets Window',
                        hint: 'Limits',
                        onClick: () => runAction(() => onSelectView('analytics')),
                      },
                      {
                        label: 'Open Annual Chart Window',
                        hint: 'Report',
                        onClick: () => runAction(() => onSelectView('report')),
                      },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          {/* 7. Settings */}
          <div
            className="relative"
            onMouseEnter={() => handleEnterMenu('settings')}
            onMouseLeave={handleLeaveMenu}
          >
            <button
              type="button"
              onClick={() => runAction(() => onSelectView('settings'))}
              className={navBtnClass('settings')}
            >
              <span>Settings</span>
              <ChevronDown className="h-3 w-3 opacity-75" />
            </button>
            {renderMenuWrapper(
              'settings',
              'right',
              <>
                <div className={previewBoxClass}>
                  <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                    Active Currency · Edition
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-sm font-bold text-neutral-950 dark:text-white">
                    <span>
                      {curCfg.code} ({curCfg.symbol})
                    </span>
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {isAdults ? 'Adults' : 'Kids'} · {state.theme === 'dark' ? 'Dark' : 'White'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <CascadeItem
                    subKey="settings-currency"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="left"
                    label="Change Currency"
                    hint={`${curCfg.code} ${curCfg.symbol}`}
                    onClick={() => runAction(() => onSelectView('settings'))}
                    subItems={CURRENCIES.map((c) => ({
                      label: `${c.code} — ${c.label}`,
                      hint: c.symbol,
                      active: state.currency === c.code,
                      onClick: () => runAction(() => onChangeCurrency(c.code)),
                    }))}
                  />
                  <CascadeItem
                    subKey="settings-edition"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="left"
                    label="Separate Edition"
                    hint={isAdults ? 'Adults' : 'Kids'}
                    onClick={() => runAction(() => onSelectView('settings'))}
                    subItems={[
                      {
                        label: 'Adults Edition (White Ledger)',
                        hint: 'Clean',
                        active: edition === 'adults',
                        onClick: () => runAction(() => onChangeEdition('adults')),
                      },
                      {
                        label: 'Kids Edition (PiggyPal)',
                        hint: 'Fun',
                        active: edition === 'kids',
                        onClick: () => runAction(() => onChangeEdition('kids')),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="settings-theme"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="left"
                    label="Surface Theme"
                    hint={state.theme === 'dark' ? 'Dark' : 'White'}
                    onClick={() =>
                      runAction(() =>
                        onChangeTheme(state.theme === 'dark' ? 'light' : 'dark')
                      )
                    }
                    subItems={[
                      {
                        label: 'White Surface Mode',
                        hint: 'Light',
                        active: state.theme === 'light',
                        onClick: () => runAction(() => onChangeTheme('light')),
                      },
                      {
                        label: 'Dark Surface Mode',
                        hint: 'Dark',
                        active: state.theme === 'dark',
                        onClick: () => runAction(() => onChangeTheme('dark')),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="settings-account"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="left"
                    label="Account, Income & PIN"
                    hint="Window"
                    onClick={() => runAction(() => onSelectView('settings'))}
                    subItems={[
                      {
                        label: 'Open All Settings Window',
                        hint: 'PIN / Income',
                        onClick: () => runAction(() => onSelectView('settings')),
                      },
                      {
                        label: 'Open Custom Balance Window',
                        hint: 'Calibrate',
                        onClick: () => runAction(onOpenCustomBalance),
                      },
                      {
                        label: user ? 'Open Account & Cloud Window' : 'Open Sign In / Sign Up Window',
                        hint: user ? 'Cloud' : 'Auth',
                        onClick: () => runAction(() => onOpenAuth('signin')),
                      },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          {/* 8. Ledger Tools */}
          <div
            className="relative"
            onMouseEnter={() => handleEnterMenu('more')}
            onMouseLeave={handleLeaveMenu}
          >
            <button
              type="button"
              onClick={() => runAction(() => onSelectView('chores'))}
              className={navBtnClass('more')}
            >
              <span>{isAdults ? 'Ledger Tools' : 'More Stuff'}</span>
              <ChevronDown className="h-3 w-3 opacity-75" />
            </button>
            {renderMenuWrapper(
              'more',
              'right',
              <>
                <div className={previewBoxClass}>
                  <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                    {isAdults ? 'Recurring Income & Invoices' : 'Allowance & Chores'}
                  </div>
                  <div className="font-num mt-0.5 text-base font-bold text-neutral-950 dark:text-white">
                    {fmt(state.allowance, state.currency)} / week
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <CascadeItem
                    subKey="more-chores"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="left"
                    label={isAdults ? 'Invoices & Side Tasks' : 'Chores & Tasks'}
                    hint={`${state.chores.length} open`}
                    onClick={() => runAction(() => onSelectView('chores'))}
                    subItems={[
                      {
                        label: 'Open Tasks & Invoices Window',
                        hint: `${state.chores.length} items`,
                        onClick: () => runAction(() => onSelectView('chores')),
                      },
                      {
                        label: 'Record Recurring Deposit & View',
                        hint: `+${fmt(state.allowance, state.currency)}`,
                        onClick: () =>
                          runAction(() => {
                            onQuickDeposit();
                            onSelectView('home');
                          }),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="more-sample"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="left"
                    label={isAdults ? 'Sample & Snapshot Tools' : 'Sample & Snapshots'}
                    hint="Window"
                    onClick={() =>
                      runAction(() => {
                        onLoadBaseline();
                        onSelectView('report');
                      })
                    }
                    subItems={[
                      {
                        label: isAdults
                          ? 'Load 12-Month Sample & View Chart'
                          : 'Load Sample & View Chart',
                        hint: 'Preview',
                        onClick: () =>
                          runAction(() => {
                            onLoadBaseline();
                            onSelectView('report');
                          }),
                      },
                      {
                        label: 'Capture Snapshot & View Chart',
                        hint: currentYM(),
                        onClick: () =>
                          runAction(() => {
                            onCaptureCurrentMonth();
                            onSelectView('report');
                          }),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="more-export"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="left"
                    label="Export & Backup Data"
                    hint="Files"
                    onClick={() => runAction(() => onSelectView('analytics'))}
                    subItems={[
                      {
                        label: 'Export Ledger (CSV) & View Statement',
                        hint: '.csv',
                        onClick: () =>
                          runAction(() => {
                            onExportCSV();
                            onSelectView('analytics');
                          }),
                      },
                      {
                        label: 'Export Backup (JSON) & View Statement',
                        hint: '.json',
                        onClick: () =>
                          runAction(() => {
                            onExportJSON();
                            onSelectView('analytics');
                          }),
                      },
                      {
                        label: 'Download PDF & View Chart',
                        hint: '.pdf',
                        onClick: () =>
                          runAction(() => {
                            onSelectView('report');
                            onDownloadPDF();
                          }),
                      },
                    ]}
                  />
                  <CascadeItem
                    subKey="more-reset"
                    activeSub={openSub}
                    onHoverSub={setOpenSub}
                    isAdults={isAdults}
                    flyoutSide="left"
                    label="Reset Ledger Data"
                    hint="Window"
                    danger
                    onClick={() => runAction(onRequestReset)}
                    subItems={[
                      {
                        label: `Open Reset Confirmation Window`,
                        hint: 'Confirm',
                        danger: true,
                        onClick: () => runAction(onRequestReset),
                      },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          {/* 9. Account: Sign In & Sign Up Hover Menu */}
          <div
            className="relative"
            onMouseEnter={() => handleEnterMenu('auth')}
            onMouseLeave={handleLeaveMenu}
          >
            <button
              type="button"
              onClick={() => runAction(() => onOpenAuth('signin'))}
              className={`flex shrink-0 items-center gap-1 whitespace-nowrap border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                isAdults
                  ? 'rounded-none border-neutral-200/80 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200'
                  : 'rounded-full border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300'
              }`}
            >
              <span>{accountLabel}</span>
              <ChevronDown className="h-3 w-3 opacity-75" />
            </button>
            {renderMenuWrapper(
              'auth',
              'right',
              <>
                <div className={previewBoxClass}>
                  <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                    {user
                      ? user.emailVerified
                        ? cloudSynced
                          ? 'Cloud Sync Active'
                          : 'Connecting Sync...'
                        : 'Email Verification Needed'
                      : 'Cloud Account'}
                  </div>
                  <div className="mt-0.5 truncate text-xs font-bold text-neutral-950 dark:text-white">
                    {user ? user.email || user.displayName : 'Sign in or create account'}
                  </div>
                </div>

                {user ? (
                  <div className="flex flex-col gap-0.5">
                    <CascadeItem
                      subKey="auth-profile"
                      activeSub={openSub}
                      onHoverSub={setOpenSub}
                      isAdults={isAdults}
                      flyoutSide="left"
                      label="Account & Cloud Status"
                      hint={user.emailVerified ? 'Synced' : 'Verify'}
                      onClick={() => runAction(() => onOpenAuth('signin'))}
                      subItems={[
                        {
                          label: 'Open Account Window',
                          hint: 'Details',
                          onClick: () => runAction(() => onOpenAuth('signin')),
                        },
                        {
                          label: 'Sync Cloud Now',
                          hint: 'Save',
                          onClick: () => runAction(onSyncCloudNow),
                        },
                      ]}
                    />
                    <CascadeItem
                      subKey="auth-edition"
                      activeSub={openSub}
                      onHoverSub={setOpenSub}
                      isAdults={isAdults}
                      flyoutSide="left"
                      label="Switch Edition"
                      hint={isAdults ? 'Adults' : 'Kids'}
                      onClick={() => runAction(() => onOpenAuth('signin'))}
                      subItems={[
                        {
                          label: 'Switch to Adults Edition',
                          hint: 'White',
                          active: edition === 'adults',
                          onClick: () => runAction(() => onChangeEdition('adults')),
                        },
                        {
                          label: 'Switch to Kids Edition',
                          hint: 'Kids',
                          active: edition === 'kids',
                          onClick: () => runAction(() => onChangeEdition('kids')),
                        },
                      ]}
                    />
                    <CascadeItem
                      subKey="auth-signout"
                      activeSub={openSub}
                      onHoverSub={setOpenSub}
                      isAdults={isAdults}
                      flyoutSide="left"
                      label="Sign Out"
                      hint="Exit"
                      danger
                      onClick={() => runAction(onSignOut)}
                      subItems={[
                        {
                          label: 'Confirm Sign Out',
                          hint: 'Exit',
                          danger: true,
                          onClick: () => runAction(onSignOut),
                        },
                      ]}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <CascadeItem
                      subKey="auth-signin"
                      activeSub={openSub}
                      onHoverSub={setOpenSub}
                      isAdults={isAdults}
                      flyoutSide="left"
                      label="Sign In"
                      hint="Window"
                      onClick={() => runAction(() => onOpenAuth('signin'))}
                      subItems={[
                        {
                          label: 'Sign In with Google',
                          hint: '1-Click',
                          onClick: () => runAction(onSignInGoogle),
                        },
                        {
                          label: 'Open Email Sign In Window',
                          hint: 'Email',
                          onClick: () => runAction(() => onOpenAuth('signin')),
                        },
                      ]}
                    />
                    <CascadeItem
                      subKey="auth-signup"
                      activeSub={openSub}
                      onHoverSub={setOpenSub}
                      isAdults={isAdults}
                      flyoutSide="left"
                      label="Sign Up"
                      hint="Window"
                      onClick={() => runAction(() => onOpenAuth('signup'))}
                      subItems={[
                        {
                          label: 'Sign Up with Google',
                          hint: '1-Click',
                          onClick: () => runAction(onSignInGoogle),
                        },
                        {
                          label: 'Open Create Account Window',
                          hint: 'Register',
                          onClick: () => runAction(() => onOpenAuth('signup')),
                        },
                      ]}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </nav>

        {/* Primary Action Box */}
        <button
          type="button"
          onClick={() => runAction(onOpenCustomBalance)}
          className={`shrink-0 whitespace-nowrap border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            isAdults
              ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'
              : 'rounded-full border-slate-900 bg-slate-900 text-white hover:bg-slate-800 dark:bg-indigo-600'
          }`}
        >
          Set Custom Balance
        </button>
      </div>
    </header>
  );
};

interface CascadeItemProps {
  subKey: string;
  activeSub: string | null;
  onHoverSub: (key: string | null) => void;
  isAdults: boolean;
  flyoutSide: 'left' | 'right';
  label: string;
  hint: string;
  danger?: boolean;
  onClick: () => void;
  subItems: SubMenuAction[];
}

const CascadeItem: React.FC<CascadeItemProps> = ({
  subKey,
  activeSub,
  onHoverSub,
  isAdults,
  flyoutSide,
  label,
  hint,
  danger,
  onClick,
  subItems,
}) => {
  const isSubOpen = activeSub === subKey;
  const flyoutContainerClass =
    flyoutSide === 'right'
      ? `absolute left-full top-0 z-50 w-60 pl-1.5 transition-all duration-150 ${
          isSubOpen
            ? 'pointer-events-auto visible opacity-100'
            : 'pointer-events-none invisible opacity-0'
        }`
      : `absolute right-full top-0 z-50 w-60 pr-1.5 transition-all duration-150 ${
          isSubOpen
            ? 'pointer-events-auto visible opacity-100'
            : 'pointer-events-none invisible opacity-0'
        }`;

  const flyoutBoxClass = isAdults
    ? 'rounded-none border border-neutral-200 bg-white p-1.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900'
    : 'rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900';

  return (
    <div
      className="relative"
      onMouseEnter={() => onHoverSub(subKey)}
      onFocus={() => onHoverSub(subKey)}
    >
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs font-semibold transition-colors ${
          isAdults ? 'rounded-none' : 'rounded-md'
        } ${
          isSubOpen && !danger
            ? isAdults
              ? 'bg-neutral-100 text-neutral-950 dark:bg-neutral-800 dark:text-white'
              : 'bg-indigo-50 text-indigo-700 dark:bg-slate-800'
            : ''
        } ${
          danger
            ? 'text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
            : isAdults
            ? 'text-neutral-800 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-white'
            : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-slate-800'
        }`}
      >
        <span className="truncate">{label}</span>
        <span className="ml-2 flex shrink-0 items-center gap-1">
          <span className="font-num text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
            {hint}
          </span>
          <ChevronRight className="h-3 w-3 text-neutral-400 dark:text-neutral-500" />
        </span>
      </button>

      {/* New small cascading flyout menu opened on hover */}
      <div className={flyoutContainerClass}>
        <div className={flyoutBoxClass}>
          <div className="mb-1 border-b border-neutral-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
            {label}
          </div>
          <div className="flex flex-col gap-0.5">
            {subItems.map((sub) => (
              <button
                key={sub.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sub.onClick();
                }}
                className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                  isAdults ? 'rounded-none' : 'rounded-md'
                } ${
                  sub.danger
                    ? 'text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
                    : sub.active
                    ? isAdults
                      ? 'bg-neutral-100 text-neutral-950 dark:bg-neutral-800 dark:text-white'
                      : 'bg-indigo-600 text-white'
                    : isAdults
                    ? 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                    : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span className="truncate">{sub.label}</span>
                {sub.hint && (
                  <span
                    className={`font-num ml-2 shrink-0 text-[10px] font-medium ${
                      sub.active && !isAdults
                        ? 'text-indigo-100'
                        : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    {sub.hint}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
