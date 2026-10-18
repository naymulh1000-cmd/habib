import React, { Component, ReactNode, ErrorInfo } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Display sync caught by boundary:', error, errorInfo);
  }

  handleReload() {
    try {
      (this as any).setState({ hasError: false, error: null });
    } catch (_) {}
    window.location.reload();
  }

  render() {
    const state = (this as any).state as ErrorBoundaryState;
    const props = (this as any).props as ErrorBoundaryProps;

    if (state && state.hasError) {
      return (
        <div className="min-h-screen bg-[#070A14] text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">FXBY24 Trading Terminal</h2>
          <p className="text-sm text-gray-400 max-w-md mb-6">
            The workspace was refreshed for interface consistency. Click below to continue trading.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 cursor-pointer active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Open Terminal</span>
          </button>
        </div>
      );
    }

    return props.children;
  }
}
