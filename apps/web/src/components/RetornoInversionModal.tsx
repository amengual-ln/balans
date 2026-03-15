import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Inversion } from '@/hooks/useInversiones';
import { Account } from '@/hooks/useAccounts';
import { apiPost } from '@/hooks/useAPI';

const retornoSchema = z.object({
  cantidad_vendida: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  precio_venta: z.coerce.number().positive('El precio debe ser mayor a 0'),
  cuenta_destino_id: z.string().uuid('Seleccioná una cuenta'),
  fecha: z.string().optional(),
  descripcion: z.string().max(200).optional(),
});

type RetornoFormData = z.infer<typeof retornoSchema>;

interface RetornoInversionModalProps {
  inversion: Inversion;
  accounts: Account[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function RetornoInversionModal({
  inversion: inv,
  accounts,
  onClose,
  onSuccess,
}: RetornoInversionModalProps) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RetornoFormData>({
    resolver: zodResolver(retornoSchema),
    defaultValues: {
      cantidad_vendida: 0,
      precio_venta: 0,
      cuenta_destino_id: inv.cuenta_origen?.id ?? '',
      fecha: new Date().toISOString().split('T')[0],
    },
  });

  const cantidadVendida = useWatch({ control: form.control, name: 'cantidad_vendida' });
  const precioVenta = useWatch({ control: form.control, name: 'precio_venta' });
  const [totalRetorno, setTotalRetorno] = useState(0);

  useEffect(() => {
    const cantidad = parseFloat(cantidadVendida.toString());
    const precio = parseFloat(precioVenta.toString());
    if (!isNaN(cantidad) && !isNaN(precio)) {
      setTotalRetorno(cantidad * precio);
    } else {
      setTotalRetorno(0);
    }
  }, [cantidadVendida, precioVenta]);

  const activeAccounts = accounts.filter((a) => a.activa && a.tipo !== 'FONDO_DESCUENTO');

  const handleSubmit = async (data: RetornoFormData) => {
    setError('');
    setSubmitting(true);
    try {
      await apiPost(`/api/inversiones/${inv.id}/retorno`, data);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar retorno');
    } finally {
      setSubmitting(false);
    }
  };

  const montoInvertido = parseFloat(inv.monto_invertido.toString());

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 animate-fade-in">
      <div className="w-full rounded-t-xl bg-white p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Registrar retorno</h2>
            <p className="mt-0.5 text-sm font-mono text-text-secondary">{inv.ticker}</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Cantidad vendida */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Cantidad vendida <span className="text-negative">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              autoFocus
              placeholder="0.00"
              {...form.register('cantidad_vendida')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {inv.cantidad && (
              <p className="text-xs text-text-secondary">
                Cantidad disponible: {parseFloat(inv.cantidad.toString()).toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                })}
              </p>
            )}
            {form.formState.errors.cantidad_vendida && (
              <p className="text-sm text-negative">{form.formState.errors.cantidad_vendida.message}</p>
            )}
          </div>

          {/* Precio venta */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Precio de venta <span className="text-negative">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...form.register('precio_venta')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {form.formState.errors.precio_venta && (
              <p className="text-sm text-negative">{form.formState.errors.precio_venta.message}</p>
            )}
          </div>

          {/* Total retorno */}
          <div className="rounded-lg bg-surface p-3">
            <p className="text-xs text-text-secondary">Total a recuperar</p>
            <p className="text-2xl font-bold tabular-nums text-text-primary">
              {inv.moneda} {totalRetorno.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
            {totalRetorno > montoInvertido && (
              <p className="mt-1 text-xs text-positive">
                Ganancia: +{inv.moneda}{' '}
                {(totalRetorno - montoInvertido).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            )}
            {totalRetorno < montoInvertido && (
              <p className="mt-1 text-xs text-negative">
                Pérdida: -{inv.moneda}{' '}
                {(montoInvertido - totalRetorno).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Cuenta destino */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Cuenta destino <span className="text-negative">*</span>
            </label>
            <select
              {...form.register('cuenta_destino_id')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Seleccionar cuenta</option>
              {activeAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nombre} ({acc.moneda})
                </option>
              ))}
            </select>
            {form.formState.errors.cuenta_destino_id && (
              <p className="text-sm text-negative">{form.formState.errors.cuenta_destino_id.message}</p>
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
              placeholder="Ej: Venta parcial de posición"
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
              {submitting ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
