import { ArrowLeft, ChevronRight, Plus, ReceiptText } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CATEGORIES,
  ExpenseCategoryId,
  MONTH_LABEL,
  MovementRecord,
  formatCOP,
  formatMovementDateDisplay,
} from '../data/budgetData';
import { CategoryIcon } from './CategoryIcon';

interface MovementsScreenProps {
  movements: MovementRecord[];
  hasExpenses: boolean;
  totalSpent: number;
  totalIncome: number;
  onSelectMovement: (movement: MovementRecord) => void;
  onBackToDashboard: () => void;
  onOpenCreateExpense: () => void;
  onOpenCreateIncome: () => void;
}

type MovementFilter = 'all' | 'income' | 'expense' | ExpenseCategoryId;

export function MovementsScreen({
  movements,
  hasExpenses,
  totalSpent,
  totalIncome,
  onSelectMovement,
  onBackToDashboard,
  onOpenCreateExpense,
  onOpenCreateIncome,
}: MovementsScreenProps) {
  const [filter, setFilter] = useState<MovementFilter>('all');

  const filteredMovements = useMemo(() => {
    if (filter === 'all') return movements;
    if (filter === 'income') return movements.filter((m) => m.type === 'income');
    if (filter === 'expense') return movements.filter((m) => m.type === 'expense');
    return movements.filter(
      (m) => m.type === 'expense' && m.categoryId === filter
    );
  }, [movements, filter]);

  const filteredSummary = useMemo(() => {
    const inc = filteredMovements
      .filter((m) => m.type === 'income')
      .reduce((sum, m) => sum + m.amount, 0);
    const exp = filteredMovements
      .filter((m) => m.type === 'expense')
      .reduce((sum, m) => sum + m.amount, 0);
    return { inc, exp };
  }, [filteredMovements]);

  const categoryList = Object.values(CATEGORIES);

  // Versión vacía cuando no hay ningún gasto registrado
  if (!hasExpenses) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
            aria-label="Volver al Dashboard"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Movimientos del mes
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {MONTH_LABEL}
            </p>
          </div>
        </div>

        <section
          aria-labelledby="movimientos-vacio-titulo"
          className="bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 rounded-2xl px-6 py-16 sm:py-20 text-center transition-colors duration-200"
        >
          <div className="max-w-md mx-auto flex flex-col items-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-5">
              <ReceiptText className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
            </span>

            <h3
              id="movimientos-vacio-titulo"
              className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50"
            >
              Tus gastos van a vivir aquí
            </h3>

            <p className="mt-2.5 text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
              Cada vez que pagues algo, lo registras y aparece en esta lista
            </p>

            <button
              type="button"
              onClick={onOpenCreateExpense}
              className="mt-7 inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 shadow-xs transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
            >
              <Plus className="w-4 h-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
              <span>Registrar gasto</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera de la pantalla Movimientos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="mt-0.5 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
            aria-label="Volver al Dashboard"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Movimientos del mes
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 tabular-nums">
              {MONTH_LABEL} · {movements.length} movimientos · Gastos:{' '}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {formatCOP(totalSpent)}
              </span>
              {totalIncome > 0 && (
                <>
                  {' '}
                  · Ingresos:{' '}
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    +{formatCOP(totalIncome)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenCreateIncome}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold bg-[#5B3DF5]/[0.08] hover:bg-[#5B3DF5]/[0.14] dark:bg-[#5B3DF5]/15 dark:hover:bg-[#5B3DF5]/25 text-[#5B3DF5] dark:text-[#A896FF] border border-[#5B3DF5]/25 dark:border-[#5B3DF5]/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3DF5]"
          >
            <Plus className="w-4 h-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            <span>Registrar ingreso</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateExpense}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
          >
            <Plus className="w-4 h-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            <span>Registrar gasto</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div
        role="group"
        aria-label="Filtrar movimientos"
        className="flex flex-wrap items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
          className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 ${
            filter === 'all'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
              : 'bg-white dark:bg-[#111927] text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          Todos ({movements.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('income')}
          aria-pressed={filter === 'income'}
          className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 ${
            filter === 'income'
              ? 'bg-emerald-700 dark:bg-emerald-500 text-white dark:text-slate-950'
              : 'bg-white dark:bg-[#111927] text-emerald-700 dark:text-emerald-400 border border-slate-200/90 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
          }`}
        >
          Ingresos
        </button>

        <button
          type="button"
          onClick={() => setFilter('expense')}
          aria-pressed={filter === 'expense'}
          className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 ${
            filter === 'expense'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
              : 'bg-white dark:bg-[#111927] text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          Gastos
        </button>

        {categoryList.map((cat) => {
          const isSelected = filter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id)}
              aria-pressed={isSelected}
              className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 ${
                isSelected
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-white dark:bg-[#111927] text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {cat.shortLabel}
            </button>
          );
        })}
      </div>

      {/* Lista cronológica */}
      <section className="bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors duration-200">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Orden cronológico (más reciente primero)</span>
          <span className="tabular-nums font-medium text-slate-700 dark:text-slate-200">
            Mostrando {filteredMovements.length}
            {filteredSummary.exp > 0 && ` · Gastos: ${formatCOP(filteredSummary.exp)}`}
            {filteredSummary.inc > 0 && ` · Ingresos: +${formatCOP(filteredSummary.inc)}`}
          </span>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              No hay movimientos registrados con este filtro
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Cambia el filtro o registra un nuevo ingreso o gasto del mes.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredMovements.map((movement) => {
              const isIncome = movement.type === 'income';
              const dateDisplay = formatMovementDateDisplay(movement);
              return (
                <li key={movement.id}>
                  <button
                    type="button"
                    onClick={() => onSelectMovement(movement)}
                    className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <CategoryIcon
                        type={movement.type}
                        categoryId={movement.categoryId}
                      />
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-50 truncate">
                          {movement.concept}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                          {isIncome ? (
                            <>
                              <span className="tabular-nums">{dateDisplay}</span>
                              <span
                                className="mx-1.5 text-slate-300 dark:text-slate-600"
                                aria-hidden="true"
                              >
                                ·
                              </span>
                              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                Ingreso
                              </span>
                              <span
                                className="mx-1.5 text-slate-300 dark:text-slate-600"
                                aria-hidden="true"
                              >
                                ·
                              </span>
                              <span>{movement.categoryLabel}</span>
                              {movement.paymentMethod && (
                                <>
                                  <span
                                    className="mx-1.5 text-slate-300 dark:text-slate-600"
                                    aria-hidden="true"
                                  >
                                    ·
                                  </span>
                                  <span>{movement.paymentMethod}</span>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <span>{movement.categoryLabel}</span>
                              <span
                                className="mx-1.5 text-slate-300 dark:text-slate-600"
                                aria-hidden="true"
                              >
                                ·
                              </span>
                              <span className="tabular-nums">
                                {movement.weekday} {movement.dateLabel} ·{' '}
                                {movement.timeLabel}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`font-display text-sm sm:text-base font-semibold tabular-nums whitespace-nowrap ${
                          isIncome
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-50'
                        }`}
                      >
                        {isIncome
                          ? `+${formatCOP(movement.amount)}`
                          : formatCOP(movement.amount)}
                      </span>
                      <ChevronRight
                        className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors"
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
