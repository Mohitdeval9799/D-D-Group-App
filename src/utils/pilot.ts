import type {
  CartItem,
  DealerLead,
  OrderStatus,
  PilotState,
  Product,
  TrialOrder,
} from '../types';

export const STORAGE_KEY = 'dd_group_jaipur_pilot_v1';
export const VALID_STATUSES: OrderStatus[] = [
  'Requested',
  'Contacted',
  'Trial confirmed',
  'Closed',
];

export const EMPTY_PILOT_STATE: PilotState = {
  cart: {},
  orders: [],
  leads: [],
};

export function clampQuantity(qty: number): number {
  if (!Number.isFinite(qty)) return 0;
  return Math.max(0, Math.min(999, Math.floor(qty)));
}

export function updateCartQuantity(
  cart: Record<string, number>,
  productId: string,
  delta: number
): Record<string, number> {
  const current = Number.isInteger(cart[productId]) ? cart[productId] : 0;
  const nextQty = clampQuantity(current + delta);
  const next = { ...cart };
  if (nextQty <= 0) {
    delete next[productId];
  } else {
    next[productId] = nextQty;
  }
  return next;
}

export function setCartQuantity(
  cart: Record<string, number>,
  productId: string,
  qty: number
): Record<string, number> {
  const nextQty = clampQuantity(qty);
  const next = { ...cart };
  if (nextQty <= 0) {
    delete next[productId];
  } else {
    next[productId] = nextQty;
  }
  return next;
}

export function getCartItems(products: Product[], cart: Record<string, number>): CartItem[] {
  return products
    .filter((p) => Number.isInteger(cart[p.id]) && cart[p.id] > 0)
    .map((p) => ({ ...p, qty: cart[p.id] }));
}

export function getCartTotals(items: CartItem[]): {
  variantCount: number;
  unitCount: number;
  subtotal: number;
} {
  let unitCount = 0;
  let subtotal = 0;
  for (const item of items) {
    unitCount += item.qty;
    subtotal += item.price * item.qty;
  }
  return {
    variantCount: items.length,
    unitCount,
    subtotal,
  };
}

export function isValidIndianMobile(phone: string): boolean {
  return /^[6-9][0-9]{9}$/.test(phone.trim());
}

export interface DealerContactInput {
  name: string;
  business: string;
  phone: string;
  city: string;
}

