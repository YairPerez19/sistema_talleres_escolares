import { Component, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, Home } from '@/components/icons';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="glass-card p-8 rounded-3xl max-w-md text-center border border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Algo sali\u00f3 mal</h2>
            <p className="text-white/50 text-sm mb-6">
              {this.state.error?.message || 'Error inesperado'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                Reintentar
              </button>
              <Link
                to="/"
                className="px-4 py-2 rounded-xl text-sm font-semibold btn-wine-glow flex items-center gap-2"
              >
                <Home className="size-4" />
                Inicio
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
