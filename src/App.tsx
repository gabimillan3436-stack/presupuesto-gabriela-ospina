import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { Bot, CheckCircle2, LogOut, Moon, Plus, Sun, Wallet, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import {
  AssistantBudgetContext,
  AssistantChatMessage,
  AssistantDrawer,
  RegisteredExpensePayload,
} from './components/AssistantDrawer';
import { AuthScreen } from './components/AuthScreen';
import { BudgetOnboardingScreen } from './components/BudgetOnboardingScreen';
import { DailyExpenseChart } from './components/DailyExpenseChart';
import { ExpenseDetailScreen } from './components/ExpenseDetailScreen';
import { MonthlySummary } from './components/MonthlySummary';
import { MovementsScreen } from './components/MovementsScreen';
import { RecentMovements } from './components/RecentMovements';
import { RegisterExpenseScreen } from './components/RegisterExpenseScreen';
import { RegisterIncomeScreen } from './components/RegisterIncomeScreen';
import {
  CATEGORIES,
  CURRENT_ISO_DATE,
  ExpenseCategoryId,
  MONTHLY_BUDGET_COP,
  MONTH_LABEL,
  MovementRecord,
  formatCOP,
  formatIsoDateParts,
  getDashboardMetrics,
} from './data/budgetData';
import { auth } from './firebase';
import {
  saveInitialUserProfile,
  saveUserMovement,
  subscribeToUserMovements,
  subscribeToUserProfile,
  updateUserDisplayName,
  updateUserMonthlyBudget,
  type UserProfileData,
} from './services/budgetPersistence';

type Screen =
  | 'dashboard'
  | 'movements'
  | 'detail'
  | 'create'
  | 'create-income';

const THEME_STORAGE_KEY = 'mi-presupuesto-theme';

function getInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // Ignorar errores de almacenamiento
  }
  return false;
}

function mapCategoryToId(rawCategory: string): ExpenseCategoryId {
  const normalized = rawCategory
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    normalized.includes('transporte') ||
    normalized.includes('bus') ||
    normalized.includes('taxi') ||
    normalized.includes('uber') ||
    normalized.includes('pasaje')
  ) {
    return 'transporte';
  }
  if (
    normalized.includes('servicio') ||
    normalized.includes('luz') ||
    normalized.includes('agua') ||
    normalized.includes('gas') ||
    normalized.includes('internet')
  ) {
    return 'servicios';
  }
  if (
    normalized.includes('ropa') ||
    normalized.includes('compra') ||
    normalized.includes('personal') ||
    normalized.includes('vestuario')
  ) {
    return 'compras';
  }
  if (
    normalized.includes('entretenimiento') ||
    normalized.includes('ocio') ||
    normalized.includes('cine') ||
    normalized.includes('salida')
  ) {
    return 'entretenimiento';
  }
  return 'alimentacion';
}

const INITIAL_ASSISTANT_MESSAGES: AssistantChatMessage[] = [
  {
    id: 'msg-welcome',
    role: 'assistant',
    text: '¡Hola! Soy tu asistente financiero. Dime qué gastaste, envíame una foto de tu recibo o graba una nota de voz para registrarlo al instante.',
  },
];

