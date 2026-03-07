import { prisma } from '../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import type {
  QuickAddMovementInput,
  CreateIncomeInput,
  CreateExpenseInput,
  CreateTransferInput,
  GetMovementsQuery,
  ExpenseWithDiscountInput,
  CreateCardPurchaseInput,
  CreateCardPaymentInput,
} from '../schemas/movements.schema.js';

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
    const movimiento = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    const movimiento = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    const movimiento = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
   * Compute the first cuota due date based on purchase date and card billing cycle.
   * If the purchase day is past dia_cierre, the first due date is next month's dia_vencimiento.
   * Otherwise it's the current month's dia_vencimiento.
   */
  private computeFirstDueDate(
    fechaCompra: Date,
    diaCierre: number,
    diaVencimiento: number
  ): Date {
    const year = fechaCompra.getFullYear();
    const month = fechaCompra.getMonth(); // 0-indexed
    const day = fechaCompra.getDate();

    let dueYear = year;
    let dueMonth = month;

    if (day > diaCierre) {
      // Past cierre — first due date is next billing cycle
      dueMonth = month + 1;
      if (dueMonth > 11) {
        dueMonth = 0;
        dueYear = year + 1;
      }
    }

    return new Date(dueYear, dueMonth, diaVencimiento);
  }

  /**
   * Add months to a date (handles month overflow)
   */
  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Create installment card purchase — implements RN-004
   */
  async createCardPurchase(usuarioId: string, data: CreateCardPurchaseInput) {
    const tarjeta = await prisma.tarjeta.findFirst({
      where: { id: data.tarjeta_id, usuario_id: usuarioId },
    });

    if (!tarjeta) {
      throw new Error('Tarjeta no encontrada');
    }

    if (!tarjeta.activa) {
      throw new Error(`La tarjeta "${tarjeta.nombre}" está inactiva`);
    }

    const montoTotal = data.monto;
    const cantidadCuotas = data.cantidad_cuotas ?? 1;
    const limiteDisponible = Number(tarjeta.limite_total) - Number(tarjeta.limite_comprometido);

    if (limiteDisponible < montoTotal) {
      throw new Error(
        `Límite de crédito insuficiente en "${tarjeta.nombre}". Disponible: $${limiteDisponible.toFixed(2)}, Requerido: $${montoTotal.toFixed(2)}`
      );
    }

    // Compute cuota amounts (distribute rounding error to last cuota)
    const montoPorCuotaBase = Math.round((montoTotal / cantidadCuotas) * 100) / 100;
    const sumaAnteriores = montoPorCuotaBase * (cantidadCuotas - 1);
    const montoUltimaCuota = Math.round((montoTotal - sumaAnteriores) * 100) / 100;

    const fechaCompra = data.fecha ?? new Date();
    const firstDueDate = this.computeFirstDueDate(
      fechaCompra,
      tarjeta.dia_cierre,
      tarjeta.dia_vencimiento
    );

    const moneda = data.moneda ?? tarjeta.moneda;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Create GASTO_TARJETA movement (does NOT debit account — card charges don't move cash)
      const movimiento = await tx.movimiento.create({
        data: {
          usuario_id: usuarioId,
          tipo: 'GASTO_TARJETA',
          cuenta_id: tarjeta.cuenta_id,
          tarjeta_id: tarjeta.id,
          monto: montoTotal,
          moneda,
          descripcion: data.descripcion,
          categoria: data.categoria,
          fecha: fechaCompra,
          tasa_conversion: data.tasa_conversion,
        },
      });

      // 2. Create CompraEnCuotas record
      const compra = await tx.compraEnCuotas.create({
        data: {
          usuario_id: usuarioId,
          tarjeta_id: tarjeta.id,
          movimiento_id: movimiento.id,
          descripcion: data.descripcion,
          monto_total: montoTotal,
          cantidad_cuotas: cantidadCuotas,
          monto_por_cuota: montoPorCuotaBase,
          fecha_compra: fechaCompra,
          categoria: data.categoria,
        },
      });

      // 3. Create N Cuota records with monthly due dates
      const cuotasData = Array.from({ length: cantidadCuotas }, (_, i) => ({
        compra_id: compra.id,
        numero_cuota: i + 1,
        monto: i === cantidadCuotas - 1 ? montoUltimaCuota : montoPorCuotaBase,
        fecha_vencimiento: this.addMonths(firstDueDate, i),
      }));

      await tx.cuota.createMany({ data: cuotasData });

      // 4. Increment card's limite_comprometido
      await tx.tarjeta.update({
        where: { id: tarjeta.id },
        data: { limite_comprometido: { increment: montoTotal } },
      });

      return { movimiento, compra, cuotas_creadas: cantidadCuotas };
    });

    return result;
  }

  /**
   * Create card payment — implements RN-005 (FIFO installment clearing)
   */
  async createCardPayment(usuarioId: string, data: CreateCardPaymentInput) {
    // Validate source account has sufficient balance
    await this.validateSufficientBalance(data.cuenta_id, data.monto);
    await this.validateAccountActive(data.cuenta_id);

    const tarjeta = await prisma.tarjeta.findFirst({
      where: { id: data.tarjeta_id, usuario_id: usuarioId },
    });

    if (!tarjeta) {
      throw new Error('Tarjeta no encontrada');
    }

    const cuenta = await prisma.cuenta.findUnique({
      where: { id: data.cuenta_id },
      select: { moneda: true },
    });

    const moneda = data.moneda ?? cuenta?.moneda ?? tarjeta.moneda;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Create PAGO_TARJETA movement
      const movimiento = await tx.movimiento.create({
        data: {
          usuario_id: usuarioId,
          tipo: 'PAGO_TARJETA',
          cuenta_id: data.cuenta_id,
          tarjeta_id: tarjeta.id,
          monto: data.monto,
          moneda,
          descripcion: data.descripcion || `Pago tarjeta ${tarjeta.nombre}`,
          fecha: data.fecha ?? new Date(),
          tasa_conversion: data.tasa_conversion,
        },
      });

      // 2. Debit source account
      await this.updateAccountBalance(tx, data.cuenta_id, data.monto, 'subtract');

      // 3. FIFO: fetch all unpaid cuotas ordered by fecha_vencimiento ASC
      const cuotasPendientes = await tx.cuota.findMany({
        where: {
          pagada: false,
          compra: { tarjeta_id: tarjeta.id, usuario_id: usuarioId },
        },
        include: { compra: true },
        orderBy: { fecha_vencimiento: 'asc' },
      });

      // 4. Walk cuotas, mark paid FIFO until payment amount is consumed
      let montoRestante = data.monto;
      let cuotasPagadasCount = 0;
      const comprasPagadas = new Map<string, number>(); // compra_id → cuotas_pagadas_in_this_payment

      for (const cuota of cuotasPendientes) {
        const montoCuota = Number(cuota.monto);
        if (montoRestante < montoCuota) break;

        await tx.cuota.update({
          where: { id: cuota.id },
          data: { pagada: true, fecha_pago: data.fecha ?? new Date() },
        });

        montoRestante -= montoCuota;
        cuotasPagadasCount++;

        const prev = comprasPagadas.get(cuota.compra_id) ?? 0;
        comprasPagadas.set(cuota.compra_id, prev + 1);
      }

      // 5. Update cuotas_pagadas on each affected compra, release limit if fully paid
      for (const [compraId, pagadas] of comprasPagadas.entries()) {
        const compra = cuotasPendientes.find((c: any) => c.compra_id === compraId)?.compra;
        if (!compra) continue;

        const nuevosCuotasPagadas = compra.cuotas_pagadas + pagadas;
        await tx.compraEnCuotas.update({
          where: { id: compraId },
          data: { cuotas_pagadas: nuevosCuotasPagadas },
        });

        // If all cuotas are now paid, release the committed credit
        if (nuevosCuotasPagadas >= compra.cantidad_cuotas) {
          await tx.tarjeta.update({
            where: { id: tarjeta.id },
            data: { limite_comprometido: { decrement: compra.monto_total } },
          });
        }
      }

      return { movimiento, cuotas_pagadas: cuotasPagadasCount };
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
          tarjeta_id: true,
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
          tarjeta: {
            select: {
              id: true,
              nombre: true,
              tipo: true,
            },
          },
          deuda: {
            select: {
              id: true,
              acreedor: true,
              direccion: true,
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
          mov.tipo === 'COBRO_DEUDA' ||
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

    // PAGO_TARJETA: prohibit deletion (reversing installment marks is not safe)
    if (movimiento.tipo === 'PAGO_TARJETA') {
      throw new Error(
        'No se pueden eliminar pagos de tarjeta. Registrá un movimiento correctivo si es necesario.'
      );
    }

    // PAGO_DEUDA and COBRO_DEUDA: prohibit deletion (reversing debt payments is not safe)
    if (movimiento.tipo === 'PAGO_DEUDA' || movimiento.tipo === 'COBRO_DEUDA') {
      throw new Error(
        'No se pueden eliminar pagos de deuda. Registrá un movimiento correctivo si es necesario.'
      );
    }

    // GASTO_TARJETA: reverse limit, delete compra (cascade to cuotas)
    if (movimiento.tipo === 'GASTO_TARJETA') {
      const compra = await prisma.compraEnCuotas.findFirst({
        where: { movimiento_id: id },
      });

      if (compra && compra.cuotas_pagadas > 0) {
        throw new Error('No se puede eliminar una compra con cuotas ya pagadas');
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (compra) {
          await tx.tarjeta.update({
            where: { id: compra.tarjeta_id },
            data: { limite_comprometido: { decrement: compra.monto_total } },
          });
          // Delete compra — cascades to cuotas via Prisma schema onDelete: Cascade
          await tx.compraEnCuotas.delete({ where: { id: compra.id } });
        }
        await tx.movimiento.delete({ where: { id } });
      });

      return { message: 'Movimiento eliminado exitosamente' };
    }

    // Validate: cannot delete other movement types that are part of an installment purchase
    const compraEnCuotas = await prisma.compraEnCuotas.findFirst({
      where: { movimiento_id: id },
    });

    if (compraEnCuotas) {
      throw new Error(
        'No se puede eliminar un movimiento que es parte de una compra en cuotas'
      );
    }

    // Delete in a transaction (reverse balance changes)
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

    const INCOME_TYPES = new Set(['INGRESO', 'RETORNO_INVERSION', 'COBRO_DEUDA']);
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
