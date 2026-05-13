import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MovementsList from '../components/MovementsList'
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

const movimientoIngreso: Movement = {
  ...baseMovement,
  id: 'm2',
  tipo: 'INGRESO',
  descripcion: 'Salario',
  categoria: 'Trabajo',
  monto: '150000',
}

const movimientoTransferencia: Movement = {
  ...baseMovement,
  id: 'm3',
  tipo: 'TRANSFERENCIA',
  descripcion: 'Transferencia a Mercado Pago',
  monto: '10000',
  cuenta_origen: { id: 'c1', nombre: 'Banco Galicia', tipo: 'BANCO', moneda: 'ARS' },
  cuenta_destino: { id: 'c2', nombre: 'Mercado Pago', tipo: 'BILLETERA', moneda: 'USD' },
}

const movimientoTarjeta: Movement = {
  ...baseMovement,
  id: 'm4',
  tipo: 'GASTO_TARJETA',
  descripcion: 'Restaurante',
  categoria: 'Comida',
  monto: '3500',
  cuenta_origen: null,
  tarjeta: { id: 't1', nombre: 'Visa Galicia', tipo: 'VISA' },
}

const movimientoDeuda: Movement = {
  ...baseMovement,
  id: 'm5',
  tipo: 'PAGO_DEUDA',
  descripcion: 'Pago cuota tarjeta',
  monto: '20000',
  cuenta_origen: { id: 'c1', nombre: 'Banco Galicia', tipo: 'BANCO', moneda: 'ARS' },
  deuda: { id: 'd1', acreedor: 'Banco Galicia', monto_original: '100000' },
}

const today = new Date().toISOString().split('T')[0]
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

const movimientoHoy: Movement = { ...baseMovement, id: 'm-hoy', fecha: `${today}T10:00:00.000Z` }
const movimientoAyer: Movement = { ...baseMovement, id: 'm-ayer', fecha: `${yesterday}T10:00:00.000Z` }

const subsidio: Movement = {
  ...baseMovement,
  id: 'sub1',
  tipo: 'SUBSIDIO',
  descripcion: 'Subsidio fondo descuento',
  monto: '500',
  movimiento_relacionado_id: 'm1',
  metadata: { porcentaje_descuento: 10 },
  cuenta_origen: { id: 'c3', nombre: 'Fondo Descuento', tipo: 'FONDO_DESCUENTO', moneda: 'ARS' },
}

const renderList = (props: { movements: Movement[]; isLoading?: boolean; onEditMovement?: (m: Movement) => void }) =>
  render(<MovementsList {...props} />)

