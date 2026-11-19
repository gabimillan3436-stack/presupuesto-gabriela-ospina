export type MovementType = 'expense' | 'income';

export type ExpenseCategoryId =
  | 'alimentacion'
  | 'transporte'
  | 'servicios'
  | 'compras'
  | 'entretenimiento';

export type IncomeCategoryLabel =
  | 'Salario'
  | 'Trabajo independiente'
  | 'Negocio'
  | 'Inversiones'
  | 'Regalo'
  | 'Bonificación'
  | 'Reembolso'
  | 'Otro';

export type PaymentMethodLabel =
  | 'Efectivo'
  | 'Cuenta bancaria'
  | 'Nequi'
  | 'Daviplata'
  | 'Tarjeta'
  | 'Otro';

export const INCOME_CATEGORIES: IncomeCategoryLabel[] = [
  'Salario',
  'Trabajo independiente',
  'Negocio',
  'Inversiones',
  'Regalo',
  'Bonificación',
  'Reembolso',
  'Otro',
];

export const PAYMENT_METHODS: PaymentMethodLabel[] = [
  'Efectivo',
  'Cuenta bancaria',
  'Nequi',
  'Daviplata',
  'Tarjeta',
  'Otro',
];

export interface CategoryMeta {
  id: ExpenseCategoryId;
  label: string;
  shortLabel: string;
  barClass: string;
  iconBg: string;
  iconText: string;
}

export interface MovementRecord {
  id: string;
  type: MovementType;
  day: number;
  isoDate: string;
  dateLabel: string;
  shortDate: string;
  weekday: string;
  timeLabel: string;
  concept: string;
  categoryId?: ExpenseCategoryId;
  categoryLabel: string;
  paymentMethod?: PaymentMethodLabel;
  amount: number;
  notes?: string;
  createdAt: number;
}

export type ExpenseRecord = MovementRecord;

export interface DailyPoint {
  day: number;
  shortLabel: string;
  fullDate: string;
  amount: number;
  cumulative: number;
  isRecorded: boolean;
  expenses: MovementRecord[];
  primaryExpense: MovementRecord | null;
}

export interface CategorySummary {
  meta: CategoryMeta;
  total: number;
  percentageOfSpent: number;
  count: number;
}

export const CATEGORIES: Record<ExpenseCategoryId, CategoryMeta> = {
  alimentacion: {
    id: 'alimentacion',
    label: 'Alimentación',
    shortLabel: 'Alimentación',
    barClass: 'bg-teal-700 dark:bg-teal-400',
    iconBg: 'bg-teal-50 dark:bg-teal-950/80',
    iconText: 'text-teal-700 dark:text-teal-300',
  },
  transporte: {
    id: 'transporte',
    label: 'Transporte',
    shortLabel: 'Transporte',
    barClass: 'bg-sky-600 dark:bg-sky-400',
    iconBg: 'bg-sky-50 dark:bg-sky-950/80',
    iconText: 'text-sky-700 dark:text-sky-300',
  },
  servicios: {
    id: 'servicios',
    label: 'Servicios públicos',
    shortLabel: 'Servicios',
    barClass: 'bg-amber-600 dark:bg-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-950/80',
    iconText: 'text-amber-700 dark:text-amber-300',
  },
  compras: {
    id: 'compras',
    label: 'Ropa y compras personales',
    shortLabel: 'Compras',
    barClass: 'bg-slate-600 dark:bg-slate-300',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconText: 'text-slate-700 dark:text-slate-200',
  },
  entretenimiento: {
    id: 'entretenimiento',
    label: 'Entretenimiento y ocio',
    shortLabel: 'Ocio',
    barClass: 'bg-rose-600 dark:bg-rose-400',
    iconBg: 'bg-rose-50 dark:bg-rose-950/80',
    iconText: 'text-rose-700 dark:text-rose-300',
  },
};

export const MONTHLY_BUDGET_COP = 3_200_000;
export const CURRENT_DAY = 18;
export const CURRENT_ISO_DATE = '2026-11-18';
export const TOTAL_DAYS_IN_MONTH = 30;
export const MONTH_LABEL = 'Noviembre 2026';

const WEEKDAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_SHORT_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export function getWeekdayForNovDay(day: number): string {
  return WEEKDAYS_ES[(day - 1) % 7];
}

export function formatIsoDateParts(isoDate: string): {
  day: number;
  dateLabel: string;
  shortDate: string;
  weekday: string;
} {
  const [yStr, mStr, dStr] = isoDate.split('-');
  const year = Number(yStr) || 2026;
  const month = Number(mStr) || 11;
  const day = Number(dStr) || CURRENT_DAY;
  const dateObj = new Date(year, month - 1, day);
  const weekday = WEEKDAYS_ES[dateObj.getDay()] ?? 'Mié';
  const monthShort = MONTHS_SHORT_ES[month - 1] ?? 'nov';
  return {
    day,
    dateLabel: `${day} ${monthShort} ${year}`,
    shortDate: `${day} ${monthShort}`,
    weekday,
  };
}

