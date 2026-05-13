import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditMovementModal from '../components/EditMovementModal'
import type { Movement } from '@/hooks/useMovements'

vi.mock('swr', () => ({ mutate: vi.fn() }))

const baseMovement: Movement = {
  id: 'm1',
  tipo: 'GASTO',
  descripcion: 'Supermercado',
  categoria: 'Alimentación',
  monto: '5000',
  moneda: 'ARS',
  fecha: '2024-01-15T10:00:00.000Z',
  cuenta_origen: { id: 'c1', nombre: 'Banco Galicia', tipo: 'BANCO', moneda: 'ARS' },
  cuenta_destino: null,
  tarjeta: null,
  deuda: null,
  movimiento_relacionado_id: null,
  metadata: null,
}

const mockOnClose = vi.fn()
const mockOnSuccess = vi.fn().mockResolvedValue(undefined)
const mockOnDeleted = vi.fn().mockResolvedValue(undefined)

const renderModal = (movement: Movement) =>
  render(
    <EditMovementModal
      movement={movement}
      onClose={mockOnClose}
      onSuccess={mockOnSuccess}
      onDeleted={mockOnDeleted}
    />
  )

describe('EditMovementModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('renders modal with movement description', () => {
      renderModal(baseMovement)
      expect(screen.getByRole('heading', { name: /editar movimiento/i })).toBeInTheDocument()
      expect(screen.getByText('Supermercado')).toBeInTheDocument()
    })

    it('renders form fields with current values', () => {
      renderModal(baseMovement)
      expect((document.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('2024-01-15')
      const textboxes = screen.getAllByRole('textbox')
      expect(textboxes[0]).toHaveValue('Supermercado')
      expect(textboxes[1]).toHaveValue('Alimentación')
    })

    it('X close button calls onClose', async () => {
      renderModal(baseMovement)
      await userEvent.click(document.querySelector('button[class*="text-text-secondary"]') as HTMLButtonElement)
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('form fields', () => {
    it('date field is editable', async () => {
      renderModal(baseMovement)
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
      await userEvent.clear(dateInput)
      await userEvent.type(dateInput, '2024-02-01')
      expect(dateInput.value).toBe('2024-02-01')
    })

    it('descripcion field is editable', async () => {
      renderModal(baseMovement)
      const textboxes = screen.getAllByRole('textbox')
      await userEvent.clear(textboxes[0])
      await userEvent.type(textboxes[0], 'Panadería')
      expect(textboxes[0]).toHaveValue('Panadería')
    })

    it('categoria field is editable', async () => {
      renderModal(baseMovement)
      const textboxes = screen.getAllByRole('textbox')
      await userEvent.clear(textboxes[1])
      await userEvent.type(textboxes[1], 'Comida')
      expect(textboxes[1]).toHaveValue('Comida')
    })
  })

  describe('submit', () => {
    it('calls apiPatch on submit and calls onSuccess', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { ...baseMovement, descripcion: 'Updated' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      renderModal(baseMovement)
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
      expect(mockOnClose).toHaveBeenCalled()
      mockFetch.mockRestore()
    })

    it('shows error when submit fails', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(null, { status: 500 })
      )
      renderModal(baseMovement)
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument()
      })
    })

    it('disables buttons while submitting', async () => {
      let resolve: (r: Response) => void
      vi.spyOn(global, 'fetch').mockImplementationOnce(
        () => new Promise((r) => { resolve = r as any; })
      )
      renderModal(baseMovement)
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
      expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled()
      resolve!(new Response(JSON.stringify({ data: baseMovement }), { status: 200 }))
    })
  })

  describe('delete', () => {
    it('shows confirm dialog on delete click', async () => {
      window.confirm = vi.fn().mockReturnValue(false)
      renderModal(baseMovement)
      await userEvent.click(screen.getByRole('button', { name: /eliminar movimiento/i }))
      expect(window.confirm).toHaveBeenCalledWith('¿Eliminar este movimiento? La cuenta asociada será ajustada.')
    })

    it('does not delete when confirm is cancelled', async () => {
      window.confirm = vi.fn().mockReturnValue(false)
      renderModal(baseMovement)
      await userEvent.click(screen.getByRole('button', { name: /eliminar movimiento/i }))
      expect(mockOnDeleted).not.toHaveBeenCalled()
    })
  })
})