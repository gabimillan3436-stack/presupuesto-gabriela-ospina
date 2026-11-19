import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEvent, useMemo, useState } from 'react';
import {
  CURRENT_ISO_DATE,
  INCOME_CATEGORIES,
  IncomeCategoryLabel,
  MovementRecord,
  PAYMENT_METHODS,
  PaymentMethodLabel,
  formatCOP,
  formatIsoDateParts,
} from '../data/budgetData';

interface RegisterIncomeScreenProps {
  availableBalance: number;
  onSaveIncome: (income: MovementRecord) => void;
  onCancel: () => void;
}

interface ValidationErrors {
  amount?: string;
  concept?: string;
  category?: string;
  isoDate?: string;
  paymentMethod?: string;
}

export function RegisterIncomeScreen({
  availableBalance,
  onSaveIncome,
  onCancel,
}: RegisterIncomeScreenProps) {
  const [amountInput, setAmountInput] = useState<string>('');
  const [concept, setConcept] = useState<string>('');
  const [category, setCategory] = useState<IncomeCategoryLabel>('Salario');
  const [isoDate, setIsoDate] = useState<string>(CURRENT_ISO_DATE);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodLabel>('Cuenta bancaria');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const parsedAmount = useMemo(() => {
    const digitsOnly = amountInput.replace(/\D/g, '');
    if (!digitsOnly) return 0;
    return Number(digitsOnly);
  }, [amountInput]);

  const projectedBalance = availableBalance + parsedAmount;

  const handleAmountChange = (raw: string) => {
    if (raw.includes('-')) {
      setErrors((prev) => ({
        ...prev,
        amount: 'No se permiten valores negativos en el ingreso.',
      }));
      return;
    }
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      setAmountInput('');
      if (hasSubmitted) {
        setErrors((prev) => ({
          ...prev,
          amount: 'Ingresa un valor mayor a $0 COP.',
        }));
      }
      return;
    }
    const num = Number(digitsOnly);
    if (num > 999_999_999) return;
    setAmountInput(num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    setErrors((prev) => ({ ...prev, amount: undefined }));
  };

  const validate = (): ValidationErrors => {
    const next: ValidationErrors = {};

    if (!amountInput.trim() || parsedAmount <= 0 || Number.isNaN(parsedAmount)) {
      next.amount = 'El valor del ingreso debe ser mayor que $0 COP.';
    }

    if (concept.trim().length < 2) {
      next.concept = 'Escribe una descripción para identificar el ingreso.';
    }

    if (!category) {
      next.category = 'Selecciona una categoría.';
    }

    if (!isoDate) {
      next.isoDate = 'Selecciona la fecha del ingreso.';
    }

    if (!paymentMethod) {
      next.paymentMethod = 'Selecciona un medio de pago.';
    }

    return next;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setHasSubmitted(true);
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    const { day, dateLabel, shortDate, weekday } = formatIsoDateParts(isoDate);
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'p. m.' : 'a. m.';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;

    const newIncome: MovementRecord = {
      id: `inc-${Date.now().toString().slice(-6)}`,
      type: 'income',
      day,
      isoDate,
      dateLabel,
      shortDate,
      weekday,
      timeLabel: `${displayHour}:${minutes} ${period}`,
      concept: concept.trim(),
      categoryLabel: category,
      paymentMethod,
      amount: parsedAmount,
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
    };

    window.setTimeout(() => {
      onSaveIncome(newIncome);
    }, 380);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3DF5]"
          aria-label="Volver al Dashboard"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </button>

        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Registrar Nuevo Ingreso
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Registra el dinero recibido en el mes para aumentar tu presupuesto disponible.
          </p>
        </div>
      </div>

      {/* Formulario principal */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6 transition-colors duration-200"
      >
        {/* Valor del ingreso (obligatorio) */}
        <div>
          <label
            htmlFor="income-amount"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            💰 Valor del ingreso <span className="text-rose-500">*</span>
          </label>

          <div
            className={`mt-2 flex items-center rounded-xl border px-4 py-3 bg-slate-50/70 dark:bg-slate-900/70 transition-colors focus-within:ring-2 ${
              errors.amount
                ? 'border-rose-500 focus-within:ring-rose-500/30'
                : 'border-slate-200 dark:border-slate-700 focus-within:border-[#5B3DF5] focus-within:ring-[#5B3DF5]/25'
            }`}
          >
            <span className="font-display text-2xl font-semibold text-slate-400 dark:text-slate-500 mr-2 select-none">
              $
            </span>
            <input
              id="income-amount"
              type="text"
              inputMode="numeric"
              autoFocus
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="850.000"
              aria-required="true"
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? 'income-amount-error' : undefined}
              className="w-full bg-transparent font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 placeholder:text-slate-300 dark:placeholder:text-slate-600 tabular-nums focus:outline-none"
            />
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-2 shrink-0 select-none">
              COP
            </span>
          </div>

          {parsedAmount > 0 && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Formato colombiano:{' '}
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                +{formatCOP(parsedAmount)}
              </span>
            </p>
          )}

          {errors.amount && (
            <p
              id="income-amount-error"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{errors.amount}</span>
            </p>
          )}
        </div>

        {/* Descripción */}
        <div>
          <label
            htmlFor="income-concept"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            📝 Descripción <span className="text-rose-500">*</span>
          </label>
          <input
            id="income-concept"
            type="text"
            maxLength={90}
            value={concept}
            onChange={(e) => {
              setConcept(e.target.value);
              if (hasSubmitted) {
                setErrors((prev) => ({ ...prev, concept: undefined }));
              }
            }}
            placeholder="Ej. Salario, Freelance, Venta de computador, Bonificación, Reembolso"
            aria-required="true"
            aria-invalid={Boolean(errors.concept)}
            aria-describedby={errors.concept ? 'income-concept-error' : undefined}
            className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-sm bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
              errors.concept
                ? 'border-rose-500 focus:ring-rose-500/30'
                : 'border-slate-200 dark:border-slate-700 focus:border-[#5B3DF5] focus:ring-[#5B3DF5]/25'
            }`}
          />
          {errors.concept && (
            <p
              id="income-concept-error"
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{errors.concept}</span>
            </p>
          )}
        </div>

        {/* Categoría y Fecha del ingreso */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="income-category"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              📂 Categoría <span className="text-rose-500">*</span>
            </label>
            <select
              id="income-category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as IncomeCategoryLabel)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:border-[#5B3DF5] focus:ring-[#5B3DF5]/25"
            >
              {INCOME_CATEGORIES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                {errors.category}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="income-date"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              📅 Fecha del ingreso <span className="text-rose-500">*</span>
            </label>
            <input
              id="income-date"
              type="date"
              value={isoDate}
              onChange={(e) => {
                setIsoDate(e.target.value);
                if (hasSubmitted) {
                  setErrors((prev) => ({ ...prev, isoDate: undefined }));
                }
              }}
              aria-required="true"
              aria-invalid={Boolean(errors.isoDate)}
              className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-sm bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-slate-50 tabular-nums focus:outline-none focus:ring-2 ${
                errors.isoDate
                  ? 'border-rose-500 focus:ring-rose-500/30'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#5B3DF5] focus:ring-[#5B3DF5]/25'
              }`}
            />
            {errors.isoDate && (
              <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                {errors.isoDate}
              </p>
            )}
          </div>
        </div>

        {/* Medio de pago */}
        <div>
          <label
            htmlFor="income-payment-method"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            🏦 Medio de pago <span className="text-rose-500">*</span>
          </label>
          <select
            id="income-payment-method"
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value as PaymentMethodLabel)
            }
            className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:border-[#5B3DF5] focus:ring-[#5B3DF5]/25"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          {errors.paymentMethod && (
            <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
              {errors.paymentMethod}
            </p>
          )}
        </div>

        {/* Observaciones */}
        <div>
          <label
            htmlFor="income-notes"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            📝 Observaciones{' '}
            <span className="font-normal text-slate-400 dark:text-slate-500">
              (opcional)
            </span>
          </label>
          <textarea
            id="income-notes"
            rows={3}
            maxLength={240}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalles adicionales del ingreso recibido..."
            className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-sm bg-slate-50/70 dark:bg-slate-900/70 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-[#5B3DF5] focus:ring-[#5B3DF5]/25 resize-y"
          />
        </div>

        {/* Vista previa del impacto en saldo disponible */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 px-4 py-3.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="text-slate-600 dark:text-slate-300">
            Nuevo saldo disponible estimado:
          </span>
          <span className="font-display font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formatCOP(projectedBalance)}
          </span>
        </div>

        {/* Botones de acción */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancelar
          </button>

          <motion.button
            type="submit"
            disabled={isSaving}
            whileHover={{ scale: isSaving ? 1 : 1.01 }}
            whileTap={{ scale: isSaving ? 1 : 0.99 }}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-[#5B3DF5] hover:bg-[#4B2FE0] text-white shadow-sm transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3DF5] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111927] disabled:opacity-90"
          >
            {isSaving ? (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Guardando ingreso...</span>
              </>
            ) : (
              <span>Guardar ingreso</span>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