export const INITIAL_EXPENSES: MovementRecord[] = [
  {
    id: 'exp-01',
    type: 'expense',
    day: 1,
    isoDate: '2026-11-01',
    dateLabel: '1 nov 2026',
    shortDate: '1 nov',
    weekday: 'Dom',
    timeLabel: '1:30 p. m.',
    concept: 'Almuerzo familiar de domingo',
    categoryId: 'alimentacion',
    categoryLabel: 'Alimentación',
    amount: 68_000,
    notes: 'Restaurante tradicional cerca de casa.',
    createdAt: 1,
  },
  {
    id: 'exp-02',
    type: 'expense',
    day: 2,
    isoDate: '2026-11-02',
    dateLabel: '2 nov 2026',
    shortDate: '2 nov',
    weekday: 'Lun',
    timeLabel: '7:45 a. m.',
    concept: 'Pasajes transporte público',
    categoryId: 'transporte',
    categoryLabel: 'Transporte',
    amount: 12_500,
    createdAt: 2,
  },
  {
    id: 'exp-03',
    type: 'expense',
    day: 3,
    isoDate: '2026-11-03',
    dateLabel: '3 nov 2026',
    shortDate: '3 nov',
    weekday: 'Mar',
    timeLabel: '5:20 p. m.',
    concept: 'Mercado semanal en plaza',
    categoryId: 'alimentacion',
    categoryLabel: 'Alimentación',
    amount: 145_000,
    notes: 'Frutas, verduras, granos y proteínas.',
    createdAt: 3,
  },
  {
    id: 'exp-04',
    type: 'expense',
    day: 4,
    isoDate: '2026-11-04',
    dateLabel: '4 nov 2026',
    shortDate: '4 nov',
    weekday: 'Mié',
    timeLabel: '12:50 p. m.',
    concept: 'Almuerzo ejecutivo',
    categoryId: 'alimentacion',
    categoryLabel: 'Alimentación',
    amount: 24_000,
    createdAt: 4,
  },
  {
    id: 'exp-05',
    type: 'expense',
    day: 5,
    isoDate: '2026-11-05',
    dateLabel: '5 nov 2026',
    shortDate: '5 nov',
    weekday: 'Jue',
    timeLabel: '9:15 a. m.',
    concept: 'Factura de energía eléctrica',
    categoryId: 'servicios',
    categoryLabel: 'Servicios públicos',
    amount: 186_000,
    notes: 'Pago mensual correspondiente al periodo de octubre.',
    createdAt: 5,
  },
  {
    id: 'exp-06',
    type: 'expense',
    day: 6,
    isoDate: '2026-11-06',
    dateLabel: '6 nov 2026',
    shortDate: '6 nov',
    weekday: 'Vie',
    timeLabel: '7:40 p. m.',
    concept: 'Boletas de cine y crispetas',
    categoryId: 'entretenimiento',
    categoryLabel: 'Entretenimiento y ocio',
    amount: 78_000,
    createdAt: 6,
  },
  {
    id: 'exp-07',
    type: 'expense',
    day: 7,
    isoDate: '2026-11-07',
    dateLabel: '7 nov 2026',
    shortDate: '7 nov',
    weekday: 'Sáb',
    timeLabel: '3:10 p. m.',
    concept: 'Camisa casual de algodón',
    categoryId: 'compras',
    categoryLabel: 'Ropa y compras personales',
    amount: 158_000,
    createdAt: 7,
  },
  {
    id: 'exp-08',
    type: 'expense',
    day: 8,
    isoDate: '2026-11-08',
    dateLabel: '8 nov 2026',
    shortDate: '8 nov',
    weekday: 'Dom',
    timeLabel: '8:05 p. m.',
    concept: 'Cena a domicilio',
    categoryId: 'alimentacion',
    categoryLabel: 'Alimentación',
    amount: 42_500,
    createdAt: 8,
  },
  {
    id: 'exp-09',
    type: 'expense',
    day: 9,
    isoDate: '2026-11-09',
    dateLabel: '9 nov 2026',
    shortDate: '9 nov',
    weekday: 'Lun',
    timeLabel: '8:10 a. m.',
    concept: 'Recarga de pasajes y trayecto',
    categoryId: 'transporte',
    categoryLabel: 'Transporte',
    amount: 19_000,
    createdAt: 9,
  },
  {
    id: 'exp-10',
    type: 'expense',
    day: 10,
    isoDate: '2026-11-10',
    dateLabel: '10 nov 2026',
    shortDate: '10 nov',
    weekday: 'Mar',
    timeLabel: '10:00 a. m.',
    concept: 'Servicio de internet hogar',
    categoryId: 'servicios',
    categoryLabel: 'Servicios públicos',
    amount: 115_000,
    notes: 'Plan fibra óptica mensual.',
    createdAt: 10,
  },
  {
    id: 'exp-11',
    type: 'expense',
    day: 11,
    isoDate: '2026-11-11',
    dateLabel: '11 nov 2026',
    shortDate: '11 nov',
    weekday: 'Mié',
    timeLabel: '1:15 p. m.',
    concept: 'Panadería y almuerzo del día',
    categoryId: 'alimentacion',
    categoryLabel: 'Alimentación',
    amount: 31_500,
    createdAt: 11,
  },
  {
    id: 'exp-12',
    type: 'expense',
    day: 12,
    isoDate: '2026-11-12',
    dateLabel: '12 nov 2026',
    shortDate: '12 nov',
    weekday: 'Jue',
    timeLabel: '6:30 p. m.',
    concept: 'Artículos de cuidado personal',
    categoryId: 'compras',
    categoryLabel: 'Ropa y compras personales',
    amount: 76_000,
    createdAt: 12,
  },
  {
    id: 'exp-13',
    type: 'expense',
    day: 13,
    isoDate: '2026-11-13',
    dateLabel: '13 nov 2026',
    shortDate: '13 nov',
    weekday: 'Vie',
    timeLabel: '5:45 p. m.',
    concept: 'Compra quincenal de víveres',
    categoryId: 'alimentacion',
    categoryLabel: 'Alimentación',
    amount: 162_000,
    notes: 'Despensa y productos básicos del hogar.',
    createdAt: 13,
  },
  {
    id: 'exp-14',
    type: 'expense',
    day: 14,
    isoDate: '2026-11-14',
    dateLabel: '14 nov 2026',
    shortDate: '14 nov',
    weekday: 'Sáb',
    timeLabel: '4:20 p. m.',
    concept: 'Camiseta y básicos de vestuario',
    categoryId: 'compras',
    categoryLabel: 'Ropa y compras personales',
    amount: 125_000,
    notes: 'Compra en tienda local.',
    createdAt: 14,
  },
  {
    id: 'exp-15',
    type: 'expense',
    day: 15,
    isoDate: '2026-11-15',
    dateLabel: '15 nov 2026',
    shortDate: '15 nov',
    weekday: 'Dom',
    timeLabel: '6:50 p. m.',
    concept: 'Cine y cena de domingo',
    categoryId: 'entretenimiento',
    categoryLabel: 'Entretenimiento y ocio',
    amount: 86_000,
    notes: 'Dos entradas y comida rápida después de la función.',
    createdAt: 15,
  },
  {
    id: 'exp-16',
    type: 'expense',
    day: 16,
    isoDate: '2026-11-16',
    dateLabel: '16 nov 2026',
    shortDate: '16 nov',
    weekday: 'Lun',
    timeLabel: '7:35 a. m.',
    concept: 'Pasajes de transporte diario',
    categoryId: 'transporte',
    categoryLabel: 'Transporte',
    amount: 14_500,
    createdAt: 16,
  },
  {
    id: 'exp-17',
    type: 'expense',
    day: 17,
    isoDate: '2026-11-17',
    dateLabel: '17 nov 2026',
    shortDate: '17 nov',
    weekday: 'Mar',
    timeLabel: '11:05 a. m.',
    concept: 'Factura de gas natural',
    categoryId: 'servicios',
    categoryLabel: 'Servicios públicos',
    amount: 64_000,
    notes: 'Recibo mensual de servicio domiciliario.',
    createdAt: 17,
  },
  {
    id: 'exp-18',
    type: 'expense',
    day: 18,
    isoDate: '2026-11-18',
    dateLabel: '18 nov 2026',
    shortDate: '18 nov',
    weekday: 'Mié',
    timeLabel: '8:55 a. m.',
    concept: 'Almuerzo y café de la tarde',
    categoryId: 'alimentacion',
    categoryLabel: 'Alimentación',
    amount: 38_500,
    notes: 'Menú del día y café filtrado.',
    createdAt: 18,
  },
];

