import {
  Bus,
  Clapperboard,
  Lightbulb,
  ShoppingBag,
  Utensils,
} from 'lucide-react';
import { CATEGORIES, ExpenseCategoryId, MovementType } from '../data/budgetData';

interface CategoryIconProps {
  type?: MovementType;
  categoryId?: ExpenseCategoryId;
  className?: string;
}

export function CategoryIcon({
  type = 'expense',
  categoryId = 'alimentacion',
  className = 'w-4 h-4',
}: CategoryIconProps) {
  if (type === 'income') {
    return (
      <span
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-lg leading-none"
        aria-hidden="true"
      >
        💰
      </span>
    );
  }

  const meta = CATEGORIES[categoryId];

  const renderIcon = () => {
    switch (categoryId) {
      case 'alimentacion':
        return <Utensils className={className} strokeWidth={1.85} aria-hidden="true" />;
      case 'transporte':
        return <Bus className={className} strokeWidth={1.85} aria-hidden="true" />;
      case 'servicios':
        return <Lightbulb className={className} strokeWidth={1.85} aria-hidden="true" />;
      case 'compras':
        return <ShoppingBag className={className} strokeWidth={1.85} aria-hidden="true" />;
      case 'entretenimiento':
        return <Clapperboard className={className} strokeWidth={1.85} aria-hidden="true" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${meta.iconBg} ${meta.iconText}`}
    >
      {renderIcon()}
    </span>
  );
}
