import { ArrowRight, ChevronRight } from 'lucide-react';
import {
  CategorySummary,
  ExpenseCategoryId,
  MovementRecord,
  formatCOP,
  formatMovementDateDisplay,
  formatPercent,
} from '../data/budgetData';
import { CategoryIcon } from './CategoryIcon';

interface RecentMovementsProps {
  recentFive: MovementRecord[];
  totalCount: number;
  categoryBreakdown: CategorySummary[];
  selectedCategory: ExpenseCategoryId | null;
  onSelectCategory: (categoryId: ExpenseCategoryId | null) => void;
  onOpenMovementDetail: (movement: MovementRecord) => void;
  onOpenAllMovements: () => void;
}

export function RecentMovements({
  recentFive,
  totalCount,
  categoryBreakdown,
  selectedCategory,
  onSelectCategory,
  onOpenMovementDetail,
  onOpenAllMovements,
}: RecentMovementsProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Últimos 5 movimientos */}
      <section
        aria-labelledby="ultimos-movimientos-titulo"
        className="bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-7 transition-colors duration-200"
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2
              id="ultimos-movimientos-titulo"
              className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50"
            >
              Últimos movimientos
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              5 más recientes de {totalCount} en el mes
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAllMovements}
            className="inline-flex items-center gap-1 -mr-2 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {recentFive.map((movement) => {
            const isIncome = movement.type === 'income';
            const dateDisplay = formatMovementDateDisplay(movement);
            return (
              <li key={movement.id}>
                <button
                  type="button"
                  onClick={() => onOpenMovementDetail(movement)}
                  className="w-full py-3.5 -mx-2 px-2 rounded-xl flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <CategoryIcon
                      type={movement.type}
                      categoryId={movement.categoryId}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
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
                            <span className="tabular-nums">{dateDisplay}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-display text-sm font-semibold tabular-nums whitespace-nowrap ${
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
      </section>

      {/* Resumen por categoría */}
      <section
        aria-labelledby="gastos-categoria-titulo"
        className="bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-7 transition-colors duration-200"
      >
        <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2
            id="gastos-categoria-titulo"
            className="font-display text-base font-semibold text-slate-900 dark:text-slate-50"
          >
            Distribución por categoría
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
            Toca para resaltar
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {categoryBreakdown.map(({ meta, total, percentageOfSpent }) => {
            const isSelected = selectedCategory === meta.id;
            return (
              <button
                key={meta.id}
                type="button"
                onClick={() =>
                  onSelectCategory(isSelected ? null : meta.id)
                }
                aria-pressed={isSelected}
                className={`w-full text-left rounded-xl p-2 -mx-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 ${
                  isSelected
                    ? 'bg-slate-100/90 dark:bg-slate-800/80'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {meta.label}
                  </span>
                  <div className="flex items-center gap-2 shrink-0 tabular-nums">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatPercent(percentageOfSpent)}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-50">
                      {formatCOP(total)}
                    </span>
                  </div>
                </div>

                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${percentageOfSpent}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${meta.barClass}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