export function formatCOP(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}$${formatted} COP`;
}

export function formatCOPNoSuffix(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}$${formatted}`;
}

export function formatCompactCOP(amount: number): string {
  if (amount === 0) return '$0';
  if (amount >= 1_000_000) {
    const millions = (amount / 1_000_000).toFixed(1).replace('.', ',');
    return `$${millions}M`;
  }
  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000)}k`;
  }
  return `$${amount}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export function formatMovementDateDisplay(movement: MovementRecord): string {
  if (movement.isoDate === CURRENT_ISO_DATE) {
    return 'Hoy';
  }
  return movement.dateLabel;
}

export function getDashboardMetrics(
  movements: MovementRecord[],
  baseMonthlyBudget: number = MONTHLY_BUDGET_COP
) {
  const expenses = movements.filter((m) => m.type === 'expense');
  const incomes = movements.filter((m) => m.type === 'income');

  const totalIncome = incomes.reduce((acc, item) => acc + item.amount, 0);
  const effectiveBudget = baseMonthlyBudget + totalIncome;
  const totalSpent = expenses.reduce((acc, item) => acc + item.amount, 0);
  const availableBalance = effectiveBudget - totalSpent;

  const spentPercent =
    effectiveBudget > 0
      ? (totalSpent / effectiveBudget) * 100
      : totalSpent > 0
        ? 100
        : 0;
  const availablePercent = Math.max(0, 100 - spentPercent);

  const novExpenseDays = expenses
    .filter((e) => e.isoDate.startsWith('2026-11-'))
    .map((e) => e.day);
  const maxRecordedDay = Math.max(CURRENT_DAY, ...novExpenseDays);
  const dailyAverage = totalSpent / maxRecordedDay;
  const monthProgressPercent = (CURRENT_DAY / TOTAL_DAYS_IN_MONTH) * 100;

  const expensesByDay = new Map<number, MovementRecord[]>();
  for (const expense of expenses) {
    if (!expense.isoDate.startsWith('2026-11-')) continue;
    const list = expensesByDay.get(expense.day) ?? [];
    list.push(expense);
    expensesByDay.set(expense.day, list);
  }

  let runningTotal = 0;
  const dailySeries: DailyPoint[] = [];
  for (let day = 1; day <= TOTAL_DAYS_IN_MONTH; day++) {
    const dayExpenses = expensesByDay.get(day) ?? [];
    const isRecorded = day <= maxRecordedDay;
    const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    if (isRecorded) {
      runningTotal += dayTotal;
    }
    const weekday = getWeekdayForNovDay(day);
    const primaryExpense =
      dayExpenses.length > 0
        ? [...dayExpenses].sort((a, b) => b.createdAt - a.createdAt)[0]
        : null;

    dailySeries.push({
      day,
      shortLabel: `${day}`,
      fullDate: `${weekday} ${day} nov 2026`,
      amount: dayTotal,
      cumulative: runningTotal,
      isRecorded,
      expenses: dayExpenses,
      primaryExpense,
    });
  }

  const sortedMovements = [...movements].sort((a, b) => {
    if (b.isoDate !== a.isoDate) {
      return b.isoDate.localeCompare(a.isoDate);
    }
    return b.createdAt - a.createdAt;
  });

  const recentFive = sortedMovements.slice(0, 5);

  const highestDayPoint = [...dailySeries]
    .filter((d) => d.isRecorded && d.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0];

  const highestDay = highestDayPoint
    ? {
        shortDate: `${highestDayPoint.day} nov`,
        amount: highestDayPoint.amount,
      }
    : { shortDate: '18 nov', amount: 0 };

  const categoryTotals = new Map<
    ExpenseCategoryId,
    { total: number; count: number }
  >();
  for (const key of Object.keys(CATEGORIES) as ExpenseCategoryId[]) {
    categoryTotals.set(key, { total: 0, count: 0 });
  }
  for (const exp of expenses) {
    if (!exp.categoryId) continue;
    const prev = categoryTotals.get(exp.categoryId);
    if (!prev) continue;
    categoryTotals.set(exp.categoryId, {
      total: prev.total + exp.amount,
      count: prev.count + 1,
    });
  }

  const categoryBreakdown: CategorySummary[] = (
    Object.keys(CATEGORIES) as ExpenseCategoryId[]
  )
    .map((id) => {
      const stats = categoryTotals.get(id)!;
      return {
        meta: CATEGORIES[id],
        total: stats.total,
        count: stats.count,
        percentageOfSpent: totalSpent > 0 ? (stats.total / totalSpent) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    baseMonthlyBudget,
    totalIncome,
    monthlyBudget: effectiveBudget,
    totalSpent,
    availableBalance,
    spentPercent,
    availablePercent,
    dailyAverage,
    monthProgressPercent,
    dailySeries,
    sortedMovements,
    recentFive,
    highestDay,
    categoryBreakdown,
    maxRecordedDay,
  };
}
