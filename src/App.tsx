import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, PRODUCTS, SAMPLE_TRIAL_KIT } from './data/products';
import type {
  BusinessSettings,
  OrderStatus,
  PageId,
  PilotState,
  Product,
  SortMode,
  TrialOrder,
} from './types';
import {
  DEFAULT_BUSINESS_SETTINGS,
  getDynamicCategories,
  getVisibleCustomerProducts,
  loadLocalAdminDraft,
  mergeCatalogProducts,
  saveLocalAdminDraft,
  type LocalAdminDraft,
} from './utils/catalogMerge';
import {
  clampQuantity,
  createSamplePilotRecords,
  EMPTY_PILOT_STATE,
  generateOrderReference,
  getCartItems,
  getCartTotals,
  loadPilotState,
  savePilotState,
  setCartQuantity,
  updateCartQuantity,
} from './utils/pilot';
import {
  batchSaveCatalogProductsInFirestore,
  clearUserFirestoreData,
  createDealerLeadInFirestore,
  createTrialOrderInFirestore,
  deleteCatalogProductOverrideInFirestore,
  mergeLocalCartIntoFirestore,
  replaceCartWithKitInFirestore,
  saveBusinessSettingsInFirestore,
  saveCatalogProductInFirestore,
  seedSampleRecordsInFirestore,
  subscribeBusinessSettings,
  subscribeCatalogOverrides,
  subscribeDealerLeads,
  subscribeTrialOrders,
  subscribeUserCart,
  updateTrialOrderRepeatInFirestore,
  updateTrialOrderStatusInFirestore,
  upsertCartItemInFirestore,
} from './utils/firestoreService';
import { isQuotaExceededMessage } from './firebase';
import { useFirebase } from './context/FirebaseContext';
import { AccountSyncBar } from './components/AccountSyncBar';
import { AdminView } from './components/AdminView';
import { BasketView } from './components/BasketView';
import { CatalogueView } from './components/CatalogueView';
import { DashboardView } from './components/DashboardView';
import { DealerConnectView } from './components/DealerConnectView';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { ProductDetailModal } from './components/ProductDetailModal';

const VALID_PAGES: PageId[] = ['home', 'catalogue', 'cart', 'dealer', 'dashboard', 'admin'];

