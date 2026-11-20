import { useMemo, useState, type FormEvent } from 'react';
import {
  Check,
  CloudUpload,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  PackageCheck,
  PackageX,
  Pencil,
  Percent,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Trash2,
} from 'lucide-react';
import { ADMIN_EMAIL, useFirebase } from '../context/FirebaseContext';
import type { BusinessSettings, DealerLead, OrderStatus, Product, TrialOrder } from '../types';
import { formatInr, normalizeQuery, paginate } from '../utils/catalog';
import {
  calculateDealerMarginPercent,
  computeBulkPriceUpdates,
  DEFAULT_BUSINESS_SETTINGS,
  generateNextSkuId,
} from '../utils/catalogMerge';
import { ProductEditorModal } from './ProductEditorModal';
import { ProductVisual } from './ProductVisual';

type AdminTab = 'products' | 'storefront' | 'orders' | 'export';
type ProductFilterFlag = 'all' | 'edited' | 'withPhoto' | 'outOfStock' | 'hidden';

const ADMIN_PAGE_SIZE = 25;
const ORDER_STATUSES: OrderStatus[] = ['Requested', 'Contacted', 'Trial confirmed', 'Closed'];

interface AdminViewProps {
  products: Product[];
  categories: string[];
  settings: BusinessSettings;
  orders: TrialOrder[];
  leads: DealerLead[];
  isCloudAdmin: boolean;
  localDraftProductCount: number;
  hasLocalDraftSettings: boolean;
  onSaveProduct: (product: Product) => Promise<void>;
  onDeleteOrResetProduct: (product: Product) => Promise<void>;
  onBulkSaveProducts: (products: Product[]) => Promise<void>;
  onSaveBusinessSettings: (settings: BusinessSettings) => Promise<void>;
  onPublishLocalDraftsToCloud: () => Promise<void>;
  onDiscardLocalDrafts: () => void;
  onOrderStatusChange: (orderId: string, status: OrderStatus) => void;
  onOrderRepeatToggle: (orderId: string, repeat: boolean) => void;
  onExportCsv: (csvText: string, filename: string) => void;
  onExportBackupJson: () => void;
}

function buildAdminCatalogueCsv(products: Product[]): string {
  const headers = [
    'id',
    'category',
    'family',
    'spec',
    'price',
    'mrp',
    'moq',
    'unit',
    'inStock',
    'visible',
    'featured',
    'description',
  ];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    headers.map(esc).join(','),
    ...products.map((p) =>
      [
        p.id,
        p.category,
        p.family,
        p.spec,
        p.price,
        p.mrp ?? 0,
        p.moq ?? 1,
        p.unit,
        p.inStock !== false ? 'Yes' : 'No',
        p.isHidden ? 'Hidden' : 'Visible',
        p.featured ? 'Yes' : 'No',
        p.description ?? '',
      ]
        .map(esc)
        .join(',')
    ),
  ];
  return '\uFEFF' + rows.join('\r\n');
}

