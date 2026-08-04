import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import QuickAdd from '@/components/QuickAdd'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useMovements } from '@/hooks/useMovements'
import { useQuickAddMovement } from '@/hooks/useQuickAddMovement'
import { useStats } from '@/hooks/useStats'
import { useSubscriptions } from '@/hooks/useSubscriptions'

const SHORT_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function monthRange() {
  const now = new Date()
  return {
    desde: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString(),
    hasta: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
  }
}

function formatCurrency(amount: string | number) {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(numeric || 0))
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`
}

function daysUntil(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function SectionHeader({ title, to }: { title: string; to?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      {to && (
        <Link to={to} className="inline-flex items-center gap-1 text-xs font-medium text-primary">
          Ver todo
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { desde, hasta } = monthRange()
  const { stats, isLoading: statsLoading } = useStats(desde, hasta)
  const { movements } = useMovements(desde, hasta)
  const { accounts, isLoading: accountsLoading } = useAccounts()
  const { cards } = useCards()
  const { subscriptions } = useSubscriptions()
  const { submitQuickAdd } = useQuickAddMovement()

  const activeAccounts = accounts.filter((account) => account.activa)
  const totalsByCurrency = activeAccounts.reduce<Record<string, number>>((acc, account) => {
    const amount =
      typeof account.saldo_actual === 'string'
        ? parseFloat(account.saldo_actual)
        : account.saldo_actual
    acc[account.moneda] = (acc[account.moneda] ?? 0) + amount
    return acc
  }, {})

  const topCategories = movements
    .filter((movement) =>
      ['GASTO', 'GASTO_CON_DESCUENTO', 'GASTO_TARJETA', 'GASTO_TARJETA_CON_DESCUENTO', 'SUSCRIPCION'].includes(
        movement.tipo,
      ),
    )
    .reduce<Record<string, number>>((acc, movement) => {
      const category = movement.categoria || 'otros'
      acc[category] = (acc[category] ?? 0) + parseFloat(movement.monto)
      return acc
    }, {})

  const categoryRows = Object.entries(topCategories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  const upcomingSubscriptions = subscriptions
    .filter((subscription) => subscription.activo)
    .map((subscription) => ({ subscription, days: daysUntil(subscription.proxima_fecha_pago) }))
    .filter(({ days }) => days >= 0 && days <= 14)
    .sort((a, b) => a.days - b.days)
    .slice(0, 3)

  const upcomingCards = cards
    .filter((card) => card.activa && card.proximo_pago)
    .map((card) => ({ card, days: daysUntil(card.proximo_pago!.fecha) }))
    .filter(({ days }) => days >= 0 && days <= 14)
    .sort((a, b) => a.days - b.days)
    .slice(0, 3)

  const balancePositive = (stats?.balance ?? 0) >= 0

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="mb-6">
          <p className="text-sm text-text-secondary">Hoy</p>
          <h1 className="text-2xl font-bold text-text-primary">Tu balance diario</h1>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary">
              <Wallet className="h-4 w-4" />
              Disponible
            </span>
            <Link to="/accounts" className="text-xs font-medium text-primary">
              Cuentas
            </Link>
          </div>

          {accountsLoading ? (
            <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
          ) : Object.keys(totalsByCurrency).length === 0 ? (
            <p className="text-sm text-text-secondary">Sin cuentas activas</p>
          ) : (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {Object.entries(totalsByCurrency).map(([currency, total]) => (
                <div key={currency} className="flex items-baseline gap-1.5">
                  <span className="text-sm text-text-secondary">{currency}</span>
                  <span className={`text-2xl font-bold tabular-nums ${total < 0 ? 'text-negative' : 'text-text-primary'}`}>
                    {total < 0 ? '-' : ''}{formatCurrency(total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <span className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <TrendingUp className="h-3.5 w-3.5 text-positive" />
              Ingresos mes
            </span>
            <p className="text-lg font-bold tabular-nums text-positive">
              {statsLoading ? '...' : `+$${formatCurrency(stats?.ingresos ?? 0)}`}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <span className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <TrendingDown className="h-3.5 w-3.5 text-negative" />
              Gastos mes
            </span>
            <p className="text-lg font-bold tabular-nums text-negative">
              {statsLoading ? '...' : `-$${formatCurrency(stats?.gastos ?? 0)}`}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-white p-4 shadow-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Balance del mes
          </span>
          <p className={`mt-1 text-3xl font-bold tabular-nums ${balancePositive ? 'text-positive' : 'text-negative'}`}>
            {statsLoading ? '...' : `${balancePositive ? '+' : '-'}$${formatCurrency(stats?.balance ?? 0)}`}
          </p>
        </div>

        <section className="mb-6">
          <SectionHeader title="Dónde se está yendo" to="/movements" />
          <div className="space-y-2 rounded-xl border border-border bg-white p-4 shadow-sm">
            {categoryRows.length === 0 ? (
              <p className="text-sm text-text-secondary">Todavía no hay gastos este mes.</p>
            ) : (
              categoryRows.map(([category, total]) => (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-text-primary">{category.replace(/_/g, ' ')}</span>
                  <span className="font-semibold tabular-nums text-negative">-${formatCurrency(total)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mb-6">
          <SectionHeader title="Próximos pagos" to="/subscriptions" />
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            {[...upcomingSubscriptions, ...upcomingCards].length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">Nada importante en los próximos 14 días.</p>
            ) : (
              <>
                {upcomingSubscriptions.map(({ subscription, days }) => (
                  <Link
                    key={subscription.id}
                    to="/subscriptions"
                    className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-surface"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{subscription.nombre}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-text-secondary">
                      {days === 0 ? 'Hoy' : `${formatDate(subscription.proxima_fecha_pago)}`}
                    </span>
                  </Link>
                ))}
                {upcomingCards.map(({ card, days }) => (
                  <Link
                    key={card.id}
                    to="/cards"
                    className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-surface"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <CreditCard className="h-4 w-4 shrink-0 text-warning" />
                      <span className="truncate">{card.nombre}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-text-secondary">
                      {days === 0 ? 'Hoy' : formatDate(card.proximo_pago!.fecha)}
                    </span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </section>
      </div>

      <QuickAdd onSubmit={submitQuickAdd} />
    </div>
  )
}
