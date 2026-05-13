import { describe, it, expect } from 'vitest'
import {
  createCardSchema,
  updateCardSchema,
} from '../schemas/cards.schema'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

describe('cards.schema', () => {
  describe('createCardSchema', () => {
    it('valid', () => {
      const result = createCardSchema.safeParse({
        nombre: 'Visa Classic',
        tipo: 'VISA',
        cuenta_id: VALID_UUID,
        limite_total: 500000,
        dia_cierre: 15,
        dia_vencimiento: 10,
      })
      expect(result.success).toBe(true)
    })

    it('valid with optional moneda', () => {
      const result = createCardSchema.safeParse({
        nombre: 'Mastercard Gold',
        tipo: 'MASTERCARD',
        cuenta_id: VALID_UUID,
        limite_total: 1000000,
        moneda: 'USD',
        dia_cierre: 20,
        dia_vencimiento: 15,
      })
      expect(result.success).toBe(true)
    })

    it('invalid tipo', () => {
      const result = createCardSchema.safeParse({
        nombre: 'Test',
        tipo: 'AMEX',
        cuenta_id: VALID_UUID,
        limite_total: 100000,
        dia_cierre: 1,
        dia_vencimiento: 1,
      })
      expect(result.success).toBe(false)
    })

    it('invalid cuenta_id', () => {
      const result = createCardSchema.safeParse({
        nombre: 'Test',
        tipo: 'VISA',
        cuenta_id: 'invalid',
        limite_total: 100000,
        dia_cierre: 1,
        dia_vencimiento: 1,
      })
      expect(result.success).toBe(false)
    })

    it('negative limite fails', () => {
      const result = createCardSchema.safeParse({
        nombre: 'Test',
        tipo: 'VISA',
        cuenta_id: VALID_UUID,
        limite_total: -1000,
        dia_cierre: 1,
        dia_vencimiento: 1,
      })
      expect(result.success).toBe(false)
    })

    it('dia_cierre > 31 fails', () => {
      const result = createCardSchema.safeParse({
        nombre: 'Test',
        tipo: 'VISA',
        cuenta_id: VALID_UUID,
        limite_total: 100000,
        dia_cierre: 32,
        dia_vencimiento: 1,
      })
      expect(result.success).toBe(false)
    })

    it('dia_vencimiento 0 fails', () => {
      const result = createCardSchema.safeParse({
        nombre: 'Test',
        tipo: 'VISA',
        cuenta_id: VALID_UUID,
        limite_total: 100000,
        dia_cierre: 1,
        dia_vencimiento: 0,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateCardSchema', () => {
    it('valid partial', () => {
      const result = updateCardSchema.safeParse({ nombre: 'New Name' })
      expect(result.success).toBe(true)
    })

    it('valid with activa', () => {
      const result = updateCardSchema.safeParse({ activa: false })
      expect(result.success).toBe(true)
    })

    it('empty valid', () => {
      const result = updateCardSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})