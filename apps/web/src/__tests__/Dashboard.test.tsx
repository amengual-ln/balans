import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card, ProximoPago } from '@/hooks/useCards'
import type { Movement } from '@/hooks/useMovements'
import type { Subscription } from '@/hooks/useSubscriptions'
import Dashboard from '../pages/Dashboard'

const categoryMovements: Partial<Movement>[] = [
  { id: '1', tipo: 'GASTO', categoria: 'Vivienda', monto: '1000', moneda: 'ARS' },
  { id: '2', tipo: 'GASTO', categoria: ' comida ', monto: '800', moneda: 'ARS' },
  { id: '3', tipo: 'GASTO_CON_DESCUENTO', categoria: 'COMIDA', monto: '100', moneda: 'ARS' },
  { id: '4', tipo: 'SUSCRIPCION', categoria: 'Servicios', monto: '700', moneda: 'ARS' },
  { id: '5', tipo: 'GASTO', categoria: 'Transporte', monto: '600', moneda: 'ARS' },
  { id: '6', tipo: 'GASTO', categoria: 'Salud', monto: '500', moneda: 'ARS' },
  { id: '7', tipo: 'GASTO', categoria: 'Ocio', monto: '400', moneda: 'ARS' },
  { id: '8', tipo: 'GASTO', categoria: 'Vivienda', monto: '9000', moneda: 'USD' },
  { id: '9', tipo: 'GASTO_TARJETA', categoria: 'Tarjeta', monto: '1200', moneda: 'ARS' },
  { id: '10', tipo: 'GASTO_TARJETA_CON_DESCUENTO', categoria: '', monto: '1100', moneda: 'ARS' },
]

const mocks = vi.hoisted(() => ({
  movements: [] as Partial<Movement>[],
  movementsLoading: false,
  cards: [] as Partial<Card>[],
  cardsLoading: false,
  subscriptions: [] as Partial<Subscription>[],
  subscriptionsLoading: false,
  stats: { ingresos: 2500, gastos: 1000, balance: 1500 },
  statsLoading: false,
}))

vi.mock('@/hooks/useMovements', () => ({
  useMovements: () => ({ movements: mocks.movements, isLoading: mocks.movementsLoading }),
}))
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts: [], isLoading: false }),
}))
vi.mock('@/hooks/useCards', () => ({
  useCards: () => ({ cards: mocks.cards, isLoading: mocks.cardsLoading }),
}))
vi.mock('@/hooks/useSubscriptions', () => ({
  useSubscriptions: () => ({
    subscriptions: mocks.subscriptions,
    isLoading: mocks.subscriptionsLoading,
  }),
}))
vi.mock('@/hooks/useStats', () => ({
  useStats: () => ({ stats: mocks.stats, isLoading: mocks.statsLoading }),
}))
vi.mock('@/hooks/useQuickAddMovement', () => ({
  useQuickAddMovement: () => ({ submitQuickAdd: vi.fn() }),
}))
vi.mock('@/components/QuickAdd', () => ({ default: () => null }))

const renderPage = () =>
  render(<Dashboard />, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> })

const nextPayment = (fecha: string): ProximoPago => ({
  fecha,
  monto: 1,
  moneda: 'ARS',
  cuotas_pendientes: 1,
  numero_cuota: 1,
  total_cuotas: 1,
})

beforeEach(() => {
  mocks.movements = [...categoryMovements]
  mocks.movementsLoading = false
  mocks.cards = []
  mocks.cardsLoading = false
  mocks.subscriptions = []
  mocks.subscriptionsLoading = false
  mocks.stats = { ingresos: 2500, gastos: 1000, balance: 1500 }
  mocks.statsLoading = false
})

describe('Dashboard monthly summary', () => {
  it('shows balance, income, and expenses in one card', () => {
    renderPage()

    const summaryCard = screen.getByText('Resumen del mes').closest('div')!
    expect(within(summaryCard).getByText('+$1.500')).toBeInTheDocument()
    expect(within(summaryCard).getByText('+$2.500')).toBeInTheDocument()
    expect(within(summaryCard).getByText('-$1.000')).toBeInTheDocument()
  })
})

