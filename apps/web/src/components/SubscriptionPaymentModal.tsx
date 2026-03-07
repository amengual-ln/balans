import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Subscription } from '@/hooks/useSubscriptions';
import { Account } from '@/hooks/useAccounts';
import { apiPost } from '@/hooks/useAPI';

const paySchema = z.object({
  cuenta_id: z.string().uuid('Seleccioná una cuenta'),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  fecha: z.string().optional(),
  descripcion: z.string().max(200).optional(),
});

type PayFormData = z.infer<typeof paySchema>;

interface SubscriptionPaymentModalProps {
  subscription: Subscription;
  accounts: Account[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function SubscriptionPaymentModal({
  subscription: sub,
  accounts,
  onClose,
  onSuccess,
}: SubscriptionPaymentModalProps) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PayFormData>({
    resolver: zodResolver(paySchema),
    defaultValues: {
      cuenta_id: sub.cuenta.id,
      monto: parseFloat(sub.monto.toString()),
      fecha: new Date().toISOString().split('T')[0],
      descripcion: `Pago suscripción: ${sub.nombre}`,
    },
  });

  const activeAccounts = accounts.filter(
    (a) => a.activa && a.tipo !== 'FONDO_DESCUENTO',
  );

  const handleSubmit = async (data: PayFormData) => {
    setError('');
    setSubmitting(true);
    try {
      await apiPost(`/api/suscripciones/${sub.id}/pagar`, data);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pago');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 animate-fade-in">
      <div className="w-full rounded-t-xl bg-white p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Registrar pago</h2>
            <p className="mt-0.5 text-sm text-text-secondary">{sub.nombre}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Monto */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Monto</label>
            <input
              type="number"
              step="0.01"
              autoFocus
              {...form.register('monto')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-text-secondary">
              Monto programado: {sub.moneda}{' '}
              {parseFloat(sub.monto.toString()).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
            </p>
            {form.formState.errors.monto && (
              <p className="text-sm text-negative">{form.formState.errors.monto.message}</p>
            )}
          </div>

          {/* Cuenta */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Cuenta</label>
            <select
              {...form.register('cuenta_id')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Seleccionar cuenta</option>
              {activeAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nombre} ({acc.moneda})
                </option>
              ))}
            </select>
            {form.formState.errors.cuenta_id && (
              <p className="text-sm text-negative">{form.formState.errors.cuenta_id.message}</p>
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

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Descripción (opcional)
            </label>
            <input
              type="text"
              {...form.register('descripcion')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
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
              {submitting ? 'Procesando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