describe('MovementsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders empty state when no movements', () => {
      renderList({ movements: [], isLoading: false })
      expect(screen.getByText(/sin movimientos/i)).toBeInTheDocument()
    })

    it('renders loading skeleton when isLoading true', () => {
      renderList({ movements: [], isLoading: true })
      expect(screen.getByLabelText(/cargando movimientos/i)).toBeInTheDocument()
    })

    it('renders movement rows', () => {
      renderList({ movements: [baseMovement], isLoading: false })
      expect(screen.getByText('Supermercado')).toBeInTheDocument()
      expect(screen.getByText(/\$5\.000/)).toBeInTheDocument()
    })
  })

  describe('grouping by date', () => {
    it('groups movements under a date heading', () => {
      const oldMovement = { ...baseMovement, id: 'm-old', fecha: '2020-01-01T10:00:00.000Z' }
      renderList({ movements: [oldMovement], isLoading: false })
      expect(screen.getByText(/1 ene/i)).toBeInTheDocument()
    })
  })

  describe('filter by type group', () => {
    it('shows all movements by default', () => {
      renderList({ movements: [baseMovement, movimientoIngreso], isLoading: false })
      expect(screen.getByText('Supermercado')).toBeInTheDocument()
      expect(screen.getByText('Salario')).toBeInTheDocument()
    })

    it('filters to income only', async () => {
      renderList({ movements: [baseMovement, movimientoIngreso], isLoading: false })
      await userEvent.selectOptions(screen.getByRole('combobox'), 'income')
      expect(screen.getByText('Salario')).toBeInTheDocument()
      expect(screen.queryByText('Supermercado')).not.toBeInTheDocument()
    })

    it('filters to expense only', async () => {
      renderList({ movements: [baseMovement, movimientoIngreso], isLoading: false })
      await userEvent.selectOptions(screen.getByRole('combobox'), 'expense')
      expect(screen.getByText('Supermercado')).toBeInTheDocument()
      expect(screen.queryByText('Salario')).not.toBeInTheDocument()
    })

    it('filters to transfers only', async () => {
      renderList({ movements: [baseMovement, movimientoTransferencia], isLoading: false })
      await userEvent.selectOptions(screen.getByRole('combobox'), 'transfer')
      expect(screen.getByText(/transferencia/i)).toBeInTheDocument()
      expect(screen.queryByText('Supermercado')).not.toBeInTheDocument()
    })
  })

  describe('filter by category', () => {
    it('filters by category text', async () => {
      renderList({ movements: [baseMovement, movimientoTarjeta], isLoading: false })
      await userEvent.type(screen.getByPlaceholderText(/categoría/i), 'ali')
      expect(screen.getByText('Supermercado')).toBeInTheDocument()
      expect(screen.queryByText('Restaurante')).not.toBeInTheDocument()
    })

    it('shows empty state when category filter matches nothing', async () => {
      renderList({ movements: [baseMovement], isLoading: false })
      await userEvent.type(screen.getByPlaceholderText(/categoría/i), 'xyz')
      expect(screen.getByText(/sin resultados/i)).toBeInTheDocument()
    })
  })

  describe('filter by description', () => {
    it('filters by description text', async () => {
      renderList({ movements: [baseMovement, movimientoTarjeta], isLoading: false })
      await userEvent.type(screen.getByPlaceholderText(/descripción/i), 'super')
      expect(screen.getByText('Supermercado')).toBeInTheDocument()
      expect(screen.queryByText('Restaurante')).not.toBeInTheDocument()
    })

    it('description filter is case-insensitive', async () => {
      renderList({ movements: [baseMovement, movimientoTarjeta], isLoading: false })
      await userEvent.type(screen.getByPlaceholderText(/descripción/i), 'SUPER')
      expect(screen.getByText('Supermercado')).toBeInTheDocument()
      expect(screen.queryByText('Restaurante')).not.toBeInTheDocument()
    })

    it('shows empty state when description filter matches nothing', async () => {
      renderList({ movements: [baseMovement], isLoading: false })
      await userEvent.type(screen.getByPlaceholderText(/descripción/i), 'xyz')
      expect(screen.getByText(/sin resultados/i)).toBeInTheDocument()
    })

    it('filters by description combined with type filter', async () => {
      renderList({ movements: [baseMovement, movimientoIngreso], isLoading: false })
      await userEvent.selectOptions(screen.getByRole('combobox'), 'expense')
      await userEvent.type(screen.getByPlaceholderText(/descripción/i), 'super')
      expect(screen.getByText('Supermercado')).toBeInTheDocument()
      expect(screen.queryByText('Salario')).not.toBeInTheDocument()
    })
  })

  describe('clear filters', () => {
    it('shows clear button when filters active', async () => {
      renderList({ movements: [baseMovement], isLoading: false })
      await userEvent.selectOptions(screen.getByRole('combobox'), 'expense')
      expect(screen.getByRole('button', { name: /limpiar/i })).toBeInTheDocument()
    })

    it('clears all filters on clear button', async () => {
      renderList({ movements: [baseMovement, movimientoIngreso], isLoading: false })
      await userEvent.selectOptions(screen.getByRole('combobox'), 'expense')
      await userEvent.click(screen.getByRole('button', { name: /limpiar/i }))
      expect(screen.getByText('Supermercado')).toBeInTheDocument()
      expect(screen.getByText('Salario')).toBeInTheDocument()
    })

    it('shows clear button when description filter is active', async () => {
      renderList({ movements: [baseMovement], isLoading: false })
      await userEvent.type(screen.getByPlaceholderText(/descripción/i), 'super')
      expect(screen.getByRole('button', { name: /limpiar/i })).toBeInTheDocument()
    })

    it('clears description filter on clear button', async () => {
      renderList({ movements: [baseMovement], isLoading: false })
      await userEvent.type(screen.getByPlaceholderText(/descripción/i), 'super')
      await userEvent.click(screen.getByRole('button', { name: /limpiar/i }))
      expect(screen.getByText('Supermercado')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /limpiar/i })).not.toBeInTheDocument()
    })
  })

  describe('edit on triple click', () => {
    it('does not call onEditMovement on single click', async () => {
      const onEdit = vi.fn()
      renderList({ movements: [baseMovement], isLoading: false, onEditMovement: onEdit })
      await userEvent.click(screen.getByText('Supermercado'))
      expect(onEdit).not.toHaveBeenCalled()
    })

    it('calls onEditMovement on triple click for editable types', async () => {
      const onEdit = vi.fn()
      renderList({ movements: [baseMovement], isLoading: false, onEditMovement: onEdit })
      await userEvent.dblClick(screen.getByText('Supermercado'))
      await userEvent.click(screen.getByText('Supermercado'))
      await waitFor(() => {
        expect(onEdit).toHaveBeenCalledWith(baseMovement)
      })
    })

    it('does not call onEditMovement for card payment types', async () => {
      const onEdit = vi.fn()
      renderList({ movements: [movimientoTarjeta], isLoading: false, onEditMovement: onEdit })
      const row = document.querySelector('[class*="min-w-0"]') as HTMLElement
      await userEvent.dblClick(row)
      await userEvent.click(row)
      expect(onEdit).not.toHaveBeenCalled()
    })
  })

  describe('card movement rendering', () => {
    it('renders card movement with card name in meta', () => {
      renderList({ movements: [movimientoTarjeta], isLoading: false })
      expect(screen.getByText(/restaurante/i)).toBeInTheDocument()
      expect(screen.getByText(/comida · visa galicia/i)).toBeInTheDocument()
    })
  })

  describe('debt movement rendering', () => {
    it('renders debt movement with creditor name in meta', () => {
      renderList({ movements: [movimientoDeuda], isLoading: false })
      expect(screen.getByText(/pago cuota tarjeta/i)).toBeInTheDocument()
      expect(screen.getByText(/banco galicia/i)).toBeInTheDocument()
    })
  })

  describe('subsidio sub-row', () => {
    it('shows subsidy info for GASTO_TARJETA_CON_DESCUENTO', () => {
      const gastoDescuento: Movement = {
        ...baseMovement,
        id: 'm-desc',
        tipo: 'GASTO_TARJETA_CON_DESCUENTO',
        monto: '4500',
      }
      const relatedSubsidio: Movement = {
        ...baseMovement,
        id: 'sub1',
        tipo: 'SUBSIDIO',
        descripcion: 'Subsidio fondo descuento',
        monto: '500',
        movimiento_relacionado_id: 'm-desc',
        metadata: { porcentaje_descuento: 10 },
        cuenta_origen: { id: 'c3', nombre: 'Fondo Descuento', tipo: 'FONDO_DESCUENTO', moneda: 'ARS' },
      }
      renderList({ movements: [gastoDescuento, relatedSubsidio], isLoading: false })
      expect(screen.getByText(/fondo descuento/i)).toBeInTheDocument()
    })

    it('does not show subsidy for regular GASTO', () => {
      renderList({ movements: [baseMovement], isLoading: false })
      expect(screen.queryByText(/subsidio/i)).not.toBeInTheDocument()
    })
  })

  describe('amount formatting', () => {
    it('shows positive sign for income', () => {
      renderList({ movements: [movimientoIngreso], isLoading: false })
      expect(screen.getByText('+$150.000')).toBeInTheDocument()
    })

    it('shows negative sign for expense', () => {
      renderList({ movements: [baseMovement], isLoading: false })
      expect(screen.getByText(/\$[45]\.000/)).toBeInTheDocument()
    })

    it('shows non-prefixed for transfer', () => {
      renderList({ movements: [movimientoTransferencia], isLoading: false })
      expect(screen.getByText(/\$10\.?000/)).toBeInTheDocument()
    })
  })

  describe('movement count footer', () => {
    it('shows movement count', () => {
      renderList({ movements: [baseMovement, movimientoIngreso], isLoading: false })
      expect(screen.getByText(/2 movimientos en el período/i)).toBeInTheDocument()
    })
  })
})