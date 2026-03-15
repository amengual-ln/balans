import { Pencil, Trash2, TrendingUp, BarChart3 } from 'lucide-react';
import { Inversion, TipoLiquidez } from '@/hooks/useInversiones';

const TIPO_LABELS: Record<string, string> = {
  PLAZO_FIJO: 'Plazo Fijo',
  BONOS: 'Bonos',
  ACCIONES: 'Acciones',
  CRYPTO: 'Crypto',
  OTRO: 'Otra',
};

const LIQUIDEZ_LABELS: Record<TipoLiquidez, string> = {
  INMEDIATA: 'Inmediata',
  DIAS: 'Días',
  EXTERIOR: 'Exterior',
};

interface InversionCardProps {
  inversion: Inversion;
  onEdit: (inv: Inversion) => void;
  onDelete: (inv: Inversion) => void;
  onRetorno: (inv: Inversion) => void;
  onPrecio: (inv: Inversion) => void;
}

export default function InversionCard({
  inversion: inv,
  onEdit,
  onDelete,
  onRetorno,
  onPrecio,
}: InversionCardProps) {
  const montoInvertido = parseFloat(inv.monto_invertido.toString());
  const montoRecuperado = parseFloat(inv.monto_recuperado.toString());
  const precioActual = inv.precio_mercado_actual ?? null;

  let valorMercado = 0;
  if (precioActual && inv.cantidad) {
    valorMercado = precioActual * parseFloat(inv.cantidad.toString());
  }

  // Only calculate P&L if we have a market price or some recovery
  const hasPriceData = precioActual !== null || montoRecuperado > 0;
  let pnl = 0;
  let pnlPercent = 0;
  let isProfit = true;

  if (hasPriceData) {
    pnl = montoRecuperado + valorMercado - montoInvertido;
    pnlPercent = montoInvertido > 0 ? (pnl / montoInvertido) * 100 : 0;
    isProfit = pnl >= 0;
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary">
            <TrendingUp className="h-3 w-3" />
            {TIPO_LABELS[inv.tipo]}
          </span>
          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary">
            {LIQUIDEZ_LABELS[inv.tipo_liquidez]}
          </span>
          {inv.sector && (
            <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
              {inv.sector}
            </span>
          )}
          {inv.estado !== 'ACTIVA' && (
            <span className="rounded-full border border-text-secondary/30 bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary">
              {inv.estado === 'FINALIZADA' ? 'Finalizada' : 'Parcial'}
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => onEdit(inv)}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(inv)}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-negative/10 hover:text-negative"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Ticker + Name */}
      <div className="mb-3">
        <p className="font-mono text-lg font-bold text-text-primary">{inv.ticker}</p>
        {inv.descripcion && (
          <p className="text-xs text-text-secondary">{inv.descripcion}</p>
        )}
      </div>

      {/* Amounts */}
      <div className="mb-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Invertido:</span>
          <span className="font-medium text-text-primary">
            {inv.moneda} {montoInvertido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        {precioActual && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Precio actual:</span>
            <span className="font-medium text-text-primary">
              {inv.moneda} {precioActual.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {montoRecuperado > 0 && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Recuperado:</span>
            <span className="font-medium text-positive">
              + {inv.moneda} {montoRecuperado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* P&L */}
      <div className={`mb-4 rounded-lg p-3 ${hasPriceData && isProfit ? 'bg-positive/5' : hasPriceData && !isProfit ? 'bg-negative/5' : 'bg-surface'}`}>
        <p className={`text-xs ${hasPriceData ? (isProfit ? 'text-positive' : 'text-negative') : 'text-text-secondary'}`}>P&L</p>
        {hasPriceData ? (
          <p className={`text-lg font-bold tabular-nums ${isProfit ? 'text-positive' : 'text-negative'}`}>
            {isProfit ? '+' : ''}{inv.moneda} {pnl.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            {' '}
            <span className="text-xs">({pnlPercent.toFixed(1)}%)</span>
          </p>
        ) : (
          <p className="text-lg font-bold tabular-nums text-text-secondary">
            0% <span className="text-xs">(Sin datos de precio)</span>
          </p>
        )}
      </div>

      {/* Account */}
      {inv.cuenta_origen && (
        <p className="mb-4 text-xs text-text-secondary">{inv.cuenta_origen.nombre}</p>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onRetorno(inv)}
          className="rounded-lg border border-primary bg-primary/5 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          Retorno
        </button>
        <button
          onClick={() => onPrecio(inv)}
          className="flex items-center justify-center gap-1 rounded-lg border border-border bg-surface py-2 text-xs font-medium text-text-primary transition-colors hover:bg-border"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Precio
        </button>
      </div>
    </div>
  );
}