export default function App() {
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);
  const [movementsLoaded, setMovementsLoaded] = useState<boolean>(false);
  const [asyncError, setAsyncError] = useState<unknown>(null);

  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [monthlyBudget, setMonthlyBudget] =
    useState<number>(MONTHLY_BUDGET_COP);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [previousScreen, setPreviousScreen] = useState<'dashboard' | 'movements'>(
    'dashboard'
  );
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategoryId | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'expense' | 'income';
    message: string;
  } | null>(null);
  const [isDark, setIsDark] = useState<boolean>(getInitialDarkMode);
  const [userName, setUserName] = useState<string>('Usuario');
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [assistantMessages, setAssistantMessages] = useState<
    AssistantChatMessage[]
  >(INITIAL_ASSISTANT_MESSAGES);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    try {
      window.localStorage.setItem(
        THEME_STORAGE_KEY,
        isDark ? 'dark' : 'light'
      );
    } catch {
      // Ignorar errores de almacenamiento
    }
  }, [isDark]);

  // Suscripción al estado de sesión de Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);

      // Reiniciar estado de la sesión anterior inmediatamente al cambiar o cerrar cuenta
      setUserProfile(null);
      setProfileLoaded(false);
      setMovements([]);
      setMovementsLoaded(false);
      setMonthlyBudget(MONTHLY_BUDGET_COP);
      setScreen('dashboard');
      setSelectedMovementId(null);
      setSelectedCategory(null);
      setStatusBanner(null);
      setIsAssistantOpen(false);
      setAssistantMessages(INITIAL_ASSISTANT_MESSAGES);

      if (user) {
        const fallbackName =
          user.displayName?.trim() ||
          user.email?.split('@')[0] ||
          'Usuario';
        setUserName(fallbackName);
      } else {
        setUserName('Usuario');
      }
    });

    return () => unsubscribe();
  }, []);

  // Suscripción al perfil privado de la cuenta en Firestore
  useEffect(() => {
    if (!authUser) return;

    setProfileLoaded(false);
    const unsubscribe = subscribeToUserProfile(
      authUser.uid,
      (profile) => {
        setUserProfile(profile);
        setProfileLoaded(true);
        if (profile) {
          setMonthlyBudget(profile.monthlyBudget);
          setUserName(profile.displayName);
        }
      },
      (err) => {
        setAsyncError(err);
      }
    );

    return () => unsubscribe();
  }, [authUser]);

  // Suscripción exclusiva a los movimientos de esta cuenta (solo tras completar configuración inicial)
  useEffect(() => {
    if (!authUser || !userProfile?.onboardingCompleted) {
      setMovements([]);
      setMovementsLoaded(false);
      return;
    }

    const unsubscribe = subscribeToUserMovements(
      authUser.uid,
      (items) => {
        setMovements(items);
        setMovementsLoaded(true);
      },
      (err) => {
        setAsyncError(err);
      }
    );

    return () => unsubscribe();
  }, [authUser, userProfile?.onboardingCompleted]);

  if (asyncError) {
    throw asyncError instanceof Error
      ? asyncError
      : new Error(String(asyncError));
  }

  const hasExpenses = useMemo(
    () => movements.some((m) => m.type === 'expense'),
    [movements]
  );

  const metrics = useMemo(
    () => getDashboardMetrics(movements, monthlyBudget),
    [movements, monthlyBudget]
  );

  const selectedMovement = useMemo(
    () => movements.find((m) => m.id === selectedMovementId) ?? null,
    [movements, selectedMovementId]
  );

  const assistantBudgetContext = useMemo<AssistantBudgetContext>(() => {
    const recentSummary = metrics.recentFive
      .map(
        (m) =>
          `${m.type === 'income' ? '+' : '-'}${formatCOP(m.amount)} (${m.concept}, ${m.categoryLabel}, ${m.dateLabel})`
      )
      .join('; ');

    return {
      userName,
      baseMonthlyBudget: metrics.baseMonthlyBudget,
      totalIncome: metrics.totalIncome,
      monthlyBudget: metrics.monthlyBudget,
      totalSpent: metrics.totalSpent,
      availableBalance: metrics.availableBalance,
      spentPercent: metrics.spentPercent,
      currentDate: CURRENT_ISO_DATE,
      recentMovementsSummary: recentSummary,
    };
  }, [metrics, userName]);

  const openDashboard = () => {
    setScreen('dashboard');
  };

  const openMovements = () => {
    setScreen('movements');
  };

  const openDetailFromNav = () => {
    setPreviousScreen('movements');
    setScreen('detail');
  };

  const openCreateExpense = () => {
    setPreviousScreen(screen === 'movements' ? 'movements' : 'dashboard');
    setScreen('create');
  };

  const openCreateIncome = () => {
    setPreviousScreen(screen === 'movements' ? 'movements' : 'dashboard');
    setScreen('create-income');
  };

  const openDetail = (
    movement: MovementRecord,
    from: 'dashboard' | 'movements'
  ) => {
    setSelectedMovementId(movement.id);
    setPreviousScreen(from);
    setScreen('detail');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      setAsyncError(err);
    }
  };

  const handleCompleteOnboarding = async (
    displayName: string,
    initialBudget: number
  ) => {
    if (!authUser) return;
    await saveInitialUserProfile(authUser.uid, displayName, initialBudget);
    setUserName(displayName);
    setMonthlyBudget(initialBudget);
  };

  const handleUpdateMonthlyBudget = (nextBudget: number) => {
    setMonthlyBudget(nextBudget);
    if (!authUser) return;
    void updateUserMonthlyBudget(authUser.uid, nextBudget, userName).catch(
      (err) => setAsyncError(err)
    );
  };

  const handleChangeUserName = (nextName: string) => {
    setUserName(nextName);
    if (!authUser) return;
    void updateUserDisplayName(authUser.uid, nextName).catch((err) =>
      setAsyncError(err)
    );
  };

  const handleSaveExpense = (newExpense: MovementRecord) => {
    setMovements((prev) => [newExpense, ...prev]);
    setStatusBanner({
      type: 'expense',
      message: `Gasto registrado: ${newExpense.concept} (${formatCOP(newExpense.amount)}) · Saldo actualizado.`,
    });
    setSelectedCategory(null);
    setScreen('dashboard');

    if (authUser) {
      void saveUserMovement(authUser.uid, newExpense).catch((err) =>
        setAsyncError(err)
      );
    }
  };

  const handleAssistantRegisterExpense = (
    payload: RegisteredExpensePayload
  ) => {
    const categoryId = mapCategoryToId(payload.category);
    const { day, dateLabel, shortDate, weekday } = formatIsoDateParts(
      payload.date
    );

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'p. m.' : 'a. m.';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;

    const newExpense: MovementRecord = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'expense',
      day,
      isoDate: payload.date,
      dateLabel,
      shortDate,
      weekday,
      timeLabel: `${displayHour}:${minutes} ${period}`,
      concept: payload.description,
      categoryId,
      categoryLabel: CATEGORIES[categoryId].label,
      amount: payload.amount,
      notes: 'Registrado mediante asistente inteligente.',
      createdAt: Date.now(),
    };

    setMovements((prev) => [newExpense, ...prev]);
    setStatusBanner({
      type: 'expense',
      message: `Gasto registrado por el asistente: ${newExpense.concept} (${formatCOP(newExpense.amount)}).`,
    });
    setSelectedCategory(null);

    if (authUser) {
      void saveUserMovement(authUser.uid, newExpense).catch((err) =>
        setAsyncError(err)
      );
    }
  };

  const handleSaveIncome = (newIncome: MovementRecord) => {
    setMovements((prev) => [newIncome, ...prev]);
    setStatusBanner({
      type: 'income',
      message: `✅ Ingreso registrado correctamente. (${newIncome.concept} · +${formatCOP(newIncome.amount)})`,
    });
    setSelectedCategory(null);
    setScreen('dashboard');

    if (authUser) {
      void saveUserMovement(authUser.uid, newIncome).catch((err) =>
        setAsyncError(err)
      );
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B111B] text-slate-900 dark:text-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 animate-pulse">
            <Wallet className="w-5 h-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Verificando tu sesión...
          </p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <AuthScreen
        isDark={isDark}
        onToggleDark={() => setIsDark((prev) => !prev)}
      />
    );
  }

  if (!profileLoaded) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B111B] text-slate-900 dark:text-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 animate-pulse">
            <Wallet className="w-5 h-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Cargando los datos de tu cuenta...
          </p>
        </div>
      </div>
    );
  }

  if (!userProfile || !userProfile.onboardingCompleted) {
    const defaultName =
      authUser.displayName?.trim() ||
      authUser.email?.split('@')[0] ||
      'Usuario';
    return (
      <BudgetOnboardingScreen
        initialName={defaultName}
        userEmail={authUser.email}
        isDark={isDark}
        onToggleDark={() => setIsDark((prev) => !prev)}
        onSignOut={handleSignOut}
        onCompleteOnboarding={handleCompleteOnboarding}
      />
    );
  }

  if (!movementsLoaded) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B111B] text-slate-900 dark:text-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 animate-pulse">
            <Wallet className="w-5 h-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Sincronizando tus movimientos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0B111B] text-slate-900 dark:text-slate-50 transition-colors duration-200">
      {/* Cabecera superior limpia con navegación, asistente y selector de modo oscuro */}
      <header className="bg-white dark:bg-[#111927] border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-6">
          <button
            type="button"
            onClick={openDashboard}
            className="font-display text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 rounded-md"
          >
            Mi Presupuesto Mensual
          </button>

          <nav
            aria-label="Navegación principal"
            className="flex items-center gap-3.5 sm:gap-6 text-xs sm:text-sm font-medium"
          >
            <button
              type="button"
              onClick={openDashboard}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 ${
                screen === 'dashboard'
                  ? 'border-emerald-600 dark:border-emerald-400 text-slate-900 dark:text-slate-50'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={openMovements}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 ${
                screen === 'movements'
                  ? 'border-emerald-600 dark:border-emerald-400 text-slate-900 dark:text-slate-50'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Movimientos
            </button>
            <button
              type="button"
              onClick={openDetailFromNav}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 ${
                screen === 'detail'
                  ? 'border-emerald-600 dark:border-emerald-400 text-slate-900 dark:text-slate-50'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Detalle
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAssistantOpen(true)}
              aria-label="Abrir asistente financiero"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold bg-[#5B3DF5]/[0.08] hover:bg-[#5B3DF5]/[0.15] dark:bg-[#5B3DF5]/15 dark:hover:bg-[#5B3DF5]/25 text-[#5B3DF5] dark:text-[#A896FF] border border-[#5B3DF5]/25 dark:border-[#5B3DF5]/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3DF5]"
            >
              <Bot className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span className="hidden sm:inline">Asistente</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-pressed={isDark}
              aria-label={
                isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
              }
              className="inline-flex items-center gap-2 px-2.5 sm:px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
            >
              {isDark ? (
                <>
                  <Sun
                    className="w-4 h-4 text-amber-400 shrink-0"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <span className="hidden md:inline">Modo claro</span>
                </>
              ) : (
                <>
                  <Moon
                    className="w-4 h-4 text-slate-600 shrink-0"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <span className="hidden md:inline">Modo oscuro</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              title={authUser.email ?? userName}
              aria-label={`Cerrar sesión (${authUser.email ?? userName})`}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 min-h-[40px] rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline max-w-[110px] truncate">
                {userName}
              </span>
              <span className="text-slate-300 dark:text-slate-600 hidden lg:inline">
                ·
              </span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal con transiciones suaves entre pantallas */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen + (selectedMovementId ?? '')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {screen === 'dashboard' && (
              <div className="space-y-5 sm:space-y-6">
                {/* Barra contextual del Dashboard */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-6">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {MONTH_LABEL}
                    </span>
                    <span
                      className="text-slate-300 dark:text-slate-600"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                    <span>Cifras en COP</span>
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={openCreateIncome}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold bg-[#5B3DF5]/[0.08] hover:bg-[#5B3DF5]/[0.14] dark:bg-[#5B3DF5]/15 dark:hover:bg-[#5B3DF5]/25 text-[#5B3DF5] dark:text-[#A896FF] border border-[#5B3DF5]/25 dark:border-[#5B3DF5]/40 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B3DF5]"
                    >
                      <Plus
                        className="w-4 h-4 shrink-0"
                        strokeWidth={2.25}
                        aria-hidden="true"
                      />
                      <span className="truncate">Registrar nuevo ingreso</span>
                    </button>

                    <button
                      type="button"
                      onClick={openCreateExpense}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 shadow-xs transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
                    >
                      <Plus
                        className="w-4 h-4 shrink-0"
                        strokeWidth={2.25}
                        aria-hidden="true"
                      />
                      <span className="truncate">Registrar nuevo gasto</span>
                    </button>
                  </div>
                </div>

                {/* Confirmación tras guardar un gasto o ingreso */}
                {statusBanner && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="status"
                    className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-xs sm:text-sm ${
                      statusBanner.type === 'income'
                        ? 'bg-[#5B3DF5]/10 dark:bg-[#5B3DF5]/20 border-[#5B3DF5]/30 text-slate-900 dark:text-slate-50'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {statusBanner.type === 'expense' && (
                        <CheckCircle2
                          className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <p className="truncate font-medium">
                        {statusBanner.message}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatusBanner(null)}
                      aria-label="Cerrar aviso"
                      className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </motion.div>
                )}

                {/* Resumen financiero del mes siempre dentro del Dashboard principal */}
                <MonthlySummary
                  baseMonthlyBudget={metrics.baseMonthlyBudget}
                  totalIncome={metrics.totalIncome}
                  monthlyBudget={metrics.monthlyBudget}
                  totalSpent={metrics.totalSpent}
                  availableBalance={metrics.availableBalance}
                  spentPercent={metrics.spentPercent}
                  availablePercent={metrics.availablePercent}
                  monthProgressPercent={metrics.monthProgressPercent}
                  onUpdateMonthlyBudget={handleUpdateMonthlyBudget}
                />

                {hasExpenses ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7">
                      <DailyExpenseChart
                        dailySeries={metrics.dailySeries}
                        monthlyBudget={metrics.monthlyBudget}
                        dailyAverage={metrics.dailyAverage}
                        maxRecordedDay={metrics.maxRecordedDay}
                        highestDay={metrics.highestDay}
                        selectedCategory={selectedCategory}
                        onClearCategory={() => setSelectedCategory(null)}
                      />
                    </div>

                    <div className="lg:col-span-5">
                      <RecentMovements
                        recentFive={metrics.recentFive}
                        totalCount={movements.length}
                        categoryBreakdown={metrics.categoryBreakdown}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                        onOpenMovementDetail={(mov) =>
                          openDetail(mov, 'dashboard')
                        }
                        onOpenAllMovements={openMovements}
                      />
                    </div>
                  </div>
                ) : (
                  /* Versión vacía integrada dentro del Dashboard principal */
                  <section
                    aria-labelledby="dashboard-vacio-titulo"
                    className="bg-white dark:bg-[#111927] border border-slate-200/90 dark:border-slate-800 rounded-2xl px-6 py-14 sm:py-16 text-center transition-colors duration-200"
                  >
                    <div className="max-w-md mx-auto flex flex-col items-center">
                      <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 mb-5">
                        <Wallet className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
                      </span>

                      <h3
                        id="dashboard-vacio-titulo"
                        className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50"
                      >
                        Aún no hay gastos este mes
                      </h3>

                      <p className="mt-2.5 text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                        Registra el primero y empieza a ver en qué se va la plata
                      </p>

                      <button
                        type="button"
                        onClick={openCreateExpense}
                        className="mt-7 inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 shadow-xs transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400"
                      >
                        <Plus
                          className="w-4 h-4 shrink-0"
                          strokeWidth={2.25}
                          aria-hidden="true"
                        />
                        <span>Registrar tu primer gasto</span>
                      </button>
                    </div>
                  </section>
                )}
              </div>
            )}

            {screen === 'movements' && (
              <MovementsScreen
                movements={metrics.sortedMovements}
                hasExpenses={hasExpenses}
                totalSpent={metrics.totalSpent}
                totalIncome={metrics.totalIncome}
                onSelectMovement={(mov) => openDetail(mov, 'movements')}
                onBackToDashboard={openDashboard}
                onOpenCreateExpense={openCreateExpense}
                onOpenCreateIncome={openCreateIncome}
              />
            )}

            {screen === 'detail' && (
              <ExpenseDetailScreen
                expense={selectedMovement}
                monthlyBudget={metrics.monthlyBudget}
                totalSpent={metrics.totalSpent}
                onBack={() => setScreen(previousScreen)}
              />
            )}

            {screen === 'create' && (
              <RegisterExpenseScreen
                availableBalance={metrics.availableBalance}
                onSaveExpense={handleSaveExpense}
                onCancel={() => setScreen(previousScreen)}
              />
            )}

            {screen === 'create-income' && (
              <RegisterIncomeScreen
                availableBalance={metrics.availableBalance}
                onSaveIncome={handleSaveIncome}
                onCancel={openDashboard}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Cajón lateral del asistente inteligente */}
      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        userName={userName}
        onChangeUserName={handleChangeUserName}
        messages={assistantMessages}
        onUpdateMessages={setAssistantMessages}
        budgetContext={assistantBudgetContext}
        onRegisterExpense={handleAssistantRegisterExpense}
      />
    </div>
  );
}
