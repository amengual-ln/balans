import { useAPI } from './useAPI'

type TipoMovimiento =
  | 'INGRESO'
  | 'GASTO'
  | 'TRANSFERENCIA'
  | 'PAGO_TARJETA'
  | 'GASTO_TARJETA'
  | 'GASTO_TARJETA_CON_DESCUENTO'
  | 'PAGO_DEUDA'
  | 'COBRO_DEUDA'
  | 'SUSCRIPCION'
  | 'INVERSION'
  | 'RETORNO_INVERSION'
  | 'AJUSTE'
  | 'INGRESO_INICIAL'
  | 'GASTO_CON_DESCUENTO'
  | 'SUBSIDIO'

interface CuentaRef {
  id: string
  nombre: string
  tipo: string
  moneda: string
}

interface TarjetaRef {
  id: string
  nombre: string
  tipo: string
}

interface DeudaRef {
  id: string
  acreedor: string
  direccion: 'POR_PAGAR' | 'POR_COBRAR'
}

export interface Movement {
  id: string
  tipo: TipoMovimiento
  monto: string
  moneda: string
  descripcion: string
  categoria?: string | null
  fecha: string
  tarjeta_id?: string | null
  suscripcion_id?: string | null
  cuenta_origen?: CuentaRef | null
  cuenta_destino?: CuentaRef | null
  tarjeta?: TarjetaRef | null
  deuda?: DeudaRef | null
  movimiento_relacionado_id?: string | null
  metadata?: { monto_total?: number; porcentaje_descuento?: number } | null
}

interface UseMovementsFilters {
  tarjetaId?: string | null
  cuentaId?: string | null
}

export function useMovements(
  desdeISO: string,
  hastaISO: string,
  filters: UseMovementsFilters = {},
) {
  const params = new URLSearchParams({
    desde: desdeISO,
    hasta: hastaISO,
    limit: '500',
    offset: '0',
  })

  if (filters.tarjetaId) {
    params.set('tarjeta_id', filters.tarjetaId)
  }

  if (filters.cuentaId) {
    params.set('cuenta_id', filters.cuentaId)
  }

  const { data, error, isLoading, mutate } = useAPI<Movement[]>(`/api/movements?${params}`)

  return {
    movements: data ?? [],
    error,
    isLoading,
    mutate,
  }
}
