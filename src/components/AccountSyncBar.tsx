import { Cloud, ExternalLink, LogOut, RefreshCw } from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';

export function AccountSyncBar() {
  const {
    user,
    authReady,
    authBusy,
    authError,
    authErrorCode,
    isEmbeddedIframe,
    isAdmin,
    signInWithGoogle,
    signOutUser,
    retryProfileSync,
    clearAuthError,
  } = useFirebase();

  const currentHref = typeof window !== 'undefined' ? window.location.href : '#';

  return (
    <div className="bg-[#edf3f1] border-b border-[#dce5e3]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        {!authReady ? (
          <span className="text-[#5a6d71]">Checking dealer account session…</span>
        ) : user ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'Dealer profile'}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full border border-[#cde0da] shrink-0 object-cover"
                />
              ) : (
                <span className="w-6 h-6 rounded-full bg-[#0d2f2c] text-white font-semibold text-[11px] inline-flex items-center justify-center shrink-0">
                  {(user.displayName ?? user.email ?? 'D').slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 truncate text-[#2d4348]">
                <strong className="font-semibold text-[#142a30]">
                  {user.displayName || 'Dealer Account'}
                </strong>
                {user.email && <span className="text-[#5a6d71]"> · {user.email}</span>}
                {isAdmin && (
                  <span className="text-[#066352] font-semibold"> · Store Admin</span>
                )}
                <span className="hidden sm:inline text-[#087c67] font-medium">
                  {' '}
                  · Cloud Firestore synced
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void signOutUser()}
              disabled={authBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#cde0da] bg-white text-[#2d4348] font-semibold hover:bg-[#f4f7f6] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-[#42555a] min-w-0">
              <Cloud className="w-3.5 h-3.5 text-[#087c67] shrink-0" aria-hidden="true" />
              <span>
                Local browser mode · Sign in with Google to sync your basket, orders, and Admin
                catalogue edits to Cloud Firestore.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isEmbeddedIframe && (
                <a
                  href={currentHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open app in a full browser tab if embedded preview blocks Google Sign-In cookies"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#cde0da] bg-[#f7fbf9] text-[#2d4348] font-medium hover:bg-white transition-colors whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#087c67]" aria-hidden="true" />
                  <span className="hidden sm:inline">Open in New Tab</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                disabled={authBusy}
                data-testid="google-signin-btn"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#c6dad4] bg-white text-[#142a30] font-semibold hover:bg-[#f7fbf9] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.29v3.1A12 12 0 0 0 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.3a7.21 7.21 0 0 1 0-4.6V6.6H1.29a12 12 0 0 0 0 10.8l3.99-3.1Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.6l3.99 3.1c.95-2.84 3.6-4.95 6.72-4.95Z"
                  />
                </svg>
                <span>{authBusy ? 'Signing in…' : 'Sign in with Google'}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {authError && (
        <div
          role={authErrorCode === 'auth/popup-closed-by-user' ? 'status' : 'alert'}
          className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-2.5 pt-0.5 flex flex-wrap items-center justify-between gap-2 text-xs ${
            authErrorCode === 'auth/popup-closed-by-user' ? 'text-[#695326]' : 'text-[#8f2e22]'
          }`}
        >
          <span className="leading-relaxed">{authError}</span>
          <div className="flex items-center gap-3 shrink-0">
            {authErrorCode === 'firestore/profile-sync-failed' && (
              <button
                type="button"
                onClick={() => void retryProfileSync()}
                disabled={authBusy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#d6b1ab] bg-white text-[#8f2e22] font-semibold hover:bg-[#fdf5f4] cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                <span>Retry Sync</span>
              </button>
            )}
            {isEmbeddedIframe && (
              <a
                href={currentHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#087c67] bg-[#087c67] text-white font-semibold hover:bg-[#066352]"
              >
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
                <span>Open in New Tab</span>
              </a>
            )}
            <button
              type="button"
              onClick={clearAuthError}
              className="underline font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
