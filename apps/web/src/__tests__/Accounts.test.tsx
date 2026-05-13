import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Accounts from '../pages/Accounts'

vi.mock('swr', () => ({ mutate: vi.fn() }))

const mockAccounts = [
  { id: 'a1', nombre: 'Banco Galicia', tipo: 'BANCO', moneda: 'ARS', saldo_actual: 100000, activa: true },
  { id: 'a2', nombre: 'Mercado Pago', tipo: 'BILLETERA', moneda: 'USD', saldo_actual: 5000, activa: true },
  { id: 'a3', nombre: 'Fondo Descuento', tipo: 'FONDO_DESCUENTO', moneda: 'ARS', saldo_actual: 10000, activa: true },
  { id: 'a4', nombre: 'Cuenta Inactiva', tipo: 'BANCO', moneda: 'ARS', saldo_actual: 500, activa: false },
]

const mockUseAccounts = vi.fn(() => ({ accounts: mockAccounts, isLoading: false, mutate: vi.fn() }))
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => mockUseAccounts(),
}))

vi.mock('@/hooks/useAPI', () => ({
  apiPost: vi.fn().mockResolvedValue({}),
}))

const renderPage = () =>
  render(<Accounts />, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> })

describe('Accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders page title', () => {
      renderPage()
      expect(screen.getByRole('heading', { name: 'Cuentas' })).toBeInTheDocument()
    })

    it('renders account cards', () => {
      renderPage()
      expect(screen.getByText('Banco Galicia')).toBeInTheDocument()
      expect(screen.getByText('Mercado Pago')).toBeInTheDocument()
    })

    it('renders totals banner with patrimony', () => {
      renderPage()
      expect(screen.getByText(/patrimonio total/i)).toBeInTheDocument()
    })

    it('renders nueva cuenta button', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /nueva cuenta/i })).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state when no accounts', () => {
      mockUseAccounts.mockReturnValueOnce({ accounts: [], isLoading: false, mutate: vi.fn() })
      renderPage()
      expect(screen.getByText('🏦')).toBeInTheDocument()
      expect(screen.getByText(/sin cuentas todavía/i)).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows skeleton when loading', () => {
      mockUseAccounts.mockReturnValueOnce({ accounts: [], isLoading: true, mutate: vi.fn() })
      renderPage()
      expect(document.querySelector('[class*="animate-pulse"]')).toBeInTheDocument()
    })
  })

  describe('inactive accounts', () => {
    it('shows inactive section when inactive accounts exist', () => {
      renderPage()
      expect(screen.getByText(/inactivas/i)).toBeInTheDocument()
      expect(screen.getByText('Cuenta Inactiva')).toBeInTheDocument()
    })
  })

  describe('nueva cuenta form', () => {
    it('opens form on nueva cuenta click', async () => {
      renderPage()
      await userEvent.click(screen.getByRole('button', { name: /nueva cuenta/i }))
      expect(screen.getByRole('heading', { name: /nueva cuenta/i })).toBeInTheDocument()
    })
  })
})