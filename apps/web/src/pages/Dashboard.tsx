import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  Check,
  Circle,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Wallet,
  WandSparkles,
} from 'lucide-react'
import QuickAdd, { type QuickAddInitialIntent } from '@/components/QuickAdd'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useMovements } from '@/hooks/useMovements'
import { useQuickAddMovement } from '@/hooks/useQuickAddMovement'
import { useStats } from '@/hooks/useStats'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { parseSmartInput, SMART_INPUT_DRAFT_KEY } from '@/lib/smartInput'

const SHORT_MONTHS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

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

function localDateTimestamp(dateStr: string) {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day).getTime()
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
  const navigate = useNavigate()
  const requestCounter = useRef(0)
  const [includeCardPurchases, setIncludeCardPurchases] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [smartText, setSmartText] = useState(() => sessionStorage.getItem(SMART_INPUT_DRAFT_KEY) ?? '')
  const [smartError, setSmartError] = useState('')
  const [interpreting, setInterpreting] = useState(false)
  const [smartIntent, setSmartIntent] = useState<QuickAddInitialIntent>()
  const { desde, hasta } = monthRange()
  const { stats, isLoading: statsLoading } = useStats(desde, hasta)
  const { movements, isLoading: movementsLoading } = useMovements(desde, hasta)
  const { accounts, isLoading: accountsLoading } = useAccounts()
  const { cards, isLoading: cardsLoading } = useCards()
  const { subscriptions, isLoading: subscriptionsLoading } = useSubscriptions()
  const { submitQuickAdd } = useQuickAddMovement()

  const handleSmartInput = async (event: React.FormEvent) => {
    event.preventDefault()
    if (accountsLoading || cardsLoading) return
    setInterpreting(true)
    setSmartError('')
    await Promise.resolve()
    const result = parseSmartInput(smartText, { accounts, cards, now: new Date() })
    setInterpreting(false)
    if (result.kind === 'failure') {
      setSmartError(result.error)
      return
    }
    if (result.kind === 'debt') {
      sessionStorage.setItem(SMART_INPUT_DRAFT_KEY, smartText)
      navigate('/debts', { state: { smartDebt: result.value } })
      return
    }
    setSmartIntent({
      ...result.value,
      open: true,
      requestId: String(++requestCounter.current),
    })
    sessionStorage.setItem(SMART_INPUT_DRAFT_KEY, smartText)
  }

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
    .filter(
      (movement) =>
        movement.moneda === 'ARS' &&
        [
          'GASTO',
          'GASTO_CON_DESCUENTO',
          'SUSCRIPCION',
          ...(includeCardPurchases ? ['GASTO_TARJETA', 'GASTO_TARJETA_CON_DESCUENTO'] : []),
        ].includes(movement.tipo)
    )
    .reduce<Record<string, number>>((acc, movement) => {
      const category = movement.categoria?.trim().toLocaleLowerCase('es-AR') || 'otros'
      acc[category] = (acc[category] ?? 0) + parseFloat(movement.monto)
      return acc
    }, {})

  const categoryRows = Object.entries(topCategories).sort(([, a], [, b]) => b - a)
  const visibleCategoryRows = showAllCategories ? categoryRows : categoryRows.slice(0, 5)
  const hiddenCategoryCount = categoryRows.length - 5
  const largestCategory = categoryRows[0]?.[1] ?? 0

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
  const monthEnd = new Date(hasta).getTime()
  const paidSubscriptionIds = new Set(
    movements
      .filter((movement) => movement.tipo === 'SUSCRIPCION' && movement.suscripcion_id)
      .map((movement) => movement.suscripcion_id)
  )
  const paidCardIds = new Set(
    movements
      .filter((movement) => movement.tipo === 'PAGO_TARJETA' && movement.tarjeta_id)
      .map((movement) => movement.tarjeta_id)
  )

  const checklistTasks = [
    ...subscriptions
      .filter((subscription) => {
        const paid = paidSubscriptionIds.has(subscription.id)
        return (
          subscription.activo &&
          (localDateTimestamp(subscription.proxima_fecha_pago) <= monthEnd || paid)
        )
      })
      .map((subscription) => ({
        id: `subscription-${subscription.id}`,
        label: `Pagar ${subscription.nombre}`,
        to: '/subscriptions',
        complete:
          paidSubscriptionIds.has(subscription.id) &&
          localDateTimestamp(subscription.proxima_fecha_pago) > monthEnd,
      })),
    ...cards
      .filter((card) => {
        const paid = paidCardIds.has(card.id)
        const dueThisMonth =
          card.proximo_pago && localDateTimestamp(card.proximo_pago.fecha) <= monthEnd
        return card.activa && (dueThisMonth || paid)
      })
      .map((card) => ({
        id: `card-${card.id}`,
        label: `Pagar ${card.nombre}`,
        to: '/cards',
        complete:
          paidCardIds.has(card.id) &&
          (!card.proximo_pago || localDateTimestamp(card.proximo_pago.fecha) > monthEnd),
      })),
    {
      id: 'monthly-investment',
      label: 'Hacer la inversión del mes',
      to: '/investments',
      complete: movements.some((movement) => movement.tipo === 'INVERSION'),
    },
  ]
  const completedTasks = checklistTasks.filter((task) => task.complete)
  const pendingTasks = checklistTasks.filter((task) => !task.complete)
  const checklistLoading = movementsLoading || cardsLoading || subscriptionsLoading

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="mb-6">
          <p className="text-sm text-text-secondary">Hoy</p>
          <h1 className="text-2xl font-bold text-text-primary">Tu balance diario</h1>
        </div>

        <form onSubmit={handleSmartInput} className="mb-5" aria-label="Registro rápido por texto">
          <div className="flex overflow-hidden rounded-xl border border-border bg-white shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
            <span className="flex items-center pl-3 text-primary" aria-hidden="true">
              <WandSparkles className="h-4 w-4" />
            </span>
            <input
              value={smartText}
              onChange={(event) => setSmartText(event.target.value)}
              disabled={accountsLoading || cardsLoading || interpreting}
              placeholder="Ej: café 4500 con descuento 70% fondo Freya"
              aria-label="Describí una operación"
              aria-describedby={smartError ? 'smart-input-error' : undefined}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-text-primary outline-none placeholder:text-text-secondary/70 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={accountsLoading || cardsLoading || interpreting || !smartText.trim()}
              className="m-1.5 rounded-lg bg-text-primary px-3 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {interpreting ? 'Interpretando…' : 'Interpretar'}
            </button>
          </div>
          {smartError && <p id="smart-input-error" role="alert" className="mt-1.5 px-1 text-xs text-negative">{smartError}</p>}
          <p className="mt-1.5 px-1 text-[11px] text-text-secondary">Se interpreta en este dispositivo. Revisás antes de guardar.</p>
        </form>

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
                  <span
                    className={`text-2xl font-bold tabular-nums ${total < 0 ? 'text-negative' : 'text-text-primary'}`}
                  >
                    {total < 0 ? '-' : ''}
                    {formatCurrency(total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-border bg-white p-4 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Resumen del mes
          </h2>
          {statsLoading ? (
            <div className="mt-3 space-y-4" aria-label="Cargando resumen del mes">
              <div className="h-9 w-44 animate-pulse rounded bg-gray-200" />
              <div className="grid grid-cols-2 gap-6">
                <div className="h-11 animate-pulse rounded bg-gray-100" />
                <div className="h-11 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ) : (
            <>
              <p
                className={`mt-1 text-3xl font-bold tabular-nums ${balancePositive ? 'text-positive' : 'text-negative'}`}
              >
                {`${balancePositive ? '+' : '-'}$${formatCurrency(stats?.balance ?? 0)}`}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-6 border-t border-border pt-3">
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                    <TrendingUp className="h-3.5 w-3.5 text-positive" />
                    Ingresos
                  </span>
                  <p className="mt-1 font-bold tabular-nums text-positive">
                    +${formatCurrency(stats?.ingresos ?? 0)}
                  </p>
                </div>
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                    <TrendingDown className="h-3.5 w-3.5 text-negative" />
                    Gastos
                  </span>
                  <p className="mt-1 font-bold tabular-nums text-negative">
                    -${formatCurrency(stats?.gastos ?? 0)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Checklist del mes</h2>
            {!checklistLoading && (
              <span className="text-xs font-medium tabular-nums text-text-secondary">
                {completedTasks.length} de {checklistTasks.length}
              </span>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            {checklistLoading ? (
              <div className="space-y-3 p-4" aria-label="Cargando checklist del mes">
                <div className="h-2 animate-pulse rounded-full bg-gray-200" />
                <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
                <div className="h-5 w-2/3 animate-pulse rounded bg-gray-100" />
              </div>
            ) : (
              <>
                <div
                  className="h-1 bg-gray-100"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={checklistTasks.length}
                  aria-valuenow={completedTasks.length}
                >
                  <div
                    className="h-full bg-positive transition-[width] duration-300"
                    style={{ width: `${(completedTasks.length / checklistTasks.length) * 100}%` }}
                  />
                </div>
                {pendingTasks.length === 0 ? (
                  <p className="p-4 text-sm font-medium text-positive">
                    Ya completaste tus tareas del mes
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {pendingTasks.map((task) => (
                      <Link
                        key={task.id}
                        to={task.to}
                        className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface"
                      >
                        <Circle className="h-4 w-4 shrink-0 text-text-secondary" />
                        <span>{task.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {completedTasks.length > 0 && (
                  <details className="border-t border-border">
                    <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-text-secondary">
                      Completadas ({completedTasks.length})
                    </summary>
                    <div className="divide-y divide-border border-t border-border">
                      {completedTasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                          <Check className="h-4 w-4 shrink-0 text-positive" />
                          <span className="text-text-secondary line-through">{task.label}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
          </div>
        </section>

        <section className="mb-6">
          <SectionHeader title="Dónde se está yendo" to="/movements" />
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs text-text-secondary">Gastos en ARS · mes actual</span>
              <button
                type="button"
                role="switch"
                aria-checked={includeCardPurchases}
                onClick={() => {
                  setIncludeCardPurchases((current) => !current)
                  setShowAllCategories(false)
                }}
                className="inline-flex items-center gap-2 text-xs font-medium text-text-primary"
              >
                <span
                  aria-hidden="true"
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${includeCardPurchases ? 'bg-primary' : 'bg-gray-200'}`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${includeCardPurchases ? 'translate-x-4' : 'translate-x-0'}`}
                  />
                </span>
                Incluir tarjeta
              </button>
            </div>
            {categoryRows.length === 0 ? (
              <p className="text-sm text-text-secondary">Todavía no hay gastos en ARS este mes.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {visibleCategoryRows.map(([category, total]) => (
                    <div key={category} className="text-sm">
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="truncate capitalize text-text-primary">
                          {category.replace(/_/g, ' ')}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-negative">
                          -${formatCurrency(total)}
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-red-50"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full rounded-full bg-negative transition-[width] duration-300"
                          style={{
                            width: `${largestCategory > 0 ? (total / largestCategory) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {hiddenCategoryCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((current) => !current)}
                    className="mt-4 w-full border-t border-border pt-3 text-xs font-semibold text-primary"
                  >
                    {showAllCategories ? 'Ver menos' : `Mostrar ${hiddenCategoryCount} más`}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        <section className="mb-6">
          <SectionHeader title="Próximos pagos" to="/subscriptions" />
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            {[...upcomingSubscriptions, ...upcomingCards].length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">
                Nada importante en los próximos 14 días.
              </p>
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

      <QuickAdd
        onSubmit={submitQuickAdd}
        initialIntent={smartIntent}
        onSuccess={() => {
          if (!smartIntent) return
          setSmartText('')
          setSmartIntent(undefined)
          sessionStorage.removeItem(SMART_INPUT_DRAFT_KEY)
        }}
      />
    </div>
  )
}
