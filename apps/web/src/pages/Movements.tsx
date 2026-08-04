import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import MovementsList from '@/components/MovementsList'
import QuickAdd from '@/components/QuickAdd'
import EditMovementModal from '@/components/EditMovementModal'
import { useStats, type MonthlyStats } from '@/hooks/useStats'
import { useMovements } from '@/hooks/useMovements'
import { useQuickAddMovement } from '@/hooks/useQuickAddMovement'
import type { Movement } from '@/hooks/useMovements'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function getMonthRange(year: number, month: number): { desde: Date; hasta: Date } {
  return {
    desde: new Date(year, month, 1, 0, 0, 0, 0),
    hasta: new Date(year, month + 1, 0, 23, 59, 59, 999),
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

// ─── Monthly balance card ─────────────────────────────────────────────────────

function MonthlyBalanceCard({
  stats,
  isLoading,
}: {
  stats: MonthlyStats | null
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="mb-6 animate-pulse rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="space-y-2.5">
          {[0, 1].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-20 rounded bg-gray-200" />
              <div className="h-4 w-24 rounded bg-gray-200" />
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-2.5">
            <div className="h-5 w-16 rounded bg-gray-200" />
            <div className="h-5 w-28 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="mb-6 rounded-xl border border-border bg-white p-4 shadow-sm">
        <p className="text-center text-sm text-text-secondary">Sin datos para este período</p>
      </div>
    )
  }

  const isPositive = stats.balance >= 0

  return (
    <div className="mb-6 rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-text-secondary">
          <TrendingUp className="h-3.5 w-3.5 text-positive" />
          Ingresos
        </span>
        <span className="font-semibold tabular-nums text-positive">
          +${formatCurrency(stats.ingresos)}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-text-secondary">
          <TrendingDown className="h-3.5 w-3.5 text-negative" />
          Gastos
        </span>
        <span className="font-semibold tabular-nums text-negative">
          -{formatCurrency(stats.gastos)}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <span className="text-sm font-medium text-text-primary">Balance</span>
        <span
          className={`text-base font-bold tabular-nums ${
            isPositive ? 'text-positive' : 'text-negative'
          }`}
        >
          {isPositive ? '+' : '-'}${formatCurrency(stats.balance)}
        </span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Movements() {
  const [searchParams] = useSearchParams()
  const now = new Date()
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() })

  const { desde, hasta } = useMemo(
    () => getMonthRange(period.year, period.month),
    [period.year, period.month]
  )

  const desdeISO = desde.toISOString()
  const hastaISO = hasta.toISOString()

  // SWR hooks — cached, deduplicated, stale-while-revalidate
  const { stats, isLoading: statsLoading, mutate: mutateStats } = useStats(desdeISO, hastaISO)
  const {
    movements,
    isLoading: movementsLoading,
    mutate: mutateMovements,
  } = useMovements(desdeISO, hastaISO, {
    tarjetaId: searchParams.get('tarjeta_id'),
    cuentaId: searchParams.get('cuenta_id'),
  })
  const { submitQuickAdd } = useQuickAddMovement()
  const quickAction = searchParams.get('quick')

  // ── Period navigation ────────────────────────────────────────────────────

  const prevMonth = () =>
    setPeriod((p) =>
      p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 }
    )

  const nextMonth = () =>
    setPeriod((p) =>
      p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 }
    )

  const goToCurrentMonth = () => setPeriod({ year: now.getFullYear(), month: now.getMonth() })

  const isCurrentMonth = period.year === now.getFullYear() && period.month === now.getMonth()

  const [editTarget, setEditTarget] = useState<Movement | null>(null);

  const handleEditMovement = (m: Movement) => setEditTarget(m);
  const handleEditSuccess = (_updated: Movement) => {
    mutateMovements();
    mutateStats();
    setEditTarget(null);
  };

  const handleDeleted = () => handleEditSuccess(null as unknown as Movement);

  // ── QuickAdd handler ─────────────────────────────────────────────────────

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <h1 className="mb-6 text-2xl font-bold text-text-primary">Movimientos</h1>

        {/* ── Period navigator ── */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-white hover:text-text-primary"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={goToCurrentMonth}
            className={`text-base font-semibold transition-colors ${
              isCurrentMonth ? 'text-primary' : 'text-text-primary hover:text-primary'
            }`}
            title={isCurrentMonth ? 'Mes actual' : 'Ir al mes actual'}
          >
            {MONTH_NAMES[period.month]} {period.year}
          </button>

          <button
            onClick={nextMonth}
            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-white hover:text-text-primary"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* ── Monthly balance (CU-018) ── */}
        <MonthlyBalanceCard stats={stats} isLoading={statsLoading} />

        {/* ── Movements list with filters ── */}
        <MovementsList movements={movements} isLoading={movementsLoading} onEditMovement={handleEditMovement} />
      </div>

      {/* ── QuickAdd FAB ── */}
      <QuickAdd
        onSubmit={submitQuickAdd}
        initialIntent={{
          open: quickAction === 'transfer' || quickAction === 'card',
          tipo: quickAction === 'transfer' ? 'TRANSFERENCIA' : 'GASTO',
          cuentaId: searchParams.get('cuenta_id'),
          tarjetaId: searchParams.get('tarjeta_id'),
        }}
      />

      {/* ── Edit movement modal ── */}
      {editTarget && (
        <EditMovementModal
          movement={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={handleEditSuccess}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
