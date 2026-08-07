import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import Debts from '@/pages/Debts'

vi.mock('@/hooks/useDebts', () => ({
  useDebts: () => ({ debts: [], isLoading: false, mutate: vi.fn() }),
}))
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts: [] }),
}))

function StateProbe() {
  const location = useLocation()
  return <span data-testid="router-state">{location.state ? 'present' : 'cleared'}</span>
}

describe('Debts smart input', () => {
  it('consumes router state and opens a prefilled debt form', async () => {
    const user = userEvent.setup()
    sessionStorage.setItem('freya_smart_input_draft', 'Pepito me debe 100')
    render(
      <MemoryRouter initialEntries={[{
        pathname: '/debts',
        state: {
          smartDebt: {
            tipo: 'PERSONAL',
            direccion: 'POR_COBRAR',
            acreedor: 'pepito',
            monto: 100,
            moneda: 'USD',
            fecha: '2026-08-06',
          },
        },
      }]}>
        <Routes>
          <Route path="/debts" element={<><Debts /><StateProbe /></>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Nueva deuda' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/nombre del acreedor/i)).toHaveValue('pepito')
    expect(document.querySelector('[name="monto_total"]')).toHaveValue(100)
    expect(screen.getAllByRole('button', { name: 'Me deben' }).at(-1)).toHaveClass('bg-positive')
    expect(document.querySelector('input[type="date"]')).toHaveValue('2026-08-06')
    await waitFor(() => expect(screen.getByTestId('router-state')).toHaveTextContent('cleared'))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('heading', { name: 'Nueva deuda' })).not.toBeInTheDocument()
    expect(sessionStorage.getItem('freya_smart_input_draft')).toBe('Pepito me debe 100')
  })
})
