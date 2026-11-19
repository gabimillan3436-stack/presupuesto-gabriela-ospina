import {
  AlertTriangle,
  ArrowDownRight,
  Check,
  CheckCircle2,
  Pencil,
  Wallet,
  X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import {
  CURRENT_DAY,
  TOTAL_DAYS_IN_MONTH,
  formatCOP,
  formatPercent,
} from '../data/budgetData';

interface MonthlySummaryProps {
  baseMonthlyBudget: number;
  totalIncome: number;
  monthlyBudget: number;
  totalSpent: number;
  availableBalance: number;
  spentPercent: number;
  availablePercent: number;
  monthProgressPercent: number;
  onUpdateMonthlyBudget: (nextBudget: number) => void;
}

export function MonthlySummary({
  baseMonthlyBudget,
  totalIncome,
  monthlyBudget,
  totalSpent,
  availableBalance,
  spentPercent,
  availablePercent,
  monthProgressPercent,
  onUpdateMonthlyBudget,
}: MonthlySummaryProps) {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const isPositiveBalance = availableBalance >= 0;
  const clampedSpentWidth = Math.min(100, Math.max(0, spentPercent));
  const clampedAvailableWidth = Math.max(0, 100 - clampedSpentWidth);

  const startEditing = () => {
    setBudgetInput(
      baseMonthlyBudget.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    );
    setBudgetError(null);
    setIsEditingBudget(true);
  };

  const cancelEditing = () => {
    setIsEditingBudget(false);
    setBudgetError(null);
  };

  const handleBudgetInputChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      setBudgetInput('');
      setBudgetError(null);
      return;
    }
    const num = Number(digitsOnly);
    if (num > 999_999_999) return;
    setBudgetInput(num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    setBudgetError(null);
  };

  const handleSaveBudget = (e: FormEvent) => {
    e.preventDefault();
    const digitsOnly = budgetInput.replace(/\D/g, '');
    const parsed = Number(digitsOnly);

    if (!digitsOnly || Number.isNaN(parsed) || parsed < 1) {
      setBudgetError('Ingresa un presupuesto mayor a $0 COP.');
      return;
    }

    onUpdateMonthlyBudget(parsed);
    setIsEditingBudget(false);
    setBudgetError(null);
  };

  return (
    <section
      aria-labelledby="resumen-mensual-titulo"
      className="bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 transition-colors duration-200"
    >
      {/* Cabecera de la sección con saldo disponible y estado de cuenta */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-7 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p
              id="resumen-mensual-titulo"
              className="text-sm font-medium text-slate-500 dark:text-slate-400"
            >
              Disponible para gastar
            </p>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
              ·
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                isPositiveBalance
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {isPositiveBalance ? (
                <CheckCircle2
                  className="w-4 h-4 shrink-0"
                  strokeWidth={2.1}
                  aria-hidden="true"
                />
              ) : (
                <AlertTriangle
                  className="w-4 h-4 shrink-0"
                  strokeWidth={2.1}
                  aria-hidden="true"
                />
              )}
              <span>
                {isPositiveBalance ? 'Balance positivo' : 'Balance negativo'}
              </span>
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h2
              className={`font-display text-3xl sm:text-[2.5rem] leading-none font-bold tracking-tight tabular-nums ${
                isPositiveBalance
                  ? 'text-slate-900 dark:text-slate-50'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {formatCOP(availableBalance)}
            </h2>
            <span
              className={`text-sm font-medium tabular-nums ${
                isPositiveBalance
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {isPositiveBalance
                ? `${formatPercent(availablePercent)} disponible`
                : `${formatPercent(spentPercent)} del presupuesto utilizado`}
            </span>
          </div>

          <p className="mt-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 tabular-nums">
            {totalIncome > 0 ? (
              <>
                Fórmula del mes: {formatCOP(baseMonthlyBudget)} (presupuesto) +{' '}
                {formatCOP(totalIncome)} (ingresos) − {formatCOP(totalSpent)}{' '}
                (gastos)
              </>
            ) : (
              <>
                Fórmula del mes: {formatCOP(baseMonthlyBudget)} (presupuesto) −{' '}
                {formatCOP(totalSpent)} (gastos)
              </>
            )}
          </p>
        </div>

        {/* Estado de ritmo temporal del mes */}
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 lg:text-right">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100 tabular-nums">
              Día {CURRENT_DAY} de {TOTAL_DAYS_IN_MONTH}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {formatPercent(monthProgressPercent)} del mes transcurrido
            </p>
          </div>
        </div>
      </div>

      {/* Desglose de las tres cifras clave (con presupuesto editable) */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800 py-6">
        <div className="pb-5 md:pb-0 md:pr-6">
          <div className="flex items-center justify-between gap-2 min-h-[24px] text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Wallet
                className="w-4 h-4 text-slate-400 dark:text-slate-500"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Presupuesto disponible</span>
            </span>

            {!isEditingBudget && (
              <button
                type="button"
                onClick={startEditing}
                aria-label="Editar presupuesto mensual"
                className="inline-flex items-center gap-1 px-2 py-0.5 -mr-1.5 rounded-md text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
              >
                <Pencil className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>Editar</span>
              </button>
            )}
          </div>

          {isEditingBudget ? (
            <form onSubmit={handleSaveBudget} className="mt-2 space-y-2">
              <div
                className={`flex items-center rounded-xl border px-3 py-1.5 bg-slate-50 dark:bg-slate-900/80 focus-within:ring-2 ${
                  budgetError
                    ? 'border-rose-500 focus-within:ring-rose-500/30'
                    : 'border-slate-300 dark:border-slate-700 focus-within:border-emerald-600 dark:focus-within:border-emerald-400 focus-within:ring-emerald-600/20'
                }`}
              >
                <span className="font-display text-base font-semibold text-slate-400 dark:text-slate-500 mr-1.5 select-none">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  aria-label="Nuevo presupuesto mensual en pesos colombianos"
                  value={budgetInput}
                  onChange={(e) => handleBudgetInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  className="w-full min-w-0 bg-transparent font-display text-lg font-semibold text-slate-900 dark:text-slate-50 tabular-nums focus:outline-none"
                />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1.5 shrink-0 select-none">
                  COP
                </span>
              </div>

              {budgetError && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  {budgetError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Guardar</span>
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Cancelar</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="mt-2 font-display text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
                {formatCOP(monthlyBudget)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {totalIncome > 0
                  ? `Base ${formatCOP(baseMonthlyBudget)} + Ingresos ${formatCOP(totalIncome)}`
                  : 'Presupuesto base · editable'}
              </p>
            </>
          )}
        </div>

        <div className="py-5 md:py-0 md:px-6">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total gastado</span>
            <ArrowDownRight
              className="w-4 h-4 text-slate-500 dark:text-slate-400"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 font-display text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
            {formatCOP(totalSpent)}
          </p>
          <p
            className={`mt-1 text-xs tabular-nums ${
              isPositiveBalance
                ? 'text-slate-500 dark:text-slate-400'
                : 'font-medium text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatPercent(spentPercent)} del presupuesto utilizado
          </p>
        </div>

        <div className="pt-5 md:pt-0 md:pl-6">
          <div
            className={`flex items-center justify-between text-xs font-medium ${
              isPositiveBalance
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            <span>
              {isPositiveBalance ? 'Balance positivo' : 'Balance negativo'}
            </span>
            {isPositiveBalance ? (
              <CheckCircle2
                className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            ) : (
              <AlertTriangle
                className="w-4 h-4 text-rose-600 dark:text-rose-400"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            )}
          </div>
          <p
            className={`mt-2 font-display text-xl sm:text-2xl font-semibold tabular-nums ${
              isPositiveBalance
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {formatCOP(availableBalance)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {isPositiveBalance
              ? `${formatPercent(availablePercent)} restante para ${TOTAL_DAYS_IN_MONTH - CURRENT_DAY} días`
              : `Excedido por ${formatCOP(Math.abs(availableBalance))}`}
          </p>
        </div>
      </div>

      {/* Indicador visual de progreso: porcentaje gastado vs porcentaje disponible */}
      <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm mb-2.5">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium tabular-nums">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-sm shrink-0 ${
                isPositiveBalance
                  ? 'bg-slate-800 dark:bg-slate-200'
                  : 'bg-rose-600 dark:bg-rose-500'
              }`}
              aria-hidden="true"
            />
            <span>Gastado: {formatPercent(spentPercent)}</span>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-normal">
              {formatCOP(totalSpent)}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 font-medium tabular-nums ${
              isPositiveBalance
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            <span
              className={`inline-block w-2.5 h-2.5 rounded-sm shrink-0 ${
                isPositiveBalance
                  ? 'bg-emerald-500'
                  : 'bg-rose-600 dark:bg-rose-500'
              }`}
              aria-hidden="true"
            />
            <span>
              {isPositiveBalance
                ? `Disponible: ${formatPercent(availablePercent)}`
                : 'Balance negativo'}
            </span>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
              ·
            </span>
            <span
              className={`font-normal ${
                isPositiveBalance
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCOP(availableBalance)}
            </span>
          </div>
        </div>

        <div
          role="progressbar"
          aria-label="Porcentaje gastado frente a porcentaje disponible del presupuesto mensual"
          aria-valuenow={Math.round(spentPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          className={`relative h-3.5 w-full rounded-lg overflow-hidden flex ${
            isPositiveBalance
              ? 'bg-emerald-500/20 dark:bg-emerald-500/15'
              : 'bg-rose-500/20 dark:bg-rose-500/20'
          }`}
        >
          {isPositiveBalance ? (
            <>
              <div
                style={{ width: `${clampedSpentWidth}%` }}
                className="h-full bg-slate-800 dark:bg-slate-200 transition-all duration-300"
              />
              <div
                style={{ width: `${clampedAvailableWidth}%` }}
                className="h-full bg-emerald-500 transition-all duration-300"
              />
            </>
          ) : (
            <div className="h-full w-full bg-rose-600 dark:bg-rose-500 transition-all duration-300" />
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
          <span>$0 COP</span>
          <span>50% ({formatCOP(monthlyBudget / 2)})</span>
          <span>100% ({formatCOP(monthlyBudget)})</span>
        </div>
      </div>
    </section>
  );
}
