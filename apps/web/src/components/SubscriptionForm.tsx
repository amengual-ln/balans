import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Subscription } from '@/hooks/useSubscriptions';
import { Account } from '@/hooks/useAccounts';

const VALID_FRECUENCIAS = ['SEMANAL', 'QUINCENAL', 'MENSUAL', 'TRIMESTRAL', 'ANUAL'] as const;

const subscriptionFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100).trim(),
  descripcion: z.string().max(300).trim().optional(),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  moneda: z.string().default('ARS'),
  cuenta_id: z.string().uuid('Seleccioná una cuenta'),
  frecuencia: z.enum(VALID_FRECUENCIAS),
  dia_pago: z.coerce.number().int().min(1).max(31),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es requerida'),
  fecha_fin: z.string().optional(),
  activo: z.boolean().default(true),
  categoria: z.string().max(100).trim().optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

interface SubscriptionFormProps {
  accounts: Account[];
  subscription?: Subscription | null;
  onClose: () => void;
  onSubmit: (data: SubscriptionFormData) => void;
  submitting: boolean;
}

export type { SubscriptionFormData };

export default function SubscriptionForm({
  accounts,
  subscription,
  onClose,
  onSubmit,
  submitting,
}: SubscriptionFormProps) {
  const isEdit = !!subscription;

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      nombre: '',
      moneda: 'ARS',
      frecuencia: 'MENSUAL',
      dia_pago: 1,
      fecha_inicio: new Date().toISOString().split('T')[0],
      activo: true,
    },
  });

  const frecuencia = useWatch({ control: form.control, name: 'frecuencia' });

  // Populate form when editing
  useEffect(() => {
    if (subscription) {
      form.reset({
        nombre: subscription.nombre,
        descripcion: subscription.descripcion ?? undefined,
        monto: parseFloat(subscription.monto.toString()),
        moneda: subscription.moneda,
        cuenta_id: subscription.cuenta.id,
        frecuencia: subscription.frecuencia,
        dia_pago: subscription.dia_pago,
        fecha_inicio: subscription.fecha_inicio.split('T')[0],
        fecha_fin: subscription.fecha_fin
          ? subscription.fecha_fin.split('T')[0]
          : undefined,
        activo: subscription.activo,
        categoria: subscription.categoria ?? undefined,
      });
    }
  }, [subscription, form]);

  const activeAccounts = accounts.filter(
    (a) => a.activa && a.tipo !== 'FONDO_DESCUENTO',
  );

  const diaPagoLabel =
    frecuencia === 'SEMANAL'
      ? 'Día de la semana (1=Lun, 7=Dom)'
      : 'Día del mes para el cobro (1–31)';

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 animate-fade-in">
      <div className="w-full rounded-t-xl bg-white p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">
            {isEdit ? 'Editar suscripción' : 'Nueva suscripción'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Nombre <span className="text-negative">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Netflix, Alquiler, Plan de telefonía"
              autoFocus
              {...form.register('nombre')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {form.formState.errors.nombre && (
              <p className="text-sm text-negative">{form.formState.errors.nombre.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Descripción (opcional)
            </label>
            <input
              type="text"
              placeholder="Descripción adicional"
              {...form.register('descripcion')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Monto + Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Monto <span className="text-negative">*</span>
              </label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                {...form.register('monto')}
                className="w-full rounded-lg border border-border px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {form.formState.errors.monto && (
                <p className="text-sm text-negative">{form.formState.errors.monto.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Moneda
              </label>
              <select
                {...form.register('moneda')}
                className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="BRL">BRL</option>
                <option value="CLP">CLP</option>
                <option value="UYU">UYU</option>
              </select>
            </div>
          </div>

          {/* Cuenta */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Cuenta a debitar <span className="text-negative">*</span>
            </label>
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

          {/* Frecuencia + Día de pago */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Frecuencia
              </label>
              <select
                {...form.register('frecuencia')}
                className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="SEMANAL">Semanal</option>
                <option value="QUINCENAL">Quincenal</option>
                <option value="MENSUAL">Mensual</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                {frecuencia === 'SEMANAL' ? 'Día (1=Lun…7=Dom)' : 'Día del mes'}
              </label>
              <input
                type="number"
                min={1}
                max={frecuencia === 'SEMANAL' ? 7 : 31}
                {...form.register('dia_pago')}
                className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {form.formState.errors.dia_pago && (
                <p className="text-sm text-negative">{form.formState.errors.dia_pago.message}</p>
              )}
            </div>
          </div>

          {/* Fecha inicio + fin */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Fecha de inicio
              </label>
              <input
                type="date"
                {...form.register('fecha_inicio')}
                className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Fecha de fin (opcional)
              </label>
              <input
                type="date"
                {...form.register('fecha_fin')}
                className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Categoría (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Vivienda, Entretenimiento, Servicios"
              {...form.register('categoria')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Activo toggle (edit only) */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <label className="text-sm font-medium text-text-primary">
                Suscripción activa
              </label>
              <input
                type="checkbox"
                {...form.register('activo')}
                className="h-4 w-4 accent-primary"
              />
            </div>
          )}

          {/* Helpers note */}
          {!isEdit && (
            <p className="text-xs text-text-secondary">
              {diaPagoLabel}. El próximo pago se calculará automáticamente a partir de la fecha de inicio.
            </p>
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
              {submitting ? (isEdit ? 'Guardando...' : 'Creando...') : isEdit ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
