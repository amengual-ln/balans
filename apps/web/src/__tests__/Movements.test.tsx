import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Movements from '../pages/Movements'

vi.mock('swr', () => ({ mutate: vi.fn(), useSWRConfig: vi.fn(() => ({ mutate: vi.fn() })) }))

const mockMovements = [
  { id: 'm1', tipo: 'GASTO' as const, descripcion: 'Supermercado', categoria: 'Alimentación', monto: '5000', moneda: 'ARS', fecha: '2024-06-15T10:00:00.000Z', cuenta_origen: { id: 'a1', nombre: 'Banco', tipo: 'BANCO', moneda: 'ARS' }, cuenta_destino: null, tarjeta: null, deuda: null, movimiento_relacionado_id: null, metadata: null },
]

const mockStats = { ingresos: 150000, gastos: 50000, balance: 100000 }

const mockUseMovements = vi.fn(() => ({ movements: mockMovements, isLoading: false, mutate: vi.fn() }))
vi.mock('@/hooks/useMovements', () => ({
  useMovements: () => mockUseMovements(),
}))

const mockUseStats = vi.fn(() => ({ stats: mockStats, isLoading: false, mutate: vi.fn() }))
vi.mock('@/hooks/useStats', () => ({
  useStats: () => mockUseStats(),
}))

vi.mock('@/hooks/useAPI', () => ({
  apiPost: vi.fn().mockResolvedValue({}),
  useAPI: vi.fn(() => ({ data: null })),
}))

const renderPage = (initialPath = '/movements') =>
  render(<Movements />, { wrapper: ({ children }) => <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter> })

describe('Movements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders page title', () => {
      renderPage()
      expect(screen.getByRole('heading', { name: 'Movimientos' })).toBeInTheDocument()
    })

    it('renders monthly balance card', () => {
      renderPage()
      const balanceCard = document.querySelector('[class*="rounded-xl"]')
      expect(balanceCard).toBeInTheDocument()
    })

    it('renders movements list', () => {
      renderPage()
      expect(screen.getByText('Supermercado')).toBeInTheDocument()
    })

    it('renders period navigator with month name', () => {
      renderPage()
      expect(document.querySelector('[class*="text-base"]')).toBeInTheDocument()
    })
  })

  describe('period navigation', () => {
    it('renders prev/next month buttons', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /mes anterior/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /mes siguiente/i })).toBeInTheDocument()
    })

    it('renders current month label', () => {
      renderPage()
      expect(document.querySelector('[class*="text-base"]')).toBeInTheDocument()
    })
  })

  describe('loading states', () => {
    it('shows balance skeleton when stats loading', () => {
      mockUseStats.mockReturnValueOnce({ stats: null as unknown as { ingresos: number; gastos: number; balance: number }, isLoading: true, mutate: vi.fn() })
      renderPage()
      expect(document.querySelector('[class*="animate-pulse"]')).toBeInTheDocument()
    })
  })

  describe('quick add FAB', () => {
    it('quick add FAB is present', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /quick add movement/i })).toBeInTheDocument()
    })
  })
})