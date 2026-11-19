# D&D Group — Firestore Security Specification (Phase 0)

## 1. Data Invariants

1. **Identity & Email Verification Gate**: Every write (`create`, `update`, `delete`) across `/users`, `/users/{userId}/cartItems`, `/trialOrders`, and `/dealerLeads` requires an authenticated user with `request.auth.token.email_verified == true`.
2. **PII Isolation**: `/users/{userId}`, `/trialOrders/{orderId}`, and `/dealerLeads/{leadId}` contain PII (`email`, `phone`, `name`, `business`). `get` and `list` operations MUST strictly restrict access to `ownerId == request.auth.uid` (or `userId == request.auth.uid`) or a verified admin (`isAdmin()`). Blanket `isSignedIn()` reads or client-delegated list filters are forbidden.
3. **Master Gate & Referential Existence**: A cart item at `/users/{userId}/cartItems/{skuId}`, a trial order at `/trialOrders/{orderId}`, or a dealer lead at `/dealerLeads/{leadId}` cannot be created unless the parent `/users/{request.auth.uid}` profile document exists.
4. **Immutable Ownership & Temporal Integrity**: `ownerId`, `uid`, `referenceId`, `productId`, and `createdAt` are immutable after creation. Every `createdAt` on `create` and `updatedAt` on `create`/`update` MUST equal `request.time`.
5. **Terminal State Locking**: Once a `TrialOrder` reaches `status == 'Closed'`, non-admin owners cannot mutate any field on the document.
6. **Bounded Payloads & Strict Schemas**: Every string enforces explicit `.size()` bounds matching `firebase-blueprint.json`; `phone` matches `^[6-9][0-9]{9}$`; `productId` matches `^DD-[0-9]{4}$`; `TrialOrder.items` is strictly bounded to `1 <= items.size() <= 50`; shadow/ghost keys are blocked via `hasAll` + `hasOnly` on `create` and `affectedKeys().hasOnly(...)` on `update`.
7. **Zero Privilege Escalation**: `/admins/{adminId}` denies all client writes; `/users/{userId}` forbids any `role` or `isAdmin` field.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Category | Target Path & Operation | Adversarial Payload / Context | Expected Result |
|---|---|---|---|---|
| 1 | **Identity Spoofing** | `POST /trialOrders/DD-SPOOF-1` | `{ "ownerId": "victim_uid", ... }` signed in as `attacker_uid` | `PERMISSION_DENIED` |
| 2 | **Shadow Field Injection (Create)** | `POST /users/attacker_uid` | `{ "uid": "attacker_uid", "displayName": "A", "email": "a@b.com", "photoURL": "", "isAdmin": true, "createdAt": "<server>", "updatedAt": "<server>" }` | `PERMISSION_DENIED` |
| 3 | **Shadow Field Injection (Update)** | `PATCH /trialOrders/DD-OK-1` | `{ "status": "Contacted", "updatedAt": "<server>", "isVerified": true }` | `PERMISSION_DENIED` |
| 4 | **Email Spoofing (Unverified Admin)** | `GET /trialOrders/DD-VICTIM-1` | Auth token `{ "email": "mohitdeval9799@gmail.com", "email_verified": false }` | `PERMISSION_DENIED` |
| 5 | **PII Blanket Read (Non-Owner)** | `GET /dealerLeads/LEAD-VICTIM-1` | Authenticated as `other_user_uid` (`ownerId == "victim_uid"`) | `PERMISSION_DENIED` |
| 6 | **Client-Delegated List Scraping** | `LIST /trialOrders` (unfiltered) | Authenticated as `other_user_uid` querying collection with foreign docs | `PERMISSION_DENIED` |
| 7 | **Terminal State Mutation** | `PATCH /trialOrders/DD-CLOSED-1` | Owner attempts `{ "status": "Requested", "updatedAt": "<server>" }` when `existing().status == "Closed"` | `PERMISSION_DENIED` |
| 8 | **Value Poisoning on Allowed Key** | `PATCH /trialOrders/DD-OK-1` | Owner sends `{ "status": 99999, "updatedAt": "<server>" }` or `{ "status": "ShippedFree", "updatedAt": "<server>" }` | `PERMISSION_DENIED` |
| 9 | **Resource Exhaustion / ID Poisoning** | `POST /users/attacker_uid/cartItems/<200-char-id>` | Document ID exceeds 128 chars or contains `$` / spaces | `PERMISSION_DENIED` |
| 10 | **Unbounded Array / Empty Items** | `POST /trialOrders/DD-HUGE-1` | `items` array has `0` elements or `51` elements (exceeds max `50`) | `PERMISSION_DENIED` |
| 11 | **Client-Forged Timestamp** | `POST /dealerLeads/LEAD-BACKDATE-1` | `createdAt` set to `"2020-01-01T00:00:00Z"` instead of `request.time` | `PERMISSION_DENIED` |
| 12 | **Admin Collection Escalation** | `POST /admins/attacker_uid` | `{ "uid": "attacker_uid" }` by authenticated non-admin user | `PERMISSION_DENIED` |
