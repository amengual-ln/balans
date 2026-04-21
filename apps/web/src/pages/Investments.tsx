import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useInversiones, Inversion, TickerPosition } from '@/hooks/useInversiones'
import { useAccounts } from '@/hooks/useAccounts'
import { useSWRConfig } from 'swr'
import TickerPositionCard from '@/components/TickerPositionCard'
import InversionForm, { InversionFormData } from '@/components/InversionForm'
import RetornoInversionModal from '@/components/RetornoInversionModal'
import PrecioMercadoModal from '@/components/PrecioMercadoModal'
import { apiPost, apiPut, apiDelete } from '@/hooks/useAPI'

// ─── Toast ─────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`rounded-lg px-4 py-3 shadow-lg ${
        type === 'success' ? 'bg-positive text-white' : 'bg-negative text-white'
      }`}
    >
      {message}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 h-4 w-24 rounded-full bg-gray-200" />
      <div className="mb-2 h-5 w-32 rounded bg-gray-200" />
      <div className="mb-4 h-7 w-28 rounded bg-gray-200" />
      <div className="h-9 w-full rounded-lg bg-gray-200" />
    </div>
  )
}

// ─── Filter Pills ──────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  PLAZO_FIJO: 'Plazo Fijo',
  BONOS: 'Bonos',
  ACCIONES: 'Acciones',
  CRYPTO: 'Crypto',
  FCI: 'Fondo Común',
  OTRO: 'Otra',
}

const TIPO_OPTIONS = [
  { label: 'Todos', value: 'TODOS' },
  { label: TIPO_LABELS.PLAZO_FIJO, value: 'PLAZO_FIJO' },
  { label: TIPO_LABELS.BONOS, value: 'BONOS' },
  { label: TIPO_LABELS.ACCIONES, value: 'ACCIONES' },
  { label: TIPO_LABELS.CRYPTO, value: 'CRYPTO' },
  { label: TIPO_LABELS.FCI, value: 'FCI' },
  { label: TIPO_LABELS.OTRO, value: 'OTRO' },
]

// ─── Totals Banner ────────────────────────────────────────────────────────────

function TotalsBanner({ positions }: { positions: TickerPosition[] }) {
  const byMoneda = new Map<string, { invertido: number; valor: number; recuperado: number }>()

  for (const pos of positions) {
    const precioActual = pos.precio_mercado_actual ?? 0
    const valorMercado = precioActual && pos.cantidad_total ? precioActual * pos.cantidad_total : 0

    const key = pos.moneda
    const current = byMoneda.get(key) ?? { invertido: 0, valor: 0, recuperado: 0 }
    byMoneda.set(key, {
      invertido: current.invertido + pos.total_invertido,
      valor: current.valor + valorMercado,
      recuperado: current.recuperado + pos.total_recuperado,
    })
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
        Resumen de inversiones
      </p>
      {byMoneda.size === 0 ? (
        <p className="font-semibold text-text-primary">Sin inversiones</p>
      ) : (
        <div className="space-y-3">
          {Array.from(byMoneda.entries()).map(([moneda, { invertido, valor, recuperado }]) => {
            const total = valor + recuperado
            const pnl = total - invertido
            const pnlPercent = invertido > 0 ? (pnl / invertido) * 100 : 0

            return (
              <div key={moneda} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-secondary">{moneda}</span>
                  <span className="font-medium text-text-primary">
                    {invertido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>Valor actual + Recuperado:</span>
                  <span className={pnl >= 0 ? 'text-positive' : 'text-negative'}>
                    {total.toLocaleString('es-AR', { minimumFractionDigits: 2 })} (
                    {pnlPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

interface DeleteConfirmProps {
  lote: Inversion
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}

function DeleteConfirm({ lote, onConfirm, onCancel, deleting }: DeleteConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-bold text-text-primary">Eliminar lote</h3>
        <p className="mb-6 text-sm text-text-secondary">
          ¿Eliminar <strong>Lote #{lote.lote_numero}</strong> de <strong>{lote.ticker}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg bg-surface py-2 px-4 font-medium text-text-primary transition-colors hover:bg-surface/80"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-lg bg-negative py-2 px-4 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Investments() {
  const { inversiones: positions, isLoading, mutate } = useInversiones()
  const { accounts } = useAccounts()
  const { mutate: globalMutate } = useSWRConfig()

  const [tipoFilter, setTipoFilter] = useState<string>('TODOS')
  const [showForm, setShowForm] = useState(false)
  const [editLote, setEditLote] = useState<Inversion | null>(null)
  const [retornoLote, setRetornoLote] = useState<Inversion | null>(null)
  const [precioTicker, setPrecioTicker] = useState<TickerPosition | null>(null)
  const [deleteLote, setDeleteLote] = useState<Inversion | null>(null)
  const [addLoteTicker, setAddLoteTicker] = useState<TickerPosition | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const filteredPositions =
    tipoFilter === 'TODOS' ? positions : positions.filter((p) => p.tipo === tipoFilter)

  const availableTipos = new Set(positions.map((p) => p.tipo))
  const visibleTipoOptions = TIPO_OPTIONS.filter(
    (opt) => opt.value === 'TODOS' || availableTipos.has(opt.value as any)
  )

  const handleCreate = async (data: InversionFormData) => {
    setSubmitting(true)
    try {
      await apiPost('/api/inversiones', {
        ...data,
        fecha_inicio: new Date(data.fecha_inicio).toISOString(),
      })
      mutate()
      globalMutate(
        (key) =>
          typeof key === 'string' &&
          (key.startsWith('/api/cuentas') || key.startsWith('/api/movements'))
      )
      setShowForm(false)
      setToast({ message: 'Inversión creada exitosamente', type: 'success' })
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Error al crear inversión',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (data: InversionFormData) => {
    if (!editLote) return
    setSubmitting(true)
    try {
      await apiPut(`/api/inversiones/${editLote.id}`, {
        nombre: data.nombre,
        ticker: data.ticker,
        tipo: data.tipo,
        sector: data.sector,
        tipo_liquidez: data.tipo_liquidez,
        cantidad: data.cantidad,
        precio_por_unidad: data.precio_por_unidad,
      })
      mutate()
      setEditLote(null)
      setToast({ message: 'Inversión actualizada', type: 'success' })
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Error al actualizar inversión',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteLote) return
    setDeleting(true)
    try {
      await apiDelete(`/api/inversiones/${deleteLote.id}`)
      mutate()
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/cuentas'))
      setDeleteLote(null)
      setToast({ message: 'Lote eliminado', type: 'success' })
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Error al eliminar lote',
        type: 'error',
      })
      setDeleteLote(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleRetornoSuccess = () => {
    mutate()
    globalMutate(
      (key) =>
        typeof key === 'string' &&
        (key.startsWith('/api/movements') || key.startsWith('/api/cuentas'))
    )
    setRetornoLote(null)
    setToast({ message: 'Retorno registrado exitosamente', type: 'success' })
  }

  const handlePrecioSuccess = () => {
    mutate()
    globalMutate((key) => typeof key === 'string' && key.startsWith('/api/inversiones'))
    setPrecioTicker(null)
    setToast({ message: 'Precio registrado exitosamente', type: 'success' })
  }

  const handleAddLote = (pos: TickerPosition) => {
    setAddLoteTicker(pos)
    setShowForm(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pb-24">
        <div className="mx-auto max-w-2xl px-4 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-2xl px-4 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Inversiones</h1>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-5 w-5" />
            Nueva inversión
          </button>
        </div>

        {/* Totals */}
        <TotalsBanner positions={filteredPositions} />

        {/* Filter Pills */}
        {visibleTipoOptions.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {visibleTipoOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTipoFilter(option.value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  tipoFilter === option.value
                    ? 'bg-primary text-white'
                    : 'border border-border bg-surface text-text-secondary hover:bg-surface/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {filteredPositions.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-sm text-text-secondary">
              {positions.length === 0
                ? 'No hay inversiones registradas'
                : 'No hay inversiones con este tipo'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredPositions.map((pos) => (
              <TickerPositionCard
                key={pos.ticker}
                position={pos}
                onAddLote={handleAddLote}
                onEditLote={(lote) => setEditLote(lote)}
                onDeleteLote={(lote) => setDeleteLote(lote)}
                onRetorno={(lote) => setRetornoLote(lote)}
                onPrecio={(position) => setPrecioTicker(position)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Forms & Modals */}
      {showForm && !editLote && !addLoteTicker && (
        <InversionForm
          accounts={accounts}
          inversion={null}
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
          submitting={submitting}
        />
      )}
      {showForm && addLoteTicker && (
        <InversionForm
          accounts={accounts}
          inversion={null}
          lockedTicker={addLoteTicker.ticker}
          lockedDefaults={{
            tipo: addLoteTicker.tipo,
            sector: addLoteTicker.sector,
            tipo_liquidez: addLoteTicker.tipo_liquidez,
            moneda: addLoteTicker.moneda,
            cuenta_id: addLoteTicker.lotes[0]?.cuenta_origen?.id ?? '',
          }}
          onClose={() => {
            setShowForm(false)
            setAddLoteTicker(null)
          }}
          onSubmit={handleCreate}
          submitting={submitting}
        />
      )}
      {editLote && (
        <InversionForm
          accounts={accounts}
          inversion={editLote}
          onClose={() => setEditLote(null)}
          onSubmit={handleUpdate}
          submitting={submitting}
        />
      )}
      {retornoLote && (
        <RetornoInversionModal
          inversion={retornoLote}
          accounts={accounts}
          onClose={() => setRetornoLote(null)}
          onSuccess={handleRetornoSuccess}
        />
      )}
      {precioTicker && (
        <PrecioMercadoModal
          inversion={{
            id: precioTicker.most_recent_lote_id,
            ticker: precioTicker.ticker,
            moneda: precioTicker.moneda,
            precio_mercado_actual: precioTicker.precio_mercado_actual,
          }}
          onClose={() => setPrecioTicker(null)}
          onSuccess={handlePrecioSuccess}
        />
      )}
      {deleteLote && (
        <DeleteConfirm
          lote={deleteLote}
          onConfirm={handleDelete}
          onCancel={() => setDeleteLote(null)}
          deleting={deleting}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 right-4 z-40">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  )
}
