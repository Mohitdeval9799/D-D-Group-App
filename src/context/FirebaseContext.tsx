import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider, isRunningInIframe, popupResolver } from '../firebase';
import { ensureUserProfile } from '../utils/firestoreService';

export const ADMIN_EMAIL = 'mohitdeval9799@gmail.com';

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  profileReady: boolean;
  authBusy: boolean;
  authError: string | null;
  authErrorCode: string | null;
  isEmbeddedIframe: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  retryProfileSync: () => Promise<void>;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

function formatGoogleAuthError(code: string, rawMessage: string, embedded: boolean): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';

  if (code === 'auth/popup-blocked') {
    return embedded
      ? 'Your browser blocked the Google Sign-In popup inside the preview frame. Click "Open in New Tab" to sign in cleanly, or allow popups for this site.'
      : 'Your browser blocked the Google Sign-In popup. Please allow popups for this site and try again.';
  }

  if (code === 'auth/unauthorized-domain') {
    return `Domain "${host}" is not authorized in Firebase Auth (${code}). Open the live preview URL or add "${host}" under Firebase Console → Authentication → Settings → Authorized domains.`;
  }

  if (
    code === 'auth/internal-error' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    code === 'auth/web-storage-unsupported'
  ) {
    return embedded
      ? `Browser privacy settings inside the embedded preview frame interrupted Google Sign-In (${code}). Open this app in a full browser tab using the button on the right to sign in with Google.`
      : `Browser storage or third-party cookie settings blocked Google Sign-In (${code}). Enable cookies for Google sign-in or try a standard browser tab.`;
  }

  if (code === 'auth/network-request-failed') {
    return `Network request failed while reaching Google Sign-In (${code}). Check your internet connection or disable ad/tracker blockers and retry.`;
  }

  if (code === 'auth/operation-not-allowed') {
    return `Google Sign-In provider is not enabled on this Firebase project (${code}). Enable Google under Firebase Console → Authentication → Sign-in method.`;
  }

  const suffix = code ? ` (${code})` : rawMessage ? ` (${rawMessage.slice(0, 80)})` : '';
  return embedded
    ? `Google Sign-In could not complete inside the embedded preview${suffix}. Try opening the app in a new tab.`
    : `Could not complete Google Sign-In${suffix}. Please try again.`;
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const isEmbeddedIframe = useMemo(() => isRunningInIframe(), []);

  const syncProfile = useCallback(async (targetUser: User) => {
    try {
      await ensureUserProfile(targetUser);
      setProfileReady(true);
      setAuthError(null);
      setAuthErrorCode(null);
    } catch (err) {
      console.error('Failed to initialize Firestore user profile:', err);
      setAuthError(
        'Signed in with Google, but Firestore profile sync failed. Click Retry Sync or refresh.'
      );
      setAuthErrorCode('firestore/profile-sync-failed');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!active) return;
      setUser(nextUser);
      setProfileReady(false);

      if (nextUser) {
        try {
          await ensureUserProfile(nextUser);
          if (active) {
            setProfileReady(true);
            setAuthError(null);
            setAuthErrorCode(null);
          }
        } catch (err) {
          console.error('Failed to initialize Firestore user profile:', err);
          if (active) {
            setAuthError(
              'Signed in with Google, but Firestore profile sync failed. Click Retry Sync.'
            );
            setAuthErrorCode('firestore/profile-sync-failed');
          }
        }
      }
      if (active) setAuthReady(true);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setAuthErrorCode(null);
    setAuthBusy(true);
    try {
      // Invoke signInWithPopup synchronously before any await so browsers preserve the click gesture
      await signInWithPopup(auth, googleProvider, popupResolver);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      const message = err instanceof Error ? err.message : String(err);
      console.error('Google Sign-In error:', code, message, err);

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User intentionally dismissed the Google popup
      } else {
        setAuthErrorCode(code || 'auth/unknown');
        setAuthError(formatGoogleAuthError(code, message, isEmbeddedIframe));
      }
    } finally {
      setAuthBusy(false);
    }
  }, [isEmbeddedIframe]);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    setAuthErrorCode(null);
    setAuthBusy(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-out error:', err);
      setAuthError('Could not sign out cleanly. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const retryProfileSync = useCallback(async () => {
    if (!auth.currentUser) return;
    setAuthBusy(true);
    try {
      await syncProfile(auth.currentUser);
    } finally {
      setAuthBusy(false);
    }
  }, [syncProfile]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
    setAuthErrorCode(null);
  }, []);

  const isAdmin = Boolean(
    user && user.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL
  );

  const value = useMemo<FirebaseContextValue>(
    () => ({
      user,
      authReady,
      profileReady,
      authBusy,
      authError,
      authErrorCode,
      isEmbeddedIframe,
      isAdmin,
      signInWithGoogle,
      signOutUser,
      retryProfileSync,
      clearAuthError,
    }),
    [
      user,
      authReady,
      profileReady,
      authBusy,
      authError,
      authErrorCode,
      isEmbeddedIframe,
      isAdmin,
      signInWithGoogle,
      signOutUser,
      retryProfileSync,
      clearAuthError,
    ]
  );

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

export function useFirebase(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside a FirebaseProvider');
  }
  return ctx;
}
