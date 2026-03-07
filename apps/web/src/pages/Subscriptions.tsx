import { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useSubscriptions, Subscription, FrecuenciaSuscripcion } from '@/hooks/useSubscriptions';
import { useAccounts } from '@/hooks/useAccounts';
import { useSWRConfig } from 'swr';
import SubscriptionCard from '@/components/SubscriptionCard';
import SubscriptionForm, { SubscriptionFormData } from '@/components/SubscriptionForm';
import SubscriptionPaymentModal from '@/components/SubscriptionPaymentModal';
import { apiPost, apiPut, apiDelete } from '@/hooks/useAPI';

// ─── Monthly cost multipliers ─────────────────────────────────────────────────

const MONTHLY_MULTIPLIER: Record<FrecuenciaSuscripcion, number> = {
  SEMANAL: 4.33,
  QUINCENAL: 2.17,
  MENSUAL: 1,
  TRIMESTRAL: 1 / 3,
  ANUAL: 1 / 12,
};

// ─── Toast ─────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`rounded-lg px-4 py-3 shadow-lg ${
        type === 'success' ? 'bg-positive text-white' : 'bg-negative text-white'
      }`}
    >
      {message}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 h-4 w-24 rounded-full bg-gray-200" />
      <div className="mb-2 h-5 w-32 rounded bg-gray-200" />
      <div className="mb-4 h-7 w-28 rounded bg-gray-200" />
      <div className="h-9 w-full rounded-lg bg-gray-200" />
    </div>
  );
}

// ─── Totals Banner ────────────────────────────────────────────────────────────

function TotalsBanner({ subscriptions }: { subscriptions: Subscription[] }) {
  const active = subscriptions.filter((s) => s.activo);

  const byMoneda = new Map<string, number>();
  for (const sub of active) {
    const monto = parseFloat(sub.monto.toString());
    const monthly = monto * MONTHLY_MULTIPLIER[sub.frecuencia];
    byMoneda.set(sub.moneda, (byMoneda.get(sub.moneda) ?? 0) + monthly);
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
        Costo mensual estimado
      </p>
      {byMoneda.size === 0 ? (
        <p className="font-semibold text-text-primary">Sin suscripciones activas</p>
      ) : (
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {Array.from(byMoneda.entries()).map(([moneda, total]) => (
            <div key={moneda} className="flex items-baseline gap-1.5">
              <span className="text-sm text-text-secondary">{moneda}</span>
              <span className="text-2xl font-bold tabular-nums text-text-primary">
                {total.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      )}
      {active.length > 0 && (
        <p className="mt-1 text-xs text-text-secondary">
          {active.length} suscripción{active.length !== 1 ? 'es' : ''} activa{active.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

interface DeleteConfirmProps {
  subscription: Subscription;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteConfirm({ subscription: sub, onConfirm, onCancel, deleting }: DeleteConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-bold text-text-primary">Eliminar suscripción</h3>
        <p className="mb-6 text-sm text-text-secondary">
          ¿Eliminar <strong>{sub.nombre}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg bg-surface py-2 px-4 font-medium text-text-primary transition-colors hover:bg-surface/80"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-lg bg-negative py-2 px-4 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Subscriptions() {
  const { subscriptions, isLoading, mutate } = useSubscriptions();
  const { accounts } = useAccounts();
  const { mutate: globalMutate } = useSWRConfig();

  const [showForm, setShowForm] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [paySub, setPaySub] = useState<Subscription | null>(null);
  const [deleteSub, setDeleteSub] = useState<Subscription | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { active, inactive } = useMemo(() => {
    const a = subscriptions.filter((s) => s.activo);
    const i = subscriptions.filter((s) => !s.activo);
    return { active: a, inactive: i };
  }, [subscriptions]);

  const handleCreate = async (data: SubscriptionFormData) => {
    setSubmitting(true);
    try {
      await apiPost('/api/suscripciones', {
        ...data,
        fecha_inicio: new Date(data.fecha_inicio).toISOString(),
        fecha_fin: data.fecha_fin ? new Date(data.fecha_fin).toISOString() : undefined,
      });
      mutate();
      setShowForm(false);
      setToast({ message: 'Suscripción creada exitosamente', type: 'success' });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Error al crear suscripción',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data: SubscriptionFormData) => {
    if (!editSub) return;
    setSubmitting(true);
    try {
      await apiPut(`/api/suscripciones/${editSub.id}`, {
        ...data,
        fecha_fin: data.fecha_fin ? new Date(data.fecha_fin).toISOString() : null,
      });
      mutate();
      setEditSub(null);
      setToast({ message: 'Suscripción actualizada', type: 'success' });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Error al actualizar suscripción',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSub) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/suscripciones/${deleteSub.id}`);
      mutate();
      setDeleteSub(null);
      setToast({ message: 'Suscripción eliminada', type: 'success' });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Error al eliminar suscripción',
        type: 'error',
      });
      setDeleteSub(null);
    } finally {
      setDeleting(false);
    }
  };

  const handlePaySuccess = () => {
    mutate();
    globalMutate((key) =>
      typeof key === 'string' &&
      (key.startsWith('/api/movements') || key.startsWith('/api/cuentas')),
    );
    setPaySub(null);
    setToast({ message: 'Pago registrado exitosamente', type: 'success' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pb-24">
        <div className="mx-auto max-w-2xl px-4 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-2xl px-4 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Suscripciones</h1>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </button>
        </div>

        {/* Totals Banner */}
        <TotalsBanner subscriptions={subscriptions} />

        {/* Empty state */}
        {subscriptions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl">🔄</p>
            <p className="mt-3 text-base font-medium text-text-primary">
              Sin suscripciones todavía
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Registrá servicios recurrentes como alquileres, streaming o planes de telefonía
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Nueva suscripción
            </button>
          </div>
        )}

        {/* Active subscriptions */}
        {active.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Activas</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {active.map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  onPay={setPaySub}
                  onEdit={(s) => setEditSub(s)}
                  onDelete={setDeleteSub}
                />
              ))}
            </div>
          </div>
        )}

        {/* Inactive subscriptions */}
        {inactive.length > 0 && (
          <details className="group">
            <summary className="mb-4 cursor-pointer text-lg font-semibold text-text-primary">
              Pausadas / Finalizadas ({inactive.length})
            </summary>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {inactive.map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  onPay={setPaySub}
                  onEdit={(s) => setEditSub(s)}
                  onDelete={setDeleteSub}
                />
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <SubscriptionForm
          accounts={accounts}
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
          submitting={submitting}
        />
      )}

      {/* Edit form */}
      {editSub && (
        <SubscriptionForm
          accounts={accounts}
          subscription={editSub}
          onClose={() => setEditSub(null)}
          onSubmit={handleUpdate}
          submitting={submitting}
        />
      )}

      {/* Payment modal */}
      {paySub && (
        <SubscriptionPaymentModal
          subscription={paySub}
          accounts={accounts}
          onClose={() => setPaySub(null)}
          onSuccess={handlePaySuccess}
        />
      )}

      {/* Delete confirm */}
      {deleteSub && (
        <DeleteConfirm
          subscription={deleteSub}
          onConfirm={handleDelete}
          onCancel={() => setDeleteSub(null)}
          deleting={deleting}
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
