export const UID = '123e4567-e89b-12d3-a456-426614174000'
export const UID2 = '223e4567-e89b-12d3-a456-426614174001'
export const CARD_ID = '333e4567-e89b-12d3-a456-426614174002'
export const CARD2_ID = '443e4567-e89b-12d3-a456-426614174003'
export const ACCOUNT_ID = '553e4567-e89b-12d3-a456-426614174004'
export const ACCOUNT2_ID = '663e4567-e89b-12d3-a456-426614174005'
export const FONDO_ID = '773e4567-e89b-12d3-a456-426614174006'
export const DEBT_ID = '883e4567-e89b-12d3-a456-426614174007'
export const INVERSION_ID = '993e4567-e89b-12d3-a456-426614174008'
export const SUBSCRIPCION_ID = 'aa3e4567-e89b-12d3-a456-426614174009'

export const mockAccount = (overrides = {}) => ({
  id: ACCOUNT_ID,
  usuario_id: UID,
  nombre: 'Cuenta Principal',
  tipo: 'CUENTA_CORRIENTE',
  moneda: 'USD',
  saldo_actual: 1000,
  activa: true,
  recarga_mensual: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const mockAccountFondo = (overrides = {}) => ({
  id: FONDO_ID,
  usuario_id: UID,
  nombre: 'Fondo Descuento',
  tipo: 'FONDO_DESCUENTO',
  moneda: 'USD',
  saldo_actual: 500,
  activa: true,
  recarga_mensual: 100,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const mockCard = (overrides = {}) => ({
  id: CARD_ID,
  usuario_id: UID,
  cuenta_id: ACCOUNT_ID,
  nombre: 'Visa Test',
  tipo: 'CREDITO',
  limite_total: 5000,
  limite_comprometido: 0,
  dia_cierre: 15,
  dia_vencimiento: 25,
  moneda: 'USD',
  activa: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const mockDebt = (overrides = {}) => ({
  id: DEBT_ID,
  usuario_id: UID,
  acreedor: 'Juan Perez',
  descripcion: 'Prestamo personal',
  monto_total: 1000,
  monto_pendiente: 1000,
  direccion: 'POR_PAGAR',
  activa: true,
  saldada: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const mockInversion = (overrides = {}) => ({
  id: INVERSION_ID,
  usuario_id: UID,
  ticker: 'AAPL',
  nombre: 'Apple Inc',
  tipo_inversion: 'ACCION',
  cantidad: 10,
  monto_invertido: 1500,
  monto_recuperado: 0,
  precio_entrada: 150,
  estado: 'ACTIVA',
  fecha_inicio: '2024-01-01',
  fecha_fin: null,
  lote_numero: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const mockSuscripcion = (overrides = {}) => ({
  id: SUBSCRIPCION_ID,
  usuario_id: UID,
  nombre: 'Netflix',
  monto: 15.99,
  frecuencia: 'MENSUAL',
  dia_pago: 15,
  activa: true,
  fecha_inicio: '2024-01-01',
  fecha_fin: null,
  proxima_fecha_pago: '2024-02-15',
  categoria: 'Entretenimiento',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const mockMovement = (overrides = {}) => ({
  id: 'mmock-id',
  usuario_id: UID,
  tipo: 'GASTO',
  monto: 100,
  moneda: 'USD',
  descripcion: 'Test movimiento',
  categoria: 'Test',
  fecha: new Date().toISOString(),
  cuenta_id: ACCOUNT_ID,
  cuenta_destino_id: null,
  tarjeta_id: null,
  movimiento_relacionado_id: null,
  metadata: null,
  tasa_conversion: null,
  ...overrides,
})

export const mockCuota = (overrides = {}) => ({
  id: 'cuota-id',
  compra_id: 'compra-id',
  numero_cuota: 1,
  monto: 100,
  fecha_vencimiento: '2024-03-25',
  pagada: false,
  fecha_pago: null,
  ...overrides,
})

export const mockCompra = (overrides = {}) => ({
  id: 'compra-id',
  usuario_id: UID,
  tarjeta_id: CARD_ID,
  movimiento_id: 'movimiento-id',
  descripcion: 'Compra test',
  monto_total: 300,
  cantidad_cuotas: 3,
  monto_por_cuota: 100,
  cuotas_pagadas: 0,
  fecha_compra: '2024-01-15',
  categoria: 'Test',
  ...overrides,
})

type MockCb = (result: { data: unknown; error: unknown; count?: number }) => void
type MockEmptyCb = () => void

export function createMockSupabaseClient(fixtures: {
  accounts?: any[]
  cards?: any[]
  movements?: any[]
  debts?: any[]
  inversiones?: any[]
  suscripciones?: any[]
  cuotas?: any[]
  compras?: any[]
  precios?: any[]
  configs?: any[]
  cuentas?: any[]
  tarjetas?: any[]
  deudas?: any[]
  pagos_deuda?: any[]
  movimientos?: any[]
} = {}) {
  const store: Record<string, any[]> = {
    cuentas: fixtures.accounts ?? [mockAccount()],
    tarjetas: fixtures.cards ?? [mockCard()],
    deudas: fixtures.debts ?? [],
    inversiones: fixtures.inversiones ?? [],
    suscripciones: fixtures.suscripciones ?? [],
    cuotas: fixtures.cuotas ?? [],
    compras_en_cuotas: fixtures.compras ?? [],
    precios_mercado: fixtures.precios ?? [],
    movimientos: fixtures.movements ?? [],
    configuraciones_moneda: fixtures.configs ?? [],
    pagos_deuda: fixtures.pagos_deuda ?? [],
  }

  function query(_table: string) {
    return {
      select: (_cols?: string, _opts?: any) => ({
        eq: (field: string, _value: any) => ({
          single: () => {
            const item = store[_table]?.find((r: any) => r[field] === _value)
            return Promise.resolve({ data: item ?? null, error: item ? null : { code: 'PGRST116', message: 'Not found' } })
          },
          then: (cb: MockCb) => cb({ data: store[_table]?.filter((r: any) => r[field] === _value) ?? [], error: null }),
        }),
        in: (_field: string, _values: any[]) => ({
          order: (_field: string, _opts: any) => ({
            then: (cb: MockCb) => cb({ data: store[_table] ?? [], error: null }),
          }),
        }),
        or: (_cond: string) => ({
          then: (cb: MockCb) => cb({ data: store[_table] ?? [], error: null }),
          order: (_f: string, _o: any) => ({
            range: (_a: number, _b: number) => ({
              then: (cb: MockCb) => cb({ data: store[_table] ?? [], error: null, count: store[_table]?.length ?? 0 }),
            }),
          }),
        }),
        then: (cb: MockCb) => cb({ data: store[_table] ?? [], error: null, count: store[_table]?.length ?? 0 }),
        order: (_field: string, _opts: any) => ({
          range: (_a: number, _b: number) => ({
            then: (cb: MockCb) => cb({ data: store[_table] ?? [], error: null, count: store[_table]?.length ?? 0 }),
          }),
          then: (cb: MockCb) => cb({ data: store[_table] ?? [], error: null, count: store[_table]?.length ?? 0 }),
        }),
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => {
            const record = { id: 'generated-id', ...data }
            if (!store[_table]) store[_table] = []
            store[_table].push(record)
            return Promise.resolve({ data: record, error: null })
          },
        }),
      }),
      update: (data: any) => ({
        eq: (field: string, value: any) => ({
          select: () => ({
            single: () => {
              const idx = store[_table]?.findIndex((r: any) => r[field] === value)
              if (idx !== undefined && idx >= 0) {
                store[_table][idx] = { ...store[_table][idx], ...data }
                return Promise.resolve({ data: store[_table][idx], error: null })
              }
              return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
            },
            then: (cb: MockCb) => cb({ data: store[_table]?.map((r: any) => r[field] === value ? { ...r, ...data } : r), error: null }),
          }),
          in: (_field: string, _values: string[]) => {
            return {
              then: (cb: MockEmptyCb) => cb(),
            }
          },
        }),
      }),
      delete: () => ({
        eq: (field: string, value: any) => {
          store[_table] = store[_table]?.filter((r: any) => r[field] !== value)
          return Promise.resolve({ error: null })
        },
      }),
    }
  }

  return {
    from: (table: string) => query(table),
  }
}
