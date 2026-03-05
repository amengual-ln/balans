import { useState, useEffect, useRef } from 'react';
import { X, Plus, TrendingUp, TrendingDown, CheckCircle, AlertCircle, Gift, ArrowLeftRight } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useCards } from '@/hooks/useCards';
import { mutate as globalMutate } from 'swr';

const LAST_ACCOUNT_KEY = 'freya_last_account';

export interface QuickAddData {
  tipo: 'INGRESO' | 'GASTO' | 'TRANSFERENCIA' | 'TARJETA';
  monto: number;
  categoria?: string;
  cuenta_id?: string;
  cuenta_destino_id?: string;   // transfer destination
  tasa_conversion?: number;     // only for cross-currency transfers
  descripcion?: string;
  fecha?: string;
  // Discount fund fields
  descuento_activo?: boolean;
  porcentaje_descuento?: number;
  fondo_descuento_id?: string;
  // Card purchase fields
  tarjeta_id?: string;
  cantidad_cuotas?: number;
}

interface QuickAddProps {
  onSubmit?: (data: QuickAddData) => void | Promise<void>;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMON_CATEGORIES: Category[] = [
  { id: 'comida', name: 'Comida', icon: '🍽️' },
  { id: 'transporte', name: 'Transporte', icon: '🚗' },
  { id: 'entretenimiento', name: 'Ocio', icon: '🎬' },
  { id: 'servicios', name: 'Servicios', icon: '💡' },
  { id: 'salud', name: 'Salud', icon: '⚕️' },
  { id: 'compras', name: 'Compras', icon: '🛍️' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBalance(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuickAdd({ onSubmit }: QuickAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tipo, setTipo] = useState<'INGRESO' | 'GASTO' | 'TRANSFERENCIA'>('GASTO');
  const [monto, setMonto] = useState('');
  const [destinoAccountId, setDestinoAccountId] = useState<string | undefined>();
  const [tasaConversion, setTasaConversion] = useState('');
  const [categoria, setCategoria] = useState<string | undefined>();
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  const { accounts: allAccounts } = useAccounts();
  const accounts = allAccounts.filter((a) => a.activa);
  const { cards: allCards } = useCards();
  const activeCards = allCards.filter((c) => c.activa);
  const [cantidadCuotas, setCantidadCuotas] = useState(1);
  const [descuentoActivo, setDescuentoActivo] = useState(false);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(70);
  const [fondoDescuentoId, setFondoDescuentoId] = useState<string | undefined>();
  const [descripcion, setDescripcion] = useState('');
  const [fechaActiva, setFechaActiva] = useState(false);
  const [fecha, setFecha] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // ── Set default selections when accounts load ───────────────────────────

  useEffect(() => {
    if (accounts.length === 0) return;

    const paymentAccts = accounts.filter((a) => a.tipo !== 'FONDO_DESCUENTO');
    const saved = localStorage.getItem(LAST_ACCOUNT_KEY);
    const validSaved = paymentAccts.find((a) => a.id === saved);
    const originId = validSaved?.id ?? paymentAccts[0]?.id;

    setSelectedAccountId((prev) => prev ?? originId);
    setDestinoAccountId((prev) => prev ?? paymentAccts.find((a) => a.id !== originId)?.id);

    const funds = accounts.filter((a) => a.tipo === 'FONDO_DESCUENTO');
    setFondoDescuentoId((prev) => prev ?? funds[0]?.id);
  }, [accounts]);

  // ── Toast auto-dismiss ────────────────────────────────────────────────────

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Auto-focus amount on open ─────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && amountInputRef.current) {
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ── Global keyboard shortcuts ─────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === '+') {
          e.preventDefault();
          setTipo('INGRESO');
          setIsOpen(true);
        } else if (e.key === '-') {
          e.preventDefault();
          setTipo('GASTO');
          setIsOpen(true);
        }
      } else {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeModal();
        } else if (e.key === 'Enter' && monto) {
          e.preventDefault();
          handleSubmit();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, monto]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const closeModal = () => {
    setIsOpen(false);
    setTimeout(() => {
      setMonto('');
      setCategoria(undefined);
      setTipo('GASTO');
      setDescripcion('');
      setFechaActiva(false);
      setFecha('');
      setDescuentoActivo(false);
      setPorcentajeDescuento(70);
      setTasaConversion('');
      setCantidadCuotas(1);
    }, 200);
  };

  const handleSubmit = async () => {
    if (!monto || parseFloat(monto) <= 0) return;

    const isCard = selectedAccountId?.startsWith('card:') ?? false;
    const cardId = isCard ? selectedAccountId!.slice(5) : undefined;

    setIsSubmitting(true);
    try {
      const data: QuickAddData = {
        tipo: isCard ? 'TARJETA' : tipo,
        monto: parseFloat(monto),
        categoria: tipo !== 'TRANSFERENCIA' ? categoria : undefined,
        cuenta_id: !isCard && tipo !== 'TRANSFERENCIA' ? selectedAccountId
          : tipo === 'TRANSFERENCIA' ? selectedAccountId
          : undefined,
        cuenta_destino_id: tipo === 'TRANSFERENCIA' ? destinoAccountId : undefined,
        tasa_conversion:
          tipo === 'TRANSFERENCIA' && tasaConversion ? parseFloat(tasaConversion) : undefined,
        descripcion: descripcion.trim() || undefined,
        fecha: fechaActiva && fecha ? new Date(fecha + 'T12:00:00').toISOString() : undefined,
        descuento_activo: !isCard && descuentoActivo && tipo === 'GASTO',
        porcentaje_descuento: !isCard && descuentoActivo ? porcentajeDescuento : undefined,
        fondo_descuento_id: !isCard && descuentoActivo ? fondoDescuentoId : undefined,
        tarjeta_id: isCard ? cardId : undefined,
        cantidad_cuotas: isCard ? cantidadCuotas : undefined,
      };

      await onSubmit?.(data);

      // Persist last used account (not card)
      if (selectedAccountId && !isCard) {
        localStorage.setItem(LAST_ACCOUNT_KEY, selectedAccountId);
      }

      // Refresh card limits after card purchase
      if (isCard) {
        globalMutate('/api/tarjetas');
      }

      closeModal();
      const toastMsg =
        tipo === 'INGRESO' ? 'Ingreso guardado'
        : isCard ? 'Compra en tarjeta guardada'
        : tipo === 'GASTO' ? 'Gasto guardado'
        : 'Transferencia guardada';
      setToast({ message: toastMsg, type: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Error al guardar',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setMonto(value);
    }
  };

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) closeModal();
  };

  // Split accounts into payment accounts and discount funds
  const paymentAccounts = accounts.filter((a) => a.tipo !== 'FONDO_DESCUENTO');
  const discountFunds = accounts.filter((a) => a.tipo === 'FONDO_DESCUENTO');

  // Derive card selection
  const isCardSelected = tipo === 'GASTO' && (selectedAccountId?.startsWith('card:') ?? false);
  const selectedCardId = isCardSelected ? selectedAccountId!.slice(5) : undefined;
  const selectedCard = activeCards.find((c) => c.id === selectedCardId);

  const selectedAccount = !isCardSelected ? paymentAccounts.find((a) => a.id === selectedAccountId) : undefined;
  const selectedFund = discountFunds.find((a) => a.id === fondoDescuentoId);

  // Transfer: accounts available as destination (excludes origin)
  const destAccounts = paymentAccounts.filter((a) => a.id !== selectedAccountId);
  const destAccount = destAccounts.find((a) => a.id === destinoAccountId);
  const currenciesDiffer =
    !!selectedAccount && !!destAccount && selectedAccount.moneda !== destAccount.moneda;

  // Today as YYYY-MM-DD (local time) — used for date input max
  const todayStr = new Date().toLocaleDateString('en-CA');

  // Preview amounts when discount is active
  const montoNumerico = parseFloat(monto) || 0;
  const montoSubsidio = parseFloat((montoNumerico * (porcentajeDescuento / 100)).toFixed(2));
  const montoPagado = parseFloat((montoNumerico - montoSubsidio).toFixed(2));

  const showAccountSelector = paymentAccounts.length > 0 || (tipo === 'GASTO' && activeCards.length > 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-all hover:bg-blue-600 hover:scale-110 active:scale-95 md:h-16 md:w-16"
        aria-label="Quick add movement"
      >
        <Plus className="h-6 w-6 md:h-7 md:w-7" strokeWidth={2.5} />
      </button>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-sm font-medium text-white shadow-lg animate-fade-in ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200 md:items-center"
          onClick={handleClickOutside}
        >
          <div
            ref={modalRef}
            className="w-full animate-slide-up rounded-t-2xl bg-white p-6 shadow-2xl transition-all duration-200 md:w-full md:max-w-md md:animate-fade-in md:rounded-2xl"
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                {tipo === 'INGRESO' ? 'Agregar Ingreso'
                  : tipo === 'TRANSFERENCIA' ? 'Nueva Transferencia'
                  : isCardSelected ? 'Compra en tarjeta'
                  : 'Agregar Gasto'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Type toggle — 3 buttons */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setTipo('GASTO')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 font-medium transition-all ${
                  tipo === 'GASTO'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <TrendingDown className="h-5 w-5" />
                <span>Gasto</span>
              </button>
              <button
                onClick={() => setTipo('INGRESO')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 font-medium transition-all ${
                  tipo === 'INGRESO'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <TrendingUp className="h-5 w-5" />
                <span>Ingreso</span>
              </button>
              <button
                onClick={() => setTipo('TRANSFERENCIA')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 font-medium transition-all ${
                  tipo === 'TRANSFERENCIA'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <ArrowLeftRight className="h-5 w-5" />
                <span>Transferir</span>
              </button>
            </div>

            {/* Amount input */}
            <div className="mb-4">
              <label htmlFor="qa-amount" className="mb-2 block text-sm font-medium text-gray-700">
                Monto
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-gray-400">
                  $
                </span>
                <input
                  ref={amountInputRef}
                  id="qa-amount"
                  type="text"
                  inputMode="decimal"
                  value={monto}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  className="w-full rounded-lg border-2 border-gray-200 py-4 pl-10 pr-4 text-3xl font-semibold text-gray-800 transition-colors focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Description input — hidden for transfers */}
            {tipo !== 'TRANSFERENCIA' && (
              <div className="mb-4">
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  maxLength={200}
                  placeholder={isCardSelected ? 'Descripción — Ej: TV 55"' : 'Descripción (opcional) — Ej: café en la ofi'}
                  className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* Account / Card selector (origin) */}
            {showAccountSelector && (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="qa-account" className="text-sm font-medium text-gray-700">
                    {tipo === 'TRANSFERENCIA' ? 'Desde' : 'Cuenta'}
                  </label>
                  {isCardSelected && selectedCard ? (
                    <span className="text-xs text-gray-500">
                      {selectedCard.moneda}{' '}
                      <span className="font-semibold text-gray-700">
                        {formatBalance(selectedCard.limite_disponible)}
                      </span>{' '}
                      disponible
                    </span>
                  ) : selectedAccount ? (
                    <span className="text-xs text-gray-500">
                      {selectedAccount.moneda}{' '}
                      <span
                        className={
                          parseFloat(String(selectedAccount.saldo_actual)) < 0
                            ? 'font-semibold text-red-600'
                            : 'font-semibold text-gray-700'
                        }
                      >
                        {formatBalance(selectedAccount.saldo_actual)}
                      </span>{' '}
                      disponible
                    </span>
                  ) : null}
                </div>
                <select
                  id="qa-account"
                  value={selectedAccountId ?? ''}
                  onChange={(e) => {
                    const newOrigin = e.target.value || undefined;
                    setSelectedAccountId(newOrigin);
                    // Reset cuotas when switching away from a card
                    if (!newOrigin?.startsWith('card:')) {
                      setCantidadCuotas(1);
                    }
                    // If destination equals new origin, reset it
                    if (!newOrigin?.startsWith('card:') && destinoAccountId === newOrigin) {
                      setDestinoAccountId(
                        paymentAccounts.find((a) => a.id !== newOrigin)?.id,
                      );
                    }
                  }}
                  className={`w-full rounded-lg border-2 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 transition-colors focus:outline-none ${
                    isCardSelected
                      ? 'border-amber-300 focus:border-amber-500'
                      : 'border-gray-200 focus:border-blue-500'
                  }`}
                >
                  {paymentAccounts.length > 0 && tipo === 'GASTO' && activeCards.length > 0 ? (
                    <optgroup label="Cuentas">
                      {paymentAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} · {a.moneda} {formatBalance(a.saldo_actual)}
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    paymentAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} · {a.moneda} {formatBalance(a.saldo_actual)}
                      </option>
                    ))
                  )}
                  {tipo === 'GASTO' && activeCards.length > 0 && (
                    <optgroup label="Tarjetas de crédito">
                      {activeCards.map((c) => (
                        <option key={c.id} value={`card:${c.id}`}>
                          {c.nombre} · {c.moneda} {formatBalance(c.limite_disponible)} disponible
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {/* Cuotas pills — auto-appear when a card is selected */}
                {isCardSelected && (
                  <div className="mt-3">
                    <label className="mb-2 block text-xs font-medium text-gray-600">Cuotas</label>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 3, 6, 12].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setCantidadCuotas(n)}
                          className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold transition-all ${
                            cantidadCuotas === n
                              ? 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {n === 1 ? '1 pago' : `${n}×`}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={48}
                        value={cantidadCuotas}
                        onChange={(e) => {
                          const v = Math.min(48, Math.max(1, parseInt(e.target.value) || 1));
                          setCantidadCuotas(v);
                        }}
                        className="w-16 rounded-lg border-2 border-gray-200 px-2 py-1.5 text-center text-sm font-semibold text-gray-800 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    {montoNumerico > 0 && cantidadCuotas > 1 && (
                      <p className="mt-1.5 text-xs text-gray-500">
                        ≈ ${formatBalance(montoNumerico / cantidadCuotas)} por cuota
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Destination account selector — only for transfers */}
            {tipo === 'TRANSFERENCIA' && (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="qa-destino" className="text-sm font-medium text-gray-700">
                    Hacia
                  </label>
                  {destAccount && (
                    <span className="text-xs text-gray-500">
                      {destAccount.moneda}{' '}
                      <span
                        className={
                          parseFloat(String(destAccount.saldo_actual)) < 0
                            ? 'font-semibold text-red-600'
                            : 'font-semibold text-gray-700'
                        }
                      >
                        {formatBalance(destAccount.saldo_actual)}
                      </span>{' '}
                      disponible
                    </span>
                  )}
                </div>
                {destAccounts.length > 0 ? (
                  <select
                    id="qa-destino"
                    value={destinoAccountId ?? ''}
                    onChange={(e) => setDestinoAccountId(e.target.value || undefined)}
                    className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 transition-colors focus:border-blue-500 focus:outline-none"
                  >
                    {destAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} · {a.moneda} {formatBalance(a.saldo_actual)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-lg border-2 border-dashed border-gray-200 px-3 py-2.5 text-sm text-gray-400">
                    No hay otras cuentas disponibles
                  </p>
                )}

                {/* Conversion rate — only when currencies differ */}
                {currenciesDiffer && (
                  <div className="mt-3">
                    <label htmlFor="qa-tasa" className="mb-1.5 block text-xs font-medium text-gray-600">
                      Tasa de conversión{' '}
                      <span className="font-normal text-gray-400">
                        ({selectedAccount?.moneda} → {destAccount?.moneda}, opcional)
                      </span>
                    </label>
                    <input
                      id="qa-tasa"
                      type="number"
                      min={0}
                      step="any"
                      value={tasaConversion}
                      onChange={(e) => setTasaConversion(e.target.value)}
                      placeholder="Ej: 1050"
                      className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Date toggle */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setFechaActiva((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
              >
                <span>📅</span>
                {fechaActiva ? 'Usar fecha de hoy' : 'Cambiar fecha'}
              </button>
              {fechaActiva && (
                <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
                  <input
                    type="date"
                    value={fecha}
                    max={todayStr}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full rounded border border-blue-200 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Discount fund section — only for regular gastos (not card purchases) */}
            {tipo === 'GASTO' && !isCardSelected && (
              <div className="mb-4">
                {/* Toggle */}
                <label
                  className={`flex cursor-pointer items-center justify-between rounded-lg border-2 px-3 py-2.5 transition-colors ${
                    descuentoActivo
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${discountFunds.length === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Gift className="h-4 w-4 text-blue-500" />
                    Aplica descuento de fondo
                    {discountFunds.length === 0 && (
                      <span className="text-xs font-normal text-gray-400">(sin fondos)</span>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={descuentoActivo}
                    disabled={discountFunds.length === 0}
                    onChange={(e) => setDescuentoActivo(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                </label>

                {/* Expanded discount options */}
                {descuentoActivo && discountFunds.length > 0 && (
                  <div className="mt-3 space-y-3 rounded-lg border-2 border-blue-100 bg-blue-50 p-3">
                    {/* Fund selector */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor="qa-fund" className="text-xs font-medium text-gray-600">
                          Fondo de descuento
                        </label>
                        {selectedFund && (
                          <span className="text-xs text-gray-500">
                            {selectedFund.moneda}{' '}
                            <span
                              className={
                                parseFloat(String(selectedFund.saldo_actual)) < 0
                                  ? 'font-semibold text-red-600'
                                  : 'font-semibold text-gray-700'
                              }
                            >
                              {formatBalance(selectedFund.saldo_actual)}
                            </span>{' '}
                            disponible
                          </span>
                        )}
                      </div>
                      <select
                        id="qa-fund"
                        value={fondoDescuentoId ?? ''}
                        onChange={(e) => setFondoDescuentoId(e.target.value || undefined)}
                        className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 focus:border-blue-500 focus:outline-none"
                      >
                        {discountFunds.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre} · {a.moneda} {formatBalance(a.saldo_actual)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Percentage input */}
                    <div>
                      <label htmlFor="qa-descuento" className="mb-1.5 block text-xs font-medium text-gray-600">
                        % descuento del fondo
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="qa-descuento"
                          type="number"
                          min={1}
                          max={99}
                          value={porcentajeDescuento}
                          onChange={(e) => {
                            const v = Math.min(99, Math.max(1, parseInt(e.target.value) || 1));
                            setPorcentajeDescuento(v);
                          }}
                          className="w-20 rounded-lg border border-blue-200 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-800 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>

                    {/* Split preview */}
                    {montoNumerico > 0 && (
                      <div className="rounded-lg bg-white px-3 py-2 text-xs">
                        <span className="text-gray-500">Total </span>
                        <span className="font-semibold text-gray-800">${formatBalance(montoNumerico)}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="text-gray-500">Pagás </span>
                        <span className="font-semibold text-negative">${formatBalance(montoPagado)}</span>
                        <span className="mx-1.5 text-gray-400">·</span>
                        <span className="text-gray-500">Fondo </span>
                        <span className="font-semibold text-blue-600">${formatBalance(montoSubsidio)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Category pills — hidden for transfers */}
            {tipo !== 'TRANSFERENCIA' && <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-gray-700">
                Categoría
              </label>
              <div className="grid grid-cols-3 gap-2">
                {COMMON_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoria(cat.id === categoria ? undefined : cat.id)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 py-3 transition-all ${
                      categoria === cat.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-medium text-gray-700">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={
                !monto || parseFloat(monto) <= 0 || isSubmitting ||
                (tipo === 'TRANSFERENCIA' && (!selectedAccountId || !destinoAccountId))
              }
              className={`w-full rounded-lg py-4 font-semibold text-white transition-all ${
                !monto || parseFloat(monto) <= 0 || isSubmitting ||
                (tipo === 'TRANSFERENCIA' && (!selectedAccountId || !destinoAccountId))
                  ? 'cursor-not-allowed bg-gray-300'
                  : tipo === 'INGRESO'
                  ? 'bg-green-500 hover:bg-green-600 active:scale-[0.98]'
                  : isCardSelected
                  ? 'bg-amber-500 hover:bg-amber-600 active:scale-[0.98]'
                  : tipo === 'GASTO'
                  ? 'bg-red-500 hover:bg-red-600 active:scale-[0.98]'
                  : 'bg-blue-500 hover:bg-blue-600 active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>

            <p className="mt-4 text-center text-xs text-gray-500">
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">Enter</kbd> guardar •{' '}
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">Esc</kbd> cancelar
            </p>
          </div>
        </div>
      )}
    </>
  );
}
