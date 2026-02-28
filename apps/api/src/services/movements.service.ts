import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import type {
  QuickAddMovementInput,
  CreateIncomeInput,
  CreateExpenseInput,
  CreateTransferInput,
  GetMovementsQuery,
  ExpenseWithDiscountInput,
} from '../schemas/movements.schema';

export class MovementsService {
  /**
   * Get conversion rate between currencies
   * If same currency, returns 1
   * Otherwise, looks up ConfiguracionMoneda or uses provided rate
   */
  private async getConversionRate(
    usuarioId: string,
    fromCurrency: string,
    toCurrency: string,
    providedRate?: number
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    if (providedRate) {
      return providedRate;
    }

    // Look up conversion rate in user's configuration
    const config = await prisma.configuracionMoneda.findUnique({
      where: {
        usuario_id_moneda: {
          usuario_id: usuarioId,
          moneda: fromCurrency,
        },
      },
    });

    if (!config) {
      throw new Error(
        `No hay tasa de conversión configurada para ${fromCurrency}. Por favor configúrala primero.`
      );
    }

    return Number(config.tasa_a_principal);
  }

  /**
   * Validate sufficient balance for expenses
   */
  private async validateSufficientBalance(
    cuentaId: string,
    monto: number
  ): Promise<void> {
    const cuenta = await prisma.cuenta.findUnique({
      where: { id: cuentaId },
      select: { saldo_actual: true, nombre: true },
    });

    if (!cuenta) {
      throw new Error('Cuenta no encontrada');
    }

    const saldoActual = Number(cuenta.saldo_actual);

    if (saldoActual < monto) {
      throw new Error(
        `Saldo insuficiente en ${cuenta.nombre}. Disponible: $${saldoActual.toFixed(2)}, Requerido: $${monto.toFixed(2)}`
      );
    }
  }

  /**
   * Validate account is active
   */
  private async validateAccountActive(cuentaId: string): Promise<void> {
    const cuenta = await prisma.cuenta.findUnique({
      where: { id: cuentaId },
      select: { activa: true, nombre: true },
    });

    if (!cuenta) {
      throw new Error('Cuenta no encontrada');
    }

    if (!cuenta.activa) {
      throw new Error(`La cuenta ${cuenta.nombre} está inactiva`);
    }
  }

  /**
   * Update account balance after movement
   */
  private async updateAccountBalance(
    tx: Prisma.TransactionClient,
    cuentaId: string,
    monto: number,
    operation: 'add' | 'subtract'
  ): Promise<void> {
    // Use increment/decrement for a single atomic UPDATE — avoids the extra
    // findUnique round-trip and eliminates the read-modify-write race condition.
    await tx.cuenta.update({
      where: { id: cuentaId },
      data: {
        saldo_actual: operation === 'add' ? { increment: monto } : { decrement: monto },
      },
    });
  }

  /**
   * Get user's default account or most recently used account
   */
  private async getDefaultAccount(usuarioId: string): Promise<string> {
    // Get the most recently used active account
    const lastMovement = await prisma.movimiento.findFirst({
      where: {
        usuario_id: usuarioId,
        tipo: { in: ['GASTO', 'INGRESO'] },
      },
      orderBy: { created_at: 'desc' },
      select: { cuenta_id: true },
    });

    if (lastMovement) {
      // Verify the account is still active
      const cuenta = await prisma.cuenta.findUnique({
        where: { id: lastMovement.cuenta_id },
        select: { activa: true },
      });

      if (cuenta?.activa) {
        return lastMovement.cuenta_id;
      }
    }

    // Fallback: get first active account
    const firstAccount = await prisma.cuenta.findFirst({
      where: {
        usuario_id: usuarioId,
        activa: true,
      },
      orderBy: { created_at: 'asc' },
      select: { id: true },
    });

    if (!firstAccount) {
      throw new Error('No hay cuentas activas disponibles');
    }

    return firstAccount.id;
  }