function readHashPage(): PageId {
  if (typeof window === 'undefined') return 'home';
  const raw = window.location.hash.replace(/^#/, '') as PageId;
  return VALID_PAGES.includes(raw) ? raw : 'home';
}

function triggerDownload(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const { user, authReady, profileReady, isAdmin } = useFirebase();
  const isCloudSynced = Boolean(authReady && profileReady && user);
  const isCloudAdmin = Boolean(isCloudSynced && isAdmin);

  const [page, setPage] = useState<PageId>(readHashPage);
  const [localState, setLocalState] = useState<PilotState>(loadPilotState);
  const [cloudState, setCloudState] = useState<PilotState>(EMPTY_PILOT_STATE);
  const [fatalFirestoreError, setFatalFirestoreError] = useState<Error | null>(null);

  // Public live catalog overrides & business settings from Firestore + local draft preview
  const [cloudOverrides, setCloudOverrides] = useState<Record<string, Product>>({});
  const [cloudSettings, setCloudSettings] = useState<BusinessSettings | null>(null);
  const [localAdminDraft, setLocalAdminDraft] = useState<LocalAdminDraft>(loadLocalAdminDraft);

  // Catalogue filter state
  const [category, setCategory] = useState<string>('All');
  const [family, setFamily] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<SortMode>('default');
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const [inspectedProductId, setInspectedProductId] = useState<string | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const mergedUidRef = useRef<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  const handleCloudActionError = useCallback(
    (err: unknown) => {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      if (isQuotaExceededMessage(errorObj.message)) {
        setFatalFirestoreError(errorObj);
        return;
      }
      showToast('Could not save change to Cloud Firestore. Please verify your connection and retry.');
      console.error(errorObj);
    },
    [showToast]
  );

  // 1. Public realtime listeners for catalog overrides & storefront business settings
  useEffect(() => {
    const onPublicListenerError = (err: Error) => {
      if (isQuotaExceededMessage(err.message)) {
        setFatalFirestoreError(err);
      } else {
        console.warn('Public catalog listener warning:', err.message);
      }
    };

    const unsubCatalog = subscribeCatalogOverrides(
      (overrides) => setCloudOverrides(overrides),
      onPublicListenerError
    );
    const unsubSettings = subscribeBusinessSettings(
      (settings) => setCloudSettings(settings),
      onPublicListenerError
    );

    return () => {
      unsubCatalog();
      unsubSettings();
    };
  }, []);

  // 2. Private authenticated listeners for user cart, orders & leads
  useEffect(() => {
    if (!authReady || !profileReady || !user) {
      setCloudState(EMPTY_PILOT_STATE);
      mergedUidRef.current = null;
      return;
    }

    const uid = user.uid;
    const onListenerError = (err: Error) => {
      if (isQuotaExceededMessage(err.message)) {
        setFatalFirestoreError(err);
      } else {
        showToast('Cloud Firestore sync interrupted. Check permissions or network.');
      }
    };

    const unsubCart = subscribeUserCart(
      uid,
      (cart) => setCloudState((prev) => ({ ...prev, cart })),
      onListenerError
    );
    const unsubOrders = subscribeTrialOrders(
      uid,
      isAdmin,
      (orders) => setCloudState((prev) => ({ ...prev, orders })),
      onListenerError
    );
    const unsubLeads = subscribeDealerLeads(
      uid,
      isAdmin,
      (leads) => setCloudState((prev) => ({ ...prev, leads })),
      onListenerError
    );

    return () => {
      unsubCart();
      unsubOrders();
      unsubLeads();
    };
  }, [authReady, profileReady, user, isAdmin, showToast]);

  // Seamlessly merge any local trial basket items into Firestore once on sign-in
  useEffect(() => {
    if (!isCloudSynced || !user) return;
    if (mergedUidRef.current === user.uid) return;
    mergedUidRef.current = user.uid;

    const pendingLocalCart = localState.cart;
    if (Object.keys(pendingLocalCart).length === 0) return;

    void mergeLocalCartIntoFirestore(user.uid, pendingLocalCart)
      .then(() => {
        setLocalState((prev) => {
          const cleared = { ...prev, cart: {} };
          savePilotState(cleared);
          return cleared;
        });
        showToast('Synced your local trial basket items to Cloud Firestore');
      })
      .catch(handleCloudActionError);
  }, [isCloudSynced, user, localState.cart, showToast, handleCloudActionError]);

  if (fatalFirestoreError) {
    throw fatalFirestoreError;
  }

  // Merge cloud catalog + any pending local admin drafts
  const effectiveOverrides = useMemo<Record<string, Product>>(
    () => ({ ...cloudOverrides, ...localAdminDraft.overrides }),
    [cloudOverrides, localAdminDraft.overrides]
  );

  const effectiveSettings = useMemo<BusinessSettings>(
    () => localAdminDraft.settings ?? cloudSettings ?? DEFAULT_BUSINESS_SETTINGS,
    [localAdminDraft.settings, cloudSettings]
  );

  const allProducts = useMemo(
    () => mergeCatalogProducts(PRODUCTS, effectiveOverrides),
    [effectiveOverrides]
  );

  const customerProducts = useMemo(
    () => getVisibleCustomerProducts(allProducts),
    [allProducts]
  );

  const allCategories = useMemo(
    () => getDynamicCategories(CATEGORIES, allProducts),
    [allProducts]
  );

  const customerCategories = useMemo(
    () => getDynamicCategories(CATEGORIES, customerProducts),
    [customerProducts]
  );

  const inspectedProduct = useMemo(
    () => (inspectedProductId ? allProducts.find((p) => p.id === inspectedProductId) ?? null : null),
    [allProducts, inspectedProductId]
  );

  const pilotState = isCloudSynced ? cloudState : localState;

  const persistLocalState = useCallback(
    (updater: (prev: PilotState) => PilotState) => {
      setLocalState((prev) => {
        const next = updater(prev);
        const saved = savePilotState(next);
        if (!saved) {
          showToast('Local storage unavailable. Changes persist for this session only.');
        }
        return next;
      });
    },
    [showToast]
  );

  const updateLocalAdminDraft = useCallback(
    (updater: (prev: LocalAdminDraft) => LocalAdminDraft) => {
      setLocalAdminDraft((prev) => {
        const next = updater(prev);
        const saved = saveLocalAdminDraft(next);
        if (!saved) {
          showToast(
            'Browser storage limit reached (photos are large). Sign in as Admin to save directly to Cloud Firestore.'
          );
        }
        return next;
      });
    },
    [showToast]
  );

  // Hash navigation sync
  useEffect(() => {
    const onHashChange = () => setPage(readHashPage());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((nextPage: PageId) => {
    setPage(nextPage);
    if (window.location.hash !== `#${nextPage}`) {
      window.location.hash = nextPage;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleSelectCategoryFromHome = useCallback(
    (selectedCategory: string) => {
      setCategory(selectedCategory);
      setFamily('all');
      setSearch('');
      setCatalogPage(1);
      navigate('catalogue');
    },
    [navigate]
  );

  const handleCategoryChange = useCallback((nextCat: string) => {
    setCategory(nextCat);
    setFamily('all');
    setSearch('');
    setCatalogPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setCategory('All');
    setFamily('all');
    setSearch('');
    setSort('default');
    setCatalogPage(1);
  }, []);

  const cartItems = useMemo(
    () => getCartItems(allProducts, pilotState.cart),
    [allProducts, pilotState.cart]
  );
  const cartTotals = useMemo(() => getCartTotals(cartItems), [cartItems]);

  // ------------------------------------------------------------------
  // Admin Catalogue & Business Settings Handlers
  // ------------------------------------------------------------------
  const handleAdminSaveProduct = useCallback(
    async (product: Product) => {
      if (isCloudAdmin && user) {
        try {
          await saveCatalogProductInFirestore(user.uid, product);
          // Clear any stale local draft for this SKU if it existed
          if (product.id in localAdminDraft.overrides) {
            updateLocalAdminDraft((prev) => {
              const nextOverrides = { ...prev.overrides };
              delete nextOverrides[product.id];
              return { ...prev, overrides: nextOverrides };
            });
          }
          showToast(`Published ${product.id} (${product.family}) live to Cloud Firestore`);
        } catch (err) {
          handleCloudActionError(err);
          throw err;
        }
      } else {
        updateLocalAdminDraft((prev) => ({
          ...prev,
          overrides: {
            ...prev.overrides,
            [product.id]: { ...product, isEdited: true },
          },
        }));
        showToast(
          `Saved ${product.id} in Local Draft Mode · Sign in as Admin to publish live`
        );
      }
    },
    [isCloudAdmin, user, localAdminDraft.overrides, updateLocalAdminDraft, showToast, handleCloudActionError]
  );

  const handleAdminDeleteOrResetProduct = useCallback(
    async (product: Product) => {
      if (isCloudAdmin && user) {
        try {
          await deleteCatalogProductOverrideInFirestore(product.id);
          if (product.id in localAdminDraft.overrides) {
            updateLocalAdminDraft((prev) => {
              const nextOverrides = { ...prev.overrides };
              delete nextOverrides[product.id];
              return { ...prev, overrides: nextOverrides };
            });
          }
          showToast(
            product.isCustom
              ? `Deleted custom product ${product.id} from Cloud Firestore`
              : `Reset ${product.id} back to original catalogue defaults`
          );
        } catch (err) {
          handleCloudActionError(err);
          throw err;
        }
      } else {
        updateLocalAdminDraft((prev) => {
          const nextOverrides = { ...prev.overrides };
          delete nextOverrides[product.id];
          return { ...prev, overrides: nextOverrides };
        });
        showToast(
          product.isCustom
            ? `Removed custom draft ${product.id}`
            : `Reverted local draft edits for ${product.id}`
        );
      }
    },
    [isCloudAdmin, user, localAdminDraft.overrides, updateLocalAdminDraft, showToast, handleCloudActionError]
  );

  const handleAdminBulkSaveProducts = useCallback(
    async (updatedProducts: Product[]) => {
      if (updatedProducts.length === 0) return;
      if (isCloudAdmin && user) {
        try {
          await batchSaveCatalogProductsInFirestore(user.uid, updatedProducts);
          showToast(`Published updated prices for ${updatedProducts.length} SKUs to Cloud Firestore`);
        } catch (err) {
          handleCloudActionError(err);
          throw err;
        }
      } else {
        updateLocalAdminDraft((prev) => {
          const nextOverrides = { ...prev.overrides };
          for (const p of updatedProducts) {
            nextOverrides[p.id] = { ...p, isEdited: true };
          }
          return { ...prev, overrides: nextOverrides };
        });
        showToast(
          `Updated ${updatedProducts.length} SKU prices in Local Draft Mode · Sign in as Admin to publish live`
        );
      }
    },
    [isCloudAdmin, user, updateLocalAdminDraft, showToast, handleCloudActionError]
  );

  const handleAdminSaveBusinessSettings = useCallback(
    async (nextSettings: BusinessSettings) => {
      if (isCloudAdmin && user) {
        try {
          await saveBusinessSettingsInFirestore(user.uid, nextSettings);
          if (localAdminDraft.settings) {
            updateLocalAdminDraft((prev) => ({ ...prev, settings: null }));
          }
          showToast('Published business & storefront settings live to Cloud Firestore');
        } catch (err) {
          handleCloudActionError(err);
          throw err;
        }
      } else {
        updateLocalAdminDraft((prev) => ({ ...prev, settings: nextSettings }));
        showToast('Saved storefront settings in Local Draft Mode · Sign in as Admin to publish live');
      }
    },
    [isCloudAdmin, user, localAdminDraft.settings, updateLocalAdminDraft, showToast, handleCloudActionError]
  );

  const handlePublishLocalDraftsToCloud = useCallback(async () => {
    if (!isCloudAdmin || !user) return;
    const draftProducts = Object.values(localAdminDraft.overrides);
    try {
      if (draftProducts.length > 0) {
        await batchSaveCatalogProductsInFirestore(user.uid, draftProducts);
      }
      if (localAdminDraft.settings) {
        await saveBusinessSettingsInFirestore(user.uid, localAdminDraft.settings);
      }
      updateLocalAdminDraft(() => ({ overrides: {}, settings: null }));
      showToast('All local draft edits published live to Cloud Firestore');
    } catch (err) {
      handleCloudActionError(err);
    }
  }, [isCloudAdmin, user, localAdminDraft, updateLocalAdminDraft, showToast, handleCloudActionError]);

  const handleDiscardLocalDrafts = useCallback(() => {
    updateLocalAdminDraft(() => ({ overrides: {}, settings: null }));
    showToast('Discarded local draft edits');
  }, [updateLocalAdminDraft, showToast]);

  // ------------------------------------------------------------------
  // Cart, Order & Lead Handlers
  // ------------------------------------------------------------------
  const handleUpdateCart = useCallback(
    (productId: string, delta: number) => {
      if (isCloudSynced && user) {
        const current = Number.isInteger(cloudState.cart[productId]) ? cloudState.cart[productId] : 0;
        const nextQty = clampQuantity(current + delta);
        void upsertCartItemInFirestore(user.uid, productId, nextQty).catch(handleCloudActionError);
      } else {
        persistLocalState((prev) => ({
          ...prev,
          cart: updateCartQuantity(prev.cart, productId, delta),
        }));
      }

      if (delta > 0) {
        showToast(delta === 1 ? 'Added to trial basket' : `Added ${delta} units to trial basket`);
      }
    },
    [isCloudSynced, user, cloudState.cart, persistLocalState, showToast, handleCloudActionError]
  );

  const handleRemoveCartItem = useCallback(
    (productId: string) => {
      if (isCloudSynced && user) {
        void upsertCartItemInFirestore(user.uid, productId, 0).catch(handleCloudActionError);
      } else {
        persistLocalState((prev) => ({
          ...prev,
          cart: setCartQuantity(prev.cart, productId, 0),
        }));
      }
      showToast('Removed item from trial basket');
    },
    [isCloudSynced, user, persistLocalState, showToast, handleCloudActionError]
  );

  const handleLoadSampleKit = useCallback(() => {
    if (isCloudSynced && user) {
      void replaceCartWithKitInFirestore(
        user.uid,
        Object.keys(cloudState.cart),
        SAMPLE_TRIAL_KIT
      )
        .then(() => showToast('Loaded ₹5,000 dealer sample kit into your Cloud basket'))
        .catch(handleCloudActionError);
    } else {
      persistLocalState((prev) => ({
        ...prev,
        cart: { ...SAMPLE_TRIAL_KIT },
      }));
      showToast('Loaded ₹5,000 dealer sample kit into your trial basket');
    }
  }, [isCloudSynced, user, cloudState.cart, persistLocalState, showToast, handleCloudActionError]);

  const handleSubmitOrder = useCallback(
    (details: {
      name: string;
      business: string;
      phone: string;
      city: string;
      segment: string;
      notes: string;
    }) => {
      const itemsSnapshot = getCartItems(allProducts, pilotState.cart);
      if (itemsSnapshot.length === 0) return;
      const totals = getCartTotals(itemsSnapshot);
      const refId = generateOrderReference();
      const newOrder: TrialOrder = {
        id: refId,
        date: new Date().toISOString(),
        ...details,
        items: itemsSnapshot,
        total: totals.subtotal,
        status: 'Requested',
        repeat: false,
      };

      if (isCloudSynced && user) {
        void createTrialOrderInFirestore(user.uid, newOrder, Object.keys(cloudState.cart))
          .then(() => {
            navigate('dashboard');
            showToast(`Order request ${refId} saved to Cloud Firestore.`);
          })
          .catch(handleCloudActionError);
      } else {
        persistLocalState((prev) => ({
          ...prev,
          cart: {},
          orders: [newOrder, ...prev.orders],
        }));
        navigate('dashboard');
        showToast(`Order request ${refId} saved locally. Sign in with Google to sync.`);
      }
    },
    [
      allProducts,
      pilotState.cart,
      isCloudSynced,
      user,
      cloudState.cart,
      navigate,
      persistLocalState,
      showToast,
      handleCloudActionError,
    ]
  );

  const handleSubmitLead = useCallback(
    (lead: {
      name: string;
      business: string;
      phone: string;
      city: string;
      interest: string;
      currentSupplier: string;
      challenge: string;
    }) => {
      const newLead = {
        id: `LEAD-${Date.now().toString(36).toUpperCase()}`,
        date: new Date().toISOString(),
        ...lead,
      };

      if (isCloudSynced && user) {
        void createDealerLeadInFirestore(user.uid, newLead)
          .then(() => showToast('Dealer enquiry saved to Cloud Firestore.'))
          .catch(handleCloudActionError);
      } else {
        persistLocalState((prev) => ({
          ...prev,
          leads: [newLead, ...prev.leads],
        }));
        showToast('Dealer interest saved locally. Sign in with Google to sync to Firestore.');
      }
    },
    [isCloudSynced, user, persistLocalState, showToast, handleCloudActionError]
  );

  const handleOrderStatusChange = useCallback(
    (orderId: string, status: OrderStatus) => {
      if (isCloudSynced && user) {
        void updateTrialOrderStatusInFirestore(orderId, status).catch(handleCloudActionError);
      } else {
        persistLocalState((prev) => ({
          ...prev,
          orders: prev.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
        }));
      }
    },
    [isCloudSynced, user, persistLocalState, handleCloudActionError]
  );

  const handleOrderRepeatToggle = useCallback(
    (orderId: string, repeat: boolean) => {
      if (isCloudSynced && user) {
        void updateTrialOrderRepeatInFirestore(orderId, repeat).catch(handleCloudActionError);
      } else {
        persistLocalState((prev) => ({
          ...prev,
          orders: prev.orders.map((o) => (o.id === orderId ? { ...o, repeat } : o)),
        }));
      }
    },
    [isCloudSynced, user, persistLocalState, handleCloudActionError]
  );

  const handleLoadSampleRecords = useCallback(() => {
    const sample = createSamplePilotRecords(allProducts);
    if (isCloudSynced && user) {
      void seedSampleRecordsInFirestore(user.uid, sample.orders, sample.leads)
        .then(() => showToast('Loaded 3 sample pilot requests and 2 dealer enquiries to Cloud Firestore'))
        .catch(handleCloudActionError);
    } else {
      persistLocalState((prev) => ({
        ...prev,
        orders: [...sample.orders, ...prev.orders],
        leads: [...sample.leads, ...prev.leads],
      }));
      showToast('Loaded 3 sample pilot requests and 2 dealer enquiries');
    }
  }, [allProducts, isCloudSynced, user, persistLocalState, showToast, handleCloudActionError]);

  const handleResetAllData = useCallback(() => {
    if (isCloudSynced && user) {
      void clearUserFirestoreData(
        user.uid,
        Object.keys(cloudState.cart),
        cloudState.orders.map((o) => o.id),
        cloudState.leads.map((l) => l.id)
      )
        .then(() => showToast('Cleared your Cloud Firestore pilot records'))
        .catch(handleCloudActionError);
    } else {
      persistLocalState(() => EMPTY_PILOT_STATE);
      showToast('All local pilot data cleared');
    }
  }, [
    isCloudSynced,
    user,
    cloudState.cart,
    cloudState.orders,
    cloudState.leads,
    persistLocalState,
    showToast,
    handleCloudActionError,
  ]);

  const handleExportCsv = useCallback(
    (csvText: string, filename = 'dd-group-catalogue.csv') => {
      triggerDownload(csvText, 'text/csv;charset=utf-8', filename);
      showToast(`Exported ${filename}`);
    },
    [showToast]
  );

  const handleExportJson = useCallback(() => {
    const payload = JSON.stringify(
      {
        storageMode: isCloudSynced ? 'cloud_firestore' : 'local_browser',
        exportedAt: new Date().toISOString(),
        businessSettings: effectiveSettings,
        catalogOverrides: effectiveOverrides,
        orders: pilotState.orders,
        leads: pilotState.leads,
      },
      null,
      2
    );
    triggerDownload(payload, 'application/json', 'dd-group-business-backup.json');
    showToast('Exported complete business backup JSON');
  }, [
    isCloudSynced,
    effectiveSettings,
    effectiveOverrides,
    pilotState.leads,
    pilotState.orders,
    showToast,
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7f6] text-[#142a30]">
      <Header
        activePage={page}
        basketCount={cartTotals.unitCount}
        companyName={effectiveSettings.companyName}
        onNavigate={navigate}
      />
      <AccountSyncBar />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
        {page === 'home' && (
          <HomeView
            products={customerProducts}
            categories={customerCategories}
            settings={effectiveSettings}
            onNavigate={navigate}
            onSelectCategory={handleSelectCategoryFromHome}
          />
        )}

        {page === 'catalogue' && (
          <CatalogueView
            products={customerProducts}
            categories={customerCategories}
            settings={effectiveSettings}
            category={category}
            family={family}
            search={search}
            sort={sort}
            page={catalogPage}
            cart={pilotState.cart}
            basketUnitCount={cartTotals.unitCount}
            basketSubtotal={cartTotals.subtotal}
            onCategoryChange={handleCategoryChange}
            onFamilyChange={(nextFam) => {
              setFamily(nextFam);
              setCatalogPage(1);
            }}
            onSearchChange={(nextSearch) => {
              setSearch(nextSearch);
              setCatalogPage(1);
            }}
            onSortChange={(nextSort) => {
              setSort(nextSort);
              setCatalogPage(1);
            }}
            onPageChange={setCatalogPage}
            onClearFilters={handleClearFilters}
            onUpdateCart={handleUpdateCart}
            onInspectProduct={(prod) => setInspectedProductId(prod.id)}
            onExportCsv={(csvText) => handleExportCsv(csvText, 'dd-group-catalogue.csv')}
            onOpenBasket={() => navigate('cart')}
          />
        )}

        {page === 'cart' && (
          <BasketView
            items={cartItems}
            totalProductCount={customerProducts.length}
            settings={effectiveSettings}
            isCloudSynced={isCloudSynced}
            onUpdateCart={handleUpdateCart}
            onRemoveItem={handleRemoveCartItem}
            onLoadSampleKit={handleLoadSampleKit}
            onNavigate={navigate}
            onSubmitOrder={handleSubmitOrder}
          />
        )}

        {page === 'dealer' && (
          <DealerConnectView
            products={customerProducts}
            categories={customerCategories}
            settings={effectiveSettings}
            isCloudSynced={isCloudSynced}
            onSubmitLead={handleSubmitLead}
          />
        )}

        {page === 'dashboard' && (
          <DashboardView
            orders={pilotState.orders}
            leads={pilotState.leads}
            isCloudSynced={isCloudSynced}
            isAdmin={isAdmin}
            userEmail={user?.email ?? null}
            onStatusChange={handleOrderStatusChange}
            onRepeatToggle={handleOrderRepeatToggle}
            onExportJson={handleExportJson}
            onLoadSampleRecords={handleLoadSampleRecords}
            onResetAllData={handleResetAllData}
          />
        )}

        {page === 'admin' && (
          <AdminView
            products={allProducts}
            categories={allCategories}
            settings={effectiveSettings}
            orders={pilotState.orders}
            leads={pilotState.leads}
            isCloudAdmin={isCloudAdmin}
            localDraftProductCount={Object.keys(localAdminDraft.overrides).length}
            hasLocalDraftSettings={localAdminDraft.settings !== null}
            onSaveProduct={handleAdminSaveProduct}
            onDeleteOrResetProduct={handleAdminDeleteOrResetProduct}
            onBulkSaveProducts={handleAdminBulkSaveProducts}
            onSaveBusinessSettings={handleAdminSaveBusinessSettings}
            onPublishLocalDraftsToCloud={handlePublishLocalDraftsToCloud}
            onDiscardLocalDrafts={handleDiscardLocalDrafts}
            onOrderStatusChange={handleOrderStatusChange}
            onOrderRepeatToggle={handleOrderRepeatToggle}
            onExportCsv={handleExportCsv}
            onExportBackupJson={handleExportJson}
          />
        )}
      </main>

      <footer className="border-t border-[#dce5e3] bg-white mt-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#5a6d71]">
          <div>
            <strong className="font-semibold text-[#142a30]">
              {effectiveSettings.companyName}
            </strong>
            {effectiveSettings.tagline && ` · ${effectiveSettings.tagline}`}
            {effectiveSettings.city && ` · ${effectiveSettings.city}`}
            {effectiveSettings.contactPhone && ` · ${effectiveSettings.contactPhone}`}
          </div>
          <div>
            {effectiveSettings.showPrototypeNotices
              ? 'Jaipur pilot venture prototype · '
              : 'Wholesale Electrical Supply · '}
            {isCloudSynced
              ? 'Synced with Cloud Firestore'
              : 'Sign in with Google for Cloud Firestore sync'}
          </div>
        </div>
      </footer>

      <ProductDetailModal
        product={inspectedProduct}
        allProducts={customerProducts}
        settings={effectiveSettings}
        cartQty={inspectedProduct ? pilotState.cart[inspectedProduct.id] ?? 0 : 0}
        onClose={() => setInspectedProductId(null)}
        onSelectProduct={(prod) => setInspectedProductId(prod.id)}
        onAddQuantity={(id, qty) => {
          handleUpdateCart(id, qty);
        }}
      />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 bottom-4 z-50 max-w-[90vw] rounded-lg bg-[#0d2f2c] text-white px-4 py-3 text-sm font-medium shadow-lg border border-white/10"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
