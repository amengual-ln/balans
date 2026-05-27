import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockStore: Record<string, any[]> = {}

function resetStore() {
  Object.keys(mockStore).forEach(k => delete mockStore[k])
}

type MockCb = (value?: any) => void

vi.mock('../lib/supabase.js', () => {
  function chainableQuery(data: any[], _table: string) {
    const filters: Array<(row: any) => boolean> = []

    const api = {
      eq(field: string, value: any) {
        filters.push(row => row[field] === value)
        return api
      },
      single() {
        const filtered = filters.reduce((acc, f) => acc.filter(f), data)
        const item = filtered[0] ?? null
        return Promise.resolve({ data: item, error: item ? null : { code: 'PGRST116' } })
      },
      maybeSingle() {
        return this.single()
      },
      then(cb: MockCb) {
        const filtered = filters.reduce((acc, f) => acc.filter(f), data)
        cb({ data: filtered, error: null, count: filtered.length })
        return api
      },
      order(_field: string, _opts?: any) {
        return api
      },
      range(_start: number, _end: number) {
        return api
      },
      or(_cond: string) {
        return api
      },
      in(field: string, values: string[]) {
        filters.push(row => values.includes(row[field]))
        return api
      },
    }
    return api
  }

  function query(table: string) {
    const tableData = mockStore[table] ?? []
    return {
      select(_cols?: string) {
        return chainableQuery(tableData, table)
      },
      insert(data: any) {
        return {
          select() {
            return {
              single() {
                const record = { id: 'generated-id', ...data }
                if (!mockStore[table]) mockStore[table] = []
                mockStore[table].push(record)
                return Promise.resolve({ data: record, error: null })
              },
            }
          },
        }
      },
      update(data: any) {
        const filters: Array<(row: any) => boolean> = []
        return {
          eq(field: string, value: any) {
            filters.push(row => row[field] === value)
            return {
              select() {
                return {
                  single() {
                    const idx = mockStore[table]?.findIndex(r => filters.every(f => f(r)))
                    if (idx !== undefined && idx >= 0) {
                      mockStore[table][idx] = { ...mockStore[table][idx], ...data }
                      return Promise.resolve({ data: mockStore[table][idx], error: null })
                    }
                    return Promise.resolve({ data: null, error: { code: 'PGRST116' } })
                  },
                  then(cb: MockCb) {
                    cb({ data: mockStore[table]?.map(r => filters.every(f => f(r)) ? { ...r, ...data } : r), error: null })
                    return { then: () => {} }
                  },
                }
              },
              in(_field: string, _values: string[]) {
                return { then(cb: MockCb) { cb({ error: null }) } }
              },
            }
          },
        }
      },
      delete() {
        const filters: Array<(row: any) => boolean> = []
        return {
          eq(field: string, value: any) {
            filters.push(row => row[field] === value)
            return {
              then(cb: MockCb) {
                mockStore[table] = mockStore[table]?.filter(r => !filters.some(f => f(r)))
                cb({ error: null })
              },
              select() {
                return {
                  then(cb: MockCb) {
                    mockStore[table] = mockStore[table]?.filter(r => !filters.some(f => f(r)))
                    cb({ error: null })
                  },
                }
              },
            }
          },
          in(field: string, values: string[]) {
            filters.push(row => values.includes(row[field]))
            return { then(cb: MockCb) { cb({ error: null }) } }
          },
        }
      },
    }
  }

  return {
    supabase: { from: (table: string) => query(table) },
    __resetStore: resetStore,
  }
})

vi.mock('../lib/db.js', () => ({
  assertSuccess: <T>(data: T | null) => {
    if (data === null) throw new Error('Not found')
    return data
  },
  assertOk: (error: any) => {
    if (error) throw new Error(error.message ?? 'Database error')
  },
}))

import { MovementsService } from '../services/movements.service'

const UID = '123e4567-e89b-12d3-a456-426614174000'
const ACCOUNT_ID = '553e4567-e89b-12d3-a456-426614174004'
const ACCOUNT2_ID = '663e4567-e89b-12d3-a456-426614174005'
const FONDO_ID = '773e4567-e89b-12d3-a456-426614174006'

