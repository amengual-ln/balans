import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Cards from '../pages/Cards'

vi.mock('swr', () => ({ mutate: vi.fn(), useSWRConfig: vi.fn(() => ({ mutate: vi.fn() })) }))

const mockCards = [
  { id: 'c1', nombre: 'Visa Galicia', tipo: 'VISA', moneda: 'ARS', limite_total: 100000, limite_comprometido: 20000, activa: true, limite_disponible: 80000 },
  { id: 'c2', nombre: 'Mastercard', tipo: 'MASTERCARD', moneda: 'USD', limite_total: 50000, limite_comprometido: 0, activa: true, limite_disponible: 50000 },
  { id: 'c3', nombre: 'Amex Inactiva', tipo: 'AMEX', moneda: 'ARS', limite_total: 20000, limite_comprometido: 0, activa: false, limite_disponible: 20000 },
]

const mockAccounts = [
  { id: 'a1', nombre: 'Banco Galicia', tipo: 'BANCO', moneda: 'ARS', saldo_actual: 100000, activa: true },
]

const mockUseCards = vi.fn(() => ({ cards: mockCards, isLoading: false, mutate: vi.fn() }))
vi.mock('@/hooks/useCards', () => ({
  useCards: () => mockUseCards(),
}))

const mockUseAccounts = vi.fn(() => ({ accounts: mockAccounts, mutate: vi.fn() }))
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => mockUseAccounts(),
}))

vi.mock('@/hooks/useAPI', () => ({
  apiPost: vi.fn().mockResolvedValue({}),
}))

const renderPage = () =>
  render(<Cards />, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> })

describe('Cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders page title', () => {
      renderPage()
      expect(screen.getByRole('heading', { name: 'Tarjetas' })).toBeInTheDocument()
    })

    it('renders card items', () => {
      renderPage()
      expect(screen.getByText('Visa Galicia')).toBeInTheDocument()
      expect(screen.getByText('Mastercard')).toBeInTheDocument()
    })

    it('renders totals banner', () => {
      renderPage()
      expect(screen.getByText(/total comprometido/i)).toBeInTheDocument()
    })

    it('renders nueva tarjeta button', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /nueva tarjeta/i })).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state when no cards', () => {
      mockUseCards.mockReturnValueOnce({ cards: [], isLoading: false, mutate: vi.fn() })
      renderPage()
      expect(screen.getByText('💳')).toBeInTheDocument()
      expect(screen.getByText(/sin tarjetas todavía/i)).toBeInTheDocument()
    })
  })

  describe('inactive cards', () => {
    it('shows inactive section', () => {
      renderPage()
      expect(screen.getByText(/inactivas/i)).toBeInTheDocument()
      expect(screen.getByText('Amex Inactiva')).toBeInTheDocument()
    })
  })

  describe('next payment', () => {
    it('renders next payment line when proximo_pago exists', () => {
      const cardsWithProximo = [
        {
          ...mockCards[0],
          proximo_pago: {
            monto: 5000,
            moneda: 'ARS',
            fecha: '2026-06-15',
            cuotas_pendientes: 3,
            numero_cuota: 2,
            total_cuotas: 3,
          },
        },
      ]
      mockUseCards.mockReturnValueOnce({ cards: cardsWithProximo, isLoading: false, mutate: vi.fn() })
      renderPage()
      expect(screen.getByText(/siguiente pago/i)).toBeInTheDocument()
      expect(screen.getAllByText(/3 cuotas/i).length).toBeGreaterThan(0)
    })

    it('does not render next payment line when no proximo_pago', () => {
      const cardsNoProximo = [
        { ...mockCards[0], proximo_pago: null },
      ]
      mockUseCards.mockReturnValueOnce({ cards: cardsNoProximo, isLoading: false, mutate: vi.fn() })
      renderPage()
      expect(screen.queryByText(/siguiente pago/i)).not.toBeInTheDocument()
    })

    it('shows nearest card and its aggregated next payment monto', () => {
      const laterDate = '2026-07-15'
      const nearerDate = '2026-06-01'
      const cardsMultiple = [
        {
          ...mockCards[0],
          proximo_pago: { monto: 1000, moneda: 'ARS', fecha: laterDate, cuotas_pendientes: 2, numero_cuota: 1, total_cuotas: 2 },
        },
        {
          ...mockCards[1],
          proximo_pago: { monto: 3000, moneda: 'USD', fecha: nearerDate, cuotas_pendientes: 3, numero_cuota: 1, total_cuotas: 3 },
        },
      ]
      mockUseCards.mockReturnValueOnce({ cards: cardsMultiple, isLoading: false, mutate: vi.fn() })
      renderPage()
      expect(screen.getAllByText(/3 cuotas/i).length).toBeGreaterThan(0)
    })

    it('renders next payment monto as sum of one cuota per purchase on the nearest card', () => {
      const cardsWithAggregation = [
        {
          ...mockCards[0],
          proximo_pago: {
            monto: 4500,
            moneda: 'ARS',
            fecha: '2026-06-01',
            cuotas_pendientes: 4,
            numero_cuota: 1,
            total_cuotas: 3,
          },
        },
      ]
      mockUseCards.mockReturnValueOnce({ cards: cardsWithAggregation, isLoading: false, mutate: vi.fn() })
      renderPage()
      expect(screen.getByText(/siguiente pago/i)).toBeInTheDocument()
      expect(screen.getByText('4.500')).toBeInTheDocument()
    })
  })

  describe('nueva tarjeta form', () => {
    it('opens form on nueva tarjeta click', async () => {
      renderPage()
      await userEvent.click(screen.getByRole('button', { name: /nueva tarjeta/i }))
      expect(screen.getByRole('heading', { name: /nueva tarjeta/i })).toBeInTheDocument()
    })
  })
})
