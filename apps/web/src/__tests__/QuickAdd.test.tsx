import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuickAdd from '../components/QuickAdd'

vi.mock('swr', () => ({
  mutate: vi.fn(),
}))

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn(() => ({
    accounts: [
      { id: 'acc1', nombre: 'Banco Galicia', tipo: 'BANCO', moneda: 'ARS', saldo_actual: 10000, activa: true },
      { id: 'acc2', nombre: 'Mercado Pago', tipo: 'BILLETERA', moneda: 'USD', saldo_actual: 5000, activa: true },
      { id: 'acc3', nombre: 'Fondo Descuento', tipo: 'FONDO_DESCUENTO', moneda: 'ARS', saldo_actual: 2000, activa: true },
    ],
  })),
}))

vi.mock('@/hooks/useCards', () => ({
  useCards: vi.fn(() => ({
    cards: [
      { id: 'card1', nombre: 'Visa Galicia', tipo: 'VISA', moneda: 'ARS', limite_total: 100000, limite_comprometido: 20000, activa: true, limite_disponible: 80000 },
      { id: 'card2', nombre: 'Mastercard', tipo: 'MASTERCARD', moneda: 'USD', limite_total: 50000, limite_comprometido: 0, activa: true, limite_disponible: 50000 },
    ],
  })),
}))

const mockOnSubmit = vi.fn().mockResolvedValue(undefined)

const renderQA = () => render(<QuickAdd onSubmit={mockOnSubmit} />)