const movementsService = new MovementsService()

function configureStore(data: Record<string, any[]>) {
  Object.keys(mockStore).forEach(k => delete mockStore[k])
  Object.entries(data).forEach(([k, v]) => { mockStore[k] = JSON.parse(JSON.stringify(v)) })
}

describe('MovementsService — createExpenseWithDiscount', () => {
  beforeEach(() => { resetStore() })

  it('splits monto into gasto_pago + subsidio based on percentage', async () => {
    configureStore({
      cuentas: [
        { id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 2000, activa: true },
        { id: FONDO_ID, usuario_id: UID, nombre: 'Fondo', tipo: 'FONDO_DESCUENTO', moneda: 'USD', saldo_actual: 500, activa: true },
      ],
    })
    const result = await movementsService.createExpenseWithDiscount(UID, {
      cuenta_pago_id: ACCOUNT_ID,
      fondo_descuento_id: FONDO_ID,
      monto_total: 1000,
      porcentaje_descuento: 20,
      fecha: new Date(),
      categoria: 'Comida',
    }) as any
    expect(result.gastoMovimiento!.monto).toBe(800)
    expect(result.subsidioMovimiento!.monto).toBe(200)
    expect(result.subsidioMovimiento!.tipo).toBe('SUBSIDIO')
    expect(result.gastoMovimiento!.tipo).toBe('GASTO_CON_DESCUENTO')
  })

  it('rejects if fondo balance less than calculated subsidy (no auto-cap)', async () => {
    configureStore({
      cuentas: [
        { id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 2000, activa: true },
        { id: FONDO_ID, usuario_id: UID, nombre: 'Fondo', tipo: 'FONDO_DESCUENTO', moneda: 'USD', saldo_actual: 50, activa: true },
      ],
    })
    await expect(
      movementsService.createExpenseWithDiscount(UID, {
        cuenta_pago_id: ACCOUNT_ID,
        fondo_descuento_id: FONDO_ID,
        monto_total: 1000,
        porcentaje_descuento: 20,
        fecha: new Date(),
        categoria: 'Comida',
      })
    ).rejects.toThrow('Saldo insuficiente en Fondo')
  })

  it('rejects non-FONDO_DESCUENTO account', async () => {
    configureStore({
      cuentas: [
        { id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 2000, activa: true },
        { id: 'no-fondo', usuario_id: UID, nombre: 'NoFondo', tipo: 'CAJA_AHORRO', moneda: 'USD', saldo_actual: 500, activa: true },
      ],
    })
    await expect(
      movementsService.createExpenseWithDiscount(UID, {
        cuenta_pago_id: ACCOUNT_ID,
        fondo_descuento_id: 'no-fondo',
        monto_total: 1000,
        porcentaje_descuento: 20,
        fecha: new Date(),
        categoria: 'Comida',
      })
    ).rejects.toThrow('no es un fondo de descuento')
  })

  it('subsidio references gasto.id as its movimiento_relacionado_id', async () => {
    configureStore({
      cuentas: [
        { id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 2000, activa: true },
        { id: FONDO_ID, usuario_id: UID, nombre: 'Fondo', tipo: 'FONDO_DESCUENTO', moneda: 'USD', saldo_actual: 500, activa: true },
      ],
    })
    const result = await movementsService.createExpenseWithDiscount(UID, {
      cuenta_pago_id: ACCOUNT_ID,
      fondo_descuento_id: FONDO_ID,
      monto_total: 1000,
      porcentaje_descuento: 20,
      fecha: new Date(),
      categoria: 'Comida',
    }) as any
    expect(result.subsidioMovimiento!.movimiento_relacionado_id).toBe(result.gastoMovimiento!.id)
    expect(result.gastoMovimiento!.tipo).toBe('GASTO_CON_DESCUENTO')
    expect(result.subsidioMovimiento!.tipo).toBe('SUBSIDIO')
  })

  it('rounds subsidy and paid to 2 decimal places', async () => {
    configureStore({
      cuentas: [
        { id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 2000, activa: true },
        { id: FONDO_ID, usuario_id: UID, nombre: 'Fondo', tipo: 'FONDO_DESCUENTO', moneda: 'USD', saldo_actual: 500, activa: true },
      ],
    })
    const result = await movementsService.createExpenseWithDiscount(UID, {
      cuenta_pago_id: ACCOUNT_ID,
      fondo_descuento_id: FONDO_ID,
      monto_total: 1000,
      porcentaje_descuento: 20,
      fecha: new Date(),
      categoria: 'Comida',
    }) as any
    expect(result.subsidioMovimiento!.monto).toBe(50)
    expect(result.gastoMovimiento!.monto).toBe(283.33)
  })

  it('rejects inactive pago account', async () => {
    configureStore({
      cuentas: [
        { id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 2000, activa: false },
        { id: FONDO_ID, usuario_id: UID, nombre: 'Fondo', tipo: 'FONDO_DESCUENTO', moneda: 'USD', saldo_actual: 500, activa: true },
      ],
    })
    await expect(
      movementsService.createExpenseWithDiscount(UID, {
        cuenta_pago_id: ACCOUNT_ID,
        fondo_descuento_id: FONDO_ID,
        monto_total: 1000,
        porcentaje_descuento: 20,
        fecha: new Date(),
        categoria: 'Comida',
      })
    ).rejects.toThrow('inactiva')
  })
})