export function validateDealerContact(input: DealerContactInput): {
  valid: boolean;
  errors: Partial<Record<keyof DealerContactInput, string>>;
} {
  const errors: Partial<Record<keyof DealerContactInput, string>> = {};
  if (!input.name.trim()) errors.name = 'Enter a contact name.';
  if (!input.business.trim()) errors.business = 'Enter a business or shop name.';
  if (!isValidIndianMobile(input.phone)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
  }
  if (!input.city.trim()) errors.city = 'Enter a city name.';
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function generateOrderReference(now = Date.now(), randomSuffix?: string): string {
  const timePart = now.toString(36).toUpperCase();
  const randPart =
    randomSuffix ?? Math.random().toString(36).slice(2, 5).toUpperCase().padEnd(3, 'X');
  return `DD-${timePart}-${randPart}`;
}

export interface PilotMetrics {
  totalRequests: number;
  uniqueDealers: number;
  repeatInterestedDealers: number;
  repeatRatePercent: number;
  totalSampleValue: number;
  totalLeads: number;
  dealerGoalProgressPercent: number;
}

export function computePilotMetrics(
  orders: TrialOrder[],
  leads: DealerLead[],
  dealerTarget = 10
): PilotMetrics {
  const uniquePhones = new Set(orders.map((o) => o.phone.trim()));
  const repeatPhones = new Set(orders.filter((o) => o.repeat).map((o) => o.phone.trim()));
  const uniqueDealers = uniquePhones.size;
  const repeatInterestedDealers = repeatPhones.size;
  const repeatRatePercent =
    uniqueDealers > 0 ? Math.round((repeatInterestedDealers / uniqueDealers) * 100) : 0;
  const totalSampleValue = orders.reduce((sum, o) => sum + o.total, 0);
  const dealerGoalProgressPercent = Math.min(
    100,
    dealerTarget > 0 ? Math.round((uniqueDealers / dealerTarget) * 100) : 0
  );

  return {
    totalRequests: orders.length,
    uniqueDealers,
    repeatInterestedDealers,
    repeatRatePercent,
    totalSampleValue,
    totalLeads: leads.length,
    dealerGoalProgressPercent,
  };
}

export interface UnitEconomicsInput {
  customers: number;
  purchasesPerCustomer: number;
  sellingPrice: number;
  variableCost: number;
  monthlyFixedCost: number;
}

export interface UnitEconomicsOutput {
  monthlyOrders: number;
  contributionPerSale: number;
  marginPercent: number;
  monthlyRevenue: number;
  monthlyGrossContribution: number;
  operatingSurplus: number;
  breakEvenOrders: number;
}

export function computeUnitEconomics(input: UnitEconomicsInput): UnitEconomicsOutput {
  const monthlyOrders = Math.max(0, input.customers) * Math.max(0, input.purchasesPerCustomer);
  const contributionPerSale = input.sellingPrice - input.variableCost;
  const marginPercent =
    input.sellingPrice > 0 ? Math.round((contributionPerSale / input.sellingPrice) * 100) : 0;
  const monthlyRevenue = monthlyOrders * input.sellingPrice;
  const monthlyGrossContribution = monthlyOrders * contributionPerSale;
  const operatingSurplus = monthlyGrossContribution - input.monthlyFixedCost;
  const breakEvenOrders =
    contributionPerSale > 0 ? Math.ceil(input.monthlyFixedCost / contributionPerSale) : 0;

  return {
    monthlyOrders,
    contributionPerSale,
    marginPercent,
    monthlyRevenue,
    monthlyGrossContribution,
    operatingSurplus,
    breakEvenOrders,
  };
}

export function createSamplePilotRecords(products: Product[]): {
  orders: TrialOrder[];
  leads: DealerLead[];
} {
  const pick = (id: string, qty: number): CartItem => {
    const p = products.find((item) => item.id === id) ?? products[0];
    return { ...p, qty };
  };

  const items1 = [pick('DD-0001', 15), pick('DD-0053', 12), pick('DD-0109', 1), pick('DD-0169', 6)];
  const items2 = [pick('DD-0167', 10), pick('DD-0199', 2), pick('DD-0238', 2), pick('DD-0113', 1)];
  const items3 = [pick('DD-0251', 2), pick('DD-0074', 3), pick('DD-0026', 10)];

  const sumItems = (arr: CartItem[]) => arr.reduce((s, it) => s + it.price * it.qty, 0);

  const orders: TrialOrder[] = [
    {
      id: 'DD-DEMO-JPR1',
      date: '2026-11-12T10:30:00.000Z',
      name: 'Ramesh Agarwal (Sample)',
      business: 'Pink City Electricals (Sample)',
      phone: '9829011101',
      city: 'Jaipur',
      segment: 'Electrical Dealer',
      notes: 'Testing modular switch finish and 9W LED bulb carton margins for Johari Bazaar counter.',
      items: items1,
      total: sumItems(items1),
      status: 'Trial confirmed',
      repeat: true,
    },
    {
      id: 'DD-DEMO-JPR2',
      date: '2026-11-14T14:15:00.000Z',
      name: 'Mahendra Saini (Sample)',
      business: 'Saini Power Controls (Sample)',
      phone: '9829011102',
      city: 'Jaipur',
      segment: 'Electrical Contractor',
      notes: 'Comparing MCB & RCCB trip consistency for 12-flat Vaishali Nagar residential project.',
      items: items2,
      total: sumItems(items2),
      status: 'Contacted',
      repeat: false,
    },
    {
      id: 'DD-DEMO-JPR3',
      date: '2026-11-16T09:45:00.000Z',
      name: 'Deepak Khandelwal (Sample)',
      business: 'Mansarovar Lights & Hardware (Sample)',
      phone: '9829011103',
      city: 'Jaipur',
      segment: 'Electrical Dealer',
      notes: 'Evaluating 2×2 panels and 1200 mm ceiling fans for commercial office orders.',
      items: items3,
      total: sumItems(items3),
      status: 'Requested',
      repeat: true,
    },
  ];

  const leads: DealerLead[] = [
    {
      id: 'LEAD-DEMO-1',
      date: '2026-11-13T11:00:00.000Z',
      name: 'Sunil Choudhary (Sample)',
      business: 'Sitapura Industrial Supplies (Sample)',
      phone: '9829022201',
      city: 'Jaipur',
      interest: 'Cables',
      currentSupplier: 'Polycab & local wholesalers',
      challenge: 'Unpredictable local cable gauge quality and high minimum order sizes from Tier-1 distributors.',
    },
    {
      id: 'LEAD-DEMO-2',
      date: '2026-11-15T16:20:00.000Z',
      name: 'Anita Verma (Sample)',
      business: 'Malviya Nagar Electrical Depot (Sample)',
      phone: '9829022202',
      city: 'Jaipur',
      interest: 'Multiple categories',
      currentSupplier: 'Havells + 4 separate local traders',
      challenge: 'Managing 5 different distributor bills and inconsistent replacement turnaround on LED lights.',
    },
  ];

  return { orders, leads };
}

export function loadPilotState(): PilotState {
  if (typeof window === 'undefined') return EMPTY_PILOT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PILOT_STATE;
    const parsed = JSON.parse(raw) as Partial<PilotState>;
    if (
      parsed &&
      typeof parsed.cart === 'object' &&
      parsed.cart !== null &&
      Array.isArray(parsed.orders) &&
      Array.isArray(parsed.leads)
    ) {
      return {
        cart: parsed.cart,
        orders: parsed.orders,
        leads: parsed.leads,
      };
    }
  } catch {
    // Fallback cleanly if storage is blocked or malformed
  }
  return EMPTY_PILOT_STATE;
}

export function savePilotState(state: PilotState): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
