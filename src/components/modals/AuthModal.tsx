import React, { useEffect, useState } from 'react';
import {
  User,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { CheckCircle2, Cloud, LogOut, Mail, ShieldCheck, X } from 'lucide-react';
import { auth, googleProvider } from '../../firebase';
import { EditionMode } from '../../types/ledger';

export type AuthModalTab = 'signin' | 'request';

interface AuthModalProps {
  edition: EditionMode;
  open: boolean;
  initialTab: AuthModalTab;
  user: User | null;
  adminUsernameActive: boolean;
  isAdmin: boolean;
  cloudSynced: boolean;
  onClose: () => void;
  onNotify: (msg: string) => void;
  onRefreshUser: () => Promise<void>;
  onAdminSignIn: () => void;
  onAdminSignOut: () => void;
  onOpenAdminPanel: () => void;
  onSubmitAccountRequest: (payload: {
    fullName: string;
    email: string;
    requestedEdition: EditionMode;
    reason: string;
  }) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  edition,
  open,
  initialTab,
  user,
  adminUsernameActive,
  isAdmin,
  cloudSynced,
  onClose,
  onNotify,
  onRefreshUser,
  onAdminSignIn,
  onAdminSignOut,
  onOpenAdminPanel,
  onSubmitAccountRequest,
}) => {
  const isAdults = edition === 'adults';
  const [tab, setTab] = useState<AuthModalTab>(initialTab);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Request an Account fields
  const [fullName, setFullName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqEdition, setReqEdition] = useState<EditionMode>(edition);
  const [reqReason, setReqReason] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConsoleGuide, setShowConsoleGuide] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setReqEdition(edition);
      setErrorMsg(null);
      setShowConsoleGuide(false);
      setRequestSubmitted(false);
    }
  }, [open, initialTab, edition]);

  if (!open) return null;

  const boxShape = isAdults ? 'rounded-none' : 'rounded-2xl';
  const inputShape = isAdults ? 'rounded-none' : 'rounded-xl';
  const btnShape = isAdults ? 'rounded-none' : 'rounded-xl';

  const formatAuthError = (err: unknown): string => {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: string }).code || '')
        : '';
    if (code === 'auth/operation-not-allowed') {
      setShowConsoleGuide(true);
      return 'Email/Password sign-in is not enabled yet in Firebase Console. Use "Sign In with Google" or admin credentials, or enable Email/Password in Authentication -> Sign-in method.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup was closed before finishing.';
    }
    if (code === 'auth/popup-blocked') {
      return 'Browser blocked the sign-in popup. Allow popups for this site and try again.';
    }
    if (code === 'auth/unauthorized-domain') {
      return `Domain "${window.location.hostname}" is not authorized in Firebase Authentication -> Settings -> Authorized domains yet.`;
    }
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      return 'Invalid username/email or password. Please check your credentials and try again.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address or username ("admin").';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Please wait a minute before trying again.';
    }
    return err instanceof Error ? err.message : 'Authentication failed.';
  };

  const handleGoogleAuth = async () => {
    setBusy(true);
    setErrorMsg(null);
    setShowConsoleGuide(false);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      onNotify(`Signed in as ${cred.user.displayName || cred.user.email || 'user'}.`);
      if (cred.user.emailVerified) {
        onClose();
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const idTrim = identifier.trim();
    if (!idTrim || !password) {
      setErrorMsg('Please enter your username/email and password.');
      return;
    }

    // Built-in Admin Account
    if (idTrim.toLowerCase() === 'admin') {
      if (password === 'Ivanna2016@') {
        setErrorMsg(null);
        onAdminSignIn();
        onNotify('Signed in as Admin. Admin Controls unlocked.');
        onClose();
        return;
      }
      setErrorMsg('Invalid password for admin account.');
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setShowConsoleGuide(false);
    try {
      const cred = await signInWithEmailAndPassword(auth, idTrim, password);
      if (!cred.user.emailVerified) {
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Ignore rate limit if already sent recently
        }
        onNotify('Signed in. Please verify your email address to enable cloud sync.');
      } else {
        onNotify(`Signed in as ${cred.user.displayName || cred.user.email || 'user'}.`);
        onClose();
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameClean = fullName.trim().slice(0, 80);
    const emailClean = reqEmail.trim().slice(0, 254);
    const reasonClean = reqReason.trim().slice(0, 300);

    if (!nameClean || !emailClean || !emailClean.includes('@')) {
      setErrorMsg('Enter your full name and a valid email address.');
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    try {
      await onSubmitAccountRequest({
        fullName: nameClean,
        email: emailClean,
        requestedEdition: reqEdition,
        reason: reasonClean,
      });
      setRequestSubmitted(true);
      setFullName('');
      setReqEmail('');
      setReqReason('');
      onNotify('Account request submitted for admin review.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit account request.');
    } finally {
      setBusy(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await sendEmailVerification(user);
      onNotify('Verification email sent. Check your inbox and spam folder.');
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleReloadUser = async () => {
    if (!user) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await reload(user);
      // Force fresh JWT so Firestore security rules immediately observe email_verified == true
      await user.getIdToken(true);
      await onRefreshUser();
      if (auth.currentUser?.emailVerified) {
        onNotify('Email verified! Cloud sync is now active.');
        onClose();
      } else {
        setErrorMsg(
          'Email is still unverified. Click the verification link in your inbox, then press Refresh Status again.'
        );
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOutAll = async () => {
    setBusy(true);
    try {
      if (user) {
        await signOut(auth);
      }
      onAdminSignOut();
      onNotify('Signed out.');
      onClose();
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const isSignedInSession = Boolean(user || adminUsernameActive);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Account Sign In and Account Request"
    >
      <div
        className={`w-full max-w-md border bg-white p-5 shadow-lg dark:bg-neutral-900 ${boxShape} ${
          isAdults
            ? 'border-neutral-200 dark:border-neutral-700'
            : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-bold text-neutral-950 dark:text-white">
              {isSignedInSession
                ? 'Account & Controls'
                : tab === 'signin'
                ? 'Sign In to BalanceLedger'
                : 'Request an Account'}
            </h2>
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isSignedInSession
                ? 'Manage session, email verification, and admin controls'
                : 'Sign in with existing credentials or request new access'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className={`border border-neutral-200/80 p-1.5 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 ${btnShape}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isSignedInSession ? (
          <div className="space-y-4">
            <div
              className={`border p-3.5 ${boxShape} ${
                isAdults
                  ? 'border-neutral-200/80 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-950'
                  : 'border-indigo-100 bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-950'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-neutral-950 dark:text-white">
                    {user
                      ? user.displayName || 'Account Holder'
                      : 'admin (Built-In Admin Account)'}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-300">
                    {user ? user.email : 'Administrator Controls Session'}
                  </div>
                </div>
                {user ? (
                  <span
                    className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-semibold ${btnShape} ${
                      user.emailVerified
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                    }`}
                  >
                    {user.emailVerified ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </>
                    ) : (
                      <>
                        <Mail className="h-3 w-3" /> Unverified
                      </>
                    )}
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 border border-neutral-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-900 ${btnShape}`}
                  >
                    Admin
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-neutral-200/70 pt-2.5 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                <Cloud className="h-3.5 w-3.5" />
                <span>
                  {user
                    ? user.emailVerified
                      ? cloudSynced
                        ? 'Firestore cloud sync is active for this edition.'
                        : 'Connecting to Firestore cloud sync...'
                      : 'Verify your email to enable Firestore cloud sync.'
                    : 'Local admin controls active. Connect Google Admin inside Admin Controls for cloud sync.'}
                </span>
              </div>
            </div>

            {user && !user.emailVerified && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleResendVerification}
                  className={`flex-1 border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white ${btnShape}`}
                >
                  Resend Verification Email
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleReloadUser}
                  className={`flex-1 border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${btnShape} ${
                    isAdults
                      ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800'
                      : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Refresh &amp; Verify Now
                </button>
              </div>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  onOpenAdminPanel();
                  onClose();
                }}
                className={`w-full border px-4 py-2 text-xs font-semibold ${btnShape} ${
                  isAdults
                    ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-white dark:bg-white dark:text-neutral-900'
                    : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                Open Admin Controls &amp; Account Requests
              </button>
            )}

            {errorMsg && (
              <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className={`border border-neutral-200/80 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 ${btnShape}`}
              >
                Done
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleSignOutAll}
                className={`inline-flex items-center gap-1.5 border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-neutral-900 dark:text-red-400 ${btnShape}`}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sign In / Request an Account Tab Switcher */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setErrorMsg(null);
                  setRequestSubmitted(false);
                }}
                className={`border px-3 py-2 text-xs font-semibold transition-colors ${btnShape} ${
                  tab === 'signin'
                    ? isAdults
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                      : 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-neutral-200/80 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('request');
                  setErrorMsg(null);
                }}
                className={`border px-3 py-2 text-xs font-semibold transition-colors ${btnShape} ${
                  tab === 'request'
                    ? isAdults
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                      : 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-neutral-200/80 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
                }`}
              >
                Request an Account
              </button>
            </div>

            {tab === 'signin' ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGoogleAuth}
                  className={`flex w-full items-center justify-center gap-2 border px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${btnShape} ${
                    isAdults
                      ? 'border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{busy ? 'Opening Google...' : 'Sign In with Google'}</span>
                </button>

                <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-400">
                  <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                  <span>OR USERNAME / EMAIL</span>
                  <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                </div>

                <form onSubmit={handleSignInSubmit} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Username or Email
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={254}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="admin or name@example.com"
                      className={`w-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${inputShape}`}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className={`w-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${inputShape}`}
                    />
                  </div>

                  {errorMsg && (
                    <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
                      {errorMsg}
                    </div>
                  )}

                  {showConsoleGuide && (
                    <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
                      <strong>Enable Email/Password in Firebase Console:</strong> Open project{' '}
                      <code className="font-mono">gen-lang-client-0487953598</code> &rarr;{' '}
                      <strong>Authentication</strong> &rarr; <strong>Sign-in method</strong> &rarr;{' '}
                      <strong>Email/Password</strong> &rarr; Enable &amp; Save.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className={`w-full border px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${btnShape} ${
                      isAdults
                        ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-white dark:bg-white dark:text-neutral-900'
                        : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {busy ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>
              </>
            ) : requestSubmitted ? (
              <div className="space-y-4">
                <div className="border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <div className="font-bold">Account Request Submitted</div>
                  <p className="mt-1 leading-relaxed">
                    Your request has been queued for administrator review. An admin can review and
                    approve it inside Admin Controls.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setRequestSubmitted(false);
                  }}
                  className={`w-full border px-4 py-2.5 text-xs font-semibold ${btnShape} ${
                    isAdults
                      ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800'
                      : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jordan Taylor"
                    className={`w-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${inputShape}`}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${inputShape}`}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Preferred Edition
                  </label>
                  <select
                    value={reqEdition}
                    onChange={(e) => setReqEdition(e.target.value as EditionMode)}
                    className={`w-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${inputShape}`}
                  >
                    <option value="adults">Adults Edition (BalanceLedger White)</option>
                    <option value="kids">Kids Edition (PiggyPal)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Note for Admin (Optional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={300}
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    placeholder="Briefly describe how you plan to use this ledger..."
                    className={`w-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${inputShape}`}
                  />
                </div>

                {errorMsg && (
                  <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className={`w-full border px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${btnShape} ${
                    isAdults
                      ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-white dark:bg-white dark:text-neutral-900'
                      : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {busy ? 'Submitting Request...' : 'Submit Account Request'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