describe('MovementsService — createIncome', () => {
  beforeEach(() => { resetStore() })

  it('creates INGRESO movement and credits account', async () => {
    configureStore({
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1000, activa: true }],
    })
    const result = await movementsService.createIncome(UID, {
      cuenta_id: ACCOUNT_ID,
      monto: 500,
      descripcion: 'Test ingreso',
      fecha: new Date(),
      categoria: 'Salario',
    })
    expect(result.tipo).toBe('INGRESO')
    expect(result.monto).toBe(500)
    expect(mockStore.movimientos?.length).toBeGreaterThan(0)
    expect(mockStore.movimientos[0].tipo).toBe('INGRESO')
    expect(mockStore.movimientos[0].monto).toBe(500)
  })

  it('rejects inactive account', async () => {
    configureStore({
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1000, activa: false }],
    })
    await expect(
      movementsService.createIncome(UID, { cuenta_id: ACCOUNT_ID, monto: 500, descripcion: 'Test', fecha: new Date(), categoria: 'Salario' })
    ).rejects.toThrow('inactiva')
  })
})

describe('MovementsService — createExpense', () => {
  beforeEach(() => { resetStore() })

  it('creates GASTO movement', async () => {
    configureStore({
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1000, activa: true }],
    })
    const result = await movementsService.createExpense(UID, {
      cuenta_id: ACCOUNT_ID,
      monto: 200,
      descripcion: 'Test gasto',
      fecha: new Date(),
      categoria: 'Comida',
    })
    expect(result.tipo).toBe('GASTO')
    expect(result.monto).toBe(200)
  })

  it('rejects if insufficient balance', async () => {
    configureStore({
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 50, activa: true }],
    })
    await expect(
      movementsService.createExpense(UID, { cuenta_id: ACCOUNT_ID, monto: 200, descripcion: 'Test', fecha: new Date(), categoria: 'Comida' })
    ).rejects.toThrow('Saldo insuficiente')
  })
})

