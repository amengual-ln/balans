import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))

vi.mock('../lib/supabase.js', () => ({
  supabase: { from: fromMock },
}))

import { SuscripcionesService } from '../services/suscripciones.service'

function singleResult(data: unknown) {
  const query = {
    eq: () => query,
    single: async () => ({ data, error: null }),
  }
  return query
}

describe('SuscripcionesService — pagarSuscripcion', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('copies subscription category to the payment movement', async () => {
    const insertedMovements: Record<string, unknown>[] = []
    const subscription = {
      id: 'sub-1',
      usuario_id: 'user-1',
      nombre: 'Internet',
      monto: 100,
      moneda: 'ARS',
      activo: true,
      fecha_fin: null,
      frecuencia: 'MENSUAL',
      dia_pago: 5,
      proxima_fecha_pago: '2026-08-05T00:00:00.000Z',
      cuenta_id: 'account-1',
      categoria: 'conectividad',
    }

    fromMock.mockImplementation((table: string) => {
      if (table === 'suscripciones') {
        return {
          select: () => singleResult(subscription),
          update: (data: Record<string, unknown>) => ({
            eq: () => ({
              select: () => ({
                single: async () => ({ data: { ...subscription, ...data }, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'cuentas') {
        return {
          select: () => singleResult({ usuario_id: 'user-1', saldo_actual: 500, activa: true }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      if (table === 'movimientos') {
        return {
          insert: (data: Record<string, unknown>) => {
            insertedMovements.push(data)
            return {
              select: () => ({ single: async () => ({ data: { id: 'movement-1' }, error: null }) }),
            }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await new SuscripcionesService().pagarSuscripcion('user-1', 'sub-1', {
      cuenta_id: 'account-1',
    })

    expect(insertedMovements[0]?.categoria).toBe('conectividad')
  })
})
