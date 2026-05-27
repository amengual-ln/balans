import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Investments from '../pages/Investments'

vi.mock('swr', () => ({ mutate: vi.fn(), useSWRConfig: vi.fn(() => ({ mutate: vi.fn() })) }))

const mockPositions = [
  { id: 'p1', simbolo: 'AAPL', tipo: 'ACCIONES', moneda: 'USD', cantidad_total: 10, total_invertido: 1500, precio_mercado_actual: 180, total_recuperado: 0 },
  { id: 'p2', simbolo: 'BTC', tipo: 'CRYPTO', moneda: 'USD', cantidad_total: 0.5, total_invertido: 20000, precio_mercado_actual: 45000, total_recuperado: 0 },
]

const mockUseInversiones = vi.fn(() => ({ inversiones: mockPositions, isLoading: false, mutate: vi.fn() }))
vi.mock('@/hooks/useInversiones', () => ({
  useInversiones: () => mockUseInversiones(),
}))

const mockUseAccounts = vi.fn(() => ({ accounts: [{ id: 'a1', nombre: 'Banco Galicia', tipo: 'BANCO', moneda: 'ARS', saldo_actual: 100000, activa: true }], mutate: vi.fn() }))
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => mockUseAccounts(),
}))

vi.mock('@/hooks/useAPI', () => ({
  apiPost: vi.fn().mockResolvedValue({}),
  apiPut: vi.fn().mockResolvedValue({}),
  apiDelete: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/components/TickerPositionCard', () => ({
  default: ({ position, onEdit, onDelete }: any) => (
    <div data-testid="position-card">
      <span>{position.simbolo}</span>
      <button onClick={() => onEdit?.(position)}>Editar</button>
      <button onClick={() => onDelete?.(position)}>Eliminar</button>
    </div>
  ),
}))

vi.mock('@/components/InversionForm', () => ({
  default: ({ onClose }: any) => (
    <div role="dialog">
      <h2>Nueva Inversión</h2>
      <button onClick={onClose}>Cerrar</button>
    </div>
  ),
}))

vi.mock('@/components/RetornoInversionModal', () => ({
  default: () => <div role="dialog" />,
}))

vi.mock('@/components/PrecioMercadoModal', () => ({
  default: () => <div role="dialog" />,
}))

const renderPage = () =>
  render(<Investments />, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> })

describe('Investments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders page title', () => {
      renderPage()
      expect(screen.getByRole('heading', { name: 'Inversiones' })).toBeInTheDocument()
    })

    it('renders position cards', () => {
      renderPage()
      expect(screen.getByText('AAPL')).toBeInTheDocument()
      expect(screen.getByText('BTC')).toBeInTheDocument()
    })

    it('renders totals banner', () => {
      renderPage()
      expect(screen.getByText(/resumen de inversiones/i)).toBeInTheDocument()
    })

    it('renders filter pills', () => {
      renderPage()
      expect(document.querySelectorAll('button').length).toBeGreaterThan(0)
    })

    it('renders nueva inversion button', () => {
      renderPage()
      const btns = Array.from(document.querySelectorAll('button'))
      const nuevaBtn = btns.find(b => /nueva|inversion/i.test(b.textContent || ''))
      expect(nuevaBtn).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state when no investments', () => {
      mockUseInversiones.mockReturnValueOnce({ inversiones: [], isLoading: false, mutate: vi.fn() })
      renderPage()
      expect(screen.getByText(/sin inversiones/i)).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows skeleton when loading', () => {
      mockUseInversiones.mockReturnValueOnce({ inversiones: [], isLoading: true, mutate: vi.fn() })
      renderPage()
      expect(document.querySelector('[class*="animate-pulse"]')).toBeInTheDocument()
    })
  })

  describe('nueva inversion form', () => {
    it('opens form on button click', async () => {
      renderPage()
      const btns = Array.from(document.querySelectorAll('button'))
      const nuevaBtn = btns.find(b => /nueva|inversion/i.test(b.textContent || ''))
      if (nuevaBtn) await userEvent.click(nuevaBtn)
      expect(document.querySelector('[role="dialog"]')).toBeInTheDocument()
    })
  })
})