import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Subscriptions from '../pages/Subscriptions'

vi.mock('swr', () => ({ mutate: vi.fn(), useSWRConfig: vi.fn(() => ({ mutate: vi.fn() })) }))

const mockSubscriptions = [
  { id: 's1', nombre: 'Netflix', monto: '15.99', moneda: 'USD', frecuencia: 'MENSUAL' as const, dia_pago: 5, proxima_fecha_pago: '2026-08-05', activo: true, categoria: 'Streaming', fecha_inicio: '2024-01-01', fecha_fin: null, created_at: '2024-01-01', updated_at: '2024-01-01', cuenta: { id: 'a1', nombre: 'Banco Galicia', moneda: 'ARS' } },
  { id: 's2', nombre: 'Spotify', monto: '4.99', moneda: 'USD', frecuencia: 'MENSUAL' as const, dia_pago: 20, proxima_fecha_pago: '2026-08-20', activo: true, categoria: 'Streaming', fecha_inicio: '2024-01-01', fecha_fin: null, created_at: '2024-01-01', updated_at: '2024-01-01', cuenta: { id: 'a1', nombre: 'Banco Galicia', moneda: 'ARS' } },
  { id: 's3', nombre: 'Old Service', monto: '100', moneda: 'ARS', frecuencia: 'MENSUAL' as const, dia_pago: 1, proxima_fecha_pago: '2024-01-01', activo: false, categoria: 'Otro', fecha_inicio: '2023-01-01', fecha_fin: '2024-01-01', created_at: '2023-01-01', updated_at: '2024-01-01', cuenta: { id: 'a1', nombre: 'Banco Galicia', moneda: 'ARS' } },
]

const mockUseSubscriptions = vi.fn(() => ({ subscriptions: mockSubscriptions, isLoading: false, mutate: vi.fn() }))
vi.mock('@/hooks/useSubscriptions', () => ({
  useSubscriptions: () => mockUseSubscriptions(),
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

vi.mock('@/components/SubscriptionCard', () => ({
  default: ({ subscription, onPay, onEdit, onDelete }: any) => (
    <div data-testid="sub-card" onClick={() => onEdit?.(subscription)}>
      <span>{subscription.nombre}</span>
      <button onClick={() => onPay?.(subscription)}>Pagar</button>
      <button onClick={() => onEdit?.(subscription)}>Editar</button>
      <button onClick={() => onDelete?.(subscription)}>Eliminar</button>
    </div>
  ),
}))

vi.mock('@/components/SubscriptionForm', () => ({
  default: ({ onClose }: any) => (
    <div role="dialog">
      <h2>Nueva Suscripción</h2>
      <button onClick={onClose}>Cerrar</button>
    </div>
  ),
}))

vi.mock('@/components/SubscriptionPaymentModal', () => ({
  default: ({ onClose }: any) => (
    <div role="dialog">
      <button onClick={onClose}>Cerrar</button>
    </div>
  ),
}))

const renderPage = () =>
  render(<Subscriptions />, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> })

describe('Subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders page title', () => {
      renderPage()
      expect(screen.getByRole('heading', { name: 'Suscripciones' })).toBeInTheDocument()
    })

    it('renders subscription cards', () => {
      renderPage()
      expect(screen.getByText('Netflix')).toBeInTheDocument()
      expect(screen.getByText('Spotify')).toBeInTheDocument()
    })

    it('renders totals banner', () => {
      renderPage()
      expect(screen.getByText(/costo mensual estimado/i)).toBeInTheDocument()
    })

    it('renders nueva button', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /nueva/i })).toBeInTheDocument()
    })

    it('renders urgency sections', () => {
      renderPage()
      expect(screen.getByText(/próximos 7 días/i)).toBeInTheDocument()
      expect(screen.getByText(/más adelante/i)).toBeInTheDocument()
    })

    it('renders inactive section in details element', () => {
      renderPage()
      expect(screen.getByText(/pausadas \/ finalizadas/i)).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state when no subscriptions', () => {
      mockUseSubscriptions.mockReturnValueOnce({ subscriptions: [], isLoading: false, mutate: vi.fn() })
      renderPage()
      expect(screen.getByText('🔄')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows skeleton when loading', () => {
      mockUseSubscriptions.mockReturnValueOnce({ subscriptions: [], isLoading: true, mutate: vi.fn() })
      renderPage()
      expect(document.querySelector('[class*="animate-pulse"]')).toBeInTheDocument()
    })
  })

  describe('nueva suscripcion form', () => {
    it('opens form on nueva click', async () => {
      renderPage()
      await userEvent.click(screen.getByRole('button', { name: /nueva/i }))
      expect(document.querySelector('[role="dialog"]')).toBeInTheDocument()
    })
  })
})
