import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../data/products';
import { createSamplePilotRecords } from './pilot';
import {
  BLUEPRINT_LIMITS,
  makeUserScopedSampleId,
  sanitizeCartItemPayload,
  sanitizeDealerLeadPayload,
  sanitizeTrialOrderPayload,
  sanitizeUserProfilePayload,
} from './firestorePayloads';

test('sanitizeUserProfilePayload enforces blueprint maxLength and rejects invalid UID', () => {
  const ok = sanitizeUserProfilePayload({
    uid: 'user_abc-123',
    displayName: 'A'.repeat(200),
    email: 'dealer@example.com',
    photoURL: 'https://example.com/' + 'x'.repeat(600),
  });
  assert.equal(ok.uid, 'user_abc-123');
  assert.equal(ok.displayName.length, BLUEPRINT_LIMITS.maxDisplayName);
  assert.equal(ok.photoURL.length, BLUEPRINT_LIMITS.maxPhotoUrl);

  assert.throws(() =>
    sanitizeUserProfilePayload({
      uid: 'bad uid with spaces!',
      displayName: 'Test',
      email: 'a@b.com',
      photoURL: '',
    })
  );
});

test('sanitizeCartItemPayload enforces SKU pattern and quantity bounds', () => {
  const item = sanitizeCartItemPayload('uid_1', 'DD-0001', 1500);
  assert.equal(item.qty, 999);
  assert.equal(item.productId, 'DD-0001');

  assert.throws(() => sanitizeCartItemPayload('uid_1', 'bad sku!', 2));
  assert.throws(() => sanitizeCartItemPayload('uid_1', 'DD-0001', 0));
});

test('sanitizeTrialOrderPayload truncates long notes, bounds items to 50, and prevents Closed creation', () => {
  const { orders } = createSamplePilotRecords(PRODUCTS);
  const sample = orders[0];
  const bloatedItems = Array.from({ length: 65 }, (_, idx) => ({
    ...PRODUCTS[idx % PRODUCTS.length],
    qty: 2,
  }));

  const sanitized = sanitizeTrialOrderPayload('uid_dealer_1', {
    ...sample,
    status: 'Closed',
    notes: 'N'.repeat(1200),
    items: bloatedItems,
  });

  assert.equal(sanitized.items.length, BLUEPRINT_LIMITS.maxOrderItems);
  assert.equal(sanitized.notes.length, BLUEPRINT_LIMITS.maxNotes);
  assert.equal(sanitized.status, 'Requested');
  assert.ok(BLUEPRINT_LIMITS.phonePattern.test(sanitized.phone));
  assert.ok(BLUEPRINT_LIMITS.refIdPattern.test(sanitized.referenceId));
});

test('sanitizeDealerLeadPayload enforces phone pattern and truncates challenge', () => {
  const { leads } = createSamplePilotRecords(PRODUCTS);
  const sanitized = sanitizeDealerLeadPayload('uid_dealer_2', {
    ...leads[0],
    challenge: 'C'.repeat(1000),
  });

  assert.equal(sanitized.challenge.length, BLUEPRINT_LIMITS.maxChallenge);
  assert.throws(() =>
    sanitizeDealerLeadPayload('uid_dealer_2', {
      ...leads[0],
      phone: '12345',
    })
  );
});

test('makeUserScopedSampleId produces unique valid reference IDs per user', () => {
  const idA = makeUserScopedSampleId('DD-DEMO-JPR1', 'userAlpha991');
  const idB = makeUserScopedSampleId('DD-DEMO-JPR1', 'userBeta442');
  assert.notEqual(idA, idB);
  assert.ok(BLUEPRINT_LIMITS.refIdPattern.test(idA));
  assert.ok(BLUEPRINT_LIMITS.idPattern.test(idB));
});
