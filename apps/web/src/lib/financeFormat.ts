export function parseAmount(amount: string | number | null | undefined): number {
  if (amount == null) return 0;
  return typeof amount === 'string' ? parseFloat(amount) : amount;
}

export function formatAmount(amount: string | number, options?: { signed?: boolean }): string {
  const num = parseAmount(amount);
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));

  if (!options?.signed) return formatted;
  if (num < 0) return `-${formatted}`;
  if (num > 0) return `+${formatted}`;
  return formatted;
}

export function formatMoney(moneda: string, amount: string | number, options?: { signed?: boolean }): string {
  return `${moneda} ${formatAmount(amount, options)}`;
}

export function daysUntil(date: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function formatShortDate(date: string): string {
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
}

export function dueLabel(date: string): string {
  const days = daysUntil(date);
  if (days < 0) return `Venció hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days} días`;
}

export function dueTone(date: string): 'danger' | 'warning' | 'neutral' {
  const days = daysUntil(date);
  if (days < 0) return 'danger';
  if (days <= 7) return 'warning';
  return 'neutral';
}
