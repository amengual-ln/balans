import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, X, Gift } from 'lucide-react';

// Temporary: replaced by Supabase Auth context once auth is wired up
const USER_ID = import.meta.env.VITE_USER_ID ?? 'demo-user-id';

// ─── Types ───────────────────────────────────────────────────────────────────

type TipoMovimiento =
  | 'INGRESO'
  | 'GASTO'
  | 'TRANSFERENCIA'
  | 'PAGO_TARJETA'
  | 'GASTO_TARJETA'
  | 'PAGO_DEUDA'
  | 'INVERSION'
  | 'RETORNO_INVERSION'
  | 'AJUSTE'
  | 'INGRESO_INICIAL'
  | 'GASTO_CON_DESCUENTO'
  | 'SUBSIDIO';

interface CuentaRef {
  id: string;
  nombre: string;
  tipo: string;
  moneda: string;
}

interface Movement {
  id: string;
  tipo: TipoMovimiento;
  monto: string;
  moneda: string;
  descripcion: string;
  categoria?: string | null;
  fecha: string;
  cuenta_origen?: CuentaRef | null;
  cuenta_destino?: CuentaRef | null;
  movimiento_relacionado_id?: string | null;
  metadata?: { monto_total?: number; porcentaje_descuento?: number } | null;
}

type FilterGroup = '' | 'income' | 'expense' | 'transfer';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INCOME_TYPES = new Set<TipoMovimiento>(['INGRESO', 'RETORNO_INVERSION', 'INGRESO_INICIAL']);
const EXPENSE_TYPES = new Set<TipoMovimiento>([
  'GASTO', 'PAGO_TARJETA', 'GASTO_TARJETA', 'PAGO_DEUDA', 'INVERSION', 'GASTO_CON_DESCUENTO',
]);

function getAmountClass(tipo: TipoMovimiento): string {
  if (INCOME_TYPES.has(tipo)) return 'text-positive';
  if (EXPENSE_TYPES.has(tipo)) return 'text-negative';
  return 'text-primary';
}

function getAmountPrefix(tipo: TipoMovimiento): string {
  if (INCOME_TYPES.has(tipo)) return '+';
  if (EXPENSE_TYPES.has(tipo)) return '-';
  return '';
}

function formatAmount(monto: string): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parseFloat(monto));
}

const SHORT_MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

