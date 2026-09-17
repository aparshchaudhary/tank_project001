import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TURRET CBPM Uncaught Runtime Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    localStorage.removeItem('cbpm_token');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060a12] text-slate-200 flex flex-col items-center justify-center p-6 font-mono">
          <div className="max-w-2xl w-full bg-defense-900 border border-red-800/80 rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-defense-800 pb-3">
              <div className="w-8 h-8 rounded bg-red-500/10 border border-red-500/40 text-red-400 flex items-center justify-center font-bold">
                !
              </div>
              <div>
                <h1 className="text-sm font-bold text-red-400 tracking-wider">
                  TURRET CBPM — RUNTIME EXCEPTION CAUGHT
                </h1>
                <p className="text-[11px] text-slate-400">
                  Client-side rendering error prevented normal console display.
                </p>
              </div>
            </div>

            <div className="bg-defense-950 p-4 rounded border border-defense-800/60 overflow-x-auto">
              <p className="text-red-300 font-bold text-xs mb-2">
                {this.state.error?.toString() || 'Unknown Runtime Error'}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-4 py-2 bg-defense-800 hover:bg-defense-700 text-slate-200 text-xs rounded transition-colors"
              >
                Attempt Recovery
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded transition-colors"
              >
                Reset Session &amp; Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
