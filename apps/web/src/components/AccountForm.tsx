import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';

// ─── Validation schema (mirrors backend createAccountSchema) ─────────────────

const VALID_CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU'] as const;
const VALID_TIPOS = ['BANCO', 'BILLETERA', 'BROKER', 'EFECTIVO', 'FONDO_DESCUENTO'] as const;

const accountFormSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  tipo: z.enum(VALID_TIPOS, { errorMap: () => ({ message: 'Tipo requerido' }) }),
  moneda: z.enum(VALID_CURRENCIES, { errorMap: () => ({ message: 'Moneda requerida' }) }),
  saldo_inicial: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
      message: 'El saldo inicial debe ser 0 o mayor',
    })
    .default('0'),
  fecha_inicio: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

// ─── Options ─────────────────────────────────────────────────────────────────

const TIPO_OPTIONS: { value: string; label: string }[] = [
  { value: 'BANCO', label: 'Banco' },
  { value: 'BILLETERA', label: 'Billetera' },
  { value: 'BROKER', label: 'Broker' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'FONDO_DESCUENTO', label: 'Fondo de descuento' },
];

const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'ARS', label: 'ARS — Peso argentino' },
  { value: 'USD', label: 'USD — Dólar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'BRL', label: 'BRL — Real brasileño' },
  { value: 'CLP', label: 'CLP — Peso chileno' },
  { value: 'UYU', label: 'UYU — Peso uruguayo' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AccountFormPayload {
  nombre: string;
  tipo: string;
  moneda: string;
  saldo_inicial: number;
}

interface AccountFormProps {
  onSubmit: (data: AccountFormPayload) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AccountForm({ onSubmit, onClose, isSubmitting }: AccountFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      tipo: 'BANCO',
      moneda: 'ARS',
      saldo_inicial: '0',
    },
  });

  // Auto-focus name on mount
  useEffect(() => {
    setFocus('nombre');
  }, [setFocus]);

  // Close on Escape
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
      saldo_inicial: parseFloat(data.saldo_inicial),
    });
  });

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal */}
      <div className="w-full max-w-md animate-fade-in rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Nueva cuenta</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} noValidate className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Nombre <span className="text-negative">*</span>
            </label>
            <input
              {...register('nombre')}
              type="text"
              placeholder="Ej: Cuenta corriente BNA"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary outline-none transition-colors
                focus:border-primary focus:ring-2 focus:ring-primary/20
                ${errors.nombre ? 'border-negative' : 'border-border'}`}
            />
            {errors.nombre && (
              <p className="mt-1 text-xs text-negative">{errors.nombre.message}</p>
            )}
          </div>

          {/* Type + Currency row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Type */}
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
              {errors.tipo && (
                <p className="mt-1 text-xs text-negative">{errors.tipo.message}</p>
              )}
            </div>

            {/* Currency */}
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
              {errors.moneda && (
                <p className="mt-1 text-xs text-negative">{errors.moneda.message}</p>
              )}
            </div>
          </div>

          {/* Initial balance */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Saldo inicial
            </label>
            <input
              {...register('saldo_inicial')}
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              inputMode="decimal"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary outline-none transition-colors
                focus:border-primary focus:ring-2 focus:ring-primary/20
                ${errors.saldo_inicial ? 'border-negative' : 'border-border'}`}
            />
            {errors.saldo_inicial && (
              <p className="mt-1 text-xs text-negative">{errors.saldo_inicial.message}</p>
            )}
            <p className="mt-1 text-xs text-text-secondary">
              Se creará un movimiento INGRESO_INICIAL por este monto
            </p>
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
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Creando…' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
