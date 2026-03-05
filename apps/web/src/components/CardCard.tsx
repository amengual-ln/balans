import { CreditCard } from 'lucide-react';
import type { Card } from '@/hooks/useCards';

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoTarjeta = 'VISA' | 'MASTERCARD' | 'OTRA';

interface CardCardProps {
  card: Card;
  onClick: (card: Card) => void;
  onPay: (card: Card) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIPO_COLORS: Record<TipoTarjeta, string> = {
  VISA: 'bg-blue-50 text-blue-700',
  MASTERCARD: 'bg-orange-50 text-orange-700',
  OTRA: 'bg-surface text-text-secondary',
};

function formatAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));
}

function UtilizationBar({ pct }: { pct: number }) {
  const color =
    pct > 90 ? 'bg-negative' : pct > 70 ? 'bg-warning' : 'bg-positive';
  return (
    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CardCard({ card, onClick, onPay }: CardCardProps) {
  const { nombre, tipo, moneda, limite_total, limite_comprometido, limite_disponible, activa } = card;

  const total = typeof limite_total === 'string' ? parseFloat(limite_total) : limite_total;
  const disponible = limite_disponible;
  const isOverLimit = disponible < 0;
  const utilizationPct = total > 0 ? ((total - disponible) / total) * 100 : 0;
  const tipoColor = TIPO_COLORS[tipo as TipoTarjeta] ?? TIPO_COLORS.OTRA;

  return (
    <div
      className={`
        group w-full rounded-xl border bg-white p-4 shadow-sm
        transition-all duration-150
        ${activa
          ? 'border-border hover:border-primary hover:shadow-md hover:-translate-y-0.5'
          : 'border-border opacity-50'
        }
      `}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => onClick(card)}
          disabled={!activa}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tipoColor} ${activa ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        >
          <CreditCard className="h-3 w-3" />
          {tipo}
        </button>
        {!activa && (
          <span className="text-xs text-text-secondary">Inactiva</span>
        )}
      </div>

      {/* Card name */}
      <button
        onClick={() => onClick(card)}
        disabled={!activa}
        className={`mb-2 block w-full truncate text-left text-sm font-medium text-text-primary ${activa ? 'group-hover:text-primary cursor-pointer' : 'cursor-not-allowed'} transition-colors`}
      >
        {nombre}
      </button>

      {/* Available limit */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-text-secondary">{moneda}</span>
        <span
          className={`text-xl font-bold tabular-nums leading-none ${
            isOverLimit ? 'text-negative' : 'text-positive'
          }`}
        >
          {isOverLimit ? '-' : ''}{formatAmount(Math.abs(disponible))}
        </span>
        <span className="text-xs text-text-secondary">disponible</span>
      </div>

      {/* Utilization bar */}
      <UtilizationBar pct={utilizationPct} />

      {/* Comprometido */}
      <p className="mt-1.5 text-xs text-text-secondary">
        {moneda} {formatAmount(limite_comprometido)} comprometido de {formatAmount(limite_total)}
      </p>

      {/* Pay CTA */}
      {activa && (
        <button
          onClick={(e) => { e.stopPropagation(); onPay(card); }}
          className="mt-3 w-full rounded-lg border border-primary py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-white"
        >
          Pagar tarjeta
        </button>
      )}
    </div>
  );
}
