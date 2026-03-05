import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus } from 'lucide-react';
import { useDebts, Debt, DireccionDeuda } from '@/hooks/useDebts';
import { useAccounts } from '@/hooks/useAccounts';
import { useSWRConfig } from 'swr';
import DebtCard from '@/components/DebtCard';
import { apiPost } from '@/hooks/useAPI';

// ============================================
// Toast Component
// ============================================

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

function Toast({ message, type, onClose }: ToastProps) {
  setTimeout(onClose, 3000);

  const bgColor = type === 'success' ? 'bg-positive' : 'bg-negative';
  const textColor = 'text-white';

  return (
    <div className={`${bgColor} ${textColor} px-4 py-3 rounded-lg shadow-lg`}>
      {message}
    </div>
  );
}

// ============================================
// Skeleton Card
// ============================================

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-border p-4 animate-pulse">
      <div className="h-4 bg-surface rounded mb-3 w-1/3"></div>
      <div className="h-6 bg-surface rounded mb-4 w-2/3"></div>
      <div className="h-2 bg-surface rounded mb-3"></div>
      <div className="h-4 bg-surface rounded w-1/2"></div>
    </div>
  );
}

// ============================================
// Totals Banner
// ============================================

interface TotalsBannerProps {
  debts: Debt[];
}

