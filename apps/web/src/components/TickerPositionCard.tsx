import { useState } from 'react'
import { Pencil, Trash2, TrendingUp, BarChart3, ChevronDown, Plus } from 'lucide-react'
import { TickerPosition, Inversion, TipoLiquidez } from '@/hooks/useInversiones'

const TIPO_LABELS: Record<string, string> = {
  PLAZO_FIJO: 'Plazo Fijo',
  BONOS: 'Bonos',
  ACCIONES: 'Acciones',
  CRYPTO: 'Crypto',
  FCI: 'Fondo Común',
  OTRO: 'Otra',
}

const LIQUIDEZ_LABELS: Record<TipoLiquidez, string> = {
  INMEDIATA: 'Inmediata',
  DIAS: 'Días',
  EXTERIOR: 'Exterior',
}

interface TickerPositionCardProps {
  position: TickerPosition
  onAddLote: (pos: TickerPosition) => void
  onEditLote: (lote: Inversion) => void
  onDeleteLote: (lote: Inversion) => void
  onRetorno: (lote: Inversion) => void
  onPrecio: (pos: TickerPosition) => void
}

export default function TickerPositionCard({
  position: pos,
  onAddLote,
  onEditLote,
  onDeleteLote,
  onRetorno,
  onPrecio,
}: TickerPositionCardProps) {
  const [expanded, setExpanded] = useState(false)

  const totalInvertido = pos.total_invertido
  const totalRecuperado = pos.total_recuperado
  const precioActual = pos.precio_mercado_actual ?? null
  const cantidadTotal = pos.cantidad_total ?? 0

  let valorMercado = 0
  if (precioActual && cantidadTotal) {
    valorMercado = precioActual * cantidadTotal
  }

  const posicionActual = valorMercado + totalRecuperado
  const hasPriceData = precioActual !== null || totalRecuperado > 0
  let pnl = 0
  let pnlPercent = 0
  let isProfit = true

  if (hasPriceData) {
    pnl = posicionActual - totalInvertido
    pnlPercent = totalInvertido > 0 ? (pnl / totalInvertido) * 100 : 0
    isProfit = pnl >= 0
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      {/* Ticker Row + Pills + Add Button */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-mono text-lg font-bold text-text-primary">{pos.ticker}</p>
          <span className="inline-flex items-center gap-1 shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary">
            <TrendingUp className="h-3 w-3" />
            {TIPO_LABELS[pos.tipo]}
          </span>
          <span className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary">
            {LIQUIDEZ_LABELS[pos.tipo_liquidez]}
          </span>
          {pos.sector && (
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
              {pos.sector}
            </span>
          )}
          {pos.estado !== 'ACTIVA' && (
            <span className="shrink-0 rounded-full border border-text-secondary/30 bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary">
              {pos.estado === 'FINALIZADA' ? 'Finalizada' : 'Parcial'}
            </span>
          )}
        </div>
        <button
          onClick={() => onAddLote(pos)}
          className="shrink-0 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
          title="Agregar lote"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Amounts */}
      <div className="mb-4 space-y-1.5 text-xs">
        <div className="flex justify-between text-text-secondary">
          <span>Invertido:</span>
          <span>
            {pos.moneda} {totalInvertido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        {precioActual && (
          <div className="flex justify-between text-text-secondary">
            <span>Precio actual:</span>
            <span>
              {pos.moneda} {precioActual.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {totalRecuperado > 0 && (
          <div className="flex justify-between text-text-secondary">
            <span>Recuperado:</span>
            <span className="text-positive">
              + {pos.moneda} {totalRecuperado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {hasPriceData && (
          <div className="flex justify-between pt-1.5 text-sm font-semibold">
            <span className="text-text-primary">Posición actual:</span>
            <span className="text-text-primary">
              {pos.moneda} {posicionActual.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* P&L */}
      <div className="mb-4 flex justify-between text-lg font-bold">
        <span
          className={
            hasPriceData ? (isProfit ? 'text-positive' : 'text-negative') : 'text-text-secondary'
          }
        >
          P&L
        </span>
        {hasPriceData ? (
          <span className={`tabular-nums ${isProfit ? 'text-positive' : 'text-negative'}`}>
            {isProfit ? '+' : ''}
            {pos.moneda} {pnl.toLocaleString('es-AR', { minimumFractionDigits: 2 })} (
            {pnlPercent.toFixed(1)}%)
          </span>
        ) : (
          <span className="text-text-secondary">—</span>
        )}
      </div>

      {/* Lotes Section */}
      {pos.lotes.length > 1 && (
        <div className="mb-4 border-t border-border pt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface/80"
          >
            <span>{pos.lotes.length} lote(s)</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>

          {expanded && (
            <div className="mt-3 space-y-2">
              {pos.lotes.map((lote) => {
                const montoInv = parseFloat(lote.monto_invertido.toString())

                return (
                  <div
                    key={lote.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/50 px-3 py-2 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary">Lote #{lote.lote_numero}</p>
                      <p className="text-text-secondary">
                        {new Date(lote.fecha_inicio).toLocaleDateString('es-AR')} •{' '}
                        {montoInv.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => onRetorno(lote)}
                        className="rounded p-1 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
                        title="Retorno"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onEditLote(lote)}
                        className="rounded p-1 text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteLote(lote)}
                        className="rounded p-1 text-text-secondary transition-colors hover:bg-negative/10 hover:text-negative"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onRetorno(pos.lotes[0])}
          className="rounded-lg border border-primary bg-primary/5 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          Retorno
        </button>
        <button
          onClick={() => onPrecio(pos)}
          className="flex items-center justify-center gap-1 rounded-lg border border-border bg-surface py-2 text-xs font-medium text-text-primary transition-colors hover:bg-border"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Precio
        </button>
      </div>
    </div>
  )
}
