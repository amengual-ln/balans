import { describe, expect, it } from 'vitest'
import type { Account } from '@/hooks/useAccounts'
import type { Card } from '@/hooks/useCards'
import { parseSmartInput } from '@/lib/smartInput'

const accounts: Account[] = [
  { id: 'galicia', nombre: 'Banco Galicia', tipo: 'BANCO', moneda: 'ARS', saldo_actual: 1, activa: true },
  { id: 'mp', nombre: 'Mercado Pago', tipo: 'BILLETERA', moneda: 'USD', saldo_actual: 1, activa: true },
  { id: 'freya', nombre: 'Fondo Freya', tipo: 'FONDO_DESCUENTO', moneda: 'ARS', saldo_actual: 1, activa: true },
]
const cards: Card[] = [
  { id: 'visa', nombre: 'Visa Galicia', tipo: 'VISA', moneda: 'ARS', limite_total: 1, limite_comprometido: 0, limite_disponible: 1, dia_cierre: 1, dia_vencimiento: 1, activa: true, cuenta_id: 'galicia' },
]
const now = new Date(2026, 7, 7, 10)
const parse = (text: string, customAccounts = accounts) => parseSmartInput(text, { accounts: customAccounts, cards, now })

describe('parseSmartInput', () => {
  it.each([
    ['café $4.500', 'GASTO', 4500, 'comida'],
    ['gasté 15,50 en café', 'GASTO', 15.5, 'comida'],
    ['Uber 20k ayer', 'GASTO', 20000, 'transporte'],
    ['cine 4500 categoría Salud', 'GASTO', 4500, 'salud'],
  ])('parses expense %s', (text, tipo, monto, categoria) => {
    const result = parse(text)
    expect(result).toMatchObject({ kind: 'movement', value: { tipo, monto, categoria } })
  })

  it('parses income and unique partial account name', () => {
    expect(parse('cobré 100000 sueldo en Galicia')).toMatchObject({
      kind: 'movement',
      value: { tipo: 'INGRESO', monto: 100000, cuentaId: 'galicia', descripcion: 'sueldo' },
    })
  })

  it('parses card and installments', () => {
    expect(parse('TV 900000 con Visa en 6 cuotas')).toMatchObject({
      kind: 'movement',
      value: { tipo: 'GASTO', monto: 900000, tarjetaId: 'visa', cuotas: 6, descripcion: 'TV' },
    })
  })

  it('parses transfer entities and rate', () => {
    expect(parse('transferí 20k de Galicia a Mercado Pago tasa 1050')).toMatchObject({
      kind: 'movement',
      value: { tipo: 'TRANSFERENCIA', monto: 20000, cuentaId: 'galicia', destinoId: 'mp', tasa: 1050 },
    })
  })

  it('parses discount and fund', () => {
    expect(parse('café 4500 con descuento 70% fondo Freya')).toMatchObject({
      kind: 'movement',
      value: { monto: 4500, descuento: 70, fondoId: 'freya', categoria: 'comida' },
    })
  })

  it('keeps card details on a discounted card purchase', () => {
    expect(parse('TV 900000 con Visa en 6 cuotas descuento 70% fondo Freya')).toMatchObject({
      kind: 'movement',
      value: { tarjetaId: 'visa', cuotas: 6, descuento: 70, fondoId: 'freya' },
    })
  })

  it.each([
    ['debo 100 a Pepito', 'POR_PAGAR', 'Pepito'],
    ['Pepito me debe 100', 'POR_COBRAR', 'Pepito'],
  ])('distinguishes debt direction: %s', (text, direccion, acreedor) => {
    expect(parse(text)).toMatchObject({ kind: 'debt', value: { direccion, acreedor, monto: 100 } })
  })

  it.each([
    ['café 100 hoy', '2026-08-07'],
    ['café 100 ayer', '2026-08-06'],
    ['café 100 el 5/8', '2026-08-05'],
    ['café 100 el 31/12/2025', '2025-12-31'],
  ])('parses date %s', (text, fecha) => {
    expect(parse(text)).toMatchObject({ kind: 'movement', value: { fecha } })
  })

  it('rejects future and incomplete input', () => {
    expect(parse('café 100 el 8/8/2026')).toMatchObject({ kind: 'failure', error: expect.stringMatching(/futura/) })
    expect(parse('transferí 100')).toMatchObject({ kind: 'failure', error: expect.stringMatching(/origen/) })
    expect(parse('café')).toMatchObject({ kind: 'failure', error: expect.stringMatching(/monto/) })
  })

  it('does not confuse a leading date with the amount', () => {
    expect(parse('ayer 5/8 café 4500')).toMatchObject({ kind: 'movement', value: { monto: 4500 } })
  })

  it('requires review for ambiguous or invalid explicit entities', () => {
    const ambiguous = [...accounts, { ...accounts[0], id: 'galicia-usd', nombre: 'Galicia USD' }]
    expect(parse('cobré 100 en Galicia', ambiguous)).toMatchObject({
      kind: 'movement', value: { reviewFields: ['cuenta'], warnings: [expect.stringMatching(/galicia/i)] },
    })
    expect(parse('TV 100 con Amex')).toMatchObject({
      kind: 'movement', value: { reviewFields: ['tarjeta'], warnings: [expect.stringMatching(/amex/i)] },
    })
  })
})
