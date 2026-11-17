import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { EditionMode, LedgerState } from './types/ledger';

const app = initializeApp(firebaseConfig);

// CRITICAL: Pass firebaseConfig.firestoreDatabaseId so Enterprise Firestore resolves properly
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/**
 * Normalizes and enforces volumetric bounds defined in firebase-blueprint.json
 * and strips undefined properties before writing to Firestore.
 */
export function buildCloudLedgerPayload(
  state: LedgerState,
  edition: EditionMode,
  ownerId: string
) {
  const snapEntries = Object.entries(state.monthlySnapshots || {}).slice(0, 120);
  const monthlySnapshots = Object.fromEntries(
    snapEntries.map(([ym, snap]) => [
      ym.slice(0, 10),
      {
        wallet: Number(snap.wallet) || 0,
        saved: Number(snap.saved) || 0,
        share: Number(snap.share) || 0,
        total: Number(snap.total) || 0,
        recordedDate: String(snap.recordedDate || '').slice(0, 20),
        mode: String(snap.mode || 'Snapshot').slice(0, 60),
      },
    ])
  );

  const budgetEntries = Object.entries(state.categoryBudgets || {}).slice(0, 30);
  const categoryBudgets = Object.fromEntries(
    budgetEntries.map(([cat, cap]) => [String(cat).slice(0, 60), Number(cap) || 0])
  );

  return {
    ownerId,
    edition,
    name: (state.name || (edition === 'adults' ? 'Primary Account' : 'Saver')).trim().slice(0, 80) || 'Account',
    theme: state.theme === 'dark' ? 'dark' : 'light',
    currency: state.currency,
    wallet: Number(state.wallet) || 0,
    saved: Number(state.saved) || 0,
    share: Number(state.share) || 0,
    allowance: Number(state.allowance) || 0,
    pinEnabled: Boolean(state.pinEnabled),
    pinCode: (state.pinCode || '1234').slice(0, 16) || '1234',
    skippedTotal: Number(state.skippedTotal) || 0,
    lastAuto16Month: String(state.lastAuto16Month || '').slice(0, 10),
    monthlySnapshots,
    jars: (state.jars || []).slice(0, 50).map((j) => stripUndefined({ ...j })),
    wishes: (state.wishes || []).slice(0, 100).map((w) => stripUndefined({ ...w })),
    paused: (state.paused || []).slice(0, 100).map((p) => stripUndefined({ ...p })),
    bought: (state.bought || []).slice(0, 250).map((b) => stripUndefined({ ...b })),
    ious: (state.ious || []).slice(0, 100).map((i) => stripUndefined({ ...i })),
    chores: (state.chores || []).slice(0, 100).map((c) => stripUndefined({ ...c })),
    shareLog: (state.shareLog || []).slice(0, 150).map((s) => stripUndefined({ ...s })),
    activity: (state.activity || []).slice(0, 40).map((a) => stripUndefined({ ...a })),
    categoryBudgets,
    subscriptions: (state.subscriptions || []).slice(0, 100).map((s) => stripUndefined({ ...s })),
    pinnedPlaces: (state.pinnedPlaces || []).slice(0, 100).map((p) => stripUndefined({ ...p })),
  };
}
