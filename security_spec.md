# D&D Group — Firestore Security Specification (Phase 0, Rev 2)

## 1. Data Invariants

1. **Identity & Email Verification Gate**: Every write across all collections requires an authenticated user with `request.auth.token.email_verified == true`.
2. **Admin-Only Catalog & Storefront Mutation**: `/catalogProducts/{productId}` and `/businessSettings/main` contain non-PII public storefront data and are publicly readable, but strictly writable (`create`, `update`, `delete`) ONLY by a verified administrator (`isAdmin()`). Non-admin dealers cannot alter prices, product photos, descriptions, or business settings.
3. **Safe Image URI Guard**: `CatalogProductOverride.imageUrl` is strictly bounded (`<= 160,000` chars) and must be empty `""`, `https://...`, or `data:image/(jpeg|png|webp);base64,...` (preventing `javascript:` or oversized blob injection).
4. **PII Isolation**: `/users/{userId}`, `/trialOrders/{orderId}`, and `/dealerLeads/{leadId}` contain PII (`email`, `phone`, `name`, `business`). `get` and `list` strictly restrict access to `ownerId == request.auth.uid` or verified admin (`isBootstrappedAdmin()` for zero-DB-read list queries, `isAdmin()` for gets).
5. **Master Gate & Referential Existence**: Cart items, trial orders, and dealer leads require an existing `/users/{request.auth.uid}` profile document on creation.
6. **Immutable Ownership & Temporal Integrity**: `ownerId`, `uid`, `referenceId`, `productId`, `id`, and `createdAt` are immutable after creation. Every `createdAt` on create and `updatedAt` on create/update MUST equal `request.time`.
7. **Terminal State Locking**: Once a `TrialOrder` reaches `status == 'Closed'`, non-admin owners cannot mutate it.
8. **Zero Privilege Escalation**: `/admins/{adminId}` denies all client writes; `/users/{userId}` forbids `role` or `isAdmin` fields.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Category | Target Path & Operation | Adversarial Payload / Context | Expected Result |
|---|---|---|---|---|
| 1 | **Identity Spoofing** | `POST /trialOrders/DD-SPOOF-1` | `{ "ownerId": "victim_uid", ... }` signed in as `attacker_uid` | `PERMISSION_DENIED` |
| 2 | **Non-Admin Price Tampering** | `PATCH /catalogProducts/DD-0001` | Regular dealer sets `{ "price": 1, "updatedAt": "<server>" }` | `PERMISSION_DENIED` |
| 3 | **XSS / Unsafe Image URL Injection** | `POST /catalogProducts/DD-0001` | Admin or attacker sets `imageUrl: "javascript:alert(1)"` | `PERMISSION_DENIED` |
| 4 | **Email Spoofing (Unverified Admin)** | `POST /businessSettings/main` | Auth token `{ "email": "mohitdeval9799@gmail.com", "email_verified": false }` | `PERMISSION_DENIED` |
| 5 | **PII Blanket Read (Non-Owner)** | `GET /dealerLeads/LEAD-VICTIM-1` | Authenticated as `other_user_uid` (`ownerId == "victim_uid"`) | `PERMISSION_DENIED` |
| 6 | **Shadow Field Injection (Update)** | `PATCH /trialOrders/DD-OK-1` | `{ "status": "Contacted", "updatedAt": "<server>", "isVerified": true }` | `PERMISSION_DENIED` |
| 7 | **Terminal State Mutation** | `PATCH /trialOrders/DD-CLOSED-1` | Owner attempts `{ "status": "Requested", "updatedAt": "<server>" }` when `existing().status == "Closed"` | `PERMISSION_DENIED` |
| 8 | **Value Poisoning on Allowed Key** | `PATCH /trialOrders/DD-OK-1` | Owner sends `{ "status": 99999, "updatedAt": "<server>" }` or invalid enum | `PERMISSION_DENIED` |
| 9 | **Resource Exhaustion / ID Poisoning** | `POST /users/attacker_uid/cartItems/<200-char-id>` | Document ID exceeds limits or contains invalid characters | `PERMISSION_DENIED` |
| 10 | **Unbounded Array / Empty Items** | `POST /trialOrders/DD-HUGE-1` | `items` array has `0` elements or `51` elements | `PERMISSION_DENIED` |
| 11 | **Client-Forged Timestamp** | `POST /dealerLeads/LEAD-BACKDATE-1` | `createdAt` set to client date string instead of `request.time` | `PERMISSION_DENIED` |
| 12 | **Admin Collection Escalation** | `POST /admins/attacker_uid` | `{ "uid": "attacker_uid" }` by non-admin user | `PERMISSION_DENIED` |
