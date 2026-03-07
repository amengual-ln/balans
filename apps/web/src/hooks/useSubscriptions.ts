import { useAPI } from './useAPI';

export type FrecuenciaSuscripcion = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL';

export interface Subscription {
  id: string;
  nombre: string;
  descripcion?: string | null;
  monto: string | number;
  moneda: string;
  frecuencia: FrecuenciaSuscripcion;
  dia_pago: number;
  proxima_fecha_pago: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
  activo: boolean;
  categoria?: string | null;
  created_at: string;
  updated_at: string;
  cuenta: { id: string; nombre: string; moneda: string };
  _count?: { movimientos: number };
}

export function useSubscriptions() {
  const { data, error, isLoading, mutate } = useAPI<Subscription[]>('/api/suscripciones');
  return { subscriptions: data ?? [], error, isLoading, mutate };
}
