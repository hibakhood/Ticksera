import { Component, type ReactNode } from 'react';
import { captureError, sentryEnabled } from '../../lib/sentry';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Top-level error boundary: reports render errors to Sentry and keeps the SPA from white-screening. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    captureError(error, { componentStack: info.componentStack });
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg p-6">
        <div className="text-center max-w-md">
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {sentryEnabled
              ? 'The error has been reported. Please reload to continue.'
              : 'Please reload the page to continue.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