  /**
   * Quick add movement (minimal fields, optimized for QuickAdd component)
   */
  async quickAddMovement(usuarioId: string, data: QuickAddMovementInput) {
    // Get default account if not provided
    const cuentaId = data.cuenta_id || (await this.getDefaultAccount(usuarioId));

    // Get account details
    const cuenta = await prisma.cuenta.findUnique({
      where: { id: cuentaId },
      select: { moneda: true, activa: true, nombre: true },
    });

    if (!cuenta) {
      throw new Error('Cuenta no encontrada');
    }

    if (!cuenta.activa) {
      throw new Error('La cuenta seleccionada está inactiva');
    }

    // For expenses, validate sufficient balance
    if (data.tipo === 'GASTO') {
      await this.validateSufficientBalance(cuentaId, data.monto);
    }

    // Create movement in a transaction
    const movimiento = await prisma.$transaction(async (tx) => {
      // Create the movement
      const newMovimiento = await tx.movimiento.create({
        data: {
          usuario_id: usuarioId,
          tipo: data.tipo,
          cuenta_id: cuentaId,
          monto: data.monto,
          moneda: cuenta.moneda,
          descripcion: data.descripcion || (data.tipo === 'GASTO' ? 'Gasto' : 'Ingreso'),
          categoria: data.categoria,
          fecha: data.fecha ?? new Date(),
        },
      });

      // Update account balance
      if (data.tipo === 'INGRESO') {
        await this.updateAccountBalance(tx, cuentaId, data.monto, 'add');
      } else {
        await this.updateAccountBalance(tx, cuentaId, data.monto, 'subtract');
      }

      return newMovimiento;
    });

    return movimiento;
  }

  /**
   * Create income movement
   */
  async createIncome(usuarioId: string, data: CreateIncomeInput) {
    // Validate account
    await this.validateAccountActive(data.cuenta_id);

    const cuenta = await prisma.cuenta.findUnique({
      where: { id: data.cuenta_id },
      select: { moneda: true },
    });

    if (!cuenta) {
      throw new Error('Cuenta no encontrada');
    }

    const moneda = data.moneda || cuenta.moneda;
    const tasaConversion =
      moneda !== cuenta.moneda
        ? await this.getConversionRate(usuarioId, moneda, cuenta.moneda, data.tasa_conversion)
        : undefined;

    // Create movement in a transaction
    const movimiento = await prisma.$transaction(async (tx) => {
      const newMovimiento = await tx.movimiento.create({
        data: {
          usuario_id: usuarioId,
          tipo: 'INGRESO',
          cuenta_id: data.cuenta_id,
          monto: data.monto,
          moneda,
          descripcion: data.descripcion,
          categoria: data.categoria,
          fecha: data.fecha,
          tasa_conversion: tasaConversion,
        },
      });

      // Update account balance (convert if needed)
      const montoEnMonedaCuenta = tasaConversion
        ? data.monto * tasaConversion
        : data.monto;

      await this.updateAccountBalance(tx, data.cuenta_id, montoEnMonedaCuenta, 'add');

      return newMovimiento;
    });

    return movimiento;
  }

  /**
   * Create expense movement
   */
  async createExpense(usuarioId: string, data: CreateExpenseInput) {
    // Validate account
    await this.validateAccountActive(data.cuenta_id);

    const cuenta = await prisma.cuenta.findUnique({
      where: { id: data.cuenta_id },
      select: { moneda: true },
    });

    if (!cuenta) {
      throw new Error('Cuenta no encontrada');
    }

    const moneda = data.moneda || cuenta.moneda;
    const tasaConversion =
      moneda !== cuenta.moneda
        ? await this.getConversionRate(usuarioId, moneda, cuenta.moneda, data.tasa_conversion)
        : undefined;

    // Calculate amount in account currency
    const montoEnMonedaCuenta = tasaConversion
      ? data.monto * tasaConversion
      : data.monto;

    // Validate sufficient balance
    await this.validateSufficientBalance(data.cuenta_id, montoEnMonedaCuenta);

    // Create movement in a transaction
    const movimiento = await prisma.$transaction(async (tx) => {
      const newMovimiento = await tx.movimiento.create({
        data: {
          usuario_id: usuarioId,
          tipo: 'GASTO',
          cuenta_id: data.cuenta_id,
          monto: data.monto,
          moneda,
          descripcion: data.descripcion,
          categoria: data.categoria,
          fecha: data.fecha,
          tasa_conversion: tasaConversion,
        },
      });

      // Update account balance
      await this.updateAccountBalance(tx, data.cuenta_id, montoEnMonedaCuenta, 'subtract');

      return newMovimiento;
    });

    return movimiento;
  }

