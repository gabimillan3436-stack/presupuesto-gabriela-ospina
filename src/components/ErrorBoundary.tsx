import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isQuotaError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
    isQuotaError: false,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error.message || '';
    const isQuotaError = raw.toLowerCase().includes('quota exceeded');
    let friendlyMessage =
      'Ocurrió un inconveniente al sincronizar los datos con tu cuenta.';

    if (isQuotaError) {
      friendlyMessage =
        'Se alcanzó temporalmente el límite diario de lecturas o escrituras gratuitas de Firestore. La cuota se restablece mañana.';
    } else if (raw.includes('Missing or insufficient permissions')) {
      friendlyMessage =
        'No tienes permisos para acceder a este recurso con la sesión actual.';
    }

    return {
      hasError: true,
      errorMessage: friendlyMessage,
      isQuotaError,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught ErrorBoundary exception:', error, info);
  }

  handleReload = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
      isQuotaError: false,
    });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B111B] text-slate-900 dark:text-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-sm">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 mb-4">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </span>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">
            {this.state.isQuotaError
              ? 'Límite diario de Firestore alcanzado'
              : 'Algo salió mal'}
          </h1>
          <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {this.state.errorMessage}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[42px] rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    );
  }
}
