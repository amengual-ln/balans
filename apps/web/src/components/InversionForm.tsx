import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Inversion } from '@/hooks/useInversiones';
import { Account } from '@/hooks/useAccounts';

const VALID_TIPOS = ['PLAZO_FIJO', 'BONOS', 'ACCIONES', 'CRYPTO', 'FCI', 'OTRO'] as const;
const VALID_LIQUIDEZ = ['INMEDIATA', 'DIAS', 'EXTERIOR'] as const;

const inversionFormSchema = z.object({
  ticker: z.string().min(1, 'El ticker es requerido').max(20).trim(),
  nombre: z.string().max(100).trim().optional(),
  sector: z.string().max(50).trim().optional(),
  tipo: z.enum(VALID_TIPOS),
  tipo_liquidez: z.enum(VALID_LIQUIDEZ),
  cantidad: z.coerce.number().positive().optional(),
  precio_por_unidad: z.coerce.number().positive().optional(),
  monto_total: z.coerce.number().positive('El monto debe ser mayor a 0'),
  moneda: z.string().default('ARS'),
  cuenta_id: z.string().uuid('Seleccioná una cuenta'),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es requerida'),
});

type InversionFormData = z.infer<typeof inversionFormSchema>;

interface InversionFormProps {
  accounts: Account[];
  inversion?: Inversion | null;
  lockedTicker?: string;
  lockedDefaults?: {
    tipo: string;
    sector?: string | null;
    tipo_liquidez: string;
    moneda: string;
    cuenta_id: string;
  };
  onClose: () => void;
  onSubmit: (data: InversionFormData) => void;
  submitting: boolean;
}

export type { InversionFormData };

