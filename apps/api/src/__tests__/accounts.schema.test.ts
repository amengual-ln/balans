import { describe, it, expect } from 'vitest'
import {
  createAccountSchema,
  updateAccountSchema,
  adjustBalanceSchema,
  getAccountsQuerySchema,
  recargarFondoSchema,
  TipoCuentaSchema,
} from '../schemas/accounts.schema'

describe('accounts.schema', () => {
  describe('createAccountSchema', () => {
    it('valid account', () => {
      const result = createAccountSchema.safeParse({
        nombre: 'Banco Galicia',
        tipo: 'BANCO',
        moneda: 'ARS',
      })
      expect(result.success).toBe(true)
    })

    it('valid with optional fields', () => {
      const result = createAccountSchema.safeParse({
        nombre: 'Wise USD',
        tipo: 'BANCO',
        moneda: 'USD',
        saldo_inicial: 1000,
        recarga_mensual: 500,
      })
      expect(result.success).toBe(true)
    })

    it('invalid tipo', () => {
      const result = createAccountSchema.safeParse({
        nombre: 'Test',
        tipo: 'INVALID',
        moneda: 'ARS',
      })
      expect(result.success).toBe(false)
    })

    it('invalid moneda', () => {
      const result = createAccountSchema.safeParse({
        nombre: 'Test',
        tipo: 'BANCO',
        moneda: 'XYZ',
      })
      expect(result.success).toBe(false)
    })

    it('empty nombre fails', () => {
      const result = createAccountSchema.safeParse({
        nombre: '',
        tipo: 'BANCO',
        moneda: 'ARS',
      })
      expect(result.success).toBe(false)
    })

    it('nombre too long fails', () => {
      const result = createAccountSchema.safeParse({
        nombre: 'a'.repeat(101),
        tipo: 'BANCO',
        moneda: 'ARS',
      })
      expect(result.success).toBe(false)
    })

    it('negative saldo_inicial fails', () => {
      const result = createAccountSchema.safeParse({
        nombre: 'Test',
        tipo: 'BANCO',
        moneda: 'ARS',
        saldo_inicial: -100,
      })
      expect(result.success).toBe(false)
    })

    it('string saldo_inicial parsed', () => {
      const result = createAccountSchema.safeParse({
        nombre: 'Test',
        tipo: 'BANCO',
        moneda: 'ARS',
        saldo_inicial: '500.50',
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.saldo_inicial).toBe(500.5)
    })
  })

  describe('updateAccountSchema', () => {
    it('valid partial update', () => {
      const result = updateAccountSchema.safeParse({
        nombre: 'New Name',
      })
      expect(result.success).toBe(true)
    })

    it('valid with all updatable fields', () => {
      const result = updateAccountSchema.safeParse({
        nombre: 'Updated',
        activa: false,
        recarga_mensual: 200,
      })
      expect(result.success).toBe(true)
    })

    it('empty object valid', () => {
      const result = updateAccountSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('negative recarga_mensual fails', () => {
      const result = updateAccountSchema.safeParse({
        recarga_mensual: -50,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('adjustBalanceSchema', () => {
    it('valid', () => {
      const result = adjustBalanceSchema.safeParse({
        nuevo_saldo: 1500,
        descripcion: 'Correction',
      })
      expect(result.success).toBe(true)
    })

    it('negative nuevo_saldo fails', () => {
      const result = adjustBalanceSchema.safeParse({
        nuevo_saldo: -100,
        descripcion: 'Test',
      })
      expect(result.success).toBe(false)
    })

    it('empty descripcion fails', () => {
      const result = adjustBalanceSchema.safeParse({
        nuevo_saldo: 1000,
        descripcion: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('getAccountsQuerySchema', () => {
    it('valid with filters', () => {
      const result = getAccountsQuerySchema.safeParse({
        activa: 'true',
        tipo: 'BANCO',
      })
      expect(result.success).toBe(true)
    })

    it('converts string boolean', () => {
      const result = getAccountsQuerySchema.safeParse({ activa: 'false' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.activa).toBe(false)
    })

    it('empty valid', () => {
      const result = getAccountsQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('recargarFondoSchema', () => {
    it('valid with monto', () => {
      const result = recargarFondoSchema.safeParse({ monto: 500 })
      expect(result.success).toBe(true)
    })

    it('no monto also valid (uses recarga_mensual)', () => {
      const result = recargarFondoSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('negative monto fails', () => {
      const result = recargarFondoSchema.safeParse({ monto: -100 })
      expect(result.success).toBe(false)
    })
  })

  describe('TipoCuentaSchema', () => {
    it('all valid types pass', () => {
      const tipos = ['BANCO', 'BILLETERA', 'BROKER', 'EFECTIVO', 'FONDO_DESCUENTO']
      for (const t of tipos) {
        expect(TipoCuentaSchema.safeParse(t).success).toBe(true)
      }
    })

    it('invalid fails', () => {
      expect(TipoCuentaSchema.safeParse('INVALID').success).toBe(false)
    })
  })
})