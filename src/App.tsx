import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PRODUCTS, SAMPLE_TRIAL_KIT } from './data/products';
import type { OrderStatus, PageId, PilotState, Product, SortMode, TrialOrder } from './types';
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
  clearUserFirestoreData,
  createDealerLeadInFirestore,
  createTrialOrderInFirestore,
  mergeLocalCartIntoFirestore,
  replaceCartWithKitInFirestore,
  seedSampleRecordsInFirestore,
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
import { BasketView } from './components/BasketView';
import { CatalogueView } from './components/CatalogueView';
import { DashboardView } from './components/DashboardView';
import { DealerConnectView } from './components/DealerConnectView';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { ProductDetailModal } from './components/ProductDetailModal';

const VALID_PAGES: PageId[] = ['home', 'catalogue', 'cart', 'dealer', 'dashboard'];

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

  const [page, setPage] = useState<PageId>(readHashPage);
  const [localState, setLocalState] = useState<PilotState>(loadPilotState);
  const [cloudState, setCloudState] = useState<PilotState>(EMPTY_PILOT_STATE);
  const [fatalFirestoreError, setFatalFirestoreError] = useState<Error | null>(null);

  // Catalogue filter state
  const [category, setCategory] = useState<string>('All');
  const [family, setFamily] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<SortMode>('default');
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const [inspectedProduct, setInspectedProduct] = useState<Product | null>(null);

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

  // Attach Firestore realtime listeners ONLY when authReady && profileReady && user
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
      (orders) => setCloudState((prev) => ({ ...prev, orders })),
      onListenerError
    );
    const unsubLeads = subscribeDealerLeads(
      uid,
      (leads) => setCloudState((prev) => ({ ...prev, leads })),
      onListenerError
    );

    return () => {
      unsubCart();
      unsubOrders();
      unsubLeads();
    };
  }, [authReady, profileReady, user, showToast]);

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
    () => getCartItems(PRODUCTS, pilotState.cart),
    [pilotState.cart]
  );
  const cartTotals = useMemo(() => getCartTotals(cartItems), [cartItems]);

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
        .then(() => showToast('Loaded ₹5,000 Jaipur dealer sample kit into your Cloud basket'))
        .catch(handleCloudActionError);
    } else {
      persistLocalState((prev) => ({
        ...prev,
        cart: { ...SAMPLE_TRIAL_KIT },
      }));
      showToast('Loaded ₹5,000 Jaipur dealer sample kit into your trial basket');
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
      const itemsSnapshot = getCartItems(PRODUCTS, pilotState.cart);
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
            showToast(`Trial request ${refId} saved to Cloud Firestore.`);
          })
          .catch(handleCloudActionError);
      } else {
        persistLocalState((prev) => ({
          ...prev,
          cart: {},
          orders: [newOrder, ...prev.orders],
        }));
        navigate('dashboard');
        showToast(`Demo trial request ${refId} saved locally. Sign in with Google to sync.`);
      }
    },
    [
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
    const sample = createSamplePilotRecords(PRODUCTS);
    if (isCloudSynced && user) {
      void seedSampleRecordsInFirestore(user.uid, sample.orders, sample.leads)
        .then(() => showToast('Loaded 3 sample Jaipur pilot requests and 2 dealer enquiries to Cloud Firestore'))
        .catch(handleCloudActionError);
    } else {
      persistLocalState((prev) => ({
        ...prev,
        orders: [...sample.orders, ...prev.orders],
        leads: [...sample.leads, ...prev.leads],
      }));
      showToast('Loaded 3 sample Jaipur pilot requests and 2 dealer enquiries');
    }
  }, [isCloudSynced, user, persistLocalState, showToast, handleCloudActionError]);

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
    (csvText: string) => {
      triggerDownload(csvText, 'text/csv;charset=utf-8', 'dd-group-sample-catalogue.csv');
      showToast('Exported 329-SKU sample catalogue CSV');
    },
    [showToast]
  );

  const handleExportJson = useCallback(() => {
    const payload = JSON.stringify(
      {
        storageMode: isCloudSynced ? 'cloud_firestore' : 'local_browser',
        disclaimer: 'Jaipur pilot prototype records — not verified paid sales',
        exportedAt: new Date().toISOString(),
        orders: pilotState.orders,
        leads: pilotState.leads,
      },
      null,
      2
    );
    triggerDownload(payload, 'application/json', 'dd-group-jaipur-pilot-records.json');
    showToast('Exported pilot records JSON');
  }, [isCloudSynced, pilotState.leads, pilotState.orders, showToast]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7f6] text-[#142a30]">
      <Header activePage={page} basketCount={cartTotals.unitCount} onNavigate={navigate} />
      <AccountSyncBar />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
        {page === 'home' && (
          <HomeView
            onNavigate={navigate}
            onSelectCategory={handleSelectCategoryFromHome}
          />
        )}

        {page === 'catalogue' && (
          <CatalogueView
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
            onInspectProduct={setInspectedProduct}
            onExportCsv={handleExportCsv}
            onOpenBasket={() => navigate('cart')}
          />
        )}

        {page === 'cart' && (
          <BasketView
            items={cartItems}
            isCloudSynced={isCloudSynced}
            onUpdateCart={handleUpdateCart}
            onRemoveItem={handleRemoveCartItem}
            onLoadSampleKit={handleLoadSampleKit}
            onNavigate={navigate}
            onSubmitOrder={handleSubmitOrder}
          />
        )}

        {page === 'dealer' && (
          <DealerConnectView isCloudSynced={isCloudSynced} onSubmitLead={handleSubmitLead} />
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
      </main>

      <footer className="border-t border-[#dce5e3] bg-white mt-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#5a6d71]">
          <div>
            <strong className="font-semibold text-[#142a30]">D&amp;D Group</strong> · Connected by
            Quality · Jaipur, Rajasthan Electrical Pilot Prototype
          </div>
          <div>
            Independent student venture prototype · Representative vector illustrations ·{' '}
            {isCloudSynced ? 'Synced with Cloud Firestore' : 'Sign in with Google for Cloud Firestore sync'}
          </div>
        </div>
      </footer>

      <ProductDetailModal
        product={inspectedProduct}
        cartQty={inspectedProduct ? pilotState.cart[inspectedProduct.id] ?? 0 : 0}
        onClose={() => setInspectedProduct(null)}
        onSelectProduct={setInspectedProduct}
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
