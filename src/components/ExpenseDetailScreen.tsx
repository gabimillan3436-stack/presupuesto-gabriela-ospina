import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Hash,
  Landmark,
  Pencil,
  PieChart,
} from 'lucide-react';
import {
  MovementRecord,
  formatCOP,
  formatPercent,
} from '../data/budgetData';
import { CategoryIcon } from './CategoryIcon';

interface ExpenseDetailScreenProps {
  expense: MovementRecord | null;
  monthlyBudget: number;
  totalSpent: number;
  onBack: () => void;
}

export function ExpenseDetailScreen({
  expense: movement,
  monthlyBudget,
  totalSpent,
  onBack,
}: ExpenseDetailScreenProps) {
  // Versión vacía de Detalle: texto suave, sin botón
  if (!movement) {
    return (
      <div className="max-w-2xl mx-auto">
        <section className="bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 rounded-2xl px-6 py-16 sm:py-20 text-center transition-colors duration-200">
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Selecciona un gasto en Movimientos para ver el detalle
          </p>
        </section>
      </div>
    );
  }

  const isIncome = movement.type === 'income';
  const shareOfBudget =
    monthlyBudget > 0 ? (movement.amount / monthlyBudget) * 100 : 0;
  const shareOfSpent =
    totalSpent > 0 ? (movement.amount / totalSpent) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Barra superior de acciones: Volver y Editar (sin funcionalidad) */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-sm font-medium bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Volver</span>
        </button>

        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Edición no disponible en esta vista"
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 text-slate-400 dark:text-slate-500 cursor-not-allowed whitespace-nowrap shrink-0"
        >
          <Pencil className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Editar</span>
        </button>
      </div>

      {/* Tarjeta principal con todos los datos del movimiento */}
      <article className="bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 transition-colors duration-200">
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-4 min-w-0">
            <CategoryIcon
              type={movement.type}
              categoryId={movement.categoryId}
              className="w-5 h-5"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isIncome ? 'Detalle del ingreso' : 'Detalle del gasto'} ·{' '}
                {movement.categoryLabel}
              </p>
              <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
                {movement.concept}
              </h2>
            </div>
          </div>
        </div>

        {/* Monto destacado */}
        <div className="py-6 border-b border-slate-100 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {isIncome ? 'Valor del ingreso recibido' : 'Monto registrado'}
          </p>
          <p
            className={`mt-1.5 font-display text-3xl sm:text-4xl font-bold tracking-tight tabular-nums ${
              isIncome
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-900 dark:text-slate-50'
            }`}
          >
            {isIncome
              ? `+${formatCOP(movement.amount)}`
              : formatCOP(movement.amount)}
          </p>
        </div>

        {/* Ficha completa de atributos */}
        <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          <div className="py-4 flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
              <Calendar className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Fecha</span>
            </dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100 tabular-nums text-right">
              {movement.weekday} {movement.dateLabel}
            </dd>
          </div>

          <div className="py-4 flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Hora de registro</span>
            </dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100 tabular-nums text-right">
              {movement.timeLabel}
            </dd>
          </div>

          {isIncome && movement.paymentMethod && (
            <div className="py-4 flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                <Landmark className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Medio de pago</span>
              </dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100 text-right">
                {movement.paymentMethod}
              </dd>
            </div>
          )}

          <div className="py-4 flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
              <PieChart className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {isIncome
                  ? 'Aporte al presupuesto'
                  : 'Impacto en el presupuesto'}
              </span>
            </dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100 tabular-nums text-right">
              {isIncome
                ? `${formatPercent(shareOfBudget)} del presupuesto disponible`
                : `${formatPercent(shareOfBudget)} del presupuesto · ${formatPercent(shareOfSpent)} de lo gastado`}
            </dd>
          </div>

          <div className="py-4 flex items-start justify-between gap-4">
            <dt className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 shrink-0">
              <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Observaciones</span>
            </dt>
            <dd className="text-slate-700 dark:text-slate-300 text-right max-w-sm">
              {movement.notes && movement.notes.trim().length > 0
                ? movement.notes
                : 'Sin observaciones adicionales registradas.'}
            </dd>
          </div>

          <div className="py-4 flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
              <Hash className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Referencia</span>
            </dt>
            <dd className="font-mono text-xs text-slate-500 dark:text-slate-400 text-right">
              {movement.id}
            </dd>
          </div>
        </dl>
      </article>
    </div>
  );
}