  /**
   * Create transfer movement
   * Creates two linked movements (origin and destination)
   */
  async createTransfer(usuarioId: string, data: CreateTransferInput) {
    // Validate both accounts
    if (data.cuenta_origen_id === data.cuenta_destino_id) {
      throw new Error('La cuenta origen y destino no pueden ser la misma');
    }

    await this.validateAccountActive(data.cuenta_origen_id);
    await this.validateAccountActive(data.cuenta_destino_id);

    // Get both accounts
    const [cuentaOrigen, cuentaDestino] = await Promise.all([
      prisma.cuenta.findUnique({
        where: { id: data.cuenta_origen_id },
        select: { moneda: true, nombre: true },
      }),
      prisma.cuenta.findUnique({
        where: { id: data.cuenta_destino_id },
        select: { moneda: true, nombre: true },
      }),
    ]);

    if (!cuentaOrigen || !cuentaDestino) {
      throw new Error('Cuenta no encontrada');
    }

    // Validate sufficient balance in origin account
    await this.validateSufficientBalance(data.cuenta_origen_id, data.monto);

    // Calculate conversion if needed
    const tasaConversion =
      cuentaOrigen.moneda !== cuentaDestino.moneda
        ? await this.getConversionRate(
            usuarioId,
            cuentaOrigen.moneda,
            cuentaDestino.moneda,
            data.tasa_conversion
          )
        : undefined;

    const montoDestino = tasaConversion ? data.monto * tasaConversion : data.monto;
    const descripcion = data.descripcion || `${cuentaOrigen.nombre} → ${cuentaDestino.nombre}`;

    // Create transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create outgoing movement
      const movimientoSalida = await tx.movimiento.create({
        data: {
          usuario_id: usuarioId,
          tipo: 'TRANSFERENCIA',
          cuenta_id: data.cuenta_origen_id,
          cuenta_destino_id: data.cuenta_destino_id,
          monto: data.monto,
          moneda: cuentaOrigen.moneda,
          descripcion,
          fecha: data.fecha,
          tasa_conversion: tasaConversion,
        },
      });

      // Create incoming movement linked to outgoing
      const movimientoEntrada = await tx.movimiento.create({
        data: {
          usuario_id: usuarioId,
          tipo: 'TRANSFERENCIA',
          cuenta_id: data.cuenta_destino_id,
          monto: montoDestino,
          moneda: cuentaDestino.moneda,
          descripcion,
          fecha: data.fecha,
          movimiento_relacionado_id: movimientoSalida.id,
          tasa_conversion: tasaConversion,
        },
      });

      // Link back the outgoing movement
      await tx.movimiento.update({
        where: { id: movimientoSalida.id },
        data: { movimiento_relacionado_id: movimientoEntrada.id },
      });

      // Update balances
      await this.updateAccountBalance(tx, data.cuenta_origen_id, data.monto, 'subtract');
      await this.updateAccountBalance(tx, data.cuenta_destino_id, montoDestino, 'add');

      return { movimientoSalida, movimientoEntrada };
    });

    return result;
  }

  /**
   * Create an expense split between a personal account and a discount fund.
   *
   * Atomically creates two linked movements:
   *  - GASTO_CON_DESCUENTO: actual amount paid from `cuenta_pago_id`
   *  - SUBSIDIO:            discount amount consumed from `fondo_descuento_id`
   *
   * Both movements are linked via movimiento_relacionado_id and share the
   * same metadata (monto_total, porcentaje_descuento) for audit purposes.
   */
  async createExpenseWithDiscount(usuarioId: string, data: ExpenseWithDiscountInput) {
    // ── Validate both accounts are active ──────────────────────────────────
    await this.validateAccountActive(data.cuenta_pago_id);
    await this.validateAccountActive(data.fondo_descuento_id);

    // ── Fetch account details ───────────────────────────────────────────────
    const [cuentaPago, fondoCuenta] = await Promise.all([
      prisma.cuenta.findUnique({
        where: { id: data.cuenta_pago_id },
        select: { moneda: true, nombre: true },
      }),
      prisma.cuenta.findUnique({
        where: { id: data.fondo_descuento_id },
        select: { tipo: true, moneda: true, nombre: true },
      }),
    ]);

    if (!cuentaPago) throw new Error('Cuenta de pago no encontrada');
    if (!fondoCuenta) throw new Error('Fondo de descuento no encontrado');

    // ── Validate fund is a FONDO_DESCUENTO account ─────────────────────────
    if (fondoCuenta.tipo !== 'FONDO_DESCUENTO') {
      throw new Error(
        `La cuenta "${fondoCuenta.nombre}" no es un fondo de descuento. Solo se permiten cuentas de tipo FONDO_DESCUENTO.`
      );
    }

    // ── Compute split ───────────────────────────────────────────────────────
    const montoSubsidio = parseFloat(
      (data.monto_total * (data.porcentaje_descuento / 100)).toFixed(2)
    );
    const montoPagado = parseFloat((data.monto_total - montoSubsidio).toFixed(2));

    // ── Validate sufficient balance in both accounts ────────────────────────
    await this.validateSufficientBalance(data.cuenta_pago_id, montoPagado);
    await this.validateSufficientBalance(data.fondo_descuento_id, montoSubsidio);

    const descripcionBase = data.descripcion || 'Gasto con descuento de fondo';
    const metadata = {
      monto_total: data.monto_total,
      porcentaje_descuento: data.porcentaje_descuento,
    };

    // ── Create both movements atomically ────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // 1. GASTO_CON_DESCUENTO — actual payment from personal account
      const gastoMovimiento = await tx.movimiento.create({
        data: {
          usuario_id: usuarioId,
          tipo: 'GASTO_CON_DESCUENTO',
          cuenta_id: data.cuenta_pago_id,
          monto: montoPagado,
          moneda: cuentaPago.moneda,
          descripcion: descripcionBase,
          categoria: data.categoria,
          fecha: data.fecha,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });

      // 2. SUBSIDIO — discount amount consumed from fund
      const subsidioMovimiento = await tx.movimiento.create({
        data: {
          usuario_id: usuarioId,
          tipo: 'SUBSIDIO',
          cuenta_id: data.fondo_descuento_id,
          monto: montoSubsidio,
          moneda: fondoCuenta.moneda,
          descripcion: descripcionBase,
          categoria: data.categoria,
          fecha: data.fecha,
          movimiento_relacionado_id: gastoMovimiento.id,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });

      // 3. Cross-link the first movement back to the second
      await tx.movimiento.update({
        where: { id: gastoMovimiento.id },
        data: { movimiento_relacionado_id: subsidioMovimiento.id },
      });

      // 4. Debit both accounts
      await this.updateAccountBalance(tx, data.cuenta_pago_id, montoPagado, 'subtract');
      await this.updateAccountBalance(tx, data.fondo_descuento_id, montoSubsidio, 'subtract');

      return { gastoMovimiento, subsidioMovimiento };
    });

    return result;
  }

  /**
   * Get movements with filters and pagination
   */
  async getMovements(usuarioId: string, query: GetMovementsQuery) {
    const where: Prisma.MovimientoWhereInput = {
      usuario_id: usuarioId,
    };

    // Date range filter
    if (query.desde || query.hasta) {
      where.fecha = {};
      if (query.desde) {
        where.fecha.gte = query.desde;
      }
      if (query.hasta) {
        // Include the entire day
        const hastaEnd = new Date(query.hasta);
        hastaEnd.setHours(23, 59, 59, 999);
        where.fecha.lte = hastaEnd;
      }
    }

    // Type filter
    if (query.tipo) {
      where.tipo = query.tipo;
    }

    // Account filter
    if (query.cuenta_id) {
      where.OR = [
        { cuenta_id: query.cuenta_id },
        { cuenta_destino_id: query.cuenta_id },
      ];
    }

    // Category filter
    if (query.categoria) {
      where.categoria = query.categoria;
    }

    // Get movements with only the fields the frontend needs
    const [movimientos, total] = await Promise.all([
      prisma.movimiento.findMany({
        where,
        select: {
          id: true,
          tipo: true,
          monto: true,
          moneda: true,
          descripcion: true,
          categoria: true,
          fecha: true,
          cuenta_id: true,
          cuenta_destino_id: true,
          movimiento_relacionado_id: true,
          metadata: true,
          cuenta_origen: {
            select: {
              id: true,
              nombre: true,
              tipo: true,
              moneda: true,
            },
          },
          cuenta_destino: {
            select: {
              id: true,
              nombre: true,
              tipo: true,
              moneda: true,
            },
          },
        },
        orderBy: { fecha: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.movimiento.count({ where }),
    ]);

    // Calculate running balance if filtering by single account
    let movimientosConBalance = movimientos;

    if (query.cuenta_id) {
      let balanceAcumulado = 0;

      // Get initial balance (we need to reverse to calculate from oldest to newest)
      const movimientosOrdenados = [...movimientos].reverse();

      movimientosConBalance = movimientosOrdenados.map((mov) => {
        // Determine if this movement affects the balance positively or negatively
        const esEntrada =
          mov.tipo === 'INGRESO' ||
          mov.tipo === 'RETORNO_INVERSION' ||
          mov.tipo === 'INGRESO_INICIAL' ||
          (mov.tipo === 'TRANSFERENCIA' && mov.cuenta_destino_id === query.cuenta_id) ||
          (mov.tipo === 'AJUSTE' && Number(mov.monto) > 0);

        const esSalida =
          mov.tipo === 'GASTO' ||
          mov.tipo === 'PAGO_TARJETA' ||
          mov.tipo === 'PAGO_DEUDA' ||
          mov.tipo === 'INVERSION' ||
          mov.tipo === 'GASTO_CON_DESCUENTO' ||
          mov.tipo === 'SUBSIDIO' ||
          (mov.tipo === 'TRANSFERENCIA' && mov.cuenta_id === query.cuenta_id) ||
          (mov.tipo === 'AJUSTE' && Number(mov.monto) < 0);

        const monto = Number(mov.monto);

        if (esEntrada) {
          balanceAcumulado += monto;
        } else if (esSalida) {
          balanceAcumulado -= monto;
        }

        return {
          ...mov,
          balance_despues: balanceAcumulado,
        };
      });

      // Reverse back to newest first
      movimientosConBalance = movimientosConBalance.reverse();
    }

    return {
      movimientos: movimientosConBalance,
      total,
      limit: query.limit,
      offset: query.offset,
      hasMore: query.offset + query.limit < total,
    };
  }

  /**
   * Delete movement
   * Reverses the balance changes
   */
  async deleteMovement(id: string, usuarioId: string) {
    const movimiento = await prisma.movimiento.findFirst({
      where: {
        id,
        usuario_id: usuarioId,
      },
      include: {
        movimiento_relacionado: true,
      },
    });

    if (!movimiento) {
      throw new Error('Movimiento no encontrado');
    }

    // Validate: cannot delete if it's part of an installment purchase
    const compraEnCuotas = await prisma.compraEnCuotas.findFirst({
      where: { movimiento_id: id },
    });

    if (compraEnCuotas) {
      throw new Error(
        'No se puede eliminar un movimiento que es parte de una compra en cuotas'
      );
    }

    // Delete in a transaction (reverse balance changes)
    await prisma.$transaction(async (tx) => {
      const monto = Number(movimiento.monto);

      // Reverse balance changes based on movement type
      if (movimiento.tipo === 'INGRESO' || movimiento.tipo === 'INGRESO_INICIAL' || movimiento.tipo === 'RETORNO_INVERSION') {
        // Was added, now subtract
        await this.updateAccountBalance(tx, movimiento.cuenta_id, monto, 'subtract');
      } else if (
        movimiento.tipo === 'GASTO' ||
        movimiento.tipo === 'PAGO_TARJETA' ||
        movimiento.tipo === 'PAGO_DEUDA' ||
        movimiento.tipo === 'INVERSION'
      ) {
        // Was subtracted, now add
        await this.updateAccountBalance(tx, movimiento.cuenta_id, monto, 'add');
      } else if (movimiento.tipo === 'TRANSFERENCIA') {
        // The outgoing movement (salida) has cuenta_destino_id set.
        // The incoming movement (entrada) does not.
        const esMovimientoSalida = !!movimiento.cuenta_destino_id;
        const relatedMovement = movimiento.movimiento_relacionado;

        if (relatedMovement) {
          // Identify each side of the transfer
          const movimientoSalida = esMovimientoSalida ? movimiento : relatedMovement;
          const movimientoEntrada = esMovimientoSalida ? relatedMovement : movimiento;

          const montoSalida = Number(movimientoSalida.monto);
          const montoEntrada = Number(movimientoEntrada.monto);

          // Reverse balances: restore origin, undo destination credit
          await this.updateAccountBalance(tx, movimientoSalida.cuenta_id, montoSalida, 'add');
          await this.updateAccountBalance(tx, movimientoEntrada.cuenta_id, montoEntrada, 'subtract');

          // Null out both FK references first to satisfy the self-referential
          // FK constraint — Postgres Restrict prevents deleting a row that
          // another row still points to via movimiento_relacionado_id.
          await tx.movimiento.update({
            where: { id: movimiento.id },
            data: { movimiento_relacionado_id: null },
          });
          await tx.movimiento.update({
            where: { id: relatedMovement.id },
            data: { movimiento_relacionado_id: null },
          });

          // Delete the paired movement; current movement is deleted below.
          await tx.movimiento.delete({
            where: { id: relatedMovement.id },
          });
        } else {
          // Paired movement was already removed — reverse only this side.
          if (esMovimientoSalida) {
            // Outgoing: restore origin balance
            await this.updateAccountBalance(tx, movimiento.cuenta_id, monto, 'add');
          } else {
            // Incoming: undo destination credit
            await this.updateAccountBalance(tx, movimiento.cuenta_id, monto, 'subtract');
          }

          if (movimiento.movimiento_relacionado_id) {
            await tx.movimiento.update({
              where: { id: movimiento.id },
              data: { movimiento_relacionado_id: null },
            });
          }
        }
      } else if (
        movimiento.tipo === 'GASTO_CON_DESCUENTO' ||
        movimiento.tipo === 'SUBSIDIO'
      ) {
        // Both sides of the discount operation get restored together,
        // following the same pattern as TRANSFERENCIA.
        const relatedMovement = movimiento.movimiento_relacionado;

        if (relatedMovement) {
          // Restore balance for both accounts
          await this.updateAccountBalance(tx, movimiento.cuenta_id, monto, 'add');
          await this.updateAccountBalance(
            tx,
            relatedMovement.cuenta_id,
            Number(relatedMovement.monto),
            'add'
          );

          // Null both FK references before deleting (Postgres RESTRICT)
          await tx.movimiento.update({
            where: { id: movimiento.id },
            data: { movimiento_relacionado_id: null },
          });
          await tx.movimiento.update({
            where: { id: relatedMovement.id },
            data: { movimiento_relacionado_id: null },
          });

          await tx.movimiento.delete({ where: { id: relatedMovement.id } });
        } else {
          // Orphaned movement — restore only this account
          await this.updateAccountBalance(tx, movimiento.cuenta_id, monto, 'add');
          if (movimiento.movimiento_relacionado_id) {
            await tx.movimiento.update({
              where: { id: movimiento.id },
              data: { movimiento_relacionado_id: null },
            });
          }
        }
      } else if (movimiento.tipo === 'AJUSTE') {
        // For adjustments, we need to reverse the adjustment
        // This is complex, might want to prevent deletion of adjustments
        throw new Error('No se pueden eliminar movimientos de tipo AJUSTE');
      }

      // Delete the movement
      await tx.movimiento.delete({
        where: { id },
      });
    });

    return { message: 'Movimiento eliminado exitosamente' };
  }

  /**
   * Get movement statistics for a date range
   */
  async getMovementStats(usuarioId: string, desde?: Date, hasta?: Date) {
    const where: Prisma.MovimientoWhereInput = {
      usuario_id: usuarioId,
    };

    if (desde || hasta) {
      where.fecha = {};
      if (desde) {
        where.fecha.gte = desde;
      }
      if (hasta) {
        const hastaEnd = new Date(hasta);
        hastaEnd.setHours(23, 59, 59, 999);
        where.fecha.lte = hastaEnd;
      }
    }

    // Two groupBy queries instead of four separate aggregates
    const [byTipo, byCategoria] = await Promise.all([
      prisma.movimiento.groupBy({
        by: ['tipo'],
        where,
        _sum: { monto: true },
        _count: true,
      }),
      prisma.movimiento.groupBy({
        by: ['categoria'],
        where: {
          ...where,
          categoria: { not: null },
        },
        _sum: { monto: true },
        _count: true,
      }),
    ]);

    const INCOME_TYPES = new Set(['INGRESO', 'RETORNO_INVERSION']);
    const EXPENSE_TYPES = new Set(['GASTO', 'PAGO_TARJETA', 'PAGO_DEUDA', 'GASTO_CON_DESCUENTO']);

    let totalIngresos = 0;
    let totalGastos = 0;
    for (const row of byTipo) {
      const monto = Number(row._sum.monto || 0);
      if (INCOME_TYPES.has(row.tipo)) totalIngresos += monto;
      if (EXPENSE_TYPES.has(row.tipo)) totalGastos += monto;
    }

    return {
      ingresos: totalIngresos,
      gastos: totalGastos,
      balance: totalIngresos - totalGastos,
      por_categoria: byCategoria,
      por_tipo: byTipo,
    };
  }
}

export const movementsService = new MovementsService();