function TotalsBanner({ debts }: TotalsBannerProps) {
  const activeDebts = debts.filter((d) => !d.saldada);

  // Group by currency
  const byMoneda = new Map<string, number>();
  for (const debt of activeDebts) {
    const monto = parseFloat(debt.monto_pendiente.toString());
    const current = byMoneda.get(debt.moneda) ?? 0;
    byMoneda.set(debt.moneda, current + monto);
  }

  return (
    <div className="bg-gradient-to-r from-surface to-surface/50 border border-border rounded-lg p-4 mb-6">
      <p className="text-text-secondary text-sm mb-2">Deudas activas</p>
      <div className="flex flex-wrap gap-4">
        {byMoneda.size === 0 ? (
          <p className="text-text-primary font-semibold">Sin deudas activas</p>
        ) : (
          Array.from(byMoneda.entries()).map(([moneda, monto]) => (
            <div key={moneda}>
              <p className="text-text-primary text-lg font-bold">
                {moneda} {monto.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================
// Debt Form Modal
// ============================================

const debtFormSchema = z.object({
  tipo: z.enum(['PERSONAL', 'CREDITO_BILLETERA', 'PRESTAMO', 'OTRO']),
  direccion: z.enum(['POR_PAGAR', 'POR_COBRAR']),
  acreedor: z.string().min(1, 'La contraparte es requerida').max(100),
  monto_total: z.coerce.number().positive('El monto debe ser mayor a 0'),
  moneda: z.string().default('ARS'),
  fecha_inicio: z.string(),
  cantidad_cuotas: z.preprocess(
    v => (v === '' || v == null ? undefined : Number(v)),
    z.number().int().positive().optional()
  ),
  monto_cuota: z.preprocess(
    v => (v === '' || v == null ? undefined : Number(v)),
    z.number().positive().optional()
  ),
});

type DebtFormInput = z.infer<typeof debtFormSchema>;

interface DebtFormProps {
  onClose: () => void;
  onSubmit: (data: DebtFormInput) => void;
  submitting: boolean;
}

function DebtForm({ onClose, onSubmit, submitting }: DebtFormProps) {
  const [direccion, setDireccion] = useState<DireccionDeuda>('POR_PAGAR');

  const form = useForm<DebtFormInput>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      tipo: 'PERSONAL',
      direccion: 'POR_PAGAR',
      moneda: 'ARS',
      fecha_inicio: new Date().toISOString().split('T')[0],
    },
  });

  const handleDireccionChange = (newDireccion: DireccionDeuda) => {
    setDireccion(newDireccion);
    form.setValue('direccion', newDireccion);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 animate-fade-in">
      <div className="bg-white w-full rounded-t-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Nueva deuda</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* Dirección Toggle */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Tipo de deuda
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDireccionChange('POR_PAGAR')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  direccion === 'POR_PAGAR'
                    ? 'bg-negative text-white'
                    : 'bg-surface text-text-secondary border border-border'
                }`}
              >
                Lo que debo
              </button>
              <button
                type="button"
                onClick={() => handleDireccionChange('POR_COBRAR')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  direccion === 'POR_COBRAR'
                    ? 'bg-positive text-white'
                    : 'bg-surface text-text-secondary border border-border'
                }`}
              >
                Me deben
              </button>
            </div>
          </div>

          {/* Acreedor */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              {direccion === 'POR_PAGAR' ? 'Acreedor' : 'Deudor'}
            </label>
            <input
              type="text"
              placeholder="Nombre del acreedor/deudor"
              {...form.register('acreedor')}
              autoFocus
              className="w-full px-3 py-2 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {form.formState.errors.acreedor && (
              <p className="text-sm text-negative">
                {form.formState.errors.acreedor.message}
              </p>
            )}
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Tipo
            </label>
            <select
              {...form.register('tipo')}
              className="w-full px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="PERSONAL">Personal</option>
              <option value="CREDITO_BILLETERA">Billetera</option>
              <option value="PRESTAMO">Préstamo</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          {/* Moneda */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Moneda
            </label>
            <select
              {...form.register('moneda')}
              className="w-full px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="BRL">BRL</option>
              <option value="CLP">CLP</option>
              <option value="UYU">UYU</option>
            </select>
          </div>

          {/* Monto Total */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Monto total
            </label>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              {...form.register('monto_total')}
              className="w-full px-3 py-2 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {form.formState.errors.monto_total && (
              <p className="text-sm text-negative">
                {form.formState.errors.monto_total.message}
              </p>
            )}
          </div>

          {/* Fecha Inicio */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Fecha de inicio
            </label>
            <input
              type="date"
              {...form.register('fecha_inicio')}
              className="w-full px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Cantidad de cuotas (optional) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Cantidad de cuotas (opcional)
            </label>
            <input
              type="number"
              placeholder="Dejar en blanco si no aplica"
              step="1"
              {...form.register('cantidad_cuotas')}
              className="w-full px-3 py-2 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Monto por cuota (optional) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Monto por cuota (opcional)
            </label>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              {...form.register('monto_cuota')}
              className="w-full px-3 py-2 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg font-medium text-text-primary bg-surface hover:bg-surface/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 px-4 rounded-lg font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Debt Payment Modal
// ============================================

const payDebtSchema = z.object({
  cuenta_id: z.string().uuid(),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  fecha: z.string().optional(),
  descripcion: z.string().max(200).optional(),
});

type PayDebtInput = z.infer<typeof payDebtSchema>;

interface DebtPaymentModalProps {
  debt: Debt;
  accounts: Array<{ id: string; nombre: string; moneda: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

function DebtPaymentModal({
  debt,
  accounts,
  onClose,
  onSuccess,
}: DebtPaymentModalProps) {
  const isPayable = debt.direccion === 'POR_PAGAR';
  const monto_pendiente = parseFloat(debt.monto_pendiente.toString());

  const form = useForm<PayDebtInput>({
    resolver: zodResolver(payDebtSchema),
    defaultValues: {
      monto: monto_pendiente,
      fecha: new Date().toISOString().split('T')[0],
      descripcion: `${isPayable ? 'Pago' : 'Cobro'} deuda ${debt.acreedor}`,
    },
  });

  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (data: PayDebtInput) => {
    setError('');
    const montoNum = parseFloat(data.monto.toString());

    if (montoNum > monto_pendiente) {
      setError('El monto no puede exceder el pendiente');
      return;
    }

    setSubmitting(true);
    try {
      await apiPost(`/api/deudas/${debt.id}/pagar`, {
        ...data,
        monto: montoNum,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al procesar el pago'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAccounts = accounts.filter((a) => a.id !== 'FONDO_DESCUENTO');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 animate-fade-in">
      <div className="bg-white w-full rounded-t-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            Registrar {isPayable ? 'pago' : 'cobro'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          {/* Monto */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Monto
            </label>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              {...form.register('monto')}
              autoFocus
              className="w-full px-3 py-2 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-text-secondary">
              Máximo: {debt.moneda}{' '}
              {monto_pendiente.toLocaleString('es-AR', {
                maximumFractionDigits: 2,
              })}
            </p>
            {form.formState.errors.monto && (
              <p className="text-sm text-negative">
                {form.formState.errors.monto.message}
              </p>
            )}
          </div>

          {/* Cuenta */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Cuenta
            </label>
            <select
              {...form.register('cuenta_id')}
              className="w-full px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Seleccionar cuenta</option>
              {filteredAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nombre}
                </option>
              ))}
            </select>
            {form.formState.errors.cuenta_id && (
              <p className="text-sm text-negative">
                {form.formState.errors.cuenta_id.message}
              </p>
            )}
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Fecha
            </label>
            <input
              type="date"
              {...form.register('fecha')}
              className="w-full px-3 py-2 border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              Descripción (opcional)
            </label>
            <input
              type="text"
              {...form.register('descripcion')}
              className="w-full px-3 py-2 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-negative/10 border border-negative/20 rounded-lg p-3">
              <p className="text-sm text-negative">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg font-medium text-text-primary bg-surface hover:bg-surface/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 px-4 rounded-lg font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Procesando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Main Debts Page
// ============================================

export default function Debts() {
  const { debts, isLoading, mutate } = useDebts();
  const { accounts } = useAccounts();
  const { mutate: globalMutate } = useSWRConfig();

  const [showForm, setShowForm] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Split debts into categories
  const { payable, receivable, settled } = useMemo(() => {
    const p = debts.filter((d) => d.direccion === 'POR_PAGAR' && !d.saldada);
    const r = debts.filter((d) => d.direccion === 'POR_COBRAR' && !d.saldada);
    const s = debts.filter((d) => d.saldada);
    return { payable: p, receivable: r, settled: s };
  }, [debts]);

  const handleCreateDebt = async (data: DebtFormInput) => {
    setSubmitting(true);
    try {
      await apiPost('/api/deudas', {
        ...data,
        fecha_inicio: new Date(data.fecha_inicio).toISOString(),
      });
      mutate();
      setShowForm(false);
      setToast({ message: 'Deuda creada exitosamente', type: 'success' });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Error al crear deuda',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayDebt = async () => {
    if (!selectedDebt) return;
    mutate();
    globalMutate((key) => {
      return (
        typeof key === 'string' &&
        (key.startsWith('/api/movements') ||
          key.startsWith('/api/cuentas') ||
          key.startsWith('/api/deudas'))
      );
    });
    setSelectedDebt(null);
    setToast({
      message: `${selectedDebt.direccion === 'POR_PAGAR' ? 'Pago' : 'Cobro'} registrado exitosamente`,
      type: 'success',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pb-24">
        <div className="max-w-md mx-auto p-4 pt-6">
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="max-w-md mx-auto p-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Deudas</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white p-3 rounded-full hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Totals Banner */}
        <TotalsBanner debts={debts} />

        {/* Lo que debo section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Lo que debo
          </h2>
          {payable.length === 0 ? (
            <p className="text-text-secondary text-center py-8">
              Sin deudas por pagar
            </p>
          ) : (
            <div className="grid gap-3">
              {payable.map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  onPay={() => setSelectedDebt(debt)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Me deben section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Me deben
          </h2>
          {receivable.length === 0 ? (
            <p className="text-text-secondary text-center py-8">
              Sin deudas por cobrar
            </p>
          ) : (
            <div className="grid gap-3">
              {receivable.map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  onPay={() => setSelectedDebt(debt)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Saldadas section */}
        {settled.length > 0 && (
          <div>
            <details className="group">
              <summary className="cursor-pointer text-lg font-semibold text-text-primary mb-4">
                Saldadas
              </summary>
              <div className="grid gap-3">
                {settled.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    onPay={() => {}}
                  />
                ))}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <DebtForm
          onClose={() => setShowForm(false)}
          onSubmit={handleCreateDebt}
          submitting={submitting}
        />
      )}

      {selectedDebt && (
        <DebtPaymentModal
          debt={selectedDebt}
          accounts={accounts}
          onClose={() => setSelectedDebt(null)}
          onSuccess={handlePayDebt}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-4 right-4 z-40">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