describe('Dashboard expense categories', () => {
  it('sorts, groups normalized categories, keeps subscriptions, and shows five ARS rows', () => {
    renderPage()

    const visibleNames = ['vivienda', 'comida', 'servicios', 'transporte', 'salud'].map((name) =>
      screen.getByText(name)
    )
    visibleNames.slice(1).forEach((name, index) => {
      expect(
        visibleNames[index].compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    })
    expect(
      screen.getByText(
        (_, element) => element?.tagName === 'SPAN' && element.textContent === '-$900'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('servicios')).toBeInTheDocument()
    expect(screen.queryByText('ocio')).not.toBeInTheDocument()
    expect(screen.queryByText('tarjeta')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        (_, element) => element?.tagName === 'SPAN' && element.textContent === '-$1.000'
      )
    ).toBeInTheDocument()
  })

  it('expands all categories and collapses again', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Mostrar 1 más' }))
    expect(screen.getByText('ocio')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ver menos' }))
    expect(screen.queryByText('ocio')).not.toBeInTheDocument()
  })

  it('adds both card purchase types and recalculates proportional bars', async () => {
    const user = userEvent.setup()
    renderPage()
    const cardSwitch = screen.getByRole('switch', { name: 'Incluir tarjeta' })
    const knob = cardSwitch.firstElementChild?.firstElementChild

    const viviendaBarBefore =
      screen.getByText('vivienda').parentElement?.nextElementSibling?.firstElementChild
    expect(viviendaBarBefore).toHaveStyle({ width: '100%' })
    expect(knob).toHaveClass('left-0.5', 'translate-x-0')

    await user.click(cardSwitch)

    expect(knob).toHaveClass('translate-x-4')
    expect(screen.getByText('tarjeta')).toBeInTheDocument()
    expect(screen.getByText('otros')).toBeInTheDocument()
    const viviendaBarAfter =
      screen.getByText('vivienda').parentElement?.nextElementSibling?.firstElementChild
    expect(viviendaBarAfter).toHaveStyle({ width: `${(1000 / 1200) * 100}%` })
  })
})

describe('Dashboard monthly checklist', () => {
  beforeEach(() => {
    mocks.subscriptions = [
      { id: 'sub-recurring', nombre: 'Semanal', activo: true, proxima_fecha_pago: '2026-08-15' },
      { id: 'sub-paid', nombre: 'Internet', activo: true, proxima_fecha_pago: '2026-09-05' },
      { id: 'sub-later', nombre: 'Futuro', activo: true, proxima_fecha_pago: '2026-09-01' },
      { id: 'sub-overdue', nombre: 'Vencida', activo: true, proxima_fecha_pago: '2026-07-20' },
      { id: 'sub-inactive', nombre: 'Inactiva', activo: false, proxima_fecha_pago: '2026-08-10' },
    ]
    mocks.cards = [
      {
        id: 'card-partial',
        nombre: 'Visa parcial',
        activa: true,
        proximo_pago: nextPayment('2026-08-18'),
      },
      {
        id: 'card-paid',
        nombre: 'Master saldada',
        activa: true,
        proximo_pago: nextPayment('2026-09-18'),
      },
      {
        id: 'card-later',
        nombre: 'Amex futura',
        activa: true,
        proximo_pago: nextPayment('2026-09-01'),
      },
    ]
    mocks.movements = [
      ...categoryMovements,
      { id: 'pay-1', tipo: 'SUSCRIPCION', suscripcion_id: 'sub-recurring' },
      { id: 'pay-2', tipo: 'SUSCRIPCION', suscripcion_id: 'sub-paid' },
      { id: 'pay-3', tipo: 'PAGO_TARJETA', tarjeta_id: 'card-partial' },
      { id: 'pay-4', tipo: 'PAGO_TARJETA', tarjeta_id: 'card-paid' },
      { id: 'investment', tipo: 'INVERSION' },
    ]
  })

  it('keeps partial and recurring payments pending and excludes later obligations', () => {
    renderPage()

    expect(screen.getByText('3 de 6')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pagar Semanal' })).toHaveAttribute(
      'href',
      '/subscriptions'
    )
    expect(screen.getByRole('link', { name: 'Pagar Vencida' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pagar Visa parcial' })).toHaveAttribute(
      'href',
      '/cards'
    )
    expect(screen.queryByText('Pagar Futuro')).not.toBeInTheDocument()
    expect(screen.queryByText('Pagar Amex futura')).not.toBeInTheDocument()
  })

  it('expands and collapses completed tasks', async () => {
    const user = userEvent.setup()
    renderPage()

    const completed = screen.getByText('Pagar Internet')
    expect(completed).not.toBeVisible()
    await user.click(screen.getByText('Completadas (3)'))
    expect(completed).toBeVisible()
    expect(screen.getByText('Pagar Master saldada')).toBeVisible()
    expect(screen.getByText('Hacer la inversión del mes')).toBeVisible()
    await user.click(screen.getByText('Completadas (3)'))
    expect(completed).not.toBeVisible()
  })

  it('shows completion message when every task is done', () => {
    mocks.subscriptions = [
      { id: 'sub-paid', nombre: 'Internet', activo: true, proxima_fecha_pago: '2026-09-05' },
    ]
    mocks.cards = []
    mocks.movements = [
      { id: 'pay-2', tipo: 'SUSCRIPCION', suscripcion_id: 'sub-paid' },
      { id: 'investment', tipo: 'INVERSION' },
    ]

    renderPage()

    expect(screen.getByText('2 de 2')).toBeInTheDocument()
    expect(screen.getByText('Ya completaste tus tareas del mes')).toBeInTheDocument()
  })

  it('shows skeleton without false pending tasks while data loads', () => {
    mocks.movementsLoading = true

    renderPage()

    expect(screen.getByLabelText('Cargando checklist del mes')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Hacer la inversión del mes' })
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/de 6/)).not.toBeInTheDocument()
  })
})
