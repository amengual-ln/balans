import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { apiPost } from '@/hooks/useAPI';

interface RecargarFondoModalProps {
  account: { id: string; nombre: string; moneda: string; recarga_mensual?: string | number | null };
  onClose: () => void;
  onSuccess: () => void;
}

export default function RecargarFondoModal({ account, onClose, onSuccess }: RecargarFondoModalProps) {
  const defaultMonto = account.recarga_mensual ? String(Number(account.recarga_mensual)) : '';
  const [monto, setMonto] = useState(defaultMonto);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(monto);
    if (isNaN(parsed) || parsed <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiPost(`/api/cuentas/${account.id}/recargar`, { monto: parsed });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al recargar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm animate-fade-in rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text-primary">Recargar fondo</h2>
            <p className="text-xs text-text-secondary">{account.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Monto <span className="text-negative">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">
                {account.moneda}
              </span>
              <input
                ref={inputRef}
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0"
                inputMode="decimal"
                value={monto}
                onChange={(e) => { setMonto(e.target.value); setError(null); }}
                className={`w-full rounded-lg border py-2.5 pl-12 pr-3 text-sm text-text-primary placeholder:text-text-secondary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 ${error ? 'border-negative' : 'border-border'}`}
              />
            </div>
            {error && <p className="mt-1 text-xs text-negative">{error}</p>}
            <p className="mt-1 text-xs text-text-secondary">
              El saldo quedará establecido en este monto (no se acumula)
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Recargando…' : 'Recargar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
