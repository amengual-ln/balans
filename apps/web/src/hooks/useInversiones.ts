import { useAPI } from './useAPI';

export type TipoInversion = 'PLAZO_FIJO' | 'BONOS' | 'ACCIONES' | 'CRYPTO' | 'OTRO';
export type TipoLiquidez = 'INMEDIATA' | 'DIAS' | 'EXTERIOR';
export type EstadoInversion = 'ACTIVA' | 'PARCIALMENTE_RECUPERADA' | 'FINALIZADA';

export interface PrecioMercado {
  precio: string | number;
  fecha: string;
}

export interface Inversion {
  id: string;
  tipo: TipoInversion;
  descripcion?: string | null;
  sector?: string | null;
  monto_invertido: string | number;
  monto_recuperado: string | number;
  moneda: string;
  fecha_inicio: string;
  ticker: string;
  lote_numero: number;
  cantidad?: string | number | null;
  precio_por_unidad?: string | number | null;
  tipo_liquidez: TipoLiquidez;
  estado: EstadoInversion;
  precio_mercado_actual?: number | null;
  created_at: string;
  updated_at: string;
  cuenta_origen?: { id: string; nombre: string; moneda: string } | null;
  _count?: { movimientos: number };
}

export interface TickerPosition {
  ticker: string;
  tipo: TipoInversion;
  sector?: string | null;
  moneda: string;
  tipo_liquidez: TipoLiquidez;
  lotes: Inversion[];
  total_invertido: number;
  total_recuperado: number;
  cantidad_total: number | null;
  precio_mercado_actual?: number | null;
  most_recent_lote_id: string;
  estado: EstadoInversion;
}

export function useInversiones() {
  const { data, error, isLoading, mutate } = useAPI<TickerPosition[]>('/api/inversiones');
  return { inversiones: data ?? [], error, isLoading, mutate };
}