describe('QuickAdd', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('FAB', () => {
    it('renders FAB', () => {
      renderQA()
      expect(screen.getByRole('button', { name: /quick add movement/i })).toBeInTheDocument()
    })

    it('opens modal on click', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      expect(screen.getByRole('heading', { name: /agregar gasto/i })).toBeInTheDocument()
    })
  })

  describe('type toggle', () => {
    it('defaults to GASTO', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      expect(screen.getByRole('heading', { name: /agregar gasto/i })).toBeInTheDocument()
    })

    it('switches to INGRESO', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /ingreso/i }))
      expect(screen.getByRole('heading', { name: /agregar ingreso/i })).toBeInTheDocument()
    })

    it('switches to TRANSFERENCIA', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /más opciones/i }))
      await userEvent.click(screen.getByRole('button', { name: /transferir/i }))
      expect(screen.getByRole('heading', { name: /nueva transferencia/i })).toBeInTheDocument()
    })
  })

  describe('amount input', () => {
    it('renders amount field', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      expect(screen.getByRole('textbox', { name: /monto/i })).toBeInTheDocument()
    })

    it('formats number with thousand separators', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      const input = screen.getByRole('textbox', { name: /monto/i })
      await userEvent.type(input, '1234')
      expect((input as HTMLInputElement).value).toBe('1.234')
    })

    it('handles decimal comma', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      const input = screen.getByRole('textbox', { name: /monto/i })
      await userEvent.type(input, '1234,56')
      expect((input as HTMLInputElement).value).toBe('1.234,56')
    })
  })

  describe('description', () => {
    it('is hidden in simple mode', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      expect(screen.queryByPlaceholderText(/descripción/i)).not.toBeInTheDocument()
    })

    it('shows for GASTO in advanced options', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /más opciones/i }))
      expect(screen.getByPlaceholderText(/descripción/i)).toBeInTheDocument()
    })

    it('shows for INGRESO in advanced options', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /más opciones/i }))
      await userEvent.click(screen.getByRole('button', { name: /ingreso/i }))
      expect(screen.getByPlaceholderText(/descripción/i)).toBeInTheDocument()
    })

    it('hidden for TRANSFERENCIA', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /más opciones/i }))
      await userEvent.click(screen.getByRole('button', { name: /transferir/i }))
      expect(screen.queryByPlaceholderText(/descripción/i)).not.toBeInTheDocument()
    })
  })

  describe('account selector', () => {
    it('renders account select', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      expect(screen.getByRole('combobox', { name: /cuenta/i })).toBeInTheDocument()
    })

    it('shows payment accounts and cards', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      expect(screen.getByText(/banco galicia/i)).toBeInTheDocument()
      expect(screen.getByText(/mercado pago/i)).toBeInTheDocument()
    })
  })

  describe('card selection', () => {
    it('shows card options when present', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      const select = screen.getByRole('combobox', { name: /cuenta/i })
      await userEvent.selectOptions(select, 'card:card1')
      expect(screen.getByText(/visa galicia/i)).toBeInTheDocument()
    })

    it('shows cuotas pills when card selected', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      const select = screen.getByRole('combobox', { name: /cuenta/i })
      await userEvent.selectOptions(select, 'card:card1')
      expect(screen.getByRole('button', { name: /1 pago/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /3×/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /6×/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /12×/i })).toBeInTheDocument()
    })

    it('hides cuotas when regular account selected', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      const select = screen.getByRole('combobox', { name: /cuenta/i })
      await userEvent.selectOptions(select, 'acc1')
      expect(screen.queryByRole('button', { name: /1 pago/i })).not.toBeInTheDocument()
    })
  })

  describe('discount fund', () => {
    it('is hidden in simple mode', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      expect(screen.queryByText(/aplica descuento de fondo/i)).not.toBeInTheDocument()
    })

    it('shows for GASTO in advanced options', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /más opciones/i }))
      expect(screen.getByText(/aplica descuento de fondo/i)).toBeInTheDocument()
    })

    it('shows options when toggled on', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /más opciones/i }))
      await userEvent.click(screen.getByRole('checkbox', { name: /aplica descuento/i }))
      expect(screen.getByText(/fondo de descuento/i)).toBeInTheDocument()
    })

    it('hidden for TRANSFERENCIA', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /más opciones/i }))
      await userEvent.click(screen.getByRole('button', { name: /transferir/i }))
      expect(screen.queryByText(/aplica descuento/i)).not.toBeInTheDocument()
    })
  })

  describe('date toggle', () => {
    it('is hidden in simple mode', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      expect(screen.queryByRole('button', { name: /cambiar fecha/i })).not.toBeInTheDocument()
    })

    it('shows toggle button in advanced options', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /más opciones/i }))
      expect(screen.getByRole('button', { name: /cambiar fecha/i })).toBeInTheDocument()
    })

    it('shows date input when toggled', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /más opciones/i }))
      await userEvent.click(screen.getByRole('button', { name: /cambiar fecha/i }))
      const dateInput = document.querySelector('input[type="date"]')
      expect(dateInput).toBeInTheDocument()
    })
  })

  describe('transfer destination', () => {
    it('shows origen and hacia selectors', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /más opciones/i }))
      await userEvent.click(screen.getByRole('button', { name: /transferir/i }))
      expect(screen.getByRole('combobox', { name: /desde/i })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /hacia/i })).toBeInTheDocument()
    })

    it('shows conversion rate input', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /más opciones/i }))
      await userEvent.click(screen.getByRole('button', { name: /transferir/i }))
      expect(screen.getByText(/tasa de conversión/i)).toBeInTheDocument()
    })
  })

  describe('close button', () => {
    it('closes modal', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /cerrar/i }))
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /agregar gasto/i })).not.toBeInTheDocument()
      })
    })

    it('resets amount after close and reopen', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.type(screen.getByRole('textbox', { name: /monto/i }), '500')
      await userEvent.click(screen.getByRole('button', { name: /cerrar/i }))
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /agregar gasto/i })).not.toBeInTheDocument()
      })
      await new Promise((r) => setTimeout(r, 300))
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      expect((screen.getByRole('textbox', { name: /monto/i }) as HTMLInputElement).value).toBe('')
    })
  })

  describe('submit', () => {
    it('calls onSubmit with GASTO data', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.type(screen.getByRole('textbox', { name: /monto/i }), '500')
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ tipo: 'GASTO', monto: 500 }),
        )
      })
    })

    it('calls onSubmit with INGRESO data', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /ingreso/i }))
      await userEvent.type(screen.getByRole('textbox', { name: /monto/i }), '1000')
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ tipo: 'INGRESO', monto: 1000 }),
        )
      })
    })

    it('calls onSubmit with TRANSFERENCIA data', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.click(screen.getByRole('button', { name: /más opciones/i }))
      await userEvent.click(screen.getByRole('button', { name: /transferir/i }))
      await userEvent.type(screen.getByRole('textbox', { name: /monto/i }), '200')
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ tipo: 'TRANSFERENCIA', monto: 200 }),
        )
      })
    })

    it('shows success toast after submit', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.type(screen.getByRole('textbox', { name: /monto/i }), '500')
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
      await waitFor(() => {
        expect(screen.getByText(/gasto guardado/i)).toBeInTheDocument()
      })
    })

    it('shows error toast when onSubmit throws', async () => {
      mockOnSubmit.mockRejectedValueOnce(new Error('Error de prueba'))
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.type(screen.getByRole('textbox', { name: /monto/i }), '500')
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
      await waitFor(() => {
        expect(screen.getByText(/error de prueba/i)).toBeInTheDocument()
      })
    })

    it('closes modal after successful submit', async () => {
      renderQA()
      await userEvent.click(screen.getByRole('button', { name: /quick add/i }))
      await userEvent.type(screen.getByRole('textbox', { name: /monto/i }), '500')
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /agregar gasto/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('smart input intent', () => {
    it('opens prefilled and still requires explicit save', async () => {
      const onSuccess = vi.fn()
      render(
        <QuickAdd
          onSubmit={mockOnSubmit}
          onSuccess={onSuccess}
          initialIntent={{
            open: true,
            requestId: 'smart-1',
            tipo: 'GASTO',
            monto: 900000,
            descripcion: 'TV',
            categoria: 'compras',
            tarjetaId: 'card1',
            cuotas: 6,
            fecha: '2026-08-06',
          }}
        />
      )

      expect(screen.getByRole('heading', { name: /compra en tarjeta/i })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /monto/i })).toHaveValue('900.000')
      expect(screen.getByPlaceholderText(/descripción/i)).toHaveValue('TV')
      expect(screen.getByRole('combobox', { name: /cuenta/i })).toHaveValue('card:card1')
      expect(mockOnSubmit).not.toHaveBeenCalled()

      await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
      await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        tipo: 'TARJETA', monto: 900000, tarjeta_id: 'card1', cantidad_cuotas: 6,
      })))
      expect(onSuccess).toHaveBeenCalledOnce()
    })

    it('blocks save until an ambiguous selector is reviewed', async () => {
      render(
        <QuickAdd
          onSubmit={mockOnSubmit}
          initialIntent={{
            open: true,
            requestId: 'smart-2',
            tipo: 'INGRESO',
            monto: 100,
            warnings: ['Revisá la cuenta “Galicia”.'],
            reviewFields: ['cuenta'],
          }}
        />
      )

      const save = screen.getByRole('button', { name: /guardar/i })
      expect(screen.getByRole('alert')).toHaveTextContent(/revisá la cuenta/i)
      expect(save).toBeDisabled()
      await userEvent.selectOptions(screen.getByRole('combobox', { name: /cuenta/i }), 'acc2')
      expect(save).toBeEnabled()
    })
  })


})