export default function InversionForm({
  accounts,
  inversion,
  lockedTicker,
  lockedDefaults,
  onClose,
  onSubmit,
  submitting,
}: InversionFormProps) {
  const isEdit = !!inversion;
  const isAddingLote = !!lockedTicker;

  const form = useForm<InversionFormData>({
    resolver: zodResolver(inversionFormSchema),
    defaultValues: {
      ticker: lockedTicker ?? '',
      nombre: '',
      sector: lockedDefaults?.sector ?? '',
      tipo: (lockedDefaults?.tipo as any) ?? 'ACCIONES',
      tipo_liquidez: (lockedDefaults?.tipo_liquidez as any) ?? 'INMEDIATA',
      moneda: lockedDefaults?.moneda ?? 'ARS',
      monto_total: 0,
      cuenta_id: lockedDefaults?.cuenta_id ?? '',
      fecha_inicio: new Date().toISOString().split('T')[0],
    },
  });

  const cantidad = useWatch({ control: form.control, name: 'cantidad' });
  const precioUnidad = useWatch({ control: form.control, name: 'precio_por_unidad' });
  const montoTotal = useWatch({ control: form.control, name: 'monto_total' });

  const lastEditedRef = useRef<'precio' | 'monto' | null>(null);

  // Track which field user is directly editing
  const handlePrecioChange = () => {
    lastEditedRef.current = 'precio';
  };

  const handleMontoChange = () => {
    lastEditedRef.current = 'monto';
  };

  // Bidirectional auto-calc:
  // - If precio changed, calculate monto (rounded to 2 decimals)
  // - If monto changed, calculate precio (rounded to 2 decimals)
  useEffect(() => {
    if (!cantidad) return;

    const cant = parseFloat(cantidad.toString());
    const precio = precioUnidad ? parseFloat(precioUnidad.toString()) : null;
    const monto = montoTotal ? parseFloat(montoTotal.toString()) : null;

    // Helper to round to 2 decimal places
    const round = (value: number) => Math.round(value * 100) / 100;

    // If user edited precio field, calculate monto
    if (lastEditedRef.current === 'precio' && precio && !isNaN(precio)) {
      const newMonto = round(cant * precio);
      form.setValue('monto_total', newMonto);
    }
    // If user edited monto field, calculate precio
    else if (lastEditedRef.current === 'monto' && monto && !isNaN(monto)) {
      const newPrecio = round(monto / cant);
      form.setValue('precio_por_unidad', newPrecio);
    }
  }, [cantidad, precioUnidad, montoTotal, form]);

  // Populate form when editing
  useEffect(() => {
    if (inversion) {
      form.reset({
        ticker: inversion.ticker,
        nombre: inversion.descripcion ?? undefined,
        sector: inversion.sector ?? undefined,
        tipo: inversion.tipo,
        tipo_liquidez: inversion.tipo_liquidez,
        cantidad: inversion.cantidad ? parseFloat(inversion.cantidad.toString()) : undefined,
        precio_por_unidad: inversion.precio_por_unidad
          ? parseFloat(inversion.precio_por_unidad.toString())
          : undefined,
        monto_total: parseFloat(inversion.monto_invertido.toString()),
        moneda: inversion.moneda,
        cuenta_id: inversion.cuenta_origen?.id ?? '',
        fecha_inicio: inversion.fecha_inicio.split('T')[0],
      });
    }
  }, [inversion, form]);

  const brokereAccounts = accounts.filter(
    (a) => a.activa && a.tipo === 'BROKER',
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 animate-fade-in">
      <div className="w-full rounded-t-xl bg-white p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">
            {isEdit ? 'Editar inversión' : isAddingLote ? `Nuevo lote - ${lockedTicker}` : 'Nueva inversión'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Ticker */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Ticker <span className="text-negative">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: TSLA, GGAL, FIXED_2026, BTC"
              autoFocus={!isAddingLote}
              readOnly={isAddingLote}
              {...form.register('ticker', {
                onChange: (e) => {
                  if (!isAddingLote) e.target.value = e.target.value.toUpperCase();
                },
              })}
              className={`w-full rounded-lg border border-border px-3 py-2 text-text-primary placeholder-text-secondary uppercase focus:outline-none focus:ring-2 focus:ring-primary ${
                isAddingLote ? 'bg-surface cursor-not-allowed' : ''
              }`}
            />
            {form.formState.errors.ticker && (
              <p className="text-sm text-negative">{form.formState.errors.ticker.message}</p>
            )}
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Nombre (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Tesla Stock, CEDEAR Tecnología, Plazo Fijo"
              {...form.register('nombre')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Sector */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Sector (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Tecnología, Financiero, Energía, Real Estate"
              {...form.register('sector')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Tipo + Liquidez */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Tipo <span className="text-negative">*</span>
              </label>
              <select
                {...form.register('tipo')}
                className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="PLAZO_FIJO">Plazo Fijo</option>
                <option value="BONOS">Bonos</option>
                <option value="ACCIONES">Acciones</option>
                <option value="CRYPTO">Crypto</option>
                <option value="FCI">Fondo Común de Inversión</option>
                <option value="OTRO">Otra</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Liquidez
              </label>
              <select
                {...form.register('tipo_liquidez')}
                className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="INMEDIATA">Inmediata</option>
                <option value="DIAS">Días</option>
                <option value="EXTERIOR">Exterior</option>
              </select>
            </div>
          </div>

          {/* Cantidad + Precio unitario */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Cantidad (opcional)
              </label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                {...form.register('cantidad', {
                  onChange: () => {
                    lastEditedRef.current = null; // Reset when qty changes
                  },
                })}
                className="w-full rounded-lg border border-border px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Precio unitario (opcional)
              </label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                {...form.register('precio_por_unidad', {
                  onChange: handlePrecioChange,
                })}
                className="w-full rounded-lg border border-border px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Monto total + Moneda */}
          <div className={`grid gap-3 ${isAddingLote ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Monto total <span className="text-negative">*</span>
              </label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                {...form.register('monto_total', {
                  onChange: handleMontoChange,
                })}
                className="w-full rounded-lg border border-border px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {form.formState.errors.monto_total && (
                <p className="text-sm text-negative">{form.formState.errors.monto_total.message}</p>
              )}
            </div>
            {!isAddingLote && (
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
            )}
          </div>

          {/* Cuenta (Broker) */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              Cuenta Broker <span className="text-negative">*</span>
            </label>
            <select
              {...form.register('cuenta_id')}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Seleccionar cuenta</option>
              {brokereAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nombre} ({acc.moneda})
                </option>
              ))}
            </select>
            {form.formState.errors.cuenta_id && (
              <p className="text-sm text-negative">{form.formState.errors.cuenta_id.message}</p>
            )}
          </div>

          {/* Fecha inicio */}
          {!isAddingLote && (
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
              {submitting
                ? isEdit
                  ? 'Guardando...'
                  : isAddingLote
                    ? 'Creando lote...'
                    : 'Creando...'
                : isEdit
                  ? 'Guardar'
                  : isAddingLote
                    ? 'Crear lote'
                    : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
