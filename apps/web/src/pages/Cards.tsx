import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import CardCard from '@/components/CardCard';
import CardForm, { type CardFormPayload } from '@/components/CardForm';
import { useCards, type Card } from '@/hooks/useCards';
import { useAccounts } from '@/hooks/useAccounts';
import { apiPost } from '@/hooks/useAPI';
import { useSWRConfig } from 'swr';

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  onDone: () => void;
}

function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 animate-fade-in">
      <div className="rounded-xl bg-text-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        {message}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 h-4 w-20 rounded-full bg-gray-200" />
      <div className="mb-2 h-4 w-32 rounded bg-gray-200" />
      <div className="mb-1 h-6 w-28 rounded bg-gray-200" />
      <div className="mt-2 h-1 w-full rounded-full bg-gray-200" />
    </div>
  );
}

// ─── Totals banner ────────────────────────────────────────────────────────────

function TotalsBanner({ cards }: { cards: Card[] }) {
  const totals: Record<string, number> = {};
  for (const card of cards) {
    if (!card.activa) continue;
    const committed =
      typeof card.limite_comprometido === 'string'
        ? parseFloat(card.limite_comprometido)
        : card.limite_comprometido;
    totals[card.moneda] = (totals[card.moneda] ?? 0) + committed;
  }

  const entries = Object.entries(totals);
  if (entries.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
        Total comprometido
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {entries.map(([currency, total]) => (
          <div key={currency} className="flex items-baseline gap-1.5">
            <span className="text-sm text-text-secondary">{currency}</span>
            <span className={`text-2xl font-bold tabular-nums ${total > 0 ? 'text-negative' : 'text-text-primary'}`}>
              {total > 0 ? '-' : ''}
              {new Intl.NumberFormat('es-AR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }).format(Math.abs(total))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Card Payment Modal ───────────────────────────────────────────────────────

interface CardPaymentModalProps {
  card: Card;
  onClose: () => void;
  onSuccess: () => void;
}

function CardPaymentModal({ card, onClose, onSuccess }: CardPaymentModalProps) {
  const { accounts } = useAccounts();
  const paymentAccounts = accounts.filter((a) => a.activa && a.tipo !== 'FONDO_DESCUENTO');

  const [monto, setMonto] = useState('');
  const [cuentaId, setCuentaId] = useState(paymentAccounts[0]?.id ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set cuenta when accounts load
  useEffect(() => {
    if (paymentAccounts.length > 0 && !cuentaId) {
      setCuentaId(paymentAccounts[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  // Pre-fill saldo pendiente
  useEffect(() => {
    const fetchSaldo = async () => {
      try {
        const res = await fetch(`/api/tarjetas/${card.id}/saldo-a-pagar`, {
          headers: { 'x-user-id': import.meta.env.VITE_USER_ID ?? 'demo-user-id' },
        });
        const json = await res.json();
        if (json.success && json.data.saldo_pendiente > 0) {
          setMonto(String(json.data.saldo_pendiente));
        }
      } catch {
        // ignore
      }
    };
    fetchSaldo();
  }, [card.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async () => {
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) return;
    if (!cuentaId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await apiPost('/api/movements/pago-tarjeta', {
        tarjeta_id: card.id,
        cuenta_id: cuentaId,
        monto: montoNum,
        descripcion: `Pago tarjeta ${card.nombre}`,
        fecha: new Date().toISOString(),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md animate-fade-in rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Pagar tarjeta</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-text-secondary">
          <span className="font-medium text-text-primary">{card.nombre}</span>
          {' · '}{card.moneda} {
            new Intl.NumberFormat('es-AR').format(
              typeof card.limite_comprometido === 'string'
                ? parseFloat(card.limite_comprometido)
                : card.limite_comprometido
            )
          } comprometido
        </p>

        <div className="space-y-4">
          {/* Monto */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Monto a pagar
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Cuenta */}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Desde cuenta
            </label>
            <select
              value={cuentaId}
              onChange={(e) => setCuentaId(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {paymentAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} — {a.moneda}{' '}
                  {new Intl.NumberFormat('es-AR').format(
                    typeof a.saldo_actual === 'string' ? parseFloat(a.saldo_actual) : a.saldo_actual
                  )}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-negative">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !monto || parseFloat(monto) <= 0 || !cuentaId}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Pagando…' : 'Confirmar pago'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Cards() {
  const navigate = useNavigate();
  const { cards, isLoading, mutate } = useCards();
  const { accounts, mutate: mutateAccounts } = useAccounts();
  const { mutate: globalMutate } = useSWRConfig();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [payingCard, setPayingCard] = useState<Card | null>(null);

  const handleCreate = async (payload: CardFormPayload) => {
    setSubmitting(true);
    try {
      await apiPost('/api/tarjetas', payload);
      setShowForm(false);
      setToast('Tarjeta creada exitosamente');
      mutate();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCardClick = (card: Card) => {
    navigate(`/movements?tarjeta_id=${card.id}&tarjeta_nombre=${encodeURIComponent(card.nombre)}`);
  };

  const handlePaySuccess = () => {
    setPayingCard(null);
    setToast('Pago registrado exitosamente');
    mutate();
    mutateAccounts();
    // Invalidate movements across all periods
    globalMutate(
      (key: unknown) => typeof key === 'string' && key.startsWith('/api/movements'),
      undefined,
      { revalidate: true }
    );
  };

  const activeCards = cards.filter((c) => c.activa);
  const inactiveCards = cards.filter((c) => !c.activa);

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Tarjetas</h1>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva tarjeta
          </button>
        </div>

        {!isLoading && cards.length > 0 && <TotalsBanner cards={cards} />}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : activeCards.length === 0 && inactiveCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl">💳</p>
            <p className="mt-3 text-base font-medium text-text-primary">Sin tarjetas todavía</p>
            <p className="mt-1 text-sm text-text-secondary">
              Agregá tu primera tarjeta de crédito para registrar compras en cuotas
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Nueva tarjeta
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {activeCards.map((card) => (
                <CardCard
                  key={card.id}
                  card={card}
                  onClick={handleCardClick}
                  onPay={setPayingCard}
                />
              ))}
            </div>

            {inactiveCards.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Inactivas
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {inactiveCards.map((card) => (
                    <CardCard
                      key={card.id}
                      card={card}
                      onClick={handleCardClick}
                      onPay={setPayingCard}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <CardForm
          accounts={accounts}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          isSubmitting={submitting}
        />
      )}

      {payingCard && (
        <CardPaymentModal
          card={payingCard}
          onClose={() => setPayingCard(null)}
          onSuccess={handlePaySuccess}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
