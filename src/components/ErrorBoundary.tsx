import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected application error.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let friendlyMsg = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage) as {
          error?: string;
          operationType?: string;
          path?: string;
        };
        if (parsed && parsed.error) {
          friendlyMsg = `Firestore ${parsed.operationType || 'operation'} failed on ${
            parsed.path || 'document'
          }: ${parsed.error}`;
        }
      } catch {
        // Not JSON
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-white p-6 text-neutral-900">
          <div className="w-full max-w-lg border border-neutral-200 bg-white p-6">
            <h1 className="text-base font-bold text-neutral-950">
              Something went wrong
            </h1>
            <p className="mt-2 break-words text-xs leading-relaxed text-neutral-600">
              {friendlyMsg}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-50"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="border border-neutral-900 bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
              >
                Reload Ledger
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
