import { describe, it, expect } from 'vitest'
import {
  createSuscripcionSchema,
  updateSuscripcionSchema,
  pagarSuscripcionSchema,
} from '../schemas/suscripciones.schema'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

describe('suscripciones.schema', () => {
  describe('createSuscripcionSchema', () => {
    it('valid', () => {
      const result = createSuscripcionSchema.safeParse({
        nombre: 'Netflix',
        monto: 1500,
        cuenta_id: VALID_UUID,
        frecuencia: 'MENSUAL',
        dia_pago: 15,
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(true)
    })

    it('valid with all optional fields', () => {
      const result = createSuscripcionSchema.safeParse({
        nombre: 'Spotify',
        descripcion: 'Premium plan',
        monto: 999,
        moneda: 'USD',
        cuenta_id: VALID_UUID,
        frecuencia: 'MENSUAL',
        dia_pago: 5,
        fecha_inicio: '2024-01-01',
        fecha_fin: '2025-01-01',
        categoria: 'Entretenimiento',
      })
      expect(result.success).toBe(true)
    })

    it('invalid frecuencia', () => {
      const result = createSuscripcionSchema.safeParse({
        nombre: 'Test',
        monto: 100,
        cuenta_id: VALID_UUID,
        frecuencia: 'WEEKLY',
        dia_pago: 1,
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })

    it('empty nombre fails', () => {
      const result = createSuscripcionSchema.safeParse({
        nombre: '',
        monto: 100,
        cuenta_id: VALID_UUID,
        frecuencia: 'MENSUAL',
        dia_pago: 1,
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })

    it('negative monto fails', () => {
      const result = createSuscripcionSchema.safeParse({
        nombre: 'Test',
        monto: -100,
        cuenta_id: VALID_UUID,
        frecuencia: 'MENSUAL',
        dia_pago: 1,
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })

    it('invalid cuenta_id', () => {
      const result = createSuscripcionSchema.safeParse({
        nombre: 'Test',
        monto: 100,
        cuenta_id: 'invalid',
        frecuencia: 'MENSUAL',
        dia_pago: 1,
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })

    it('dia_pago out of range', () => {
      const result = createSuscripcionSchema.safeParse({
        nombre: 'Test',
        monto: 100,
        cuenta_id: VALID_UUID,
        frecuencia: 'MENSUAL',
        dia_pago: 32,
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateSuscripcionSchema', () => {
    it('valid partial', () => {
      const result = updateSuscripcionSchema.safeParse({ nombre: 'New Name' })
      expect(result.success).toBe(true)
    })

    it('valid with all fields', () => {
      const result = updateSuscripcionSchema.safeParse({
        nombre: 'Updated',
        descripcion: 'New desc',
        monto: 2000,
        frecuencia: 'TRIMESTRAL',
        activo: false,
      })
      expect(result.success).toBe(true)
    })

    it('empty valid', () => {
      const result = updateSuscripcionSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('pagarSuscripcionSchema', () => {
    it('valid', () => {
      const result = pagarSuscripcionSchema.safeParse({
        cuenta_id: VALID_UUID,
      })
      expect(result.success).toBe(true)
    })

    it('valid with monto override', () => {
      const result = pagarSuscripcionSchema.safeParse({
        cuenta_id: VALID_UUID,
        monto: 2000,
      })
      expect(result.success).toBe(true)
    })

    it('negative monto fails', () => {
      const result = pagarSuscripcionSchema.safeParse({
        cuenta_id: VALID_UUID,
        monto: -100,
      })
      expect(result.success).toBe(false)
    })
  })
})