import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  ExpenseCategoryId,
  MovementRecord,
  PaymentMethodLabel,
} from '../data/budgetData';
import { db, handleFirestoreError, OperationType } from '../firebase';

export const MAX_DISPLAY_NAME_LEN = 80;
export const MAX_CONCEPT_LEN = 160;
export const MAX_NOTES_LEN = 500;
export const MAX_BUDGET_COP = 1_000_000_000_000;

export interface UserProfileData {
  uid: string;
  displayName: string;
  monthlyBudget: number;
  onboardingCompleted: boolean;
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  return cleaned || `mov-${Date.now()}`;
}

function clampString(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function subscribeToUserProfile(
  uid: string,
  onData: (profile: UserProfileData | null) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const profilePath = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const data = snapshot.data();
      onData({
        uid: String(data.uid ?? uid),
        displayName: String(data.displayName ?? 'Usuario'),
        monthlyBudget:
          typeof data.monthlyBudget === 'number' &&
          Number.isFinite(data.monthlyBudget)
            ? data.monthlyBudget
            : 0,
        onboardingCompleted: Boolean(data.onboardingCompleted),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, profilePath);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export function subscribeToUserMovements(
  uid: string,
  onData: (movements: MovementRecord[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const movementsPath = `users/${uid}/movements`;
  const q = query(
    collection(db, 'users', uid, 'movements'),
    where('uid', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MovementRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id ?? docSnap.id),
          type: d.type === 'income' ? 'income' : 'expense',
          day: typeof d.day === 'number' ? d.day : 1,
          isoDate: String(d.isoDate ?? '2026-11-18'),
          dateLabel: String(d.dateLabel ?? ''),
          shortDate: String(d.shortDate ?? ''),
          weekday: String(d.weekday ?? ''),
          timeLabel: String(d.timeLabel ?? ''),
          concept: String(d.concept ?? ''),
          categoryId: d.categoryId
            ? (String(d.categoryId) as ExpenseCategoryId)
            : undefined,
          categoryLabel: String(d.categoryLabel ?? 'Alimentación'),
          paymentMethod: d.paymentMethod
            ? (String(d.paymentMethod) as PaymentMethodLabel)
            : undefined,
          amount: typeof d.amount === 'number' ? d.amount : 0,
          notes: typeof d.notes === 'string' ? d.notes : undefined,
          createdAt:
            typeof d.clientCreatedAt === 'number'
              ? d.clientCreatedAt
              : Date.now(),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, movementsPath);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export async function saveInitialUserProfile(
  uid: string,
  displayName: string,
  monthlyBudget: number
): Promise<void> {
  const profilePath = `users/${uid}`;
  const cleanName = clampString(displayName, MAX_DISPLAY_NAME_LEN) || 'Usuario';
  const cleanBudget = Math.max(
    0,
    Math.min(MAX_BUDGET_COP, Math.round(monthlyBudget))
  );

  try {
    await setDoc(doc(db, 'users', uid), {
      uid: sanitizeId(uid),
      displayName: cleanName,
      monthlyBudget: cleanBudget,
      onboardingCompleted: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, profilePath);
  }
}

export async function updateUserMonthlyBudget(
  uid: string,
  monthlyBudget: number,
  fallbackDisplayName: string
): Promise<void> {
  const profilePath = `users/${uid}`;
  const cleanBudget = Math.max(
    0,
    Math.min(MAX_BUDGET_COP, Math.round(monthlyBudget))
  );

  try {
    await updateDoc(doc(db, 'users', uid), {
      monthlyBudget: cleanBudget,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // Si por alguna razón aún no existía el documento, lo inicializamos de forma segura
    if (error instanceof Error && error.message.includes('No document to update')) {
      await saveInitialUserProfile(uid, fallbackDisplayName, cleanBudget);
      return;
    }
    handleFirestoreError(error, OperationType.UPDATE, profilePath);
  }
}

export async function updateUserDisplayName(
  uid: string,
  displayName: string
): Promise<void> {
  const profilePath = `users/${uid}`;
  const cleanName = clampString(displayName, MAX_DISPLAY_NAME_LEN);
  if (!cleanName) return;

  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: cleanName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, profilePath);
  }
}

export async function saveUserMovement(
  uid: string,
  movement: MovementRecord
): Promise<void> {
  const safeId = sanitizeId(movement.id);
  const movementPath = `users/${uid}/movements/${safeId}`;
  const safeAmount = Math.max(
    1,
    Math.min(MAX_BUDGET_COP, Math.round(movement.amount))
  );
  const safeDay = Math.max(1, Math.min(31, Math.round(movement.day)));
  const safeIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(movement.isoDate)
    ? movement.isoDate
    : '2026-11-18';

  const payload: Record<string, unknown> = {
    id: safeId,
    uid: sanitizeId(uid),
    type: movement.type === 'income' ? 'income' : 'expense',
    day: safeDay,
    isoDate: safeIsoDate,
    dateLabel: clampString(movement.dateLabel || safeIsoDate, 32),
    shortDate: clampString(movement.shortDate || safeIsoDate.slice(5), 16),
    weekday: clampString(movement.weekday || 'Hoy', 12),
    timeLabel: clampString(movement.timeLabel || '12:00 p. m.', 24),
    concept: clampString(movement.concept || 'Movimiento', MAX_CONCEPT_LEN),
    categoryLabel: clampString(movement.categoryLabel || 'Alimentación', 64),
    amount: safeAmount,
    clientCreatedAt:
      typeof movement.createdAt === 'number' && movement.createdAt >= 0
        ? movement.createdAt
        : Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (movement.categoryId) {
    payload.categoryId = clampString(movement.categoryId, 32);
  }
  if (movement.paymentMethod) {
    payload.paymentMethod = clampString(movement.paymentMethod, 32);
  }
  if (movement.notes && movement.notes.trim().length > 0) {
    payload.notes = clampString(movement.notes, MAX_NOTES_LEN);
  }

  try {
    await setDoc(doc(db, 'users', uid, 'movements', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, movementPath);
  }
}
