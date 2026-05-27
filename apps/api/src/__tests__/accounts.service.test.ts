import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockStore: Record<string, any[]> = {}

function resetStore() {
  Object.keys(mockStore).forEach(k => delete mockStore[k])
}

type MockCb = (value: { data: any; error: any; count?: number }) => void
type MockCbEmpty = (value: { error: any }) => void

vi.mock('../lib/supabase.js', () => {
  return {
    supabase: {
      from(table: string) {
        const tableData: any[] = mockStore[table] ?? []
        const filters: Array<(row: any) => boolean> = []

        function runFilters(data: any[]) {
          return filters.reduce((acc, f) => acc.filter(f), data)
        }

        const api: any = {
          select() { return api },
          eq(field: string, value: any) {
            filters.push((row: any) => row[field] === value)
            return api
          },
          single() {
            const result = runFilters(tableData)
            const item = result[0] ?? null
            return Promise.resolve({ data: item, error: item ? null : { code: 'PGRST116' } })
          },
          maybeSingle() { return this.single() },
          order() { return api },
          range() { return api },
          in(field: string, values: string[]) {
            filters.push((row: any) => values.includes(row[field]))
            return api
          },
          or(cond: string) {
            const pairs = cond.split(',')
            for (const pair of pairs) {
              const [field, op, value] = pair.split('.')
              if (op === 'eq') filters.push((row: any) => row[field] === value)
            }
            return api
          },
          then(onFulfilled: MockCb) {
            const result = runFilters(tableData)
            Promise.resolve({ data: result, error: null, count: result.length }).then(onFulfilled)
            return api
          },
        }

        const insertApi: any = {
          select() { return insertApi },
          single() {
            const record = { id: 'generated-id' }
            Object.assign(record, insertApi._insertData ?? {})
            if (!mockStore[table]) mockStore[table] = []
            mockStore[table].push(record)
            return Promise.resolve({ data: record, error: null })
          },
        }

        const updateApi: any = {
          eq(field: string, value: any) {
            return {
              select() {
                return {
                  single() {
                    const idx = mockStore[table]?.findIndex((r: any) => r[field] === value)
                    if (idx !== undefined && idx >= 0) {
                      const updated = { ...mockStore[table][idx], ...updateApi._data }
                      mockStore[table][idx] = updated
                      return Promise.resolve({ data: updated, error: null })
                    }
                    return Promise.resolve({ data: null, error: { code: 'PGRST116' } })
                  },
                  then(onFulfilled: MockCb) {
                    mockStore[table] = mockStore[table]?.map(r =>
                      r[field] === value ? { ...r, ...updateApi._data } : r
                    )
                    Promise.resolve({ data: mockStore[table], error: null }).then(onFulfilled)
                    return { then: () => {} }
                  },
                }
              },
              in() { return { then(cb: MockCbEmpty) { cb({ error: null }) } } }
            }
          },
          _data: null as any,
        }

        const deleteApi: any = {
          eq(field: string, value: any) {
            return {
              then(onFulfilled: MockCbEmpty) {
                mockStore[table] = mockStore[table]?.filter(r => r[field] !== value)
                Promise.resolve({ error: null }).then(onFulfilled)
                return { then: () => {} }
              },
              select() {
                return {
                  then(onFulfilled: MockCbEmpty) {
                    mockStore[table] = mockStore[table]?.filter(r => r[field] !== value)
                    Promise.resolve({ error: null }).then(onFulfilled)
                    return { then: () => {} }
                  },
                }
              },
            }
          },
          in() { return { then(cb: MockCbEmpty) { cb({ error: null }) } } },
        }

        return {
          select() { return api },
          insert(data: any) {
            insertApi._insertData = data
            return insertApi
          },
          update(data: any) {
            updateApi._data = data
            return updateApi
          },
          delete() { return deleteApi },
        }
      },
    },
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

import { accountsService } from '../services/accounts.service'

const UID = '123e4567-e89b-12d3-a456-426614174000'
const ACCOUNT_ID = '553e4567-e89b-12d3-a456-426614174004'
const ACCOUNT2_ID = '663e4567-e89b-12d3-a456-426614174005'

function configureStore(data: Record<string, any[]>) {
  Object.keys(mockStore).forEach(k => delete mockStore[k])
  Object.entries(data).forEach(([k, v]) => { mockStore[k] = JSON.parse(JSON.stringify(v)) })
}

describe('AccountsService — deleteAccount guards', () => {
  beforeEach(() => { resetStore() })

  it('rejects deletion when cuenta has movements as source', async () => {
    configureStore({
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1000, activa: true }],
      movimientos: [{ id: 'm1', usuario_id: UID, tipo: 'GASTO', monto: 100, cuenta_id: ACCOUNT_ID }],
    })
    await expect(accountsService.deleteAccount(ACCOUNT_ID, UID)).rejects.toThrow('No se puede eliminar')
  })

  it('rejects deletion when cuenta has movements as destination', async () => {
    configureStore({
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1000, activa: true }],
      movimientos: [{ id: 'm1', usuario_id: UID, tipo: 'TRANSFERENCIA', monto: 500, cuenta_id: ACCOUNT2_ID, cuenta_destino_id: ACCOUNT_ID }],
    })
    await expect(accountsService.deleteAccount(ACCOUNT_ID, UID)).rejects.toThrow('No se puede eliminar')
  })

  it('rejects deletion when cuenta has associated cards', async () => {
    configureStore({
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1000, activa: true }],
      tarjetas: [{ id: 'card1', usuario_id: UID, cuenta_id: ACCOUNT_ID, nombre: 'Visa', tipo: 'CREDITO', limite_total: 5000, moneda: 'USD', activa: true }],
    })
    await expect(accountsService.deleteAccount(ACCOUNT_ID, UID)).rejects.toThrow('No se puede eliminar')
  })

  it('deletes account with no movements and no cards', async () => {
    configureStore({
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1000, activa: true }],
    })
    const result = await accountsService.deleteAccount(ACCOUNT_ID, UID)
    expect(result.message).toBe('Cuenta eliminada exitosamente')
    expect(mockStore.cuentas?.find(c => c.id === ACCOUNT_ID)).toBeUndefined()
  })
})

