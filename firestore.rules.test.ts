/**
 * Phase 0 Rules Test Specification for BalanceLedger / PiggyPal
 * Validates the Dirty Dozen adversarial payloads against @firebase/rules-unit-testing.
 */

export const DIRTY_DOZEN_PAYLOADS = [
  {
    name: '1. Unauthenticated access to user profile',
    auth: null,
    path: 'users/userA',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '2. Unverified email write attempt',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: false },
    path: 'users/userA',
    operation: 'create',
    payload: {
      ownerId: 'userA',
      email: 'a@example.com',
      displayName: 'User A',
      preferredEdition: 'adults',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '3. Cross-user PII get attempt',
    auth: { uid: 'userB', email: 'b@example.com', email_verified: true },
    path: 'users/userA',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. Collection list scrape attempt on /users',
    auth: { uid: 'userB', email: 'b@example.com', email_verified: true },
    path: 'users',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Owner ID spoofing on user profile creation',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    path: 'users/userA',
    operation: 'create',
    payload: {
      ownerId: 'userB',
      email: 'a@example.com',
      displayName: 'Spoofer',
      preferredEdition: 'adults',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Shadow field injection (isAdmin: true)',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    path: 'users/userA',
    operation: 'create',
    payload: {
      ownerId: 'userA',
      email: 'a@example.com',
      displayName: 'User A',
      preferredEdition: 'adults',
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. Orphaned ledger write without parent user doc',
    auth: { uid: 'userOrphan', email: 'o@example.com', email_verified: true },
    path: 'users/userOrphan/ledgers/adults',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '8. Mismatched or invalid editionId',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    path: 'users/userA/ledgers/crypto',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '9. Invalid path variable ID poisoning',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    path: 'users/userA$bad',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Mutating immutable createdAt or ownerId on update',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    path: 'users/userA/ledgers/adults',
    operation: 'update',
    patch: { ownerId: 'userB' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. Forged non-server timestamp on updatedAt',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    path: 'users/userA',
    operation: 'update',
    patch: { updatedAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Array exhaustion & primitive poisoning inside jars list',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    path: 'users/userA/ledgers/adults',
    operation: 'update',
    patch: { jars: ['invalid-primitive'] },
    expected: 'PERMISSION_DENIED',
  },
] as const;
