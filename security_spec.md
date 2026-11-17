# Security Specification — BalanceLedger / PiggyPal Firestore Rules

## 1. Data Invariants
1. **Strict Ownership**: Every `/users/{userId}` document and every `/users/{userId}/ledgers/{editionId}` document is strictly owned by `userId == request.auth.uid`. No cross-user reads or writes are permitted.
2. **Email Verification Gate**: All authenticated read/write operations on Firestore require `request.auth.token.email_verified == true` to prevent unverified account spoofing.
3. **Master Gate Relational Sync**: A `/users/{userId}/ledgers/{editionId}` document cannot exist, be read, or be written unless the parent `/users/{userId}` document exists and has `ownerId == request.auth.uid`.
4. **Immutable Identity & Timestamps**: `ownerId`, `edition`, and `createdAt` are immutable after creation. `createdAt == request.time` on creation, and `updatedAt == request.time` on creation and every update.
5. **Edition Allowlist & Key Sync**: `editionId` and `edition` MUST equal `'adults'` or `'kids'`, and `data.edition == editionId`.
6. **Bounded Payloads & Anti-Shadow Fields**: Every string has strict `.size()` bounds, every list has explicit `.size() <= MAX` bounds plus first-element type guarding when non-empty, every map (`monthlySnapshots`, `categoryBudgets`) has bounded key counts, and `keys().hasAll` + `keys().hasOnly` + `affectedKeys().hasOnly` forbid arbitrary shadow fields.
7. **PII Isolation**: `email` lives exclusively in `/users/{userId}` and `/accountRequests/{requestId}` and can only be read by `isOwner(userId)` or `isAdmin()`; blanket `list` queries on `/users` are denied.
8. **Account Request Integrity**: Visitors may only `create` `/accountRequests/{requestId}` with `status == 'pending'`; only verified admins (`isAdmin()`) may read, list, approve/reject (`status`), or delete requests.
9. **Admin RBAC Protection**: Only verified admins (`takshdevelopment@gmail.com` with `email_verified == true` or existing `/admins/{uid}`) can create/modify `/admins/{userId}` documents; regular users cannot self-elevate.

## 2. The "Dirty Dozen" Payloads (Expected `PERMISSION_DENIED`)
1. **Unauthenticated Read/Write**: Anonymous client attempts `get(/users/userA)` or `set(/users/userA/ledgers/adults)`.
2. **Unverified Email Write**: Signed-in user with `email_verified: false` attempts `set(/users/userA)` or `set(/users/userA/ledgers/adults)`.
3. **Cross-User Read (PII Leak)**: Verified `userB` attempts `get(/users/userA)` to steal `userA`'s email.
4. **Cross-User List Scrape**: Verified `userB` attempts `list(/users)` or `list(/users/userA/ledgers)`.
5. **Identity Spoofing on Create**: Verified `userA` attempts `create(/users/userA)` with `ownerId: "userB"`.
6. **Shadow / Ghost Field Injection**: Verified `userA` sends valid `UserProfile` or `LedgerEdition` plus `"isAdmin": true` or `"role": "superadmin"`.
7. **Orphaned Ledger Without Parent**: Verified `userA` attempts `create(/users/userA/ledgers/adults)` before `/users/userA` exists.
8. **Invalid Edition ID Poisoning**: Verified `userA` attempts `create(/users/userA/ledgers/crypto)` or sets `edition: "kids"` inside `/ledgers/adults`.
9. **ID Poisoning (Junk/Oversized ID)**: Verified `userA` attempts `get(/users/invalid$id#12345)` or `create(/users/userA/ledgers/abc$def)`.
10. **Immutable Field Mutation**: Verified `userA` attempts `update(/users/userA/ledgers/adults)` changing `ownerId`, `edition`, or `createdAt`.
11. **Timestamp Forgery**: Verified `userA` attempts `create` or `update` with client-supplied `updatedAt` != `request.time`.
12. **Array / String Exhaustion (Denial of Wallet)**: Verified `userA` sends `name` with 500 characters (`> 80`), `activity` list with 100 items (`> 40`), or `jars` containing a non-map primitive `[ "bad-item" ]`.
