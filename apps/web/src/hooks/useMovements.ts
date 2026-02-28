import { useAPI } from './useAPI';

type TipoMovimiento =
  | 'INGRESO'
  | 'GASTO'
  | 'TRANSFERENCIA'
  | 'PAGO_TARJETA'
  | 'GASTO_TARJETA'
  | 'PAGO_DEUDA'
  | 'INVERSION'
  | 'RETORNO_INVERSION'
  | 'AJUSTE'
  | 'INGRESO_INICIAL'
  | 'GASTO_CON_DESCUENTO'
  | 'SUBSIDIO';

interface CuentaRef {
  id: string;
  nombre: string;
  tipo: string;
  moneda: string;
}

export interface Movement {
  id: string;
  tipo: TipoMovimiento;
  monto: string;
  moneda: string;
  descripcion: string;
  categoria?: string | null;
  fecha: string;
  cuenta_origen?: CuentaRef | null;
  cuenta_destino?: CuentaRef | null;
  movimiento_relacionado_id?: string | null;
  metadata?: { monto_total?: number; porcentaje_descuento?: number } | null;
}

export function useMovements(desdeISO: string, hastaISO: string) {
  const params = new URLSearchParams({
    desde: desdeISO,
    hasta: hastaISO,
    limit: '500',
    offset: '0',
  });

  // apiFetcher unwraps .data, so we get Movement[] directly
  const { data, error, isLoading, mutate } = useAPI<Movement[]>(
    `/api/movements?${params}`,
  );

  return {
    movements: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
