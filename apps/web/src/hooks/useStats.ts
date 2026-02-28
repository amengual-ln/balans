import { useAPI } from './useAPI';

export interface MonthlyStats {
  ingresos: number;
  gastos: number;
  balance: number;
}

export function useStats(desdeISO: string, hastaISO: string) {
  const params = new URLSearchParams({ desde: desdeISO, hasta: hastaISO });

  const { data, error, isLoading, mutate } = useAPI<MonthlyStats>(
    `/api/movements/stats?${params}`,
  );

  return {
    stats: data ?? null,
    error,
    isLoading,
    mutate,
  };
}
