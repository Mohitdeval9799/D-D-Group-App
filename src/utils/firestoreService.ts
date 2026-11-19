import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { DealerLead, OrderStatus, TrialOrder } from '../types';
import {
  makeUserScopedSampleId,
  sanitizeCartItemPayload,
  sanitizeDealerLeadPayload,
  sanitizeTrialOrderPayload,
  sanitizeUserProfilePayload,
} from './firestorePayloads';

export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const profile = sanitizeUserProfilePayload({
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  });

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...profile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName: profile.displayName,
        email: profile.email,
        photoURL: profile.photoURL,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserCart(
  uid: string,
  onData: (cart: Record<string, number>) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/cartItems`;
  const q = query(collection(db, 'users', uid, 'cartItems'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const nextCart: Record<string, number> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (typeof data.productId === 'string' && typeof data.qty === 'number' && data.qty > 0) {
          nextCart[data.productId] = data.qty;
        }
      });
      onData(nextCart);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeTrialOrders(
  uid: string,
  onData: (orders: TrialOrder[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'trialOrders';
  const q = query(collection(db, 'trialOrders'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: TrialOrder[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: typeof data.referenceId === 'string' ? data.referenceId : docSnap.id,
          date: typeof data.date === 'string' ? data.date : new Date().toISOString(),
          name: typeof data.name === 'string' ? data.name : '',
          business: typeof data.business === 'string' ? data.business : '',
          phone: typeof data.phone === 'string' ? data.phone : '',
          city: typeof data.city === 'string' ? data.city : '',
          segment: typeof data.segment === 'string' ? data.segment : 'Electrical Dealer',
          notes: typeof data.notes === 'string' ? data.notes : '',
          items: Array.isArray(data.items) ? data.items : [],
          total: typeof data.total === 'number' ? data.total : 0,
          status: (data.status as OrderStatus) ?? 'Requested',
          repeat: Boolean(data.repeat),
        });
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeDealerLeads(
  uid: string,
  onData: (leads: DealerLead[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'dealerLeads';
  const q = query(collection(db, 'dealerLeads'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: DealerLead[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          date: typeof data.date === 'string' ? data.date : new Date().toISOString(),
          name: typeof data.name === 'string' ? data.name : '',
          business: typeof data.business === 'string' ? data.business : '',
          phone: typeof data.phone === 'string' ? data.phone : '',
          city: typeof data.city === 'string' ? data.city : '',
          interest: typeof data.interest === 'string' ? data.interest : 'Multiple categories',
          currentSupplier: typeof data.currentSupplier === 'string' ? data.currentSupplier : '',
          challenge: typeof data.challenge === 'string' ? data.challenge : '',
        });
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function upsertCartItemInFirestore(
  uid: string,
  productId: string,
  nextQty: number
): Promise<void> {
  const path = `users/${uid}/cartItems/${productId}`;
  const ref = doc(db, 'users', uid, 'cartItems', productId);

  if (nextQty <= 0) {
    try {
      await deleteDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
    return;
  }

  const payload = sanitizeCartItemPayload(uid, productId, nextQty);
  try {
    await setDoc(ref, {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function mergeLocalCartIntoFirestore(
  uid: string,
  localCart: Record<string, number>
): Promise<void> {
  const entries = Object.entries(localCart).filter(([, qty]) => Number.isInteger(qty) && qty > 0);
  if (entries.length === 0) return;

  const path = `users/${uid}/cartItems`;
  const batch = writeBatch(db);
  for (const [productId, qty] of entries) {
    const payload = sanitizeCartItemPayload(uid, productId, qty);
    batch.set(doc(db, 'users', uid, 'cartItems', payload.productId), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function replaceCartWithKitInFirestore(
  uid: string,
  existingSkuIds: string[],
  kit: Record<string, number>
): Promise<void> {
  const path = `users/${uid}/cartItems`;
  const batch = writeBatch(db);

  for (const skuId of existingSkuIds) {
    if (!(skuId in kit)) {
      batch.delete(doc(db, 'users', uid, 'cartItems', skuId));
    }
  }

  for (const [productId, qty] of Object.entries(kit)) {
    const payload = sanitizeCartItemPayload(uid, productId, qty);
    batch.set(doc(db, 'users', uid, 'cartItems', payload.productId), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createTrialOrderInFirestore(
  uid: string,
  order: TrialOrder,
  cartSkuIdsToClear: string[]
): Promise<void> {
  const sanitized = sanitizeTrialOrderPayload(uid, order);
  const path = `trialOrders/${sanitized.referenceId}`;
  const batch = writeBatch(db);

  batch.set(doc(db, 'trialOrders', sanitized.referenceId), {
    ...sanitized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  for (const skuId of cartSkuIdsToClear) {
    batch.delete(doc(db, 'users', uid, 'cartItems', skuId));
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTrialOrderStatusInFirestore(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const path = `trialOrders/${orderId}`;
  try {
    await updateDoc(doc(db, 'trialOrders', orderId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateTrialOrderRepeatInFirestore(
  orderId: string,
  repeat: boolean
): Promise<void> {
  const path = `trialOrders/${orderId}`;
  try {
    await updateDoc(doc(db, 'trialOrders', orderId), {
      repeat,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createDealerLeadInFirestore(uid: string, lead: DealerLead): Promise<void> {
  const sanitized = sanitizeDealerLeadPayload(uid, lead);
  const path = `dealerLeads/${lead.id}`;
  try {
    await setDoc(doc(db, 'dealerLeads', lead.id), {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function seedSampleRecordsInFirestore(
  uid: string,
  orders: TrialOrder[],
  leads: DealerLead[]
): Promise<void> {
  const path = 'trialOrders+dealerLeads';
  const batch = writeBatch(db);

  for (const order of orders) {
    const scopedId = makeUserScopedSampleId(order.id, uid);
    const sanitized = sanitizeTrialOrderPayload(uid, { ...order, id: scopedId });
    batch.set(doc(db, 'trialOrders', sanitized.referenceId), {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  for (const lead of leads) {
    const scopedId = makeUserScopedSampleId(lead.id, uid);
    const sanitized = sanitizeDealerLeadPayload(uid, lead);
    batch.set(doc(db, 'dealerLeads', scopedId), {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function clearUserFirestoreData(
  uid: string,
  cartSkuIds: string[],
  orderIds: string[],
  leadIds: string[]
): Promise<void> {
  const path = `users/${uid}/clear`;
  const batch = writeBatch(db);

  for (const skuId of cartSkuIds) {
    batch.delete(doc(db, 'users', uid, 'cartItems', skuId));
  }
  for (const orderId of orderIds) {
    batch.delete(doc(db, 'trialOrders', orderId));
  }
  for (const leadId of leadIds) {
    batch.delete(doc(db, 'dealerLeads', leadId));
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
