import type { BusinessSettings, CartItem, DealerLead, OrderStatus, Product, TrialOrder } from '../types';
import { clampQuantity, VALID_STATUSES } from './pilot';
import { isValidProductImageUrl } from './imageOptimizer';

/**
 * Verbatim volumetric & regex constraints mirrored from firebase-blueprint.json
 * and enforced identically in firestore.rules.
 */
export const BLUEPRINT_LIMITS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  skuPattern: /^[A-Z0-9-]{3,32}$/,
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
  maxSpec: 160,
  maxProductName: 240,
  maxDescription: 1500,
  maxImageUrl: 160000,
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
  return cleaned.length >= 3
    ? cleaned
    : `${fallbackPrefix}-${Date.now().toString(36).toUpperCase()}`;
}

export function sanitizeSkuId(raw: string): string {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  if (!BLUEPRINT_LIMITS.skuPattern.test(cleaned)) {
    throw new Error('SKU code must be 3–32 characters using uppercase letters, numbers, or hyphens.');
  }
  return cleaned;
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
  const cleanSku = productId.trim().toUpperCase();
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

export interface SanitizedCatalogProduct {
  id: string;
  category: string;
  family: string;
  spec: string;
  name: string;
  price: number;
  mrp: number;
  moq: number;
  kind: Product['kind'];
  unit: string;
  description: string;
  imageUrl: string;
  inStock: boolean;
  isHidden: boolean;
  featured: boolean;
  isCustom: boolean;
  updatedBy: string;
}

export function sanitizeCatalogProductPayload(
  adminUid: string,
  product: Product
): SanitizedCatalogProduct {
  const updatedBy = adminUid.trim().slice(0, BLUEPRINT_LIMITS.maxIdLength);
  if (!BLUEPRINT_LIMITS.idPattern.test(updatedBy)) {
    throw new Error('Invalid admin UID.');
  }

  const id = sanitizeSkuId(product.id);
  const category = trimToMax(product.category, BLUEPRINT_LIMITS.maxCategory);
  const family = trimToMax(product.family, BLUEPRINT_LIMITS.maxFamily);
  const spec = trimToMax(product.spec, BLUEPRINT_LIMITS.maxSpec);
  if (!category || !family || !spec) {
    throw new Error('Category, product family/title, and specifications are required.');
  }

  const name = trimToMax(
    product.name?.trim() || `${family} · ${spec}`,
    BLUEPRINT_LIMITS.maxProductName
  );
  const price = Math.round(Number(product.price) * 100) / 100;
  if (!Number.isFinite(price) || price <= 0 || price > 10000000) {
    throw new Error('Wholesale price must be a positive number up to ₹1,00,00,000.');
  }

  const rawMrp = Number(product.mrp ?? 0);
  const mrp =
    Number.isFinite(rawMrp) && rawMrp > 0
      ? Math.min(10000000, Math.round(rawMrp * 100) / 100)
      : 0;
  const rawMoq = Math.floor(Number(product.moq ?? 1));
  const moq = Number.isFinite(rawMoq) ? Math.max(1, Math.min(9999, rawMoq)) : 1;

  const imageUrl = (product.imageUrl ?? '').trim();
  if (!isValidProductImageUrl(imageUrl)) {
    throw new Error(
      'Image URL must be an https:// link or a compressed PNG/JPEG/WebP upload under 150 KB.'
    );
  }

  return {
    id,
    category,
    family,
    spec,
    name,
    price,
    mrp,
    moq,
    kind: product.kind || 'accessory',
    unit: trimToMax(product.unit || 'piece', BLUEPRINT_LIMITS.maxUnit) || 'piece',
    description: trimToMax(product.description ?? '', BLUEPRINT_LIMITS.maxDescription),
    imageUrl,
    inStock: product.inStock !== false,
    isHidden: Boolean(product.isHidden),
    featured: Boolean(product.featured),
    isCustom: Boolean(product.isCustom),
    updatedBy,
  };
}

export interface SanitizedBusinessSettings extends BusinessSettings {
  updatedBy: string;
}

export function sanitizeBusinessSettingsPayload(
  adminUid: string,
  settings: BusinessSettings
): SanitizedBusinessSettings {
  const updatedBy = adminUid.trim().slice(0, BLUEPRINT_LIMITS.maxIdLength);
  if (!BLUEPRINT_LIMITS.idPattern.test(updatedBy)) {
    throw new Error('Invalid admin UID.');
  }

  const companyName = trimToMax(settings.companyName, 80);
  const heroTitle = trimToMax(settings.heroTitle, 160);
  if (!companyName || !heroTitle) {
    throw new Error('Company name and hero headline are required.');
  }

  return {
    companyName,
    tagline: trimToMax(settings.tagline ?? '', 120),
    heroEyebrow: trimToMax(settings.heroEyebrow ?? '', 120),
    heroTitle,
    heroSubtitle: trimToMax(settings.heroSubtitle ?? '', 600),
    contactPerson: trimToMax(settings.contactPerson ?? '', 100),
    contactPhone: trimToMax(settings.contactPhone ?? '', 24),
    whatsappNumber: trimToMax(settings.whatsappNumber ?? '', 24),
    contactEmail: trimToMax(settings.contactEmail ?? '', 200),
    city: trimToMax(settings.city ?? '', 100),
    address: trimToMax(settings.address ?? '', 300),
    gstNote: trimToMax(settings.gstNote ?? '', 200),
    announcementBanner: trimToMax(settings.announcementBanner ?? '', 300),
    showPrototypeNotices: Boolean(settings.showPrototypeNotices),
    updatedBy,
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
  items: {
    id: string;
    category: string;
    family: string;
    spec: string;
    name: string;
    price: number;
    kind: Product['kind'];
    unit: string;
    qty: number;
  }[];
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

  const boundedItems = order.items
    .filter(
      (item) =>
        BLUEPRINT_LIMITS.skuPattern.test(item.id.toUpperCase()) && item.qty > 0 && item.price > 0
    )
    .slice(0, BLUEPRINT_LIMITS.maxOrderItems)
    .map((item: CartItem) => ({
      id: item.id.toUpperCase(),
      category: trimToMax(item.category, BLUEPRINT_LIMITS.maxCategory) || 'Electrical',
      family: trimToMax(item.family, BLUEPRINT_LIMITS.maxFamily) || item.name,
      spec: trimToMax(item.spec, BLUEPRINT_LIMITS.maxSpec) || 'Standard',
      name: trimToMax(item.name, BLUEPRINT_LIMITS.maxProductName) || item.id,
      price: Math.min(10000000, Math.max(1, Number(item.price))),
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
