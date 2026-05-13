import { describe, it, expect } from 'vitest'
import {
  createInversionSchema,
  updateInversionSchema,
  registrarRetornoSchema,
  registrarPrecioSchema,
} from '../schemas/inversiones.schema'

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

describe('inversiones.schema', () => {
  describe('createInversionSchema', () => {
    it('valid basic', () => {
      const result = createInversionSchema.safeParse({
        cuenta_id: VALID_UUID,
        ticker: 'AAPL',
        monto_total: 50000,
        tipo: 'ACCIONES',
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(true)
    })

    it('valid with all fields', () => {
      const result = createInversionSchema.safeParse({
        cuenta_id: VALID_UUID,
        ticker: 'AL30',
        nombre: 'Bono Argentina',
        sector: 'Renta Fija',
        monto_total: 100000,
        tipo: 'BONOS',
        tipo_liquidez: 'DIAS',
        cantidad: 100,
        precio_por_unidad: 1000,
        moneda: 'ARS',
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(true)
    })

    it('invalid tipo', () => {
      const result = createInversionSchema.safeParse({
        cuenta_id: VALID_UUID,
        ticker: 'TEST',
        monto_total: 1000,
        tipo: 'INVALID',
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })

    it('invalid tipo_liquidez', () => {
      const result = createInversionSchema.safeParse({
        cuenta_id: VALID_UUID,
        ticker: 'TEST',
        monto_total: 1000,
        tipo: 'ACCIONES',
        tipo_liquidez: 'INVALID',
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })

    it('empty ticker fails', () => {
      const result = createInversionSchema.safeParse({
        cuenta_id: VALID_UUID,
        ticker: '',
        monto_total: 1000,
        tipo: 'ACCIONES',
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })

    it('ticker too long fails', () => {
      const result = createInversionSchema.safeParse({
        cuenta_id: VALID_UUID,
        ticker: 'A'.repeat(21),
        monto_total: 1000,
        tipo: 'ACCIONES',
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })

    it('negative monto fails', () => {
      const result = createInversionSchema.safeParse({
        cuenta_id: VALID_UUID,
        ticker: 'TEST',
        monto_total: -1000,
        tipo: 'ACCIONES',
        fecha_inicio: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateInversionSchema', () => {
    it('valid partial', () => {
      const result = updateInversionSchema.safeParse({ ticker: 'NEW_TICKER' })
      expect(result.success).toBe(true)
    })

    it('valid with all fields', () => {
      const result = updateInversionSchema.safeParse({
        ticker: 'U',
        nombre: 'Uber Updated',
        sector: 'Tech',
        tipo: 'ACCIONES',
        tipo_liquidez: 'INMEDIATA',
        cantidad: 50,
        precio_por_unidad: 75.5,
      })
      expect(result.success).toBe(true)
    })

    it('empty valid', () => {
      const result = updateInversionSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('registrarRetornoSchema', () => {
    it('valid', () => {
      const result = registrarRetornoSchema.safeParse({
        cantidad_vendida: 10,
        precio_venta: 150,
        cuenta_destino_id: VALID_UUID,
      })
      expect(result.success).toBe(true)
    })

    it('valid with optional fields', () => {
      const result = registrarRetornoSchema.safeParse({
        cantidad_vendida: 5,
        precio_venta: 200,
        cuenta_destino_id: VALID_UUID,
        fecha: '2024-06-01',
        descripcion: 'Partial sale',
      })
      expect(result.success).toBe(true)
    })

    it('negative cantidad fails', () => {
      const result = registrarRetornoSchema.safeParse({
        cantidad_vendida: -5,
        precio_venta: 100,
        cuenta_destino_id: VALID_UUID,
      })
      expect(result.success).toBe(false)
    })

    it('negative precio fails', () => {
      const result = registrarRetornoSchema.safeParse({
        cantidad_vendida: 5,
        precio_venta: -100,
        cuenta_destino_id: VALID_UUID,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('registrarPrecioSchema', () => {
    it('valid', () => {
      const result = registrarPrecioSchema.safeParse({
        precio: 150.5,
      })
      expect(result.success).toBe(true)
    })

    it('valid with date', () => {
      const result = registrarPrecioSchema.safeParse({
        precio: 200,
        fecha: '2024-06-15',
      })
      expect(result.success).toBe(true)
    })

    it('negative precio fails', () => {
      const result = registrarPrecioSchema.safeParse({
        precio: -50,
      })
      expect(result.success).toBe(false)
    })
  })
})