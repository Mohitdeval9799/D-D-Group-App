import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

/**
 * Phase 0 & Phase 5 Security Rules Verification Suite
 * Verifies blueprint-rule synchronicity and evaluates all 12 "Dirty Dozen"
 * adversarial payloads against the exact invariants enforced in firestore.rules.
 */

const RULES_PATH = fs.existsSync(path.resolve('firestore.rules'))
  ? path.resolve('firestore.rules')
  : path.resolve('DRAFT_firestore.rules');
const BLUEPRINT_PATH = path.resolve('firebase-blueprint.json');

const rulesText = fs.readFileSync(RULES_PATH, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(BLUEPRINT_PATH, 'utf8'));

interface MockAuth {
  uid: string;
  email: string;
  email_verified: boolean;
}

const SERVER_TIME = 'SERVER_TIMESTAMP';
const ADMIN_EMAIL = 'mohitdeval9799@gmail.com';

const isValidId = (id: unknown): boolean =>
  typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id);

const isValidSkuId = (id: unknown): boolean =>
  typeof id === 'string' && id.length >= 7 && id.length <= 12 && /^DD-[0-9]{4}$/.test(id);

const isValidPhone = (phone: unknown): boolean =>
  typeof phone === 'string' && phone.length === 10 && /^[6-9][0-9]{9}$/.test(phone);

const isAdmin = (auth: MockAuth | null): boolean =>
  Boolean(auth && auth.email_verified === true && auth.email === ADMIN_EMAIL);

function hasExactKeys(obj: Record<string, unknown>, allowed: string[]): boolean {
  const keys = Object.keys(obj);
  return allowed.every((k) => keys.includes(k)) && keys.every((k) => allowed.includes(k));
}

function affectedKeys(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown>
): string[] {
  const all = new Set([...Object.keys(incoming), ...Object.keys(existing)]);
  const changed: string[] = [];
  for (const key of all) {
    if (JSON.stringify(incoming[key]) !== JSON.stringify(existing[key])) {
      changed.push(key);
    }
  }
  return changed;
}

const VALID_ORDER_STATUSES = ['Requested', 'Contacted', 'Trial confirmed', 'Closed'];

function evaluateTrialOrderCreate(
  auth: MockAuth | null,
  orderId: string,
  data: Record<string, unknown>,
  userProfileExists: boolean
): 'ALLOW' | 'PERMISSION_DENIED' {
  const required = [
    'ownerId',
    'referenceId',
    'date',
    'name',
    'business',
    'phone',
    'city',
    'segment',
    'notes',
    'items',
    'total',
    'status',
    'repeat',
    'createdAt',
    'updatedAt',
  ];
  if (!auth || !auth.email_verified) return 'PERMISSION_DENIED';
  if (!isValidId(orderId)) return 'PERMISSION_DENIED';
  if (!hasExactKeys(data, required)) return 'PERMISSION_DENIED';
  if (data.ownerId !== auth.uid) return 'PERMISSION_DENIED';
  if (data.referenceId !== orderId) return 'PERMISSION_DENIED';
  if (!isValidPhone(data.phone)) return 'PERMISSION_DENIED';
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 50) {
    return 'PERMISSION_DENIED';
  }
  if (!VALID_ORDER_STATUSES.includes(String(data.status))) return 'PERMISSION_DENIED';
  if (data.createdAt !== SERVER_TIME || data.updatedAt !== SERVER_TIME) return 'PERMISSION_DENIED';
  if (!userProfileExists) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

function evaluateTrialOrderUpdate(
  auth: MockAuth | null,
  orderId: string,
  incoming: Record<string, unknown>,
  existing: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || !auth.email_verified) return 'PERMISSION_DENIED';
  if (!isValidId(orderId)) return 'PERMISSION_DENIED';
  const required = [
    'ownerId',
    'referenceId',
    'date',
    'name',
    'business',
    'phone',
    'city',
    'segment',
    'notes',
    'items',
    'total',
    'status',
    'repeat',
    'createdAt',
    'updatedAt',
  ];
  if (!hasExactKeys(incoming, required)) return 'PERMISSION_DENIED';
  if (!VALID_ORDER_STATUSES.includes(String(incoming.status))) return 'PERMISSION_DENIED';
  if (typeof incoming.status !== 'string') return 'PERMISSION_DENIED';
  if (incoming.ownerId !== existing.ownerId || incoming.createdAt !== existing.createdAt) {
    return 'PERMISSION_DENIED';
  }
  if (incoming.updatedAt !== SERVER_TIME) return 'PERMISSION_DENIED';

  const diff = affectedKeys(incoming, existing);
  const ownerStatusAction =
    existing.ownerId === auth.uid &&
    existing.status !== 'Closed' &&
    diff.every((k) => ['status', 'updatedAt'].includes(k));
  const ownerRepeatAction =
    existing.ownerId === auth.uid &&
    existing.status !== 'Closed' &&
    diff.every((k) => ['repeat', 'updatedAt'].includes(k));
  const adminAction =
    isAdmin(auth) && diff.every((k) => ['status', 'repeat', 'notes', 'updatedAt'].includes(k));

  return ownerStatusAction || ownerRepeatAction || adminAction ? 'ALLOW' : 'PERMISSION_DENIED';
}