export function AdminView({
  products,
  categories,
  settings,
  orders,
  leads,
  isCloudAdmin,
  localDraftProductCount,
  hasLocalDraftSettings,
  onSaveProduct,
  onDeleteOrResetProduct,
  onBulkSaveProducts,
  onSaveBusinessSettings,
  onPublishLocalDraftsToCloud,
  onDiscardLocalDrafts,
  onOrderStatusChange,
  onOrderRepeatToggle,
  onExportCsv,
  onExportBackupJson,
}: AdminViewProps) {
  const { user, authBusy, isEmbeddedIframe, signInWithGoogle, signOutUser } = useFirebase();

  const [activeTab, setActiveTab] = useState<AdminTab>('products');

  // Product list filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [flagFilter, setFlagFilter] = useState<ProductFilterFlag>('all');
  const [page, setPage] = useState(1);

  // Inline quick price edits map (productId -> draft price string)
  const [inlinePrices, setInlinePrices] = useState<Record<string, string>>({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  // Product modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  // Bulk price tool state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('All');
  const [bulkMode, setBulkMode] = useState<'percent' | 'flat'>('percent');
  const [bulkAmountStr, setBulkAmountStr] = useState('5');
  const [bulkRoundTo, setBulkRoundTo] = useState(5);
  const [bulkAdjustMrp, setBulkAdjustMrp] = useState(true);
  const [bulkBusy, setBulkBusy] = useState(false);

  // Business Settings form state
  const [settingsDraft, setSettingsDraft] = useState<BusinessSettings>(settings);
  const [settingsSyncedRef, setSettingsSyncedRef] = useState<BusinessSettings>(settings);
  const [savingSettings, setSavingSettings] = useState(false);

  // Sync incoming settings changes into draft when not manually diverged
  if (settings !== settingsSyncedRef) {
    setSettingsSyncedRef(settings);
    setSettingsDraft(settings);
  }

  // Publish / discard draft state
  const [publishingDrafts, setPublishingDrafts] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const totalPendingDrafts = localDraftProductCount + (hasLocalDraftSettings ? 1 : 0);
  const existingIds = useMemo(() => new Set(products.map((p) => p.id)), [products]);

  const stats = useMemo(() => {
    let edited = 0;
    let withPhoto = 0;
    let outOfStock = 0;
    let hidden = 0;
    for (const p of products) {
      if (p.isEdited || p.isCustom) edited++;
      if (p.imageUrl) withPhoto++;
      if (p.inStock === false) outOfStock++;
      if (p.isHidden) hidden++;
    }
    return {
      total: products.length,
      visible: products.length - hidden,
      edited,
      withPhoto,
      outOfStock,
      hidden,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const terms = normalizeQuery(search).split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (flagFilter === 'edited' && !p.isEdited && !p.isCustom) return false;
      if (flagFilter === 'withPhoto' && !p.imageUrl) return false;
      if (flagFilter === 'outOfStock' && p.inStock !== false) return false;
      if (flagFilter === 'hidden' && !p.isHidden) return false;
      if (terms.length > 0) {
        const hay = normalizeQuery(
          `${p.id} ${p.name} ${p.category} ${p.family} ${p.spec} ${p.description ?? ''}`
        );
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [products, search, categoryFilter, flagFilter]);

  const paged = useMemo(
    () => paginate(filteredProducts, page, ADMIN_PAGE_SIZE),
    [filteredProducts, page]
  );

  const bulkAmount = Number(bulkAmountStr);
  const bulkPreviewUpdates = useMemo(() => {
    if (!Number.isFinite(bulkAmount) || bulkAmount === 0) return [];
    return computeBulkPriceUpdates(products, {
      category: bulkCategory,
      mode: bulkMode,
      amount: bulkAmount,
      roundTo: bulkRoundTo,
      adjustMrp: bulkAdjustMrp,
    });
  }, [products, bulkCategory, bulkMode, bulkAmount, bulkRoundTo, bulkAdjustMrp]);

  const openNewProductModal = () => {
    const nextSku = generateNextSkuId(products);
    setIsNewProduct(true);
    setEditingProduct({
      id: nextSku,
      category: categories[0] ?? 'LED lighting',
      family: '',
      spec: '',
      name: '',
      price: 100,
      mrp: 0,
      moq: 1,
      kind: 'accessory',
      unit: 'piece',
      description: '',
      imageUrl: '',
      inStock: true,
      isHidden: false,
      featured: false,
      isCustom: true,
      isEdited: true,
    });
  };

  const openEditModal = (product: Product) => {
    setIsNewProduct(false);
    setEditingProduct(product);
  };

  const handleQuickPriceSave = async (product: Product) => {
    const raw = inlinePrices[product.id];
    if (raw === undefined) return;
    const nextPrice = Number(raw);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0 || nextPrice > 10000000) return;

    setSavingRowId(product.id);
    try {
      await onSaveProduct({
        ...product,
        price: Math.round(nextPrice * 100) / 100,
      });
      setInlinePrices((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    } finally {
      setSavingRowId(null);
    }
  };

  const handleQuickToggle = async (
    product: Product,
    patch: Partial<Pick<Product, 'inStock' | 'isHidden'>>
  ) => {
    setSavingRowId(product.id);
    try {
      await onSaveProduct({
        ...product,
        ...patch,
      });
    } finally {
      setSavingRowId(null);
    }
  };

  const handleApplyBulkPricing = async () => {
    if (bulkPreviewUpdates.length === 0) return;
    setBulkBusy(true);
    try {
      await onBulkSaveProducts(bulkPreviewUpdates);
      setBulkOpen(false);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleSaveSettingsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await onSaveBusinessSettings(settingsDraft);
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePublishDrafts = async () => {
    setPublishingDrafts(true);
    try {
      await onPublishLocalDraftsToCloud();
    } finally {
      setPublishingDrafts(false);
    }
  };

  const currentHref = typeof window !== 'undefined' ? window.location.href : '#';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#087c67]">Business Management Console</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142a30] tracking-tight mt-1">
            Admin Control Panel
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openNewProductModal}
            data-testid="admin-add-product-btn"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#087c67] text-white text-sm font-semibold hover:bg-[#066352] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Auth & Cloud Publish Status Banner */}
      {isCloudAdmin ? (
        <div className="rounded-lg bg-[#e8f5ef] border border-[#b9ddd0] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#0e4235]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#087c67] shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-semibold">Live Cloud Admin Active ({user?.email}):</strong>{' '}
              Every price update, product photo, new SKU, and storefront edit publishes
              immediately to Cloud Firestore for all customers.
            </span>
          </div>
          {totalPendingDrafts > 0 && (
            <button
              type="button"
              disabled={publishingDrafts}
              onClick={() => void handlePublishDrafts()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#087c67] text-white font-semibold hover:bg-[#066352] disabled:opacity-50 cursor-pointer"
            >
              <CloudUpload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {publishingDrafts
                  ? 'Publishing…'
                  : `Publish ${totalPendingDrafts} Local Draft ${totalPendingDrafts === 1 ? 'Change' : 'Changes'} to Cloud`}
              </span>
            </button>
          )}
        </div>
      ) : user ? (
        <div className="rounded-lg bg-[#fbf6e6] border border-[#e6d8ad] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#695326]">
          <div className="space-y-0.5">
            <p>
              <strong className="font-semibold">Local Draft Mode:</strong> Signed in as{' '}
              <span className="font-mono">{user.email}</span>. Live Cloud Firestore publishing is
              restricted to the store owner account (<span className="font-mono">{ADMIN_EMAIL}</span>
              ).
            </p>
            <p>
              Edits made right now are saved locally in this browser so you can preview them; switch
              to the owner Google account to publish live to all customers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="px-3.5 py-2 rounded-md border border-[#d6c289] bg-white text-[#57431d] font-semibold hover:bg-[#fdfaf0] cursor-pointer"
          >
            Switch Google Account
          </button>
        </div>
      ) : (
        <div className="rounded-lg bg-[#edf5f2] border border-[#c6ded6] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#1d413b]">
          <div className="space-y-0.5 max-w-2xl">
            <p>
              <strong className="font-semibold">Local Draft Mode Active:</strong> You can edit
              prices, upload product photos, add SKUs, and customize storefront copy immediately
              below. Sign in with the owner Google account (<span className="font-mono">{ADMIN_EMAIL}</span>) to publish changes live to Cloud Firestore for every customer.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isEmbeddedIframe && (
              <a
                href={currentHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#b9d6cd] bg-white text-[#142a30] font-semibold hover:bg-[#f7fbf9]"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#087c67]" aria-hidden="true" />
                <span>Open in New Tab</span>
              </a>
            )}
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void signInWithGoogle()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#087c67] text-white font-semibold hover:bg-[#066352] disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{authBusy ? 'Signing in…' : 'Sign in as Store Admin'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Strip */}
      <section aria-label="Catalogue summary" className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-[#dce5e3] rounded-lg p-4">
          <div className="text-xs text-[#5a6d71]">Total SKUs</div>
          <div className="font-display text-2xl font-bold text-[#142a30] tabular-nums mt-1">
            {stats.total}
          </div>
        </div>
        <div className="bg-white border border-[#dce5e3] rounded-lg p-4">
          <div className="text-xs text-[#5a6d71]">Visible to Buyers</div>
          <div className="font-display text-2xl font-bold text-[#087c67] tabular-nums mt-1">
            {stats.visible}
          </div>
        </div>
        <div className="bg-white border border-[#dce5e3] rounded-lg p-4">
          <div className="text-xs text-[#5a6d71]">Customized / New</div>
          <div className="font-display text-2xl font-bold text-[#142a30] tabular-nums mt-1">
            {stats.edited}
          </div>
        </div>
        <div className="bg-white border border-[#dce5e3] rounded-lg p-4">
          <div className="text-xs text-[#5a6d71]">With Real Photo</div>
          <div className="font-display text-2xl font-bold text-[#142a30] tabular-nums mt-1">
            {stats.withPhoto}
          </div>
        </div>
        <div className="bg-white border border-[#dce5e3] rounded-lg p-4 col-span-2 lg:col-span-1">
          <div className="text-xs text-[#5a6d71]">Out of Stock</div>
          <div className="font-display text-2xl font-bold text-[#9c4221] tabular-nums mt-1">
            {stats.outOfStock}
          </div>
        </div>
      </section>

      {/* Sub-tab Navigation */}
      <div className="border-b border-[#dce5e3] flex items-center gap-1 overflow-x-auto">
        {(
          [
            { id: 'products', label: `Products & Pricing (${products.length})` },
            { id: 'storefront', label: 'Business & Storefront' },
            { id: 'orders', label: `Orders & Enquiries (${orders.length + leads.length})` },
            { id: 'export', label: 'Export & Backup' },
          ] as { id: AdminTab; label: string }[]
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              data-testid={`admin-tab-${tab.id}`}
              className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'border-[#087c67] text-[#087c67]'
                  : 'border-transparent text-[#52666b] hover:text-[#142a30]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PRODUCTS & PRICING */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Search, Filters & Bulk Pricing Toggle */}
          <div className="bg-white border border-[#dce5e3] rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_185px_auto] gap-3">
              <div className="relative">
                <Search
                  className="w-4 h-4 text-[#6d8085] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search SKU, product name, wattage, spec..."
                  data-testid="admin-product-search"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by category"
                className="px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              >
                <option value="All">All categories ({categories.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={flagFilter}
                onChange={(e) => {
                  setFlagFilter(e.target.value as ProductFilterFlag);
                  setPage(1);
                }}
                aria-label="Filter by status"
                className="px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              >
                <option value="all">All statuses</option>
                <option value="edited">Edited / Custom ({stats.edited})</option>
                <option value="withPhoto">With custom photo ({stats.withPhoto})</option>
                <option value="outOfStock">Out of stock ({stats.outOfStock})</option>
                <option value="hidden">Hidden ({stats.hidden})</option>
              </select>

              <button
                type="button"
                onClick={() => setBulkOpen((prev) => !prev)}
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md border text-sm font-semibold whitespace-nowrap cursor-pointer ${
                  bulkOpen
                    ? 'border-[#087c67] bg-[#e8f5ef] text-[#066352]'
                    : 'border-[#cde0da] bg-white text-[#2d4348] hover:bg-[#f4f7f6]'
                }`}
              >
                <Percent className="w-4 h-4" aria-hidden="true" />
                <span>Bulk Price Update</span>
              </button>
            </div>

            {/* Bulk Price Adjustment Panel */}
            {bulkOpen && (
              <div className="pt-3 mt-2 border-t border-[#edf2f0] space-y-3 bg-[#f7faf9] -mx-4 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#066352]">
                    <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Bulk Price Revision Tool</span>
                  </div>
                  <span className="text-xs text-[#5a6d71]">
                    Adjust dealer prices across an entire category or all SKUs in one step.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#42555a] mb-1">
                      Target Category
                    </label>
                    <select
                      value={bulkCategory}
                      onChange={(e) => setBulkCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                    >
                      <option value="All">All Categories ({products.length} SKUs)</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#42555a] mb-1">
                      Adjustment Type
                    </label>
                    <select
                      value={bulkMode}
                      onChange={(e) => setBulkMode(e.target.value as 'percent' | 'flat')}
                      className="w-full px-3 py-2 text-xs rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                    >
                      <option value="percent">Percentage (% change)</option>
                      <option value="flat">Flat Amount (₹ change)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#42555a] mb-1">
                      Value ({bulkMode === 'percent' ? 'e.g. 5 or -5' : 'e.g. 10 or -10'})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={bulkAmountStr}
                      onChange={(e) => setBulkAmountStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#42555a] mb-1">
                      Round Prices To
                    </label>
                    <select
                      value={bulkRoundTo}
                      onChange={(e) => setBulkRoundTo(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                    >
                      <option value={1}>Nearest ₹1</option>
                      <option value={5}>Nearest ₹5</option>
                      <option value={10}>Nearest ₹10</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={bulkBusy || bulkPreviewUpdates.length === 0}
                    onClick={() => void handleApplyBulkPricing()}
                    className="w-full py-2 px-4 rounded-md bg-[#087c67] text-white text-xs font-semibold hover:bg-[#066352] disabled:opacity-40 cursor-pointer"
                  >
                    {bulkBusy
                      ? 'Updating…'
                      : `Apply to ${bulkPreviewUpdates.length} SKUs`}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#42555a]">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkAdjustMrp}
                      onChange={(e) => setBulkAdjustMrp(e.target.checked)}
                      className="rounded accent-[#087c67]"
                    />
                    <span>Also scale retail MRP on SKUs that have an MRP set</span>
                  </label>
                  {bulkPreviewUpdates.length > 0 && (
                    <span className="font-mono text-[11px] text-[#066352]">
                      Preview: {bulkPreviewUpdates[0].id}{' '}
                      {formatInr(
                        products.find((p) => p.id === bulkPreviewUpdates[0].id)?.price ?? 0
                      )}{' '}
                      → {formatInr(bulkPreviewUpdates[0].price)}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-[#5a6d71] pt-1">
              <span className="tabular-nums">
                Showing {paged.startIndex}–{paged.endIndex} of {filteredProducts.length} SKUs
              </span>
              <span>Tip: Edit any price inline and click the checkmark, or click Edit for photos &amp; details.</span>
            </div>
          </div>

          {/* Product Management Table */}
          <div className="bg-white border border-[#dce5e3] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f4f8f7] border-b border-[#dce5e3] text-[11px] uppercase tracking-wider text-[#5a6d71]">
                    <th className="py-3 px-4 font-semibold">Product</th>
                    <th className="py-3 px-3 font-semibold">Category</th>
                    <th className="py-3 px-3 font-semibold">Dealer Price (₹)</th>
                    <th className="py-3 px-3 font-semibold">MRP / Margin</th>
                    <th className="py-3 px-3 font-semibold">Stock</th>
                    <th className="py-3 px-3 font-semibold">Visibility</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2f0]">
                  {paged.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-[#5a6d71]">
                        No products match your search or filter.
                      </td>
                    </tr>
                  ) : (
                    paged.items.map((product) => {
                      const draftPrice = inlinePrices[product.id];
                      const hasPriceChange =
                        draftPrice !== undefined &&
                        Number(draftPrice) > 0 &&
                        Number(draftPrice) !== product.price;
                      const marginPct = calculateDealerMarginPercent(product.price, product.mrp);
                      const isRowBusy = savingRowId === product.id;

                      return (
                        <tr
                          key={product.id}
                          className={`hover:bg-[#f9fbfa] transition-colors ${
                            product.isHidden ? 'opacity-65' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3 min-w-[260px]">
                              <div className="w-12 h-12 rounded-md border border-[#e3ece9] bg-[#f6f9f8] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                                <ProductVisual product={product} className="w-full h-full" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[11px] font-mono text-[#5a6d71]">
                                  <span>{product.id}</span>
                                  {product.isCustom && (
                                    <span className="text-[#066352] font-sans font-semibold">
                                      · Custom
                                    </span>
                                  )}
                                  {!product.isCustom && product.isEdited && (
                                    <span className="text-[#087c67] font-sans font-semibold">
                                      · Edited
                                    </span>
                                  )}
                                  {product.imageUrl && (
                                    <span className="text-[#2b6cb0] font-sans font-medium">
                                      · Photo
                                    </span>
                                  )}
                                </div>
                                <div className="font-semibold text-[#142a30] text-[13px] truncate max-w-[300px]">
                                  {product.family}
                                </div>
                                <div className="text-[#5a6d71] truncate max-w-[300px]">
                                  {product.spec}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap text-[#42555a]">
                            {product.category}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-[#6d8085]">₹</span>
                              <input
                                type="number"
                                min={1}
                                step="any"
                                aria-label={`Dealer price for ${product.id}`}
                                value={draftPrice ?? String(product.price)}
                                onChange={(e) =>
                                  setInlinePrices((prev) => ({
                                    ...prev,
                                    [product.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && hasPriceChange) {
                                    void handleQuickPriceSave(product);
                                  }
                                }}
                                className="w-24 px-2 py-1.5 rounded border border-[#d1dedb] bg-white font-mono text-xs tabular-nums text-[#142a30] focus:border-[#087c67]"
                              />
                              {hasPriceChange && (
                                <button
                                  type="button"
                                  disabled={isRowBusy}
                                  onClick={() => void handleQuickPriceSave(product)}
                                  title="Save new price"
                                  aria-label={`Save price for ${product.id}`}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded bg-[#087c67] text-white hover:bg-[#066352] disabled:opacity-50 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-[#6d8085] mt-0.5">
                              per {product.unit} · MOQ {product.moq ?? 1}
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums text-[#42555a]">
                            {product.mrp && product.mrp > 0 ? (
                              <div>
                                <div>{formatInr(product.mrp)}</div>
                                {marginPct !== null && (
                                  <div className="text-[10px] font-sans text-[#087c67] font-medium">
                                    {marginPct}% margin
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#94a6aa]">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <button
                              type="button"
                              disabled={isRowBusy}
                              onClick={() =>
                                void handleQuickToggle(product, {
                                  inStock: product.inStock === false,
                                })
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-semibold cursor-pointer ${
                                product.inStock !== false
                                  ? 'border-[#c8e3d9] bg-[#eef7f3] text-[#066352] hover:bg-[#e1f0ea]'
                                  : 'border-[#e8cbc6] bg-[#fdf2f0] text-[#9c3224] hover:bg-[#fae6e3]'
                              }`}
                            >
                              {product.inStock !== false ? (
                                <>
                                  <PackageCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>In Stock</span>
                                </>
                              ) : (
                                <>
                                  <PackageX className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Out</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <button
                              type="button"
                              disabled={isRowBusy}
                              onClick={() =>
                                void handleQuickToggle(product, { isHidden: !product.isHidden })
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-semibold cursor-pointer ${
                                !product.isHidden
                                  ? 'border-[#d4e2de] bg-white text-[#2d4348] hover:bg-[#f4f7f6]'
                                  : 'border-[#d9dde0] bg-[#f1f3f4] text-[#5f6b70] hover:bg-[#e7eaec]'
                              }`}
                            >
                              {!product.isHidden ? (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-[#087c67]" aria-hidden="true" />
                                  <span>Visible</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Hidden</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              data-testid={`edit-sku-${product.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#cde0da] bg-white text-[#066352] font-semibold hover:bg-[#eef7f3] cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredProducts.length > ADMIN_PAGE_SIZE && (
              <div className="px-4 py-3 border-t border-[#edf2f0] flex items-center justify-between text-xs">
                <button
                  type="button"
                  disabled={paged.page <= 1}
                  onClick={() => setPage(paged.page - 1)}
                  className="px-3.5 py-1.5 rounded border border-[#cde0da] bg-white text-[#087c67] font-semibold disabled:opacity-40 cursor-pointer"
                >
                  ← Previous
                </button>
                <span className="font-mono tabular-nums text-[#5a6d71]">
                  Page {paged.page} / {paged.totalPages}
                </span>
                <button
                  type="button"
                  disabled={paged.page >= paged.totalPages}
                  onClick={() => setPage(paged.page + 1)}
                  className="px-3.5 py-1.5 rounded border border-[#cde0da] bg-white text-[#087c67] font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BUSINESS & STOREFRONT SETTINGS */}
      {activeTab === 'storefront' && (
        <form
          onSubmit={(e) => void handleSaveSettingsSubmit(e)}
          className="bg-white border border-[#dce5e3] rounded-lg p-6 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f0] pb-4">
            <div className="flex items-center gap-2.5">
              <Store className="w-5 h-5 text-[#087c67]" aria-hidden="true" />
              <div>
                <h2 className="font-display text-lg font-bold text-[#142a30]">
                  Business Profile &amp; Storefront Copy
                </h2>
                <p className="text-xs text-[#5a6d71]">
                  Update your company contact details, homepage headline, wholesale pricing notes,
                  and commercial mode settings anytime.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettingsDraft(DEFAULT_BUSINESS_SETTINGS)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#d1dedb] text-xs font-semibold text-[#42555a] hover:bg-[#f4f7f6] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Load Default Copy</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="biz-company" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Company / Brand Name
              </label>
              <input
                id="biz-company"
                type="text"
                maxLength={80}
                value={settingsDraft.companyName}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({ ...prev, companyName: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>

            <div>
              <label htmlFor="biz-tagline" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Brand Tagline
              </label>
              <input
                id="biz-tagline"
                type="text"
                maxLength={120}
                value={settingsDraft.tagline}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({ ...prev, tagline: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>

            <div>
              <label htmlFor="biz-contact-person" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Primary Contact Person
              </label>
              <input
                id="biz-contact-person"
                type="text"
                maxLength={100}
                value={settingsDraft.contactPerson}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({ ...prev, contactPerson: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>

            <div>
              <label htmlFor="biz-email" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Business Email
              </label>
              <input
                id="biz-email"
                type="email"
                maxLength={200}
                value={settingsDraft.contactEmail}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({ ...prev, contactEmail: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>

            <div>
              <label htmlFor="biz-phone" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Sales Phone Number
              </label>
              <input
                id="biz-phone"
                type="tel"
                maxLength={24}
                placeholder="e.g. +91 98290 XXXXX"
                value={settingsDraft.contactPhone}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({ ...prev, contactPhone: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm font-mono rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>

            <div>
              <label htmlFor="biz-whatsapp" className="block text-xs font-semibold text-[#2d4348] mb-1">
                WhatsApp Order Number
              </label>
              <input
                id="biz-whatsapp"
                type="tel"
                maxLength={24}
                placeholder="e.g. 9198290XXXXX"
                value={settingsDraft.whatsappNumber}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({ ...prev, whatsappNumber: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm font-mono rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>

            <div>
              <label htmlFor="biz-city" className="block text-xs font-semibold text-[#2d4348] mb-1">
                City / Operating Region
              </label>
              <input
                id="biz-city"
                type="text"
                maxLength={100}
                value={settingsDraft.city}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({ ...prev, city: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>

            <div>
              <label htmlFor="biz-gst" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Pricing / GST Footnote
              </label>
              <input
                id="biz-gst"
                type="text"
                maxLength={200}
                value={settingsDraft.gstNote}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({ ...prev, gstNote: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="biz-address" className="block text-xs font-semibold text-[#2d4348] mb-1">
              Business / Warehouse Address
            </label>
            <input
              id="biz-address"
              type="text"
              maxLength={300}
              value={settingsDraft.address}
              onChange={(e) =>
                setSettingsDraft((prev) => ({ ...prev, address: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
            />
          </div>

          <div className="pt-2 border-t border-[#edf2f0] space-y-4">
            <h3 className="font-display text-sm font-bold text-[#142a30]">Homepage Hero &amp; Banner</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="biz-eyebrow" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  Hero Eyebrow Label
                </label>
                <input
                  id="biz-eyebrow"
                  type="text"
                  maxLength={120}
                  value={settingsDraft.heroEyebrow}
                  onChange={(e) =>
                    setSettingsDraft((prev) => ({ ...prev, heroEyebrow: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                />
              </div>

              <div>
                <label htmlFor="biz-hero-title" className="block text-xs font-semibold text-[#2d4348] mb-1">
                  Hero Headline
                </label>
                <input
                  id="biz-hero-title"
                  type="text"
                  maxLength={160}
                  value={settingsDraft.heroTitle}
                  onChange={(e) =>
                    setSettingsDraft((prev) => ({ ...prev, heroTitle: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="biz-hero-sub" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Hero Description
              </label>
              <textarea
                id="biz-hero-sub"
                rows={3}
                maxLength={600}
                value={settingsDraft.heroSubtitle}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({ ...prev, heroSubtitle: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>

            <div>
              <label htmlFor="biz-banner" className="block text-xs font-semibold text-[#2d4348] mb-1">
                Optional Storefront Announcement Banner{' '}
                <span className="font-normal text-[#6d8085]">(leave blank to hide)</span>
              </label>
              <input
                id="biz-banner"
                type="text"
                maxLength={300}
                placeholder="e.g. Updated May copper wire rates live — extra 3% cash discount on orders above ₹25,000"
                value={settingsDraft.announcementBanner}
                onChange={(e) =>
                  setSettingsDraft((prev) => ({ ...prev, announcementBanner: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm rounded-md border border-[#d1dedb] bg-white text-[#142a30]"
              />
            </div>

            <div className="rounded-lg bg-[#f4f8f7] border border-[#dce5e3] p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsDraft.showPrototypeNotices}
                  onChange={(e) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      showPrototypeNotices: e.target.checked,
                    }))
                  }
                  className="mt-1 rounded accent-[#087c67]"
                />
                <div className="text-xs">
                  <div className="font-semibold text-[#142a30]">
                    Show student pilot / prototype disclaimers on storefront
                  </div>
                  <p className="text-[#5a6d71] mt-0.5 leading-relaxed">
                    Keep checked for academic/pilot demos. Uncheck when you are ready to run this
                    as your live commercial wholesale storefront for real customers.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#edf2f0]">
            <button
              type="submit"
              disabled={savingSettings}
              data-testid="save-settings-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#087c67] text-white text-sm font-semibold hover:bg-[#066352] disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>{savingSettings ? 'Saving…' : 'Save Storefront Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: ORDERS & ENQUIRIES */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Trial Orders */}
          <div className="bg-white border border-[#dce5e3] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#142a30]">
                Dealer Orders &amp; Trial Requests ({orders.length})
              </h2>
            </div>

            {orders.length === 0 ? (
              <p className="text-xs text-[#5a6d71] py-6 text-center">
                No dealer orders recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-[#edf2f0]">
                {orders.map((order) => (
                  <div key={order.id} className="py-4 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono font-semibold text-[#087c67]">{order.id}</div>
                        <div className="font-semibold text-[#142a30] text-sm mt-0.5">
                          {order.business} · {order.name}
                        </div>
                        <div className="text-[#5a6d71]">
                          {order.city} · {order.segment} ·{' '}
                          <a href={`tel:${order.phone}`} className="font-mono underline">
                            {order.phone}
                          </a>
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold text-sm text-[#142a30] tabular-nums">
                        {formatInr(order.total)}
                      </div>
                    </div>

                    <div className="bg-[#f7faf9] rounded p-2.5 space-y-1 text-[11px] text-[#42555a]">
                      {order.items.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex justify-between gap-2">
                          <span className="truncate">
                            {item.qty}× {item.family} ({item.spec})
                          </span>
                          <span className="font-mono shrink-0">
                            {formatInr(item.price * item.qty)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 5 && (
                        <div className="text-[#6d8085]">
                          +{order.items.length - 5} more items
                        </div>
                      )}
                    </div>

                    {order.notes && (
                      <p className="text-[#5a6d71] italic">Note: {order.notes}</p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          onOrderStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        aria-label={`Order status for ${order.id}`}
                        className="px-2.5 py-1.5 rounded border border-[#d1dedb] bg-white text-xs font-medium text-[#142a30]"
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>

                      <label className="inline-flex items-center gap-1.5 text-[#2d4348] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={order.repeat}
                          onChange={(e) => onOrderRepeatToggle(order.id, e.target.checked)}
                          className="rounded accent-[#087c67]"
                        />
                        <span>Repeat buyer interest</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dealer Enquiries */}
          <div className="bg-white border border-[#dce5e3] rounded-lg p-5 space-y-4">
            <h2 className="font-display text-base font-bold text-[#142a30]">
              Dealer Connect Enquiries ({leads.length})
            </h2>
            {leads.length === 0 ? (
              <p className="text-xs text-[#5a6d71] py-6 text-center">
                No dealer enquiries recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-[#edf2f0]">
                {leads.map((lead) => (
                  <div key={lead.id} className="py-4 space-y-1.5 text-xs">
                    <div className="font-semibold text-[#142a30] text-sm">
                      {lead.business} · {lead.name}
                    </div>
                    <div className="text-[#5a6d71]">
                      {lead.city} ·{' '}
                      <a href={`tel:${lead.phone}`} className="font-mono underline">
                        {lead.phone}
                      </a>
                    </div>
                    <div className="text-[#2d4348]">
                      Interest: <strong>{lead.interest}</strong> · Current: {lead.currentSupplier}
                    </div>
                    {lead.challenge && (
                      <p className="text-[#5a6d71] bg-[#f7faf9] rounded p-2 mt-1">
                        {lead.challenge}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: EXPORT & BACKUP */}
      {activeTab === 'export' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#dce5e3] rounded-lg p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#142a30]">
              Export Live Price List &amp; Backup
            </h2>
            <p className="text-xs text-[#5a6d71] leading-relaxed">
              Download your updated catalogue (including all edited dealer prices, MRP, MOQ, stock
              status, and custom SKUs) for sharing over WhatsApp or importing into Tally/Excel.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  onExportCsv(
                    buildAdminCatalogueCsv(products),
                    'dd-group-live-price-list.csv'
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#087c67] text-white text-xs font-semibold hover:bg-[#066352] cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Download Live Catalogue CSV</span>
              </button>
              <button
                type="button"
                onClick={onExportBackupJson}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#cde0da] bg-white text-[#066352] text-xs font-semibold hover:bg-[#eef7f3] cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Download Full JSON Backup</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#dce5e3] rounded-lg p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#142a30]">
              Local Draft Sync Status
            </h2>
            <p className="text-xs text-[#5a6d71] leading-relaxed">
              Pending local draft product edits:{' '}
              <strong className="font-mono text-[#142a30]">{localDraftProductCount}</strong> ·
              Pending storefront settings edit:{' '}
              <strong className="font-mono text-[#142a30]">
                {hasLocalDraftSettings ? 'Yes' : 'No'}
              </strong>
              .
            </p>

            {totalPendingDrafts > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                {isCloudAdmin && (
                  <button
                    type="button"
                    disabled={publishingDrafts}
                    onClick={() => void handlePublishDrafts()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#087c67] text-white text-xs font-semibold hover:bg-[#066352] disabled:opacity-50 cursor-pointer"
                  >
                    <CloudUpload className="w-4 h-4" aria-hidden="true" />
                    <span>{publishingDrafts ? 'Publishing…' : 'Publish Drafts to Cloud'}</span>
                  </button>
                )}

                {confirmDiscard ? (
                  <div className="inline-flex items-center gap-2 text-xs">
                    <span className="text-[#8f2e22] font-semibold">Discard local drafts?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDiscardLocalDrafts();
                        setConfirmDiscard(false);
                      }}
                      className="px-3 py-1.5 rounded bg-[#a43e2f] text-white font-semibold cursor-pointer"
                    >
                      Yes, Discard
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDiscard(false)}
                      className="px-2.5 py-1.5 rounded border border-[#dce5e3] text-[#42555a] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDiscard(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-md border border-[#e5c2bc] text-[#8f2e22] text-xs font-semibold hover:bg-[#fdf2f0] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Discard Local Drafts</span>
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#087c67] font-medium">
                No unpublished local drafts pending.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Product Add / Edit Modal */}
      <ProductEditorModal
        product={editingProduct}
        isNew={isNewProduct}
        categories={categories}
        existingIds={existingIds}
        onClose={() => setEditingProduct(null)}
        onSave={onSaveProduct}
        onDeleteOrReset={onDeleteOrResetProduct}
      />
    </div>
  );
}
