import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import AccountCard, { type Account } from '@/components/AccountCard';
import AccountForm, { type AccountFormPayload } from '@/components/AccountForm';
import RecargarFondoModal from '@/components/RecargarFondoModal';
import { useAccounts } from '@/hooks/useAccounts';
import { apiPost } from '@/hooks/useAPI';
import { formatAmount } from '@/lib/financeFormat';

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
      <div className="h-6 w-28 rounded bg-gray-200" />
    </div>
  );
}

// ─── Total balance banner ─────────────────────────────────────────────────────

function TotalsBanner({ accounts }: { accounts: Account[] }) {
  const totals: Record<string, number> = {};
  for (const acc of accounts) {
    if (!acc.activa) continue;
    const bal = typeof acc.saldo_actual === 'string' ? parseFloat(acc.saldo_actual) : acc.saldo_actual;
    totals[acc.moneda] = (totals[acc.moneda] ?? 0) + bal;
  }

  const entries = Object.entries(totals);
  if (entries.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
        Patrimonio total
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {entries.map(([currency, total]) => (
          <div key={currency} className="flex items-baseline gap-1.5">
            <span className="text-sm text-text-secondary">{currency}</span>
            <span
              className={`text-2xl font-bold tabular-nums ${
                total < 0 ? 'text-negative' : 'text-text-primary'
              }`}
            >
              {total < 0 ? '-' : ''}
              {formatAmount(total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Adjust balance modal ────────────────────────────────────────────────────

interface AdjustBalanceModalProps {
  account: Account;
  onClose: () => void;
  onSuccess: () => void;
}

function AdjustBalanceModal({ account, onClose, onSuccess }: AdjustBalanceModalProps) {
  const currentBalance =
    typeof account.saldo_actual === 'string'
      ? parseFloat(account.saldo_actual)
      : account.saldo_actual;
  const [newBalance, setNewBalance] = useState(String(currentBalance));
  const [description, setDescription] = useState('Ajuste manual de saldo');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const diff = (parseFloat(newBalance) || 0) - currentBalance;

  const handleSubmit = async () => {
    const parsed = parseFloat(newBalance);
    if (Number.isNaN(parsed) || parsed < 0 || !description.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await apiPost(`/api/cuentas/${account.id}/ajustar`, {
        nuevo_saldo: parsed,
        descripcion: description.trim(),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ajustar saldo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md animate-fade-in rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Ajustar saldo</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-text-secondary">
          <span className="font-medium text-text-primary">{account.nombre}</span>
          {' · saldo actual '}
          {account.moneda} {formatAmount(currentBalance)}
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Nuevo saldo
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              inputMode="decimal"
              autoFocus
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className={`mt-1 text-xs ${diff < 0 ? 'text-negative' : diff > 0 ? 'text-positive' : 'text-text-secondary'}`}>
              Movimiento de ajuste: {account.moneda} {formatAmount(diff, { signed: true })}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p>
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
              disabled={submitting || !description.trim() || parseFloat(newBalance) < 0}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Ajustando...' : 'Guardar ajuste'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Accounts() {
  const navigate = useNavigate();
  const { accounts, isLoading: loading, mutate } = useAccounts();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [recargarAccount, setRecargarAccount] = useState<Account | null>(null);
  const [adjustAccount, setAdjustAccount] = useState<Account | null>(null);

  // ── Create account (CU-001) ─────────────────────────────────────────────

  const handleCreate = async (payload: AccountFormPayload) => {
    setSubmitting(true);
    try {
      await apiPost('/api/cuentas', payload);
      setShowForm(false);
      setToast('Cuenta creada exitosamente');
      mutate();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Navigate to account detail ──────────────────────────────────────────

  const handleCardClick = (account: Account) => {
    navigate(`/movements?cuenta_id=${account.id}&cuenta_nombre=${encodeURIComponent(account.nombre)}`);
  };

  const handleTransfer = (account: Account) => {
    navigate(`/movements?quick=transfer&cuenta_id=${account.id}&cuenta_nombre=${encodeURIComponent(account.nombre)}`);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const activeAccounts = accounts.filter((a) => a.activa);
  const inactiveAccounts = accounts.filter((a) => !a.activa);

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Cuentas</h1>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva cuenta
          </button>
        </div>

        {!loading && accounts.length > 0 && <TotalsBanner accounts={accounts} />}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : activeAccounts.length === 0 && inactiveAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl">🏦</p>
            <p className="mt-3 text-base font-medium text-text-primary">Sin cuentas todavía</p>
            <p className="mt-1 text-sm text-text-secondary">
              Creá tu primera cuenta para empezar a registrar movimientos
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Nueva cuenta
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {activeAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onClick={handleCardClick}
                  onRecargar={account.tipo === 'FONDO_DESCUENTO' ? setRecargarAccount : undefined}
                  onAdjust={account.tipo !== 'FONDO_DESCUENTO' ? setAdjustAccount : undefined}
                  onTransfer={account.tipo !== 'FONDO_DESCUENTO' ? handleTransfer : undefined}
                />
              ))}
            </div>

            {inactiveAccounts.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Inactivas
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {inactiveAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onClick={handleCardClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <AccountForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          isSubmitting={submitting}
        />
      )}

      {recargarAccount && (
        <RecargarFondoModal
          account={recargarAccount}
          onClose={() => setRecargarAccount(null)}
          onSuccess={() => {
            setToast('Fondo recargado exitosamente');
            mutate();
          }}
        />
      )}

      {adjustAccount && (
        <AdjustBalanceModal
          account={adjustAccount}
          onClose={() => setAdjustAccount(null)}
          onSuccess={() => {
            setToast('Saldo ajustado exitosamente');
            mutate();
          }}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
