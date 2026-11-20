export type ProductKind =
  | 'switch'
  | 'socket'
  | 'plate'
  | 'bulb'
  | 'panel'
  | 'tube'
  | 'flood'
  | 'strip'
  | 'wire'
  | 'cable'
  | 'breaker'
  | 'db'
  | 'fan'
  | 'exhaust'
  | 'tablefan'
  | 'pcb'
  | 'conduit'
  | 'box'
  | 'accessory'
  | 'tool';

export interface Product {
  id: string;
  category: string;
  family: string;
  spec: string;
  name: string;
  price: number;
  kind: ProductKind;
  unit: string;
  description?: string;
  imageUrl?: string;
  mrp?: number;
  moq?: number;
  inStock?: boolean;
  isHidden?: boolean;
  featured?: boolean;
  isCustom?: boolean;
  isEdited?: boolean;
}

export interface BusinessSettings {
  companyName: string;
  tagline: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  contactPerson: string;
  contactPhone: string;
  whatsappNumber: string;
  contactEmail: string;
  city: string;
  address: string;
  gstNote: string;
  announcementBanner: string;
  showPrototypeNotices: boolean;
}

export interface CartItem extends Product {
  qty: number;
}

export type OrderStatus = 'Requested' | 'Contacted' | 'Trial confirmed' | 'Closed';

export interface TrialOrder {
  id: string;
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

export interface DealerLead {
  id: string;
  date: string;
  name: string;
  business: string;
  phone: string;
  city: string;
  interest: string;
  currentSupplier: string;
  challenge: string;
}

export interface PilotState {
  cart: Record<string, number>;
  orders: TrialOrder[];
  leads: DealerLead[];
}

export type PageId = 'home' | 'catalogue' | 'cart' | 'dealer' | 'dashboard' | 'admin';

export type SortMode = 'default' | 'low' | 'high' | 'name';

export interface CompetitorEntry {
  id: string;
  name: string;
  type: 'Direct Competitor' | 'Indirect Competitor' | 'Target Venture Position';
  priceTier: string;
  axisX: number; // 1 (Low Price) -> 10 (High Price)
  axisY: number; // 1 (Low Quality) -> 10 (High Quality)
  mainOffer: string;
  strength: string;
  weakness: string;
  isVenture?: boolean;
}

export interface ScenarioPreset {
  id: 'conservative' | 'base' | 'ambitious';
  label: string;
  customers: number;
  purchasesPerCustomer: number;
  notes: string;
}

export interface PilotWeek {
  week: string;
  channel: string;
  action: string;
  target: string;
  metric: string;
  learningQuestion: string;
}

export interface ValidationAssumption {
  id: string;
  title: string;
  assumption: string;
  whyItMatters: string;
  howToTest: string;
  evidenceNeeded: string;
}
