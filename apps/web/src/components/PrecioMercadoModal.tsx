import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { apiPost } from '@/hooks/useAPI';

const precioSchema = z.object({
  precio: z.coerce.number().positive('El precio debe ser mayor a 0'),
  fecha: z.string().optional(),
});

type PrecioFormData = z.infer<typeof precioSchema>;

interface PrecioMercadoModalProps {
  inversion: { id: string; ticker: string; moneda: string; precio_mercado_actual?: number | null };
  onClose: () => void;
  onSuccess: () => void;
}

export default function PrecioMercadoModal({
  inversion: inv,
  onClose,
  onSuccess,
}: PrecioMercadoModalProps) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PrecioFormData>({
    resolver: zodResolver(precioSchema),
    defaultValues: {
      precio: inv.precio_mercado_actual ?? 0,
      fecha: new Date().toISOString().split('T')[0],
    },
  });

  const handleSubmit = async (data: PrecioFormData) => {
    setError('');
    setSubmitting(true);
    try {
      await apiPost(`/api/inversiones/${inv.id}/precio`, data);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar precio');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 animate-fade-in">
      <div className="w-full rounded-t-xl bg-white p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Registrar precio</h2>
            <p className="mt-0.5 text-sm font-mono text-text-secondary">{inv.ticker}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Precio actual */}
          {inv.precio_mercado_actual && (
            <div className="rounded-lg bg-surface p-3">
              <p className="text-xs text-text-secondary">Precio anterior</p>
              <p className="text-lg font-bold tabular-nums text-text-primary">
                {inv.moneda} {inv.precio_mercado_actual.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {/* Precio nuevo */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Precio actual <span className="text-negative">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              autoFocus
              placeholder="0.00"
              {...form.register('precio')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {form.formState.errors.precio && (
              <p className="text-sm text-negative">{form.formState.errors.precio.message}</p>
            )}
          </div>

          {/* Fecha */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Fecha</label>
            <input
              type="date"
              {...form.register('fecha')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-negative/20 bg-negative/10 p-3">
              <p className="text-sm text-negative">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-surface py-2 px-4 font-medium text-text-primary transition-colors hover:bg-surface/80"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-primary py-2 px-4 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
