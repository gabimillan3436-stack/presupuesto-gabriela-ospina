import { AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import {
  CATEGORIES,
  CURRENT_DAY,
  ExpenseCategoryId,
  MovementRecord,
  TOTAL_DAYS_IN_MONTH,
  formatCOP,
  getWeekdayForNovDay,
} from '../data/budgetData';
import { CategoryIcon } from './CategoryIcon';

interface RegisterExpenseScreenProps {
  availableBalance: number;
  onSaveExpense: (expense: MovementRecord) => void;
  onCancel: () => void;
}

interface ValidationErrors {
  amount?: string;
  categoryId?: string;
  concept?: string;
  day?: string;
}

const QUICK_AMOUNTS = [5_000, 10_000, 20_000, 50_000];

export function RegisterExpenseScreen({
  availableBalance,
  onSaveExpense,
  onCancel,
}: RegisterExpenseScreenProps) {
  const [amountInput, setAmountInput] = useState<string>('');
  const [categoryId, setCategoryId] =
    useState<ExpenseCategoryId>('alimentacion');
  const [concept, setConcept] = useState<string>('');
  const [day, setDay] = useState<number>(CURRENT_DAY);
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  const parsedAmount = useMemo(() => {
    const digitsOnly = amountInput.replace(/\D/g, '');
    if (!digitsOnly) return 0;
    return Number(digitsOnly);
  }, [amountInput]);

  const projectedBalance = availableBalance - parsedAmount;
  const categories = Object.values(CATEGORIES);

  const handleAmountChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      setAmountInput('');
      return;
    }
    const num = Number(digitsOnly);
    if (num > 99_999_999) return;
    setAmountInput(num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    if (hasSubmitted) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const handleAddQuickAmount = (increment: number) => {
    const next = Math.min(99_999_999, parsedAmount + increment);
    setAmountInput(next.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    if (hasSubmitted) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const validate = (): ValidationErrors => {
    const nextErrors: ValidationErrors = {};

    if (!parsedAmount || Number.isNaN(parsedAmount) || parsedAmount < 100) {
      nextErrors.amount = 'Ingresa un monto válido de al menos $100 COP.';
    } else if (parsedAmount > 50_000_000) {
      nextErrors.amount = 'El monto ingresado supera el límite permitido.';
    }

    if (!categoryId || !CATEGORIES[categoryId]) {
      nextErrors.categoryId = 'Selecciona una categoría.';
    }

    const trimmedConcept = concept.trim();
    if (trimmedConcept.length < 2) {
      nextErrors.concept = 'Escribe una descripción breve (mínimo 2 caracteres).';
    }

    if (!Number.isInteger(day) || day < 1 || day > TOTAL_DAYS_IN_MONTH) {
      nextErrors.day = 'Selecciona un día válido de noviembre de 2026.';
    }

    return nextErrors;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'p. m.' : 'a. m.';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    const paddedDay = day.toString().padStart(2, '0');

    const newExpense: MovementRecord = {
      id: `exp-${Date.now().toString().slice(-6)}`,
      type: 'expense',
      day,
      isoDate: `2026-11-${paddedDay}`,
      dateLabel: `${day} nov 2026`,
      shortDate: `${day} nov`,
      weekday: getWeekdayForNovDay(day),
      timeLabel: `${displayHour}:${minutes} ${period}`,
      concept: concept.trim(),
      categoryId,
      categoryLabel: CATEGORIES[categoryId].label,
      amount: parsedAmount,
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
    };

    onSaveExpense(newExpense);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
          aria-label="Volver sin guardar"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </button>

        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Registrar nuevo gasto
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Ingresa el valor que acabas de pagar y guárdalo en segundos.
          </p>
        </div>
      </div>

      {/* Formulario rápido */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 transition-colors duration-200"
      >
        {/* 1. Monto */}
        <div>
          <label
            htmlFor="expense-amount"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            ¿Cuánto pagaste?
          </label>
          <div
            className={`mt-2 flex items-center rounded-xl border px-4 py-3 bg-slate-50/70 dark:bg-slate-900/70 transition-colors focus-within:ring-2 ${
              errors.amount
                ? 'border-rose-500 focus-within:ring-rose-500/40'
                : 'border-slate-200 dark:border-slate-700 focus-within:border-emerald-600 dark:focus-within:border-emerald-400 focus-within:ring-emerald-600/20'
            }`}
          >
            <span className="font-display text-2xl font-semibold text-slate-400 dark:text-slate-500 mr-2 select-none">
              $
            </span>
            <input
              id="expense-amount"
              type="text"
              inputMode="numeric"
              autoFocus
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0"
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? 'amount-error' : undefined}
              className="w-full bg-transparent font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 placeholder:text-slate-300 dark:placeholder:text-slate-600 tabular-nums focus:outline-none"
            />
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-2 shrink-0 select-none">
              COP
            </span>
          </div>

          {errors.amount && (
            <p
              id="amount-error"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{errors.amount}</span>
            </p>
          )}

          {/* Atajos de suma rápida */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleAddQuickAmount(val)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors tabular-nums cursor-pointer"
              >
                +${val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              </button>
            ))}
            {parsedAmount > 0 && (
              <button
                type="button"
                onClick={() => setAmountInput('')}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* 2. Categoría */}
        <div>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Categoría
          </span>
          <div
            role="radiogroup"
            aria-label="Categoría del gasto"
            className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          >
            {categories.map((cat) => {
              const isSelected = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 ${
                    isSelected
                      ? 'border-emerald-600 dark:border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <CategoryIcon categoryId={cat.id} />
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.categoryId && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{errors.categoryId}</span>
            </p>
          )}
        </div>

        {/* 3. Concepto y fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label
              htmlFor="expense-concept"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Descripción corta
            </label>
            <input
              id="expense-concept"
              type="text"
              maxLength={80}
              value={concept}
              onChange={(e) => {
                setConcept(e.target.value);
                if (hasSubmitted) {
                  setErrors((prev) => ({ ...prev, concept: undefined }));
                }
              }}
              placeholder="Ej. Almuerzo, pasajes, café..."
              aria-invalid={Boolean(errors.concept)}
              aria-describedby={errors.concept ? 'concept-error' : undefined}
              className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-sm bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
                errors.concept
                  ? 'border-rose-500 focus:ring-rose-500/40'
                  : 'border-slate-200 dark:border-slate-700 focus:border-emerald-600 dark:focus:border-emerald-400 focus:ring-emerald-600/20'
              }`}
            />
            {errors.concept && (
              <p
                id="concept-error"
                className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.concept}</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="expense-day"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Fecha (noviembre)
            </label>
            <select
              id="expense-day"
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:border-emerald-600 dark:focus:border-emerald-400 focus:ring-emerald-600/20 tabular-nums"
            >
              {Array.from({ length: TOTAL_DAYS_IN_MONTH }, (_, i) => i + 1).map(
                (d) => (
                  <option key={d} value={d}>
                    {d === CURRENT_DAY ? `${d} nov (Hoy)` : `${d} nov 2026`}
                  </option>
                )
              )}
            </select>
            {errors.day && (
              <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                {errors.day}
              </p>
            )}
          </div>
        </div>

        {/* 4. Nota opcional */}
        <div>
          <label
            htmlFor="expense-notes"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Nota adicional{' '}
            <span className="font-normal text-slate-400 dark:text-slate-500">
              (opcional)
            </span>
          </label>
          <input
            id="expense-notes"
            type="text"
            maxLength={140}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalle extra si deseas recordarlo después"
            className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-emerald-600 dark:focus:border-emerald-400 focus:ring-emerald-600/20"
          />
        </div>

        {/* Vista previa del impacto en saldo disponible */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 px-4 py-3.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="text-slate-600 dark:text-slate-300">
            Saldo disponible tras este gasto:
          </span>
          <span
            className={`font-display font-bold tabular-nums ${
              projectedBalance < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {formatCOP(projectedBalance)}
          </span>
        </div>

        {/* Acciones del formulario */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
          >
            <Check className="w-4 h-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            <span>Guardar gasto</span>
          </button>
        </div>
      </form>
    </div>
  );
}
