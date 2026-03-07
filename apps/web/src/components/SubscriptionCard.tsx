import { Pencil, Trash2, RefreshCw } from 'lucide-react';
import { Subscription, FrecuenciaSuscripcion } from '@/hooks/useSubscriptions';

const FRECUENCIA_LABELS: Record<FrecuenciaSuscripcion, string> = {
  SEMANAL: 'Semanal',
  QUINCENAL: 'Quincenal',
  MENSUAL: 'Mensual',
  TRIMESTRAL: 'Trimestral',
  ANUAL: 'Anual',
};

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function isExpired(sub: Subscription): boolean {
  if (!sub.fecha_fin) return false;
  return new Date() > new Date(sub.fecha_fin);
}

interface SubscriptionCardProps {
  subscription: Subscription;
  onPay: (sub: Subscription) => void;
  onEdit: (sub: Subscription) => void;
  onDelete: (sub: Subscription) => void;
}

export default function SubscriptionCard({
  subscription: sub,
  onPay,
  onEdit,
  onDelete,
}: SubscriptionCardProps) {
  const monto = parseFloat(sub.monto.toString());
  const days = daysUntil(sub.proxima_fecha_pago);
  const expired = isExpired(sub);
  const canPay = sub.activo && !expired;

  let daysColor = 'text-positive';
  if (days <= 0) daysColor = 'text-negative';
  else if (days <= 7) daysColor = 'text-negative';
  else if (days <= 14) daysColor = 'text-warning';

  let daysLabel = `en ${days} días`;
  if (days === 0) daysLabel = 'hoy';
  else if (days === 1) daysLabel = 'mañana';
  else if (days < 0) daysLabel = `hace ${Math.abs(days)} días`;

  return (
    <div
      className={`rounded-xl border border-border bg-white p-4 shadow-sm ${
        !sub.activo || expired ? 'opacity-60' : ''
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary">
            <RefreshCw className="h-3 w-3" />
            {FRECUENCIA_LABELS[sub.frecuencia]}
          </span>
          {!sub.activo && (
            <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
              Pausada
            </span>
          )}
          {expired && (
            <span className="rounded-full border border-text-secondary/30 bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary">
              Finalizada
            </span>
          )}
          {sub.categoria && (
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-text-secondary">
              {sub.categoria}
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => onEdit(sub)}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(sub)}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-negative/10 hover:text-negative"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Name + Amount */}
      <p className="mb-0.5 truncate font-semibold text-text-primary">{sub.nombre}</p>
      <p className="mb-3 text-2xl font-bold tabular-nums text-text-primary">
        {sub.moneda}{' '}
        {monto.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
      </p>

      {/* Next payment */}
      {canPay && (
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            Próximo: <span className="font-medium text-text-primary">{formatShortDate(sub.proxima_fecha_pago)}</span>
          </span>
          <span className={`font-medium ${daysColor}`}>{daysLabel}</span>
        </div>
      )}

      {/* Account */}
      <p className="mb-4 text-xs text-text-secondary">{sub.cuenta.nombre}</p>

      {/* Pay button */}
      {canPay && (
        <button
          onClick={() => onPay(sub)}
          className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Registrar pago
        </button>
      )}
    </div>
  );
}