function groupByDate(movements: Movement[]): Array<{ label: string; items: Movement[] }> {
  const groups: Array<{ label: string; items: Movement[] }> = [];
  const seen = new Map<string, Movement[]>();

  for (const m of movements) {
    const label = formatDateLabel(m.fecha);
    if (!seen.has(label)) {
      const items: Movement[] = [];
      seen.set(label, items);
      groups.push({ label, items });
    }
    seen.get(label)!.push(m);
  }

  return groups;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MovementRow({ movement, subsidio }: { movement: Movement; subsidio?: Movement }) {
  const prefix = getAmountPrefix(movement.tipo);
  const amountClass = getAmountClass(movement.tipo);

  const isTransfer = movement.tipo === 'TRANSFERENCIA';

  // For transfers: primary label is "[from] → [to]"; no secondary meta needed
  const transferLabel = isTransfer
    ? [movement.cuenta_origen?.nombre, movement.cuenta_destino?.nombre]
        .filter(Boolean)
        .join(' → ')
    : null;

  const accountName = isTransfer
    ? null
    : (movement.cuenta_origen?.nombre ?? movement.cuenta_destino?.nombre);

  const primaryLabel = isTransfer ? (transferLabel ?? movement.descripcion) : movement.descripcion;
  const meta = isTransfer ? null : [movement.categoria, accountName].filter(Boolean).join(' · ');

  return (
    <div>
      {/* Main row */}
      <div className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface">
        {/* Description + metadata */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">{primaryLabel}</p>
          {meta && (
            <p className="mt-0.5 truncate text-xs text-text-secondary">{meta}</p>
          )}
        </div>

        {/* Amount */}
        <div className="shrink-0 text-right">
          <p className={`text-sm font-semibold tabular-nums ${amountClass}`}>
            {prefix}${formatAmount(movement.monto)}
          </p>
          {movement.moneda !== 'ARS' && (
            <p className="text-xs text-text-secondary">{movement.moneda}</p>
          )}
        </div>
      </div>

      {/* Subsidio sub-row */}
      {subsidio && (
        <>
          <div className="mx-4 border-t border-dashed border-blue-100" />
          <div className="flex items-center gap-2 bg-blue-50/50 px-4 py-2">
            <Gift className="h-3.5 w-3.5 shrink-0 text-blue-400" />
            <span className="min-w-0 flex-1 truncate text-xs text-blue-600">
              {subsidio.cuenta_origen?.nombre ?? 'Fondo'}
              {subsidio.metadata?.porcentaje_descuento != null
                ? ` · ${subsidio.metadata.porcentaje_descuento}%`
                : ''}
            </span>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-blue-600">
              −${formatAmount(subsidio.monto)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando movimientos">
      {[3, 2].map((count, gi) => (
        <div key={gi}>
          <div className="mb-2 h-3 w-10 animate-pulse rounded bg-gray-200" />
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 space-y-1.5">
                  <div
                    className="h-3.5 animate-pulse rounded bg-gray-200"
                    style={{ width: `${55 + i * 18}%` }}
                  />
                  <div className="h-3 w-28 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="h-3.5 w-16 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="py-16 text-center">
      <p className="text-3xl">🗒️</p>
      <p className="mt-3 text-sm font-medium text-text-primary">
        {hasFilters ? 'Sin resultados' : 'Sin movimientos'}
      </p>
      <p className="mt-1 text-xs text-text-secondary">
        {hasFilters
          ? 'Prueba cambiando los filtros'
          : 'Presioná + para registrar tu primer movimiento'}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MovementsListProps {
  /** ISO date string for the start of the period */
  desdeISO: string;
  /** ISO date string for the end of the period */
  hastaISO: string;
  /** Increment to trigger a data refresh */
  refreshKey: number;
}

export default function MovementsList({ desdeISO, hastaISO, refreshKey }: MovementsListProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (client-side — full period is fetched once, filters are instant)
  const [filterGroup, setFilterGroup] = useState<FilterGroup>('');
  const [filterCategoria, setFilterCategoria] = useState('');

  const fetchMovements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        desde: desdeISO,
        hasta: hastaISO,
        limit: '500',
        offset: '0',
      });
      const res = await fetch(`/api/movements?${params}`, {
        headers: { 'x-user-id': USER_ID },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Error al cargar movimientos');
      }
      const json = await res.json() as { data?: Movement[] };
      setMovements(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setMovements([]);
    } finally {
      setIsLoading(false);
    }
  }, [desdeISO, hastaISO, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  // Build subsidioMap: keyed by GASTO_CON_DESCUENTO id → SUBSIDIO movement
  const subsidioMap = new Map<string, Movement>();
  movements.forEach((m) => {
    if (m.tipo === 'SUBSIDIO' && m.movimiento_relacionado_id) {
      subsidioMap.set(m.movimiento_relacionado_id, m);
    }
  });

  // Client-side filtering — SUBSIDIOs always excluded (rendered nested)
  const filtered = movements.filter((m) => {
    if (m.tipo === 'SUBSIDIO') return false;
    if (filterGroup === 'income' && !INCOME_TYPES.has(m.tipo)) return false;
    if (filterGroup === 'expense' && !EXPENSE_TYPES.has(m.tipo)) return false;
    if (filterGroup === 'transfer' && m.tipo !== 'TRANSFERENCIA') return false;
    if (filterCategoria) {
      const haystack = m.categoria?.toLowerCase() ?? '';
      if (!haystack.includes(filterCategoria.toLowerCase())) return false;
    }
    return true;
  });

  const grouped = groupByDate(filtered);
  const hasFilters = filterGroup !== '' || filterCategoria !== '';

  return (
    <div>
      {/* ── Filter bar ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Type group */}
        <div className="relative">
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value as FilterGroup)}
            className="appearance-none cursor-pointer rounded-lg border border-border bg-white py-2 pl-3 pr-7 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            <option value="">Todos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Gastos</option>
            <option value="transfer">Transferencias</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
        </div>

        {/* Category text filter */}
        <input
          type="text"
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          placeholder="Categoría..."
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none"
        />

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => { setFilterGroup(''); setFilterCategoria(''); }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-secondary transition-colors hover:border-gray-400 hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <SkeletonList />
      ) : error ? (
        <div className="py-12 text-center text-sm text-negative">{error}</div>
      ) : grouped.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <>
          {grouped.map(({ label, items }) => (
            <section key={label} className="mb-5">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {label}
              </h2>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
                {items.map((m) => (
                  <MovementRow
                    key={m.id}
                    movement={m}
                    subsidio={m.tipo === 'GASTO_CON_DESCUENTO' ? subsidioMap.get(m.id) : undefined}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* Summary footer */}
          <p className="pb-6 text-center text-xs text-text-secondary">
            {filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}
            {hasFilters && movements.filter((m) => m.tipo !== 'SUBSIDIO').length !== filtered.length
              ? ` de ${movements.filter((m) => m.tipo !== 'SUBSIDIO').length} en el período`
              : ' en el período'}
          </p>
        </>
      )}
    </div>
  );
}
