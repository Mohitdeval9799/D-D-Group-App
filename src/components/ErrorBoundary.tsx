import { Component, type ErrorInfo, type ReactNode } from 'react';
import { FIRESTORE_UPGRADE_URL, isQuotaExceededMessage, type FirestoreErrorInfo } from '../firebase';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isQuota: boolean;
  operationContext: string | null;
}

function parseErrorMessage(error: Error): {
  message: string;
  isQuota: boolean;
  operationContext: string | null;
} {
  try {
    const parsed = JSON.parse(error.message) as Partial<FirestoreErrorInfo>;
    if (parsed && typeof parsed.error === 'string') {
      const quota = isQuotaExceededMessage(parsed.error);
      return {
        message: quota
          ? 'Cloud Firestore daily free-tier quota has been reached. Quota resets tomorrow, or you can upgrade the database plan in Firebase Console.'
          : parsed.error,
        isQuota: quota,
        operationContext: parsed.operationType
          ? `${parsed.operationType.toUpperCase()} ${parsed.path ?? ''}`.trim()
          : null,
      };
    }
  } catch {
    // Standard non-JSON error
  }
  const quota = isQuotaExceededMessage(error.message);
  return {
    message: error.message || 'An unexpected error occurred while rendering this workspace.',
    isQuota: quota,
    operationContext: null,
  };
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
    isQuota: false,
    operationContext: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const info = parseErrorMessage(error);
    return {
      hasError: true,
      message: info.message,
      isQuota: info.isQuota,
      operationContext: info.operationContext,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      message: '',
      isQuota: false,
      operationContext: null,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#f4f7f6] text-[#142a30] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-[#dce5e3] rounded-xl p-7 space-y-4">
          <p className="text-xs font-semibold text-[#a43e2f]">Workspace Recovery</p>
          <h1 className="font-display text-xl font-bold text-[#142a30]">
            Something interrupted this session.
          </h1>
          <p className="text-sm text-[#4a5e63] leading-relaxed">{this.state.message}</p>
          {this.state.operationContext && (
            <p className="font-mono text-xs text-[#6d8085] bg-[#f4f7f6] rounded-md px-3 py-2">
              Operation: {this.state.operationContext}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-md bg-[#087c67] text-white text-sm font-semibold hover:bg-[#066352] transition-colors cursor-pointer"
            >
              Return to Catalogue
            </button>
            {this.state.isQuota && (
              <a
                href={FIRESTORE_UPGRADE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-md border border-[#cde0da] bg-white text-sm font-semibold text-[#087c67] hover:bg-[#edf6f2] transition-colors"
              >
                Open Firebase Quota Settings
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }
}
