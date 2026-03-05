import { Landmark } from 'lucide-react';
import { Debt, DireccionDeuda } from '@/hooks/useDebts';

interface PaidProgressBarProps {
  paid: number;
  total: number;
}

function PaidProgressBar({ paid, total }: PaidProgressBarProps) {
  const percentage = Math.min((paid / total) * 100, 100);

  let barColor = 'bg-negative';
  if (percentage >= 100) {
    barColor = 'bg-positive';
  } else if (percentage >= 50) {
    barColor = 'bg-warning';
  }

  return (
    <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
      <div
        className={`${barColor} h-full transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

interface DebtCardProps {
  debt: Debt;
  onPay: (debt: Debt) => void;
}

export default function DebtCard({ debt, onPay }: DebtCardProps) {
  const monto_total = parseFloat(debt.monto_total.toString());
  const monto_pendiente = parseFloat(debt.monto_pendiente.toString());
  const monto_pagado = monto_total - monto_pendiente;

  const isPayable = debt.direccion === 'POR_PAGAR';
  const isReceivable = debt.direccion === 'POR_COBRAR';

  const directionLabel = isPayable ? 'Por pagar' : 'Por cobrar';
  const directionColor = isPayable ? 'text-negative' : 'text-positive';
  const directionBg = isPayable
    ? 'bg-negative/10 border-negative/20'
    : 'bg-positive/10 border-positive/20';

  const typeMap: Record<string, string> = {
    PERSONAL: 'Personal',
    CREDITO_BILLETERA: 'Billetera',
    PRESTAMO: 'Préstamo',
    OTRO: 'Otro',
  };

  return (
    <div className={`bg-white rounded-lg border border-border p-4 ${debt.saldada ? 'opacity-50' : ''}`}>
      {/* Header: Direction + Type */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${directionBg}`}>
            <Landmark className="h-3.5 w-3.5" />
            <span className={directionColor}>{directionLabel}</span>
          </span>
          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-surface border border-border text-text-secondary">
            {typeMap[debt.tipo]}
          </span>
        </div>
        {debt.saldada && (
          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-positive/10 border border-positive/20 text-positive">
            Saldada
          </span>
        )}
      </div>

      {/* Counterparty */}
      <div className="mb-3">
        <p className="text-text-secondary text-sm mb-0.5">
          {isPayable ? 'Acreedor:' : 'Deudor:'}
        </p>
        <p className="text-text-primary font-semibold truncate">{debt.acreedor}</p>
      </div>

      {/* Pending Amount */}
      <div className="mb-4">
        <p className="text-text-primary text-xl font-bold">
          {debt.moneda} {monto_pendiente.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <PaidProgressBar paid={monto_pagado} total={monto_total} />
      </div>

      {/* Paid Summary */}
      <p className="text-text-secondary text-sm mb-4">
        {debt.moneda} {monto_pagado.toLocaleString('es-AR', { maximumFractionDigits: 2 })} de {monto_total.toLocaleString('es-AR', { maximumFractionDigits: 2 })} {isPayable ? 'pagado' : 'cobrado'}
      </p>

      {/* Action Button */}
      {!debt.saldada && (
        <button
          onClick={() => onPay(debt)}
          className="w-full bg-primary text-white py-2 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Registrar {isPayable ? 'pago' : 'cobro'}
        </button>
      )}
    </div>
  );
}
