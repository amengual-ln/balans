import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

vi.mock('swr', () => ({ mutate: vi.fn() }))

const renderNav = (initialPath = '/movements') =>
  render(<BottomNav />, { wrapper: ({ children }) => <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter> })

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('primary items', () => {
    it('renders Movimientos link', () => {
      renderNav('/movements')
      expect(screen.getByRole('link', { name: /movimientos/i })).toBeInTheDocument()
    })

    it('renders Cuentas link', () => {
      renderNav('/accounts')
      expect(screen.getByRole('link', { name: /cuentas/i })).toBeInTheDocument()
    })

    it('renders Tarjetas link', () => {
      renderNav('/cards')
      expect(screen.getByRole('link', { name: /tarjetas/i })).toBeInTheDocument()
    })

    it('renders Más button', () => {
      renderNav('/movements')
      expect(screen.getByRole('button', { name: /más/i })).toBeInTheDocument()
    })
  })

  describe('Más overflow menu', () => {
    it('shows overflow items when Más is clicked', async () => {
      renderNav('/movements')
      await userEvent.click(screen.getByRole('button', { name: /más/i }))
      expect(screen.getByRole('link', { name: /deudas/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /suscripciones/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /inversiones/i })).toBeInTheDocument()
    })

    it('closes overflow menu when overflow item is clicked', async () => {
      renderNav('/movements')
      await userEvent.click(screen.getByRole('button', { name: /más/i }))
      await userEvent.click(screen.getByRole('link', { name: /deudas/i }))
      expect(screen.queryByRole('link', { name: /suscripciones/i })).not.toBeInTheDocument()
    })

    it('hides overflow items by default', () => {
      renderNav('/movements')
      expect(screen.queryByRole('link', { name: /deudas/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /suscripciones/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /inversiones/i })).not.toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('has links to correct paths', () => {
      renderNav('/movements')
      expect(screen.getByRole('link', { name: /movimientos/i })).toHaveAttribute('href', '/movements')
      expect(screen.getByRole('link', { name: /cuentas/i })).toHaveAttribute('href', '/accounts')
      expect(screen.getByRole('link', { name: /tarjetas/i })).toHaveAttribute('href', '/cards')
    })

    it('overflow items have correct hrefs', async () => {
      renderNav('/movements')
      await userEvent.click(screen.getByRole('button', { name: /más/i }))
      expect(screen.getByRole('link', { name: /deudas/i })).toHaveAttribute('href', '/debts')
      expect(screen.getByRole('link', { name: /suscripciones/i })).toHaveAttribute('href', '/subscriptions')
      expect(screen.getByRole('link', { name: /inversiones/i })).toHaveAttribute('href', '/investments')
    })
  })
})