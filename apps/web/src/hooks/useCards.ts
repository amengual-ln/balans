import { useAPI } from './useAPI';

export interface Card {
  id: string;
  nombre: string;
  tipo: 'VISA' | 'MASTERCARD' | 'OTRA';
  moneda: string;
  limite_total: string | number;
  limite_comprometido: string | number;
  limite_disponible: number;
  dia_cierre: number;
  dia_vencimiento: number;
  activa: boolean;
  cuenta_id: string;
  cuenta_asociada?: { nombre: string; moneda: string };
  _count?: { compras_en_cuotas: number };
}

export function useCards() {
  const { data, error, isLoading, mutate } = useAPI<Card[]>('/api/tarjetas');
  return { cards: data ?? [], error, isLoading, mutate };
}
