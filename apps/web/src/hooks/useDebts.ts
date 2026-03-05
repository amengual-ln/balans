import useSWR from 'swr';
import { apiFetcher } from '@/hooks/useAPI';

export type DireccionDeuda = 'POR_PAGAR' | 'POR_COBRAR';

export interface Debt {
  id: string;
  tipo: 'PERSONAL' | 'CREDITO_BILLETERA' | 'PRESTAMO' | 'OTRO';
  direccion: DireccionDeuda;
  acreedor: string;
  monto_total: string | number;
  monto_pendiente: string | number;
  moneda: string;
  fecha_inicio: string;
  cantidad_cuotas?: number | null;
  monto_cuota?: string | number | null;
  saldada: boolean;
  _count?: { pagos: number };
}

export function useDebts() {
  const { data, error, isLoading, mutate } = useSWR<Debt[]>('/api/deudas', apiFetcher);
  return { debts: data ?? [], error, isLoading, mutate };
}