describe('MovementsService — createTransfer', () => {
  beforeEach(() => { resetStore() })

  it('creates two TRANSFERENCIA movements linked bidirectionally', async () => {
    configureStore({
      cuentas: [
        { id: ACCOUNT_ID, usuario_id: UID, nombre: 'Origen', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1000, activa: true },
        { id: ACCOUNT2_ID, usuario_id: UID, nombre: 'Destino', tipo: 'CAJA_AHORRO', moneda: 'USD', saldo_actual: 500, activa: true },
      ],
    })
    const result = await movementsService.createTransfer(UID, {
      cuenta_origen_id: ACCOUNT_ID,
      cuenta_destino_id: ACCOUNT2_ID,
      monto: 300,
      fecha: new Date(),
    }) as { movimientoSalida: { id: string; tipo: string; cuenta_id: string; movimiento_relacionado_id?: string }; movimientoEntrada: { id: string; tipo: string; cuenta_id: string; movimiento_relacionado_id?: string } }
    expect(result.movimientoSalida.tipo).toBe('TRANSFERENCIA')
    expect(result.movimientoEntrada.tipo).toBe('TRANSFERENCIA')
    expect(result.movimientoSalida.cuenta_id).toBe(ACCOUNT_ID)
    expect(result.movimientoEntrada.cuenta_id).toBe(ACCOUNT2_ID)
    expect(result.movimientoEntrada.movimiento_relacionado_id).toBe(result.movimientoSalida.id)
  })

  it('rejects same origin and destination account', async () => {
    configureStore({
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1000, activa: true }],
    })
    await expect(
      movementsService.createTransfer(UID, {
        cuenta_origen_id: ACCOUNT_ID,
        cuenta_destino_id: ACCOUNT_ID,
        monto: 300,
        fecha: new Date(),
      })
    ).rejects.toThrow('no pueden ser la misma')
  })

  it('rejects if origin balance insufficient', async () => {
    configureStore({
      cuentas: [
        { id: ACCOUNT_ID, usuario_id: UID, nombre: 'Origen', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 50, activa: true },
        { id: ACCOUNT2_ID, usuario_id: UID, nombre: 'Destino', tipo: 'CAJA_AHORRO', moneda: 'USD', saldo_actual: 500, activa: true },
      ],
    })
    await expect(
      movementsService.createTransfer(UID, {
        cuenta_origen_id: ACCOUNT_ID,
        cuenta_destino_id: ACCOUNT2_ID,
        monto: 300,
        fecha: new Date(),
      })
    ).rejects.toThrow('Saldo insuficiente')
  })
})

describe('MovementsService — getMovementStats', () => {
  beforeEach(() => { resetStore() })

  it('excludes TRANSFERENCIA from balance calculation', async () => {
    configureStore({
      movimientos: [
        { id: 'm1', usuario_id: UID, tipo: 'INGRESO', monto: 1000, categoria: 'Salario', cuenta_id: ACCOUNT_ID },
        { id: 'm2', usuario_id: UID, tipo: 'GASTO', monto: 300, categoria: 'Comida', cuenta_id: ACCOUNT_ID },
        { id: 'm3', usuario_id: UID, tipo: 'TRANSFERENCIA', monto: 500, categoria: null, cuenta_id: ACCOUNT_ID, cuenta_destino_id: ACCOUNT2_ID },
      ],
    })
    const stats = await movementsService.getMovementStats(UID)
    expect(stats.balance).toBe(700)
    expect(stats.ingresos).toBe(1000)
    expect(stats.gastos).toBe(300)
  })

  it('aggregates INGRESO, RETORNO_INVERSION, COBRO_DEUDA as income', async () => {
    configureStore({
      movimientos: [
        { id: 'm1', usuario_id: UID, tipo: 'INGRESO', monto: 500, categoria: 'Salario', cuenta_id: ACCOUNT_ID },
        { id: 'm2', usuario_id: UID, tipo: 'RETORNO_INVERSION', monto: 200, categoria: 'Inversion', cuenta_id: ACCOUNT_ID },
        { id: 'm3', usuario_id: UID, tipo: 'COBRO_DEUDA', monto: 100, categoria: 'Deuda', cuenta_id: ACCOUNT_ID },
      ],
    })
    const stats = await movementsService.getMovementStats(UID)
    expect(stats.ingresos).toBe(800)
  })

  it('aggregates GASTO, PAGO_TARJETA, PAGO_DEUDA, GASTO_TARJETA_CON_DESCUENTO as expense', async () => {
    configureStore({
      movimientos: [
        { id: 'm1', usuario_id: UID, tipo: 'GASTO', monto: 100, categoria: 'Comida', cuenta_id: ACCOUNT_ID },
        { id: 'm2', usuario_id: UID, tipo: 'PAGO_TARJETA', monto: 200, categoria: 'Tarjeta', cuenta_id: ACCOUNT_ID },
        { id: 'm3', usuario_id: UID, tipo: 'PAGO_DEUDA', monto: 150, categoria: 'Deuda', cuenta_id: ACCOUNT_ID },
        { id: 'm4', usuario_id: UID, tipo: 'GASTO_TARJETA_CON_DESCUENTO', monto: 80, categoria: 'Compra', cuenta_id: ACCOUNT_ID },
      ],
    })
    const stats = await movementsService.getMovementStats(UID)
    expect(stats.gastos).toBe(530)
  })
})

