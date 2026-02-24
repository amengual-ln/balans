import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AccountCard, { type Account } from '@/components/AccountCard';
import AccountForm, { type AccountFormPayload } from '@/components/AccountForm';

// Temporary: replaced by Supabase Auth context once auth is wired up
const USER_ID = import.meta.env.VITE_USER_ID ?? 'demo-user-id';

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

interface TotalsProps {
  accounts: Account[];
}

function TotalsBanner({ accounts }: TotalsProps) {
  // Group by currency, sum activa accounts only
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Accounts() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── Fetch accounts ──────────────────────────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cuentas', {
        headers: { 'x-user-id': USER_ID },
      });
      if (!res.ok) throw new Error('Error al cargar cuentas');
      const json = await res.json() as { data: Account[] };
      setAccounts(json.data ?? []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // ── Create account (CU-001) ─────────────────────────────────────────────

  const handleCreate = async (payload: AccountFormPayload) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/cuentas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json() as { success: boolean; error?: string };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Error al crear la cuenta');
      }

      setShowForm(false);
      setToast('Cuenta creada exitosamente');
      await fetchAccounts();
    } catch (err) {
      throw err; // Let AccountForm handle error display if needed
    } finally {
      setSubmitting(false);
    }
  };

  // ── Navigate to account detail ──────────────────────────────────────────

  const handleCardClick = (account: Account) => {
    navigate(`/movements?cuenta_id=${account.id}&cuenta_nombre=${encodeURIComponent(account.nombre)}`);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const activeAccounts = accounts.filter((a) => a.activa);
  const inactiveAccounts = accounts.filter((a) => !a.activa);

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">

        {/* Page heading */}
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

        {/* Totals banner */}
        {!loading && accounts.length > 0 && <TotalsBanner accounts={accounts} />}

        {/* Accounts grid */}
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
            {/* Active accounts */}
            <div className="grid grid-cols-2 gap-3">
              {activeAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onClick={handleCardClick}
                />
              ))}
            </div>

            {/* Inactive accounts */}
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

      {/* Account form modal */}
      {showForm && (
        <AccountForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          isSubmitting={submitting}
        />
      )}

      {/* Success toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