describe('AccountsService — recargarFondo', () => {
  beforeEach(() => { resetStore() })

  it('rejects non-FONDO_DESCUENTO account', async () => {
    configureStore({
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1000, activa: true }],
    })
    await expect(accountsService.recargarFondo(ACCOUNT_ID, UID, 100)).rejects.toThrow('FONDO_DESCUENTO')
  })

  it('rejects inactive account', async () => {
    configureStore({
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Fondo', tipo: 'FONDO_DESCUENTO', moneda: 'USD', saldo_actual: 500, activa: false }],
    })
    await expect(accountsService.recargarFondo(ACCOUNT_ID, UID, 100)).rejects.toThrow('inactiva')
  })

  it('rejects zero/negative monto without recarga_mensual', async () => {
    configureStore({
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Fondo', tipo: 'FONDO_DESCUENTO', moneda: 'USD', saldo_actual: 500, recarga_mensual: null, activa: true }],
    })
    await expect(accountsService.recargarFondo(ACCOUNT_ID, UID)).rejects.toThrow('mayor a 0')
  })
})

describe('AccountsService — adjustBalance', () => {
  beforeEach(() => { resetStore() })

  it('rejects inactive account', async () => {
    configureStore({
      cuentas: [{ id: ACCOUNT_ID, usuario_id: UID, nombre: 'Cuenta', tipo: 'CUENTA_CORRIENTE', moneda: 'USD', saldo_actual: 1000, activa: false }],
    })
    await expect(
      accountsService.adjustBalance(ACCOUNT_ID, UID, { nuevo_saldo: 1200, descripcion: 'Ajuste' })
    ).rejects.toThrow('inactiva')
  })
})
