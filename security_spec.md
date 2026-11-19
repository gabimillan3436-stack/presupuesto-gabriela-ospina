# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Strict Ownership (`users/{userId}`)**: Only the authenticated user whose `request.auth.uid == userId` may read (`get`), create, or update their own profile document. Listing `/users` is unconditionally forbidden (`allow list: if false`).
2. **Master Gate & Per-Account Isolation (`users/{userId}/movements/{movementId}`)**: A movement cannot be created unless the parent `/users/{userId}` document already exists and `request.auth.uid == userId`. Every movement's `uid` field must strictly match `request.auth.uid` and remain immutable after creation.
3. **Server Timestamp Integrity**: `createdAt` must equal `request.time` on creation and remain unchanged on updates; `updatedAt` must equal `request.time` on both creation and updates.
4. **Volumetric & Schema Guardrails**: All document IDs (`userId`, `movementId`) must match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), `keys().hasAll(...)` and `keys().hasOnly(...)` reject shadow fields, and every string/number field enforces explicit bounds matching `firebase-blueprint.json`.

## 2. The "Dirty Dozen" Payloads (Expected Result: `PERMISSION_DENIED`)
1. **Unauthenticated read/write** on `/users/userA` or `/users/userA/movements/mov1`.
2. **Cross-tenant read (`get`)** by `userB` on `/users/userA`.
3. **Cross-tenant `list` query** by `userB` on `/users/userA/movements` or `/users`.
4. **Identity Spoofing on create**: `userA` writes `/users/userA/movements/mov1` with `{ uid: "userB", ... }`.
5. **Shadow Field Injection**: `userA` writes `/users/userA` with an unexpected ghost key `{ ..., isAdmin: true }`.
6. **ID Poisoning**: `userA` writes `/users/userA/movements/${"x".repeat(300)}` or path with invalid characters (`../bad`).
7. **Client Timestamp Forgery**: `userA` writes `{ ..., createdAt: new Date("2020-01-01") }` instead of `request.time`.
8. **Immutable Field Mutation**: `userA` updates `/users/userA` attempting to change `uid` or `createdAt`.
9. **Orphaned Movement Write**: `userA` creates `/users/userA/movements/mov1` before `/users/userA` exists.
10. **Negative or Zero Amount**: `userA` creates a movement with `amount: -5000` or `amount: 0`.
11. **Oversized String Exhaustion**: `userA` creates a movement with `concept: "a".repeat(2000)` or `notes: "b".repeat(5000)`.
12. **Invalid Enum / Regex Date**: `userA` creates a movement with `type: "admin_override"` or `isoDate: "18-11-2026"`.
