import type { BusinessSettings, Product } from '../types';

export const ADMIN_DRAFT_STORAGE_KEY = 'dd_group_admin_draft_v1';

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  companyName: 'D&D Group',
  tagline: 'Connected by Quality',
  heroEyebrow: 'D&D Group · Jaipur, Rajasthan Electrical Supply',
  heroTitle: 'Built around your electrical business.',
  heroSubtitle:
    'Source modular switches, LED lighting, FR copper wires, switchgear, distribution boards, and electrical accessories from one dependable manufacturing partner. Compare all 329 sample variants and assemble your Jaipur trial request in minutes.',
  contactPerson: 'Mohit Deval',
  contactPhone: '',
  whatsappNumber: '',
  contactEmail: 'mohitdeval9799@gmail.com',
  city: 'Jaipur, Rajasthan',
  address: 'Jaipur Electrical Market Distribution Desk, Rajasthan',
  gstNote: 'Wholesale dealer rates · excl. GST & freight',
  announcementBanner: '',
  showPrototypeNotices: true,
};

export interface LocalAdminDraft {
  overrides: Record<string, Product>;
  settings: BusinessSettings | null;
}

export function mergeCatalogProducts(
  baseProducts: Product[],
  overrides: Record<string, Product>
): Product[] {
  const baseIds = new Set<string>();
  const merged: Product[] = baseProducts.map((base) => {
    baseIds.add(base.id);
    const override = overrides[base.id];
    if (!override) {
      return {
        ...base,
        inStock: base.inStock ?? true,
        isHidden: base.isHidden ?? false,
        featured: base.featured ?? false,
        moq: base.moq ?? 1,
        isEdited: false,
        isCustom: false,
      };
    }
    return {
      ...base,
      ...override,
      id: base.id,
      inStock: override.inStock ?? true,
      isHidden: override.isHidden ?? false,
      featured: override.featured ?? false,
      moq: override.moq ?? 1,
      isEdited: true,
      isCustom: false,
    };
  });

  const customProducts = Object.values(overrides)
    .filter((item) => !baseIds.has(item.id))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((item) => ({
      ...item,
      inStock: item.inStock ?? true,
      isHidden: item.isHidden ?? false,
      featured: item.featured ?? false,
      moq: item.moq ?? 1,
      isCustom: true,
      isEdited: true,
    }));

  return [...merged, ...customProducts];
}

export function getVisibleCustomerProducts(products: Product[]): Product[] {
  return products.filter((p) => !p.isHidden);
}

export function getDynamicCategories(baseCategories: string[], products: Product[]): string[] {
  const set = new Set<string>(baseCategories);
  for (const p of products) {
    if (p.category.trim()) set.add(p.category.trim());
  }
  return Array.from(set);
}

export function generateNextSkuId(products: Product[]): string {
  let maxNum = 329;
  for (const p of products) {
    const match = /^DD-(\d+)$/i.exec(p.id.trim());
    if (match) {
      const n = Number.parseInt(match[1], 10);
      if (Number.isFinite(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }
  return `DD-${String(maxNum + 1).padStart(4, '0')}`;
}

export interface BulkPriceOptions {
  category: string; // 'All' or exact category name
  mode: 'percent' | 'flat';
  amount: number; // e.g., +5 (%) or -10 (INR)
  roundTo: number; // 1, 5, or 10
  adjustMrp: boolean;
}

export function computeBulkPriceUpdates(
  products: Product[],
  options: BulkPriceOptions
): Product[] {
  const step = Math.max(1, options.roundTo || 1);
  const targets = products.filter(
    (p) => options.category === 'All' || p.category === options.category
  );

  return targets.map((p) => {
    const rawPrice =
      options.mode === 'percent'
        ? p.price * (1 + options.amount / 100)
        : p.price + options.amount;
    const nextPrice = Math.max(1, Math.round(rawPrice / step) * step);

    let nextMrp = p.mrp ?? 0;
    if (options.adjustMrp && nextMrp > 0) {
      const rawMrp =
        options.mode === 'percent'
          ? nextMrp * (1 + options.amount / 100)
          : nextMrp + options.amount;
      nextMrp = Math.max(nextPrice, Math.round(rawMrp / step) * step);
    }

    return {
      ...p,
      price: nextPrice,
      mrp: nextMrp,
    };
  });
}

export function calculateDealerMarginPercent(price: number, mrp?: number): number | null {
  if (!mrp || mrp <= price || mrp <= 0) return null;
  return Math.round(((mrp - price) / mrp) * 100);
}

export function loadLocalAdminDraft(): LocalAdminDraft {
  if (typeof window === 'undefined') {
    return { overrides: {}, settings: null };
  }
  try {
    const raw = window.localStorage.getItem(ADMIN_DRAFT_STORAGE_KEY);
    if (!raw) return { overrides: {}, settings: null };
    const parsed = JSON.parse(raw) as Partial<LocalAdminDraft>;
    return {
      overrides:
        parsed && typeof parsed.overrides === 'object' && parsed.overrides !== null
          ? parsed.overrides
          : {},
      settings:
        parsed && typeof parsed.settings === 'object' && parsed.settings !== null
          ? { ...DEFAULT_BUSINESS_SETTINGS, ...parsed.settings }
          : null,
    };
  } catch {
    return { overrides: {}, settings: null };
  }
}

export function saveLocalAdminDraft(draft: LocalAdminDraft): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(ADMIN_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}