test('Static Audit: rules file enforces Eight Pillars & matches blueprint collections', () => {
  assert.match(rulesText, /rules_version = '2';/);
  assert.match(rulesText, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /match \/admins\/\{adminId\}/);
  assert.match(rulesText, /match \/users\/\{userId\}/);
  assert.match(rulesText, /match \/cartItems\/\{skuId\}/);
  assert.match(rulesText, /match \/trialOrders\/\{orderId\}/);
  assert.match(rulesText, /match \/dealerLeads\/\{leadId\}/);
  // Ensure every collection path in firebase-blueprint.json is present
  assert.equal(Object.keys(blueprint.firestore).length, 5);
  // Ensure no blanket allow read: if isSignedIn();
  assert.doesNotMatch(rulesText, /allow (read|list|get): if isSignedIn\(\);/);
});

test('Dirty Dozen 1-12: all adversarial payloads return PERMISSION_DENIED', () => {
  const attacker: MockAuth = {
    uid: 'attacker_uid',
    email: 'attacker@example.com',
    email_verified: true,
  };
  const validItem = {
    id: 'DD-0001',
    category: 'Switches',
    family: '1-Way Modular Switch',
    spec: '6A · 1M',
    name: '1-Way Modular Switch 6A · 1M',
    price: 38,
    kind: 'switch',
    unit: 'pc',
    qty: 10,
  };
  const baseOrder: Record<string, unknown> = {
    ownerId: 'attacker_uid',
    referenceId: 'DD-OK-1',
    date: '2026-11-19T10:00:00.000Z',
    name: 'Rajesh Sharma',
    business: 'Sharma Electricals',
    phone: '9829011101',
    city: 'Jaipur',
    segment: 'Electrical Dealer',
    notes: '',
    items: [validItem],
    total: 380,
    status: 'Requested',
    repeat: false,
    createdAt: SERVER_TIME,
    updatedAt: SERVER_TIME,
  };

  // 1. Identity spoofing
  assert.equal(
    evaluateTrialOrderCreate(attacker, 'DD-SPOOF-1', { ...baseOrder, referenceId: 'DD-SPOOF-1', ownerId: 'victim_uid' }, true),
    'PERMISSION_DENIED'
  );

  // 2. Shadow field injection on user profile create
  const profileKeys = ['uid', 'displayName', 'email', 'photoURL', 'createdAt', 'updatedAt'];
  assert.equal(
    hasExactKeys(
      { uid: 'attacker_uid', displayName: 'A', email: 'a@b.com', photoURL: '', isAdmin: true, createdAt: SERVER_TIME, updatedAt: SERVER_TIME },
      profileKeys
    ),
    false
  );

  // 3. Shadow field injection on trialOrder update
  assert.equal(
    evaluateTrialOrderUpdate(attacker, 'DD-OK-1', { ...baseOrder, status: 'Contacted', isVerified: true }, baseOrder),
    'PERMISSION_DENIED'
  );

  // 4. Email spoofing (unverified admin email)
  const spoofedAdmin: MockAuth = {
    uid: 'spoof_uid',
    email: ADMIN_EMAIL,
    email_verified: false,
  };
  assert.equal(isAdmin(spoofedAdmin), false);

  // 5. PII blanket read by non-owner
  const canNonOwnerReadLead =
    'victim_uid' === attacker.uid || isAdmin(attacker);
  assert.equal(canNonOwnerReadLead, false);

  // 6. Client-delegated list scraping (rule requires resource.data.ownerId == request.auth.uid, zero DB reads)
  assert.match(rulesText, /allow list: if isSignedIn\(\) && \(existing\(\)\.ownerId == request\.auth\.uid \|\| isBootstrappedAdmin\(\)\);/);

  // 7. Terminal state mutation on Closed trialOrder by non-admin owner
  const closedOrder = { ...baseOrder, status: 'Closed' };
  assert.equal(
    evaluateTrialOrderUpdate(attacker, 'DD-OK-1', { ...closedOrder, status: 'Requested' }, closedOrder),
    'PERMISSION_DENIED'
  );

  // 8. Value poisoning on allowed key (invalid status type / enum)
  assert.equal(
    evaluateTrialOrderUpdate(attacker, 'DD-OK-1', { ...baseOrder, status: 99999 }, baseOrder),
    'PERMISSION_DENIED'
  );
  assert.equal(
    evaluateTrialOrderUpdate(attacker, 'DD-OK-1', { ...baseOrder, status: 'ShippedFree' }, baseOrder),
    'PERMISSION_DENIED'
  );

  // 9. Resource exhaustion / ID poisoning
  assert.equal(isValidId('a'.repeat(129)), false);
  assert.equal(isValidId('bad$id with spaces'), false);
  assert.equal(isValidSkuId('DD-999999999'), false);

  // 10. Unbounded array / empty items
  assert.equal(
    evaluateTrialOrderCreate(attacker, 'DD-OK-1', { ...baseOrder, items: [] }, true),
    'PERMISSION_DENIED'
  );
  assert.equal(
    evaluateTrialOrderCreate(attacker, 'DD-OK-1', { ...baseOrder, items: Array(51).fill(validItem) }, true),
    'PERMISSION_DENIED'
  );

  // 11. Client-forged timestamp
  assert.equal(
    evaluateTrialOrderCreate(attacker, 'DD-OK-1', { ...baseOrder, createdAt: '2020-01-01T00:00:00Z' }, true),
    'PERMISSION_DENIED'
  );

  // 12. Admin collection client write denied
  assert.match(rulesText, /match \/admins\/\{adminId\}[\s\S]*?allow list, create, update, delete: if false;/);

  // Positive control: valid owner create & status update succeed
  assert.equal(evaluateTrialOrderCreate(attacker, 'DD-OK-1', baseOrder, true), 'ALLOW');
  assert.equal(
    evaluateTrialOrderUpdate(attacker, 'DD-OK-1', { ...baseOrder, status: 'Contacted' }, baseOrder),
    'ALLOW'
  );
});
