import React from 'react';
import { User } from 'firebase/auth';
import { Check, Shield, Trash2, X } from 'lucide-react';
import { AccountRequestItem, EditionMode, LedgerState } from '../../types/ledger';
import { fmt } from '../../utils/ledgerUtils';

interface AdminViewProps {
  edition: EditionMode;
  state: LedgerState;
  user: User | null;
  adminUsernameActive: boolean;
  isFirebaseAdmin: boolean;
  requests: AccountRequestItem[];
  onApproveRequest: (req: AccountRequestItem) => void;
  onRejectRequest: (req: AccountRequestItem) => void;
  onDeleteRequest: (req: AccountRequestItem) => void;
  onConnectGoogleAdmin: () => void;
  onTogglePinLock: (enabled: boolean) => void;
  onChangeEdition: (edition: EditionMode) => void;
  onLoadBaseline: () => void;
  onExportJSON: () => void;
  onOpenCustomBalance: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  edition,
  state,
  user,
  adminUsernameActive,
  isFirebaseAdmin,
  requests,
  onApproveRequest,
  onRejectRequest,
  onDeleteRequest,
  onConnectGoogleAdmin,
  onTogglePinLock,
  onChangeEdition,
  onLoadBaseline,
  onExportJSON,
  onOpenCustomBalance,
}) => {
  const isAdults = edition === 'adults';
  const boxClass = isAdults
    ? 'rounded-none border border-neutral-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900'
    : 'rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900';
  const btnShape = isAdults ? 'rounded-none' : 'rounded-xl';

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className={boxClass}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-4 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
              <h2 className="text-lg font-bold text-neutral-950 dark:text-white">
                Admin Controls &amp; Account Requests
              </h2>
            </div>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Active Session:{' '}
              <strong>
                {isFirebaseAdmin
                  ? `${user?.email} (Verified Firebase Admin)`
                  : adminUsernameActive
                  ? 'admin (Built-In Admin Console)'
                  : 'Authorized Admin'}
              </strong>{' '}
              · {pendingCount} pending · {approvedCount} approved
            </p>
          </div>

          {!isFirebaseAdmin && (
            <button
              type="button"
              onClick={onConnectGoogleAdmin}
              className={`border px-3.5 py-2 text-xs font-semibold transition-colors ${btnShape} ${
                isAdults
                  ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-white dark:bg-white dark:text-neutral-900'
                  : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Connect Google Admin Sync (takshdevelopment@gmail.com)
            </button>
          )}
        </div>

        {!isFirebaseAdmin && (
          <div className="mt-3 border border-neutral-200/80 bg-neutral-50/70 px-3.5 py-2.5 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
            Currently viewing local admin state and device-submitted account requests. Sign in with
            Google (<code className="font-mono">takshdevelopment@gmail.com</code>) to sync live
            Firestore requests submitted from other browsers.
          </div>
        )}
      </div>

      {/* Account Requests Table */}
      <div className={boxClass}>
        <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-neutral-950 dark:text-white">
              Incoming Account Requests
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Review, approve, or reject account requests submitted from the pre-auth page.
            </p>
          </div>
          <span className="font-num text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            {requests.length} total
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="py-10 text-center text-xs text-neutral-500 dark:text-neutral-400">
            No account requests yet. Visitors can submit one via the Request an Account button.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-neutral-950 dark:text-white">
                    <span>{req.fullName}</span>
                    <span className="font-normal text-neutral-500 dark:text-neutral-400">
                      ({req.email})
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      · {req.requestedEdition}
                    </span>
                    <span
                      className={`text-[11px] font-semibold uppercase ${
                        req.status === 'approved'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : req.status === 'rejected'
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      · {req.status}
                    </span>
                  </div>
                  {req.reason && (
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                      {req.reason}
                    </p>
                  )}
                  <div className="font-num mt-0.5 text-[11px] text-neutral-400">
                    Submitted {req.createdAtLabel} · {req.source === 'cloud' ? 'Firestore' : 'Local'}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {req.status !== 'approved' && (
                    <button
                      type="button"
                      onClick={() => onApproveRequest(req)}
                      className={`inline-flex items-center gap-1 border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-neutral-950 dark:text-emerald-400 ${btnShape}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </button>
                  )}
                  {req.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => onRejectRequest(req)}
                      className={`inline-flex items-center gap-1 border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:bg-neutral-950 dark:text-amber-400 ${btnShape}`}
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteRequest(req)}
                    aria-label={`Delete request from ${req.fullName}`}
                    className={`inline-flex items-center gap-1 border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-red-400 ${btnShape}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Controls */}
      <div className={boxClass}>
        <h3 className="mb-4 border-b border-neutral-100 pb-3 text-base font-bold text-neutral-950 dark:border-neutral-800 dark:text-white">
          System &amp; Ledger Governance
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => onTogglePinLock(!state.pinEnabled)}
            className={`border p-3 text-left text-xs font-semibold transition-colors ${btnShape} ${
              isAdults
                ? 'border-neutral-200/80 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950'
                : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
            }`}
          >
            <div className="text-neutral-500 dark:text-neutral-400">PIN Protection</div>
            <div className="mt-1 text-sm font-bold text-neutral-950 dark:text-white">
              {state.pinEnabled ? 'Enabled (Click to Disable)' : 'Disabled (Click to Enable)'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChangeEdition(edition === 'adults' ? 'kids' : 'adults')}
            className={`border p-3 text-left text-xs font-semibold transition-colors ${btnShape} ${
              isAdults
                ? 'border-neutral-200/80 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950'
                : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
            }`}
          >
            <div className="text-neutral-500 dark:text-neutral-400">Active Edition</div>
            <div className="mt-1 text-sm font-bold text-neutral-950 dark:text-white">
              {isAdults ? 'Adults (Switch to Kids)' : 'Kids (Switch to Adults)'}
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenCustomBalance}
            className={`border p-3 text-left text-xs font-semibold transition-colors ${btnShape} ${
              isAdults
                ? 'border-neutral-200/80 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950'
                : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
            }`}
          >
            <div className="text-neutral-500 dark:text-neutral-400">Calibrate Holdings</div>
            <div className="font-num mt-1 text-sm font-bold text-neutral-950 dark:text-white">
              {fmt(state.wallet + state.saved + state.share, state.currency)}
            </div>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onLoadBaseline}
              className={`flex-1 border border-neutral-200/80 bg-white p-3 text-center text-xs font-semibold text-neutral-800 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 ${btnShape}`}
            >
              Load Sample
            </button>
            <button
              type="button"
              onClick={onExportJSON}
              className={`flex-1 border border-neutral-200/80 bg-white p-3 text-center text-xs font-semibold text-neutral-800 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 ${btnShape}`}
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
