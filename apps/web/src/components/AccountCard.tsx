import { Building2, Wallet, TrendingUp, Banknote, Gift } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TipoCuenta = 'BANCO' | 'BILLETERA' | 'BROKER' | 'EFECTIVO' | 'FONDO_DESCUENTO';

export interface Account {
  id: string;
  nombre: string;
  tipo: TipoCuenta;
  moneda: string;
  saldo_actual: string | number;
  activa: boolean;
}

interface AccountCardProps {
  account: Account;
  onClick: (account: Account) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<TipoCuenta, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  BANCO: { label: 'Banco', Icon: Building2 },
  BILLETERA: { label: 'Billetera', Icon: Wallet },
  BROKER: { label: 'Broker', Icon: TrendingUp },
  EFECTIVO: { label: 'Efectivo', Icon: Banknote },
  FONDO_DESCUENTO: { label: 'Fondo Descuento', Icon: Gift },
};

function formatBalance(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AccountCard({ account, onClick }: AccountCardProps) {
  const { nombre, tipo, moneda, saldo_actual, activa } = account;
  const balance = typeof saldo_actual === 'string' ? parseFloat(saldo_actual) : saldo_actual;
  const isNegative = balance < 0;
  const { label, Icon } = TYPE_CONFIG[tipo];

  return (
    <button
      onClick={() => onClick(account)}
      disabled={!activa}
      className={`
        group w-full rounded-xl border bg-white p-4 text-left shadow-sm
        transition-all duration-150
        ${activa
          ? 'border-border hover:border-primary hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
          : 'border-border opacity-50 cursor-not-allowed'
        }
      `}
    >
      {/* Header: type badge + inactive label */}
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        {!activa && (
          <span className="text-xs text-text-secondary">Inactiva</span>
        )}
      </div>

      {/* Account name */}
      <p className="mb-2 truncate text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
        {nombre}
      </p>

      {/* Balance */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-text-secondary">{moneda}</span>
        <span
          className={`text-xl font-bold tabular-nums leading-none ${
            isNegative ? 'text-negative' : 'text-text-primary'
          }`}
        >
          {isNegative ? '-' : ''}{formatBalance(saldo_actual)}
        </span>
      </div>
    </button>
  );
}
