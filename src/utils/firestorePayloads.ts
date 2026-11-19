import type { CartItem, DealerLead, OrderStatus, TrialOrder } from '../types';
import { clampQuantity, VALID_STATUSES } from './pilot';

/**
 * Verbatim volumetric & regex constraints mirrored from firebase-blueprint.json
 * and enforced identically in firestore.rules.
 */
export const BLUEPRINT_LIMITS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  skuPattern: /^DD-[0-9]{4}$/,
  refIdPattern: /^[A-Z0-9-]+$/,
  phonePattern: /^[6-9][0-9]{9}$/,
  maxIdLength: 128,
  maxDisplayName: 120,
  maxEmail: 200,
  maxPhotoUrl: 500,
  maxDate: 40,
  maxName: 100,
  maxBusiness: 120,
  maxCity: 80,
  maxSegment: 60,
  maxNotes: 800,
  maxInterest: 80,
  maxSupplier: 100,
  maxChallenge: 800,
  maxOrderItems: 50,
  maxCategory: 80,
  maxFamily: 120,
  maxSpec: 120,
  maxProductName: 200,
  maxKind: 32,
  maxUnit: 32,
} as const;

function trimToMax(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

export function sanitizeDocumentId(raw: string, fallbackPrefix = 'DOC'): string {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned.length >= 3 ? cleaned : `${fallbackPrefix}-${Date.now().toString(36).toUpperCase()}`;
}

export interface SanitizedUserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

export function sanitizeUserProfilePayload(input: {
  uid: string;
  displayName: string | null | undefined;
  email: string | null | undefined;
  photoURL: string | null | undefined;
}): SanitizedUserProfile {
  const uid = input.uid.trim().slice(0, BLUEPRINT_LIMITS.maxIdLength);
  if (!BLUEPRINT_LIMITS.idPattern.test(uid)) {
    throw new Error('Invalid user UID for Firestore profile.');
  }
  const email = trimToMax(input.email ?? '', BLUEPRINT_LIMITS.maxEmail);
  if (email.length < 3) {
    throw new Error('A verified Google email address is required.');
  }
  return {
    uid,
    displayName: trimToMax(input.displayName ?? '', BLUEPRINT_LIMITS.maxDisplayName),
    email,
    photoURL: trimToMax(input.photoURL ?? '', BLUEPRINT_LIMITS.maxPhotoUrl),
  };
}

export interface SanitizedCartItem {
  ownerId: string;
  productId: string;
  qty: number;
}

export function sanitizeCartItemPayload(
  ownerId: string,
  productId: string,
  qty: number
): SanitizedCartItem {
  const cleanOwner = ownerId.trim().slice(0, BLUEPRINT_LIMITS.maxIdLength);
  const cleanSku = productId.trim();
  const cleanQty = clampQuantity(qty);

  if (!BLUEPRINT_LIMITS.idPattern.test(cleanOwner)) {
    throw new Error('Invalid ownerId for cart item.');
  }
  if (!BLUEPRINT_LIMITS.skuPattern.test(cleanSku)) {
    throw new Error(`Invalid SKU identifier: ${cleanSku}`);
  }
  if (cleanQty < 1 || cleanQty > 999) {
    throw new Error('Cart quantity must be between 1 and 999.');
  }

  return {
    ownerId: cleanOwner,
    productId: cleanSku,
    qty: cleanQty,
  };
}

export interface SanitizedTrialOrder {
  ownerId: string;
  referenceId: string;
  date: string;
  name: string;
  business: string;
  phone: string;
  city: string;
  segment: string;
  notes: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  repeat: boolean;
}

export function sanitizeTrialOrderPayload(
  ownerId: string,
  order: TrialOrder
): SanitizedTrialOrder {
  const cleanOwner = ownerId.trim().slice(0, BLUEPRINT_LIMITS.maxIdLength);
  const referenceId = sanitizeDocumentId(order.id, 'DD');
  const phone = order.phone.trim();

  if (!BLUEPRINT_LIMITS.idPattern.test(cleanOwner)) {
    throw new Error('Invalid ownerId for trial order.');
  }
  if (!BLUEPRINT_LIMITS.refIdPattern.test(referenceId)) {
    throw new Error('Invalid trial order reference ID.');
  }
  if (!BLUEPRINT_LIMITS.phonePattern.test(phone)) {
    throw new Error('Invalid 10-digit Indian mobile number.');
  }

  const boundedItems: CartItem[] = order.items
    .filter((item) => BLUEPRINT_LIMITS.skuPattern.test(item.id) && item.qty > 0 && item.price > 0)
    .slice(0, BLUEPRINT_LIMITS.maxOrderItems)
    .map((item) => ({
      id: item.id,
      category: trimToMax(item.category, BLUEPRINT_LIMITS.maxCategory) || 'Electrical',
      family: trimToMax(item.family, BLUEPRINT_LIMITS.maxFamily) || item.name,
      spec: trimToMax(item.spec, BLUEPRINT_LIMITS.maxSpec) || 'Standard',
      name: trimToMax(item.name, BLUEPRINT_LIMITS.maxProductName) || item.id,
      price: Math.min(1000000, Math.max(1, Number(item.price))),
      kind: item.kind,
      unit: trimToMax(item.unit, BLUEPRINT_LIMITS.maxUnit) || 'pc',
      qty: Math.max(1, clampQuantity(item.qty)),
    }));

  if (boundedItems.length === 0) {
    throw new Error('Trial order must contain at least one valid SKU item.');
  }

  const computedTotal = boundedItems.reduce((sum, it) => sum + it.price * it.qty, 0);
  const safeStatus: OrderStatus =
    VALID_STATUSES.includes(order.status) && order.status !== 'Closed'
      ? order.status
      : 'Requested';

  return {
    ownerId: cleanOwner,
    referenceId,
    date: trimToMax(order.date || new Date().toISOString(), BLUEPRINT_LIMITS.maxDate),
    name: trimToMax(order.name, BLUEPRINT_LIMITS.maxName) || 'Dealer Contact',
    business: trimToMax(order.business, BLUEPRINT_LIMITS.maxBusiness) || 'Dealer Shop',
    phone,
    city: trimToMax(order.city, BLUEPRINT_LIMITS.maxCity) || 'Jaipur',
    segment: trimToMax(order.segment, BLUEPRINT_LIMITS.maxSegment) || 'Electrical Dealer',
    notes: trimToMax(order.notes ?? '', BLUEPRINT_LIMITS.maxNotes),
    items: boundedItems,
    total: Math.min(100000000, Math.max(1, computedTotal)),
    status: safeStatus,
    repeat: Boolean(order.repeat),
  };
}

export interface SanitizedDealerLead {
  ownerId: string;
  date: string;
  name: string;
  business: string;
  phone: string;
  city: string;
  interest: string;
  currentSupplier: string;
  challenge: string;
}

export function sanitizeDealerLeadPayload(
  ownerId: string,
  lead: DealerLead
): SanitizedDealerLead {
  const cleanOwner = ownerId.trim().slice(0, BLUEPRINT_LIMITS.maxIdLength);
  const phone = lead.phone.trim();

  if (!BLUEPRINT_LIMITS.idPattern.test(cleanOwner)) {
    throw new Error('Invalid ownerId for dealer enquiry.');
  }
  if (!BLUEPRINT_LIMITS.phonePattern.test(phone)) {
    throw new Error('Invalid 10-digit Indian mobile number.');
  }

  return {
    ownerId: cleanOwner,
    date: trimToMax(lead.date || new Date().toISOString(), BLUEPRINT_LIMITS.maxDate),
    name: trimToMax(lead.name, BLUEPRINT_LIMITS.maxName) || 'Dealer Contact',
    business: trimToMax(lead.business, BLUEPRINT_LIMITS.maxBusiness) || 'Dealer Shop',
    phone,
    city: trimToMax(lead.city, BLUEPRINT_LIMITS.maxCity) || 'Jaipur',
    interest: trimToMax(lead.interest, BLUEPRINT_LIMITS.maxInterest) || 'Multiple categories',
    currentSupplier:
      trimToMax(lead.currentSupplier, BLUEPRINT_LIMITS.maxSupplier) || 'Local wholesalers',
    challenge: trimToMax(lead.challenge ?? '', BLUEPRINT_LIMITS.maxChallenge),
  };
}

export function makeUserScopedSampleId(baseId: string, uid: string): string {
  const suffix = uid
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase()
    .padEnd(4, 'X');
  return sanitizeDocumentId(`${baseId}-${suffix}`, 'DD');
}
