import { describe, it, expect } from 'vitest'
import {
  quickAddMovementSchema,
  createIncomeSchema,
  createExpenseSchema,
  createTransferSchema,
  createCardPurchaseSchema,
  createCardPurchaseWithDiscountSchema,
  getMovementsQuerySchema,
  expenseWithDiscountSchema,
  editMovementSchema,
  TipoMovimientoSchema,
} from '../schemas/movements.schema'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

describe('movements.schema', () => {
  describe('quickAddMovementSchema', () => {
    it('valid income', () => {
      const result = quickAddMovementSchema.safeParse({
        tipo: 'INGRESO',
        monto: 1000,
      })
      expect(result.success).toBe(true)
    })

    it('valid expense with all fields', () => {
      const result = quickAddMovementSchema.safeParse({
        tipo: 'GASTO',
        monto: 500,
        categoria: 'Comida',
        cuenta_id: VALID_UUID,
        descripcion: 'Almuerzo',
        fecha: '2024-01-15T10:00:00Z',
      })
      expect(result.success).toBe(true)
    })

    it('invalid tipo', () => {
      const result = quickAddMovementSchema.safeParse({
        tipo: 'TRANSFERENCIA',
        monto: 100,
      })
      expect(result.success).toBe(false)
    })

    it('negative monto fails', () => {
      const result = quickAddMovementSchema.safeParse({
        tipo: 'GASTO',
        monto: -100,
      })
      expect(result.success).toBe(false)
    })

    it('zero monto fails', () => {
      const result = quickAddMovementSchema.safeParse({
        tipo: 'INGRESO',
        monto: 0,
      })
      expect(result.success).toBe(false)
    })

    it('string monto gets parsed', () => {
      const result = quickAddMovementSchema.safeParse({
        tipo: 'GASTO',
        monto: '250.50',
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.monto).toBe(250.5)
    })

    it('invalid cuenta_id uuid', () => {
      const result = quickAddMovementSchema.safeParse({
        tipo: 'GASTO',
        monto: 100,
        cuenta_id: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
    })

    it('descripcion trimmed', () => {
      const result = quickAddMovementSchema.safeParse({
        tipo: 'INGRESO',
        monto: 100,
        descripcion: '  Salario  ',
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.descripcion).toBe('Salario')
    })
  })

  describe('createIncomeSchema', () => {
    it('valid income', () => {
      const result = createIncomeSchema.safeParse({
        cuenta_id: VALID_UUID,
        monto: 5000,
        descripcion: 'Salary',
      })
      expect(result.success).toBe(true)
    })

    it('valid with optional fields', () => {
      const result = createIncomeSchema.safeParse({
        cuenta_id: VALID_UUID,
        monto: 1000,
        descripcion: 'Freelance',
        categoria: 'Trabajo',
        moneda: 'USD',
        tasa_conversion: 1.2,
      })
      expect(result.success).toBe(true)
    })

    it('invalid cuenta_id', () => {
      const result = createIncomeSchema.safeParse({
        cuenta_id: 'invalid',
        monto: 1000,
      })
      expect(result.success).toBe(false)
    })

    it('invalid moneda', () => {
      const result = createIncomeSchema.safeParse({
        cuenta_id: VALID_UUID,
        monto: 1000,
        moneda: 'GBP',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createExpenseSchema', () => {
    it('valid expense', () => {
      const result = createExpenseSchema.safeParse({
        cuenta_id: VALID_UUID,
        monto: 250.5,
        descripcion: 'Utilities',
      })
      expect(result.success).toBe(true)
    })

    it('negative monto fails', () => {
      const result = createExpenseSchema.safeParse({
        cuenta_id: VALID_UUID,
        monto: -50,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createTransferSchema', () => {
    it('valid transfer', () => {
      const result = createTransferSchema.safeParse({
        cuenta_origen_id: VALID_UUID,
        cuenta_destino_id: '123e4567-e89b-12d3-a456-426614174001',
        monto: 1000,
      })
      expect(result.success).toBe(true)
    })

    it('same origin/dest — validated at service level, not schema', () => {
      const result = createTransferSchema.safeParse({
        cuenta_origen_id: VALID_UUID,
        cuenta_destino_id: VALID_UUID,
        monto: 1000,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('createCardPurchaseSchema', () => {
    it('valid purchase', () => {
      const result = createCardPurchaseSchema.safeParse({
        tarjeta_id: VALID_UUID,
        monto: 500,
        descripcion: 'Purchase',
      })
      expect(result.success).toBe(true)
    })

    it('valid with installments', () => {
      const result = createCardPurchaseSchema.safeParse({
        tarjeta_id: VALID_UUID,
        monto: 1200,
        cantidad_cuotas: 3,
        descripcion: 'Purchase in installments',
      })
      expect(result.success).toBe(true)
    })

    it('cuotas over 60 fails', () => {
      const result = createCardPurchaseSchema.safeParse({
        tarjeta_id: VALID_UUID,
        monto: 1200,
        cantidad_cuotas: 61,
      })
      expect(result.success).toBe(false)
    })

    it('cuotas below 1 fails', () => {
      const result = createCardPurchaseSchema.safeParse({
        tarjeta_id: VALID_UUID,
        monto: 1200,
        cantidad_cuotas: 0,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createCardPurchaseWithDiscountSchema', () => {
    it('valid discount purchase', () => {
      const result = createCardPurchaseWithDiscountSchema.safeParse({
        monto_total: 1000,
        porcentaje_descuento: 20,
        tarjeta_id: VALID_UUID,
        fondo_descuento_id: VALID_UUID,
      })
      expect(result.success).toBe(true)
    })

    it('porcentaje 0 fails', () => {
      const result = createCardPurchaseWithDiscountSchema.safeParse({
        monto_total: 1000,
        porcentaje_descuento: 0,
        tarjeta_id: VALID_UUID,
        fondo_descuento_id: VALID_UUID,
      })
      expect(result.success).toBe(false)
    })

    it('porcentaje 100 fails', () => {
      const result = createCardPurchaseWithDiscountSchema.safeParse({
        monto_total: 1000,
        porcentaje_descuento: 100,
        tarjeta_id: VALID_UUID,
        fondo_descuento_id: VALID_UUID,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('expenseWithDiscountSchema', () => {
    it('valid', () => {
      const result = expenseWithDiscountSchema.safeParse({
        monto_total: 1000,
        porcentaje_descuento: 15,
        cuenta_pago_id: VALID_UUID,
        fondo_descuento_id: VALID_UUID,
      })
      expect(result.success).toBe(true)
    })

    it('porcentaje 99 is max valid', () => {
      const result = expenseWithDiscountSchema.safeParse({
        monto_total: 1000,
        porcentaje_descuento: 99,
        cuenta_pago_id: VALID_UUID,
        fondo_descuento_id: VALID_UUID,
      })
      expect(result.success).toBe(true)
    })

    it('descripcion trimmed', () => {
      const result = expenseWithDiscountSchema.safeParse({
        monto_total: 1000,
        porcentaje_descuento: 10,
        cuenta_pago_id: VALID_UUID,
        fondo_descuento_id: VALID_UUID,
        descripcion: '  Shopping  ',
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.descripcion).toBe('Shopping')
    })
  })

  describe('getMovementsQuerySchema', () => {
    it('valid with all filters', () => {
      const result = getMovementsQuerySchema.safeParse({
        tipo: 'GASTO',
        cuenta_id: VALID_UUID,
        limit: '50',
        offset: '10',
      })
      expect(result.success).toBe(true)
    })

    it('defaults limit to 100', () => {
      const result = getMovementsQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.limit).toBe(100)
    })

    it('defaults offset to 0', () => {
      const result = getMovementsQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.offset).toBe(0)
    })

    it('limit over 1000 fails', () => {
      const result = getMovementsQuerySchema.safeParse({
        limit: '1001',
      })
      expect(result.success).toBe(false)
    })

    it('date parsing', () => {
      const result = getMovementsQuerySchema.safeParse({
        desde: '2024-01-01',
        hasta: '2024-01-31',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('editMovementSchema', () => {
    it('valid partial update', () => {
      const result = editMovementSchema.safeParse({
        descripcion: 'Updated desc',
      })
      expect(result.success).toBe(true)
    })

    it('valid full update', () => {
      const result = editMovementSchema.safeParse({
        descripcion: 'Updated',
        categoria: 'Food',
        fecha: '2024-02-01',
      })
      expect(result.success).toBe(true)
    })

    it('empty object valid (no updates)', () => {
      const result = editMovementSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('TipoMovimientoSchema', () => {
    it('all valid types pass', () => {
      const types = [
        'INGRESO', 'GASTO', 'TRANSFERENCIA', 'PAGO_TARJETA', 'GASTO_TARJETA',
        'GASTO_TARJETA_CON_DESCUENTO', 'PAGO_DEUDA', 'INVERSION', 'RETORNO_INVERSION',
        'AJUSTE', 'INGRESO_INICIAL', 'GASTO_CON_DESCUENTO', 'SUBSIDIO',
      ]
      for (const t of types) {
        expect(TipoMovimientoSchema.safeParse(t).success).toBe(true)
      }
    })

    it('invalid type fails', () => {
      expect(TipoMovimientoSchema.safeParse('INVALID').success).toBe(false)
    })
  })
})