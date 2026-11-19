import { useMemo, useState } from 'react';
import {
  CATEGORIES,
  CURRENT_DAY,
  DailyPoint,
  ExpenseCategoryId,
  formatCOP,
  formatCompactCOP,
} from '../data/budgetData';

interface DailyExpenseChartProps {
  dailySeries: DailyPoint[];
  monthlyBudget: number;
  dailyAverage: number;
  maxRecordedDay: number;
  highestDay: { shortDate: string; amount: number };
  selectedCategory: ExpenseCategoryId | null;
  onClearCategory: () => void;
}

type ChartMode = 'daily' | 'cumulative';

export function DailyExpenseChart({
  dailySeries,
  monthlyBudget,
  dailyAverage,
  maxRecordedDay,
  highestDay,
  selectedCategory,
  onClearCategory,
}: DailyExpenseChartProps) {
  const [mode, setMode] = useState<ChartMode>('daily');
  const [activeDay, setActiveDay] = useState<number>(CURRENT_DAY);

  const recordedPoints = useMemo(
    () => dailySeries.filter((d) => d.isRecorded),
    [dailySeries]
  );

  const activePoint = useMemo(
    () =>
      dailySeries.find((d) => d.day === activeDay) ??
      recordedPoints[recordedPoints.length - 1],
    [dailySeries, activeDay, recordedPoints]
  );

  const maxDailyAxis = useMemo(() => {
    const peak = Math.max(0, ...recordedPoints.map((d) => d.amount));
    if (peak <= 200_000) return 200_000;
    return Math.ceil(peak / 50_000) * 50_000;
  }, [recordedPoints]);

  const dailyTicks = useMemo(() => {
    const step = maxDailyAxis / 4;
    return [
      maxDailyAxis,
      Math.round(step * 3),
      Math.round(step * 2),
      Math.round(step),
      0,
    ];
  }, [maxDailyAxis]);

  const maxCumulativeAxis = useMemo(() => {
    const peak = recordedPoints[recordedPoints.length - 1]?.cumulative ?? 0;
    return Math.max(monthlyBudget, Math.ceil(peak / 400_000) * 400_000);
  }, [recordedPoints, monthlyBudget]);

  const cumulativeTicks = useMemo(() => {
    const step = maxCumulativeAxis / 4;
    return [
      maxCumulativeAxis,
      Math.round(step * 3),
      Math.round(step * 2),
      Math.round(step),
      0,
    ];
  }, [maxCumulativeAxis]);

  const activeExpenseCategory = activePoint?.primaryExpense?.categoryId
    ? CATEGORIES[activePoint.primaryExpense.categoryId]
    : null;

  // Coordenadas SVG para la vista acumulada (viewBox 640 x 220)
  const svgWidth = 640;
  const svgHeight = 220;
  const padX = 12;
  const padY = 14;
  const plotW = svgWidth - padX * 2;
  const plotH = svgHeight - padY * 2;

  const cumulativeCoords = useMemo(() => {
    return recordedPoints.map((pt, idx) => {
      const x = padX + (idx / Math.max(1, dailySeries.length - 1)) * plotW;
      const y =
        padY +
        plotH -
        (Math.min(pt.cumulative, maxCumulativeAxis) / maxCumulativeAxis) *
          plotH;
      return { ...pt, x, y };
    });
  }, [recordedPoints, dailySeries.length, maxCumulativeAxis, plotW, plotH]);

  const linePath = useMemo(() => {
    if (cumulativeCoords.length === 0) return '';
    return cumulativeCoords
      .map(
        (c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`
      )
      .join(' ');
  }, [cumulativeCoords]);

  const areaPath = useMemo(() => {
    if (cumulativeCoords.length === 0) return '';
    const first = cumulativeCoords[0];
    const last = cumulativeCoords[cumulativeCoords.length - 1];
    const baseY = padY + plotH;
    return `${linePath} L ${last.x.toFixed(1)} ${baseY} L ${first.x.toFixed(1)} ${baseY} Z`;
  }, [linePath, cumulativeCoords, plotH]);

  const averageLineBottomPct = Math.min(
    96,
    (dailyAverage / maxDailyAxis) * 100
  );

  const activeConceptSummary = useMemo(() => {
    if (!activePoint || activePoint.expenses.length === 0) {
      return 'Día sin gastos registrados';
    }
    if (activePoint.expenses.length === 1) {
      return activePoint.expenses[0].concept;
    }
    return `${activePoint.expenses.length} gastos (${activePoint.primaryExpense?.concept})`;
  }, [activePoint]);

  return (
    <section
      aria-labelledby="grafico-gastos-titulo"
      className="bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-colors duration-200"
    >
      <div>
        {/* Cabecera y selector de vista */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div>
            <h2
              id="grafico-gastos-titulo"
              className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50"
            >
              Gastos diarios del mes
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Comportamiento del 1 al {maxRecordedDay} de noviembre ·{' '}
              {recordedPoints.length} días registrados
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Modo de visualización del gráfico"
            className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl self-start sm:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'daily'}
              onClick={() => setMode('daily')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 ${
                mode === 'daily'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Por día
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'cumulative'}
              onClick={() => setMode('cumulative')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 ${
                mode === 'cumulative'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Acumulado
            </button>
          </div>
        </div>

        {/* Lectura del día seleccionado */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 py-3 px-4 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {activePoint?.fullDate}
              </span>
              {activeExpenseCategory && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{activeExpenseCategory.label}</span>
                </>
              )}
            </div>
            <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
              {activeConceptSummary}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {mode === 'daily' ? 'Gasto del día' : 'Acumulado al día'}
            </p>
            <p className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 tabular-nums">
              {mode === 'daily'
                ? formatCOP(activePoint?.amount ?? 0)
                : formatCOP(activePoint?.cumulative ?? 0)}
            </p>
          </div>
        </div>

        {/* Filtro activo por categoría */}
        {selectedCategory && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 px-1">
            <span>
              Resaltando días de:{' '}
              <strong className="font-semibold text-slate-900 dark:text-slate-50">
                {CATEGORIES[selectedCategory].label}
              </strong>
            </span>
            <button
              type="button"
              onClick={onClearCategory}
              className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline whitespace-nowrap shrink-0"
            >
              Ver todos los días
            </button>
          </div>
        )}

        {/* Área principal del gráfico */}
        <div className="mt-6">
          {mode === 'daily' ? (
            <div className="flex gap-3">
              {/* Eje Y */}
              <div className="flex flex-col justify-between h-52 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums text-right select-none shrink-0 w-11">
                {dailyTicks.map((tick) => (
                  <span key={tick} className="leading-none">
                    {formatCompactCOP(tick)}
                  </span>
                ))}
              </div>

              {/* Lienzo de barras */}
              <div className="relative flex-1 min-w-0">
                <div className="relative h-52">
                  {/* Líneas guía horizontales */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {dailyTicks.map((tick) => (
                      <div
                        key={tick}
                        className="w-full border-b border-dashed border-slate-100 dark:border-slate-800/90"
                      />
                    ))}
                  </div>

                  {/* Línea de promedio diario */}
                  <div
                    style={{ bottom: `${averageLineBottomPct}%` }}
                    className="absolute left-0 right-0 border-t border-dashed border-emerald-500/70 dark:border-emerald-400/70 pointer-events-none z-10"
                  >
                    <span className="absolute right-0 -top-4 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-white/95 dark:bg-[#111927]/95 px-1 tabular-nums">
                      Prom. {formatCompactCOP(dailyAverage)}
                    </span>
                  </div>

                  {/* Columnas por día (1 al 30) */}
                  <div className="relative z-20 h-full flex items-end gap-[3px] sm:gap-1.5">
                    {dailySeries.map((pt) => {
                      const heightPct = pt.isRecorded
                        ? pt.amount > 0
                          ? Math.max(4, (pt.amount / maxDailyAxis) * 100)
                          : 2
                        : 0;
                      const isActive = pt.day === activeDay;
                      const matchesCategory =
                        !selectedCategory ||
                        pt.expenses.some(
                          (e) => e.categoryId === selectedCategory
                        );

                      return (
                        <button
                          key={pt.day}
                          type="button"
                          disabled={!pt.isRecorded}
                          onMouseEnter={() => pt.isRecorded && setActiveDay(pt.day)}
                          onFocus={() => pt.isRecorded && setActiveDay(pt.day)}
                          onClick={() => pt.isRecorded && setActiveDay(pt.day)}
                          aria-label={
                            pt.isRecorded
                              ? `Día ${pt.day} de noviembre: ${formatCOP(pt.amount)}`
                              : `Día ${pt.day} de noviembre: sin registros`
                          }
                          className={`group relative flex-1 h-full flex flex-col justify-end items-center focus:outline-none ${
                            pt.isRecorded ? 'cursor-pointer' : 'cursor-default'
                          }`}
                        >
                          {pt.isRecorded ? (
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full rounded-t-md transition-colors duration-150 ${
                                isActive
                                  ? 'bg-emerald-600 dark:bg-emerald-400'
                                  : matchesCategory
                                    ? 'bg-slate-800 dark:bg-slate-200 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-400'
                                    : 'bg-slate-200 dark:bg-slate-800 group-hover:bg-slate-400 dark:group-hover:bg-slate-600'
                              }`}
                            />
                          ) : (
                            <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Eje X: Días del mes */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 tabular-nums pt-2.5">
                  <span>1 nov</span>
                  <span>5</span>
                  <span>10</span>
                  <span>15</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {CURRENT_DAY}
                  </span>
                  <span>25</span>
                  <span>30 nov</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              {/* Eje Y acumulado */}
              <div className="flex flex-col justify-between h-52 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums text-right select-none shrink-0 w-11">
                {cumulativeTicks.map((tick) => (
                  <span key={tick} className="leading-none">
                    {formatCompactCOP(tick)}
                  </span>
                ))}
              </div>

              {/* Gráfico SVG de línea acumulada */}
              <div className="relative flex-1 min-w-0">
                <div className="relative h-52">
                  {/* Líneas guía */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {cumulativeTicks.map((tick, idx) => (
                      <div
                        key={tick}
                        className={`w-full border-b ${
                          idx === 0
                            ? 'border-slate-300 dark:border-slate-700 border-dashed'
                            : 'border-slate-100 dark:border-slate-800/90 border-dashed'
                        }`}
                      />
                    ))}
                  </div>

                  <span className="absolute right-0 top-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 tabular-nums z-10">
                    Presupuesto: {formatCOP(monthlyBudget)}
                  </span>

                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible text-emerald-600 dark:text-emerald-400"
                    role="img"
                    aria-label="Gráfico de gasto acumulado durante el mes"
                  >
                    <defs>
                      <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>

                    <path d={areaPath} fill="url(#cumulativeFill)" />
                    <path
                      d={linePath}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  {/* Puntos interactivos */}
                  <div className="absolute inset-0">
                    {cumulativeCoords.map((pt) => {
                      const isActive = pt.day === activeDay;
                      const leftPct = (pt.x / svgWidth) * 100;
                      const topPct = (pt.y / svgHeight) * 100;
                      return (
                        <button
                          key={pt.day}
                          type="button"
                          onMouseEnter={() => setActiveDay(pt.day)}
                          onFocus={() => setActiveDay(pt.day)}
                          onClick={() => setActiveDay(pt.day)}
                          aria-label={`Día ${pt.day} de noviembre, acumulado: ${formatCOP(pt.cumulative)}`}
                          style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center focus:outline-none cursor-pointer"
                        >
                          <span
                            className={`rounded-full border-2 border-emerald-600 dark:border-emerald-400 transition-transform duration-150 ${
                              isActive
                                ? 'w-3 h-3 bg-emerald-600 dark:bg-emerald-400 scale-110'
                                : 'w-2 h-2 bg-white dark:bg-[#111927] hover:scale-125'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Eje X */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 tabular-nums pt-2.5">
                  <span>1 nov</span>
                  <span>5</span>
                  <span>10</span>
                  <span>15</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {CURRENT_DAY}
                  </span>
                  <span>25</span>
                  <span>30 nov</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pie estadístico factual del gráfico */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="tabular-nums">
          Promedio diario:{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {formatCOP(dailyAverage)}
          </span>
        </div>
        <div className="tabular-nums">
          Día de mayor gasto:{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {highestDay.shortDate} ({formatCOP(highestDay.amount)})
          </span>
        </div>
      </div>
    </section>
  );
}