describe('MovementsService — deleteMovement guards', () => {
  beforeEach(() => { resetStore() })

  it('rejects deletion of AJUSTE type', async () => {
    configureStore({
      movimientos: [
        { id: 'm1', usuario_id: UID, tipo: 'AJUSTE', monto: 100, cuenta_id: ACCOUNT_ID, cuenta_destino_id: null, movimiento_relacionado_id: null, tarjeta_id: null },
      ],
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1100, activa: true }],
    })
    await expect(movementsService.deleteMovement('m1', UID)).rejects.toThrow('AJUSTE')
  })

  it('rejects deletion of PAGO_TARJETA type', async () => {
    configureStore({
      movimientos: [
        { id: 'm1', usuario_id: UID, tipo: 'PAGO_TARJETA', monto: 100, cuenta_id: ACCOUNT_ID, cuenta_destino_id: null, movimiento_relacionado_id: null, tarjeta_id: null },
      ],
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1100, activa: true }],
    })
    await expect(movementsService.deleteMovement('m1', UID)).rejects.toThrow('No se pueden eliminar pagos de tarjeta')
  })

  it('rejects deletion of PAGO_DEUDA type', async () => {
    configureStore({
      movimientos: [
        { id: 'm1', usuario_id: UID, tipo: 'PAGO_DEUDA', monto: 100, cuenta_id: ACCOUNT_ID, cuenta_destino_id: null, movimiento_relacionado_id: null, tarjeta_id: null },
      ],
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1100, activa: true }],
    })
    await expect(movementsService.deleteMovement('m1', UID)).rejects.toThrow('No se pueden eliminar pagos de deuda')
  })

  it('rejects deletion of COBRO_DEUDA type', async () => {
    configureStore({
      movimientos: [
        { id: 'm1', usuario_id: UID, tipo: 'COBRO_DEUDA', monto: 100, cuenta_id: ACCOUNT_ID, cuenta_destino_id: null, movimiento_relacionado_id: null, tarjeta_id: null },
      ],
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 900, activa: true }],
    })
    await expect(movementsService.deleteMovement('m1', UID)).rejects.toThrow('No se pueden eliminar pagos de deuda')
  })

  it('deletes simple INGRESO and removes from store', async () => {
    configureStore({
      movimientos: [
        { id: 'm1', usuario_id: UID, tipo: 'INGRESO', monto: 500, cuenta_id: ACCOUNT_ID, cuenta_destino_id: null, movimiento_relacionado_id: null, tarjeta_id: null },
      ],
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1500, activa: true }],
    })
    const result = await movementsService.deleteMovement('m1', UID)
    expect(result.message).toBeDefined()
  })

  it('deletes simple GASTO and removes from store', async () => {
    configureStore({
      movimientos: [
        { id: 'm1', usuario_id: UID, tipo: 'GASTO', monto: 200, cuenta_id: ACCOUNT_ID, cuenta_destino_id: null, movimiento_relacionado_id: null, tarjeta_id: null },
      ],
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 800, activa: true }],
    })
    const result = await movementsService.deleteMovement('m1', UID)
    expect(result.message).toBeDefined()
  })
})
