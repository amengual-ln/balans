import { useAPI } from './useAPI';

export interface Account {
  id: string;
  nombre: string;
  tipo: string;
  moneda: string;
  saldo_actual: string | number;
  activa: boolean;
  recarga_mensual?: string | number | null;
  created_at?: string;
  updated_at?: string;
  _count?: { movimientos: number };
}

export function useAccounts() {
  const { data, error, isLoading, mutate } = useAPI<Account[]>('/api/cuentas');

  return {
    accounts: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
