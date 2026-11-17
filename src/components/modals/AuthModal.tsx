import React, { useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { CheckCircle2, Cloud, LogOut, Mail, ShieldCheck, X } from 'lucide-react';
import { auth, googleProvider } from '../../firebase';
import { EditionMode } from '../../types/ledger';

export type AuthModalTab = 'signin' | 'signup';

interface AuthModalProps {
  edition: EditionMode;
  open: boolean;
  initialTab: AuthModalTab;
  user: User | null;
  cloudSynced: boolean;
  onClose: () => void;
  onNotify: (msg: string) => void;
  onRefreshUser: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  edition,
  open,
  initialTab,
  user,
  cloudSynced,
  onClose,
  onNotify,
  onRefreshUser,
}) => {
  const isAdults = edition === 'adults';
  const [tab, setTab] = useState<AuthModalTab>(initialTab);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConsoleGuide, setShowConsoleGuide] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setErrorMsg(null);
      setShowConsoleGuide(false);
    }
  }, [open, initialTab]);

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
      return 'Email/Password sign-in is not enabled yet in Firebase Console. Use "Continue with Google" below or enable Email/Password under Authentication -> Sign-in method.';
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
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Switch to Sign In instead.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
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
      onClose();
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    setShowConsoleGuide(false);
    try {
      if (tab === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim().slice(0, 80) });
        }
        await sendEmailVerification(cred.user);
        onNotify('Account created! Please check your email to verify for cloud sync.');
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        onNotify(`Signed in as ${cred.user.displayName || cred.user.email || 'user'}.`);
        onClose();
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
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
      onNotify('Verification email sent. Check your inbox.');
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
      onRefreshUser();
      if (auth.currentUser?.emailVerified) {
        onNotify('Email verified! Cloud sync is now active.');
      } else {
        setErrorMsg('Email is still unverified. Click the link sent to your inbox first.');
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut(auth);
      onNotify('Signed out. Local ledger remains saved on this device.');
      onClose();
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Account Sign In and Sign Up"
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
              {user
                ? 'Account & Cloud Sync'
                : tab === 'signin'
                ? 'Sign In to BalanceLedger'
                : 'Create Your Account'}
            </h2>
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {user
                ? 'Sync balances, monthly charts, bills & pinned map places'
                : 'Save and sync your ledger across devices'}
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

        {user ? (
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
                    {user.displayName || 'Account Holder'}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-300">
                    {user.email}
                  </div>
                </div>
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
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-neutral-200/70 pt-2.5 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                <Cloud className="h-3.5 w-3.5" />
                <span>
                  {user.emailVerified
                    ? cloudSynced
                      ? 'Firestore cloud sync is active for this edition.'
                      : 'Connecting to Firestore cloud sync...'
                    : 'Verify your email to enable Firestore cloud sync. Local storage remains active.'}
                </span>
              </div>
            </div>

            {!user.emailVerified && (
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
                  Refresh Status
                </button>
              </div>
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
                onClick={handleSignOut}
                className={`inline-flex items-center gap-1.5 border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-neutral-900 dark:text-red-400 ${btnShape}`}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sign In / Sign Up Tab Switcher */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setErrorMsg(null);
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
                  setTab('signup');
                  setErrorMsg(null);
                }}
                className={`border px-3 py-2 text-xs font-semibold transition-colors ${btnShape} ${
                  tab === 'signup'
                    ? isAdults
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                      : 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-neutral-200/80 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Google Primary Button */}
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
              <span>
                {tab === 'signin' ? 'Sign In with Google' : 'Sign Up with Google'}
              </span>
            </button>

            <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-400">
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
              <span>OR USE EMAIL</span>
              <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {tab === 'signup' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Account / Display Name
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={isAdults ? 'e.g. Alex Morgan' : 'e.g. Sam'}
                    className={`w-full border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${inputShape}`}
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
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
                  <strong>Enable Email/Password in Firebase Console:</strong> Open Firebase Console
                  for project <code className="font-mono">gen-lang-client-0487953598</code> &rarr;{' '}
                  <strong>Authentication</strong> &rarr; <strong>Sign-in method</strong> &rarr;{' '}
                  <strong>Add new provider</strong> &rarr; <strong>Email/Password</strong> &rarr;
                  Enable &amp; Save.
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
                {busy
                  ? 'Please wait...'
                  : tab === 'signin'
                  ? 'Sign In with Email'
                  : 'Create Account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
