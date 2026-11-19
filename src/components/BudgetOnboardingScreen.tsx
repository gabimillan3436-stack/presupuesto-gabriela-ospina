import {
  AlertCircle,
  ArrowRight,
  LogOut,
  Moon,
  Sun,
  User,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import { FormEvent, useState } from 'react';
import { formatCOPNoSuffix } from '../data/budgetData';

interface BudgetOnboardingScreenProps {
  initialName: string;
  userEmail: string | null;
  isDark: boolean;
  onToggleDark: () => void;
  onSignOut: () => void;
  onCompleteOnboarding: (
    displayName: string,
    monthlyBudget: number
  ) => Promise<void>;
}

const PRESET_BUDGETS = [1_500_000, 2_500_000, 3_200_000, 5_000_000];

export function BudgetOnboardingScreen({
  initialName,
  userEmail,
  isDark,
  onToggleDark,
  onSignOut,
  onCompleteOnboarding,
}: BudgetOnboardingScreenProps) {
  const [nameInput, setNameInput] = useState(initialName);
  const [budgetRaw, setBudgetRaw] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const numericBudget = Number(budgetRaw.replace(/\D/g, '')) || 0;

  const handleBudgetChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    setBudgetRaw(digitsOnly);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setErrorMsg(null);

    if (numericBudget <= 0) {
      setErrorMsg(
        'Ingresa un presupuesto mensual mayor a $0 COP para comenzar.'
      );
      return;
    }

    const cleanName = nameInput.trim() || initialName || 'Usuario';

    setIsSaving(true);
    try {
      await onCompleteOnboarding(cleanName, numericBudget);
    } catch {
      setErrorMsg(
        'No se pudo guardar tu presupuesto en este momento. Intenta nuevamente.'
      );
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B111B] text-slate-900 dark:text-slate-50 transition-colors duration-200 flex flex-col">
      <header className="bg-white dark:bg-[#111927] border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-xs">
              <Wallet className="w-4 h-4" strokeWidth={2.1} aria-hidden="true" />
            </span>
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Mi Presupuesto Mensual
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleDark}
              aria-pressed={isDark}
              aria-label={
                isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
              }
              className="inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
            >
              {isDark ? (
                <Sun
                  className="w-4 h-4 text-amber-400 shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              ) : (
                <Moon
                  className="w-4 h-4 text-slate-600 shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              )}
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 shrink-0">
              <Wallet className="w-5 h-5" strokeWidth={1.85} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Configuración inicial
              </p>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                ¿Cuál es tu presupuesto mensual?
              </h1>
            </div>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            Tu cuenta empieza desde cero. Define cuánto dinero planeas destinar
            este mes para que podamos calcular tu saldo disponible en tiempo real
            {userEmail ? ` (${userEmail})` : ''}.
          </p>

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/70 px-3.5 py-2.5 text-xs sm:text-sm text-rose-700 dark:text-rose-200"
            >
              <AlertCircle
                className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400"
                aria-hidden="true"
              />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="onboarding-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                ¿Cómo quieres que te llamemos?
              </label>
              <div className="relative">
                <User
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="onboarding-name"
                  type="text"
                  maxLength={80}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full pl-10 pr-3.5 py-2.5 min-h-[42px] rounded-xl text-sm bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:focus:ring-emerald-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="onboarding-budget"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Presupuesto mensual (COP) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400 dark:text-slate-500 pointer-events-none">
                  $
                </span>
                <input
                  id="onboarding-budget"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  required
                  value={
                    numericBudget > 0
                      ? formatCOPNoSuffix(numericBudget).replace('$', '')
                      : ''
                  }
                  onChange={(e) => handleBudgetChange(e.target.value)}
                  placeholder="3.200.000"
                  className="w-full pl-9 pr-14 py-3 min-h-[52px] rounded-xl font-display text-2xl font-bold tabular-nums bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:focus:ring-emerald-400"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 pointer-events-none">
                  COP
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {PRESET_BUDGETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleBudgetChange(String(preset))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tabular-nums border transition-colors cursor-pointer ${
                      numericBudget === preset
                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 border-emerald-600 dark:border-emerald-500'
                        : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700'
                    }`}
                  >
                    {formatCOPNoSuffix(preset)}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>
                {isSaving
                  ? 'Guardando tu presupuesto...'
                  : 'Guardar presupuesto y comenzar'}
              </span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
