import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import type { Account } from '@/hooks/useAccounts';

// ─── Validation schema (mirrors backend createCardSchema) ─────────────────────

const VALID_CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU'] as const;
const VALID_TIPOS = ['VISA', 'MASTERCARD', 'OTRA'] as const;

const cardFormSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  tipo: z.enum(VALID_TIPOS, { errorMap: () => ({ message: 'Tipo requerido' }) }),
  moneda: z.enum(VALID_CURRENCIES, { errorMap: () => ({ message: 'Moneda requerida' }) }),
  cuenta_id: z.string().min(1, 'La cuenta asociada es requerida'),
  limite_total: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: 'El límite debe ser mayor a 0',
    }),
  dia_cierre: z
    .string()
    .refine((v) => {
      const n = parseInt(v);
      return !isNaN(n) && n >= 1 && n <= 31;
    }, { message: 'Día inválido (1-31)' }),
  dia_vencimiento: z
    .string()
    .refine((v) => {
      const n = parseInt(v);
      return !isNaN(n) && n >= 1 && n <= 31;
    }, { message: 'Día inválido (1-31)' }),
});

type CardFormData = z.infer<typeof cardFormSchema>;

// ─── Options ──────────────────────────────────────────────────────────────────

const TIPO_OPTIONS = [
  { value: 'VISA', label: 'Visa' },
  { value: 'MASTERCARD', label: 'Mastercard' },
  { value: 'OTRA', label: 'Otra' },
];

const CURRENCY_OPTIONS = [
  { value: 'ARS', label: 'ARS — Peso argentino' },
  { value: 'USD', label: 'USD — Dólar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'BRL', label: 'BRL — Real brasileño' },
  { value: 'CLP', label: 'CLP — Peso chileno' },
  { value: 'UYU', label: 'UYU — Peso uruguayo' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CardFormPayload {
  nombre: string;
  tipo: string;
  moneda: string;
  cuenta_id: string;
  limite_total: number;
  dia_cierre: number;
  dia_vencimiento: number;
}

interface CardFormProps {
  accounts: Account[];
  onSubmit: (data: CardFormPayload) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CardForm({ accounts, onSubmit, onClose, isSubmitting }: CardFormProps) {
  const paymentAccounts = accounts.filter((a) => a.activa && a.tipo !== 'FONDO_DESCUENTO');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<CardFormData>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      tipo: 'VISA',
      moneda: 'ARS',
      cuenta_id: paymentAccounts[0]?.id ?? '',
      limite_total: '',
      dia_cierre: '10',
      dia_vencimiento: '20',
    },
  });

  useEffect(() => {
    setFocus('nombre');
  }, [setFocus]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const submit = handleSubmit(async (data) => {
    await onSubmit({
      nombre: data.nombre,
      tipo: data.tipo,
      moneda: data.moneda,
      cuenta_id: data.cuenta_id,
      limite_total: parseFloat(data.limite_total),
      dia_cierre: parseInt(data.dia_cierre),
      dia_vencimiento: parseInt(data.dia_vencimiento),
    });
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md animate-fade-in rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Nueva tarjeta</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} noValidate className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Nombre <span className="text-negative">*</span>
            </label>
            <input
              {...register('nombre')}
              type="text"
              placeholder="Ej: Visa BNA"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary outline-none transition-colors
                focus:border-primary focus:ring-2 focus:ring-primary/20
                ${errors.nombre ? 'border-negative' : 'border-border'}`}
            />
            {errors.nombre && (
              <p className="mt-1 text-xs text-negative">{errors.nombre.message}</p>
            )}
          </div>

          {/* Tipo + Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Tipo <span className="text-negative">*</span>
              </label>
              <select
                {...register('tipo')}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-text-primary outline-none transition-colors bg-white
                  focus:border-primary focus:ring-2 focus:ring-primary/20
                  ${errors.tipo ? 'border-negative' : 'border-border'}`}
              >
                {TIPO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Moneda <span className="text-negative">*</span>
              </label>
              <select
                {...register('moneda')}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-text-primary outline-none transition-colors bg-white
                  focus:border-primary focus:ring-2 focus:ring-primary/20
                  ${errors.moneda ? 'border-negative' : 'border-border'}`}
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.value}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cuenta asociada */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Cuenta asociada <span className="text-negative">*</span>
            </label>
            <select
              {...register('cuenta_id')}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-text-primary outline-none transition-colors bg-white
                focus:border-primary focus:ring-2 focus:ring-primary/20
                ${errors.cuenta_id ? 'border-negative' : 'border-border'}`}
            >
              {paymentAccounts.length === 0 ? (
                <option value="">Sin cuentas disponibles</option>
              ) : (
                paymentAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({a.moneda})
                  </option>
                ))
              )}
            </select>
            {errors.cuenta_id && (
              <p className="mt-1 text-xs text-negative">{errors.cuenta_id.message}</p>
            )}
          </div>

          {/* Límite total */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Límite total <span className="text-negative">*</span>
            </label>
            <input
              {...register('limite_total')}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="500000"
              inputMode="decimal"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary outline-none transition-colors
                focus:border-primary focus:ring-2 focus:ring-primary/20
                ${errors.limite_total ? 'border-negative' : 'border-border'}`}
            />
            {errors.limite_total && (
              <p className="mt-1 text-xs text-negative">{errors.limite_total.message}</p>
            )}
          </div>

          {/* Día cierre + Día vencimiento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Día de cierre <span className="text-negative">*</span>
              </label>
              <input
                {...register('dia_cierre')}
                type="number"
                min="1"
                max="31"
                placeholder="10"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary outline-none transition-colors
                  focus:border-primary focus:ring-2 focus:ring-primary/20
                  ${errors.dia_cierre ? 'border-negative' : 'border-border'}`}
              />
              {errors.dia_cierre && (
                <p className="mt-1 text-xs text-negative">{errors.dia_cierre.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Día de vencimiento <span className="text-negative">*</span>
              </label>
              <input
                {...register('dia_vencimiento')}
                type="number"
                min="1"
                max="31"
                placeholder="20"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary outline-none transition-colors
                  focus:border-primary focus:ring-2 focus:ring-primary/20
                  ${errors.dia_vencimiento ? 'border-negative' : 'border-border'}`}
              />
              {errors.dia_vencimiento && (
                <p className="mt-1 text-xs text-negative">{errors.dia_vencimiento.message}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || paymentAccounts.length === 0}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Creando…' : 'Crear tarjeta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
