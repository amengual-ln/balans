import { describe, it, expect } from 'vitest'
import {
  createDebtSchema,
  updateDebtSchema,
  payDebtSchema,
} from '../schemas/debts.schema'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

describe('debts.schema', () => {
  describe('createDebtSchema', () => {
    it('valid personal debt', () => {
      const result = createDebtSchema.safeParse({
        tipo: 'PERSONAL',
        direccion: 'POR_PAGAR',
        acreedor: 'Juan Perez',
        monto_total: 10000,
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(true)
    })

    it('valid with cuotas', () => {
      const result = createDebtSchema.safeParse({
        tipo: 'CREDITO_BILLETERA',
        direccion: 'POR_PAGAR',
        acreedor: 'Mercado Credito',
        monto_total: 50000,
        cantidad_cuotas: 12,
        monto_cuota: 4166.67,
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(true)
    })

    it('invalid tipo', () => {
      const result = createDebtSchema.safeParse({
        tipo: 'INVALID',
        acreedor: 'Test',
        monto_total: 1000,
      })
      expect(result.success).toBe(false)
    })

    it('invalid direccion', () => {
      const result = createDebtSchema.safeParse({
        tipo: 'PERSONAL',
        direccion: 'INVALID',
        acreedor: 'Test',
        monto_total: 1000,
      })
      expect(result.success).toBe(false)
    })

    it('empty acreedor fails', () => {
      const result = createDebtSchema.safeParse({
        tipo: 'PERSONAL',
        acreedor: '',
        monto_total: 1000,
      })
      expect(result.success).toBe(false)
    })

    it('negative monto fails', () => {
      const result = createDebtSchema.safeParse({
        tipo: 'PERSONAL',
        acreedor: 'Test',
        monto_total: -500,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateDebtSchema', () => {
    it('valid partial', () => {
      const result = updateDebtSchema.safeParse({ acreedor: 'New Creditor' })
      expect(result.success).toBe(true)
    })

    it('valid with cuotas update', () => {
      const result = updateDebtSchema.safeParse({
        cantidad_cuotas: 6,
        monto_cuota: 5000,
      })
      expect(result.success).toBe(true)
    })

    it('empty valid', () => {
      const result = updateDebtSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('payDebtSchema', () => {
    it('valid', () => {
      const result = payDebtSchema.safeParse({
        cuenta_id: VALID_UUID,
        monto: 1000,
      })
      expect(result.success).toBe(true)
    })

    it('valid with all fields', () => {
      const result = payDebtSchema.safeParse({
        cuenta_id: VALID_UUID,
        monto: 500,
        fecha: '2024-01-15T10:00:00Z',
        descripcion: 'Partial payment',
      })
      expect(result.success).toBe(true)
    })

    it('invalid cuenta_id', () => {
      const result = payDebtSchema.safeParse({
        cuenta_id: 'not-uuid',
        monto: 100,
      })
      expect(result.success).toBe(false)
    })

    it('negative monto fails', () => {
      const result = payDebtSchema.safeParse({
        cuenta_id: VALID_UUID,
        monto: -100,
      })
      expect(result.success).toBe(false)
    })
  })
})