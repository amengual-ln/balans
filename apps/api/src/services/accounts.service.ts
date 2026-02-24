import { prisma } from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import type { CreateAccountInput, UpdateAccountInput, AdjustBalanceInput } from '../schemas/accounts.schema';

export class AccountsService {
  /**
   * Calculate account balance based on movements (RN-001)
   * saldo_actual = saldo_inicial
   *   + SUM(ingresos)
   *   + SUM(retornos_inversion)
   *   - SUM(gastos)
   *   - SUM(pagos_tarjeta)
   *   - SUM(pagos_deuda)
   *   - SUM(inversiones)
   *   - SUM(transferencias_salida)
   *   + SUM(transferencias_entrada)
   *   + SUM(ajustes)
   */
  private async calculateAccountBalance(cuentaId: string): Promise<number> {
    const cuenta = await prisma.cuenta.findUnique({
      where: { id: cuentaId },
      select: { saldo_actual: true },
    });

    if (!cuenta) {
      throw new Error('Cuenta no encontrada');
    }

    // Get initial balance (from INGRESO_INICIAL movements)
    const saldoInicial = await prisma.movimiento.aggregate({
      where: {
        cuenta_id: cuentaId,
        tipo: 'INGRESO_INICIAL',
      },
      _sum: {
        monto: true,
      },
    });

    // Positive movements (increase balance)
    const ingresos = await prisma.movimiento.aggregate({
      where: {
        cuenta_id: cuentaId,
        tipo: 'INGRESO',
      },
      _sum: {
        monto: true,
      },
    });

    const retornos = await prisma.movimiento.aggregate({
      where: {
        cuenta_id: cuentaId,
        tipo: 'RETORNO_INVERSION',
      },
      _sum: {
        monto: true,
      },
    });

    const transferenciasEntrada = await prisma.movimiento.aggregate({
      where: {
        cuenta_destino_id: cuentaId,
        tipo: 'TRANSFERENCIA',
      },
      _sum: {
        monto: true,
      },
    });

    const ajustes = await prisma.movimiento.aggregate({
      where: {
        cuenta_id: cuentaId,
        tipo: 'AJUSTE',
      },
      _sum: {
        monto: true,
      },
    });

    // Negative movements (decrease balance)
    const gastos = await prisma.movimiento.aggregate({
      where: {
        cuenta_id: cuentaId,
        tipo: 'GASTO',
      },
      _sum: {
        monto: true,
      },
    });

    const pagosTarjeta = await prisma.movimiento.aggregate({
      where: {
        cuenta_id: cuentaId,
        tipo: 'PAGO_TARJETA',
      },
      _sum: {
        monto: true,
      },
    });

    const pagosDeuda = await prisma.movimiento.aggregate({
      where: {
        cuenta_id: cuentaId,
        tipo: 'PAGO_DEUDA',
      },
      _sum: {
        monto: true,
      },
    });

    const inversiones = await prisma.movimiento.aggregate({
      where: {
        cuenta_id: cuentaId,
        tipo: 'INVERSION',
      },
      _sum: {
        monto: true,
      },
    });

    const transferenciasSalida = await prisma.movimiento.aggregate({
      where: {
        cuenta_id: cuentaId,
        tipo: 'TRANSFERENCIA',
      },
      _sum: {
        monto: true,
      },
    });

    // Calculate total balance
    const total =
      Number(saldoInicial._sum.monto || 0) +
      Number(ingresos._sum.monto || 0) +
      Number(retornos._sum.monto || 0) +
      Number(transferenciasEntrada._sum.monto || 0) +
      Number(ajustes._sum.monto || 0) -
      Number(gastos._sum.monto || 0) -
      Number(pagosTarjeta._sum.monto || 0) -
      Number(pagosDeuda._sum.monto || 0) -
      Number(inversiones._sum.monto || 0) -
      Number(transferenciasSalida._sum.monto || 0);

    return total;
  }

  /**
   * Get all accounts for a user
   */
  async getAccounts(usuarioId: string, filters?: { activa?: boolean; tipo?: string }) {
    const where: any = {
      usuario_id: usuarioId,
    };

    if (filters?.activa !== undefined) {
      where.activa = filters.activa;
    }

    if (filters?.tipo) {
      where.tipo = filters.tipo;
    }

    const cuentas = await prisma.cuenta.findMany({
      where,
      orderBy: [{ activa: 'desc' }, { created_at: 'desc' }],
      select: {
        id: true,
        nombre: true,
        tipo: true,
        moneda: true,
        saldo_actual: true,
        activa: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            movimientos: true,
          },
        },
      },
    });

    return cuentas;
  }

  /**
   * Get single account by ID
   */
  async getAccountById(id: string, usuarioId: string) {
    const cuenta = await prisma.cuenta.findFirst({
      where: {
        id,
        usuario_id: usuarioId,
      },
      include: {
        _count: {
          select: {
            movimientos: true,
            tarjetas: true,
          },
        },
      },
    });

    if (!cuenta) {
      throw new Error('Cuenta no encontrada');
    }

    // Recalculate and verify balance
    const balanceCalculado = await this.calculateAccountBalance(id);
    const balanceAlmacenado = Number(cuenta.saldo_actual);

    // If there's a discrepancy, we should log it (in production, you might want to alert)
    if (Math.abs(balanceCalculado - balanceAlmacenado) > 0.01) {
      console.warn(
        `Balance mismatch for account ${id}: calculated=${balanceCalculado}, stored=${balanceAlmacenado}`
      );
    }

    return cuenta;
  }

  /**
   * Create a new account (CU-001)
   */
  async createAccount(usuarioId: string, data: CreateAccountInput) {
    // Create account with initial balance
    const cuenta = await prisma.$transaction(async (tx) => {
      // Create the account
      const newCuenta = await tx.cuenta.create({
        data: {
          usuario_id: usuarioId,
          nombre: data.nombre,
          tipo: data.tipo,
          moneda: data.moneda,
          saldo_actual: data.saldo_inicial || 0,
          activa: data.activa ?? true,
        },
      });

      // If there's an initial balance, create an INGRESO_INICIAL movement
      if (data.saldo_inicial && data.saldo_inicial > 0) {
        await tx.movimiento.create({
          data: {
            usuario_id: usuarioId,
            tipo: 'INGRESO_INICIAL',
            cuenta_id: newCuenta.id,
            monto: data.saldo_inicial,
            moneda: data.moneda,
            descripcion: 'Saldo inicial',
            fecha: new Date(),
          },
        });
      }

      return newCuenta;
    });

    return cuenta;
  }

  /**
   * Update account (CU-002)
   */
  async updateAccount(id: string, usuarioId: string, data: UpdateAccountInput) {
    // Check if account exists and belongs to user
    const existingAccount = await prisma.cuenta.findFirst({
      where: {
        id,
        usuario_id: usuarioId,
      },
      include: {
        _count: {
          select: {
            movimientos: true,
          },
        },
      },
    });

    if (!existingAccount) {
      throw new Error('Cuenta no encontrada');
    }

    // Update account
    const updatedAccount = await prisma.cuenta.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre }),
        ...(data.activa !== undefined && { activa: data.activa }),
        updated_at: new Date(),
      },
    });

    return updatedAccount;
  }

  /**
   * Delete account (CU-003)
   * Can only delete if no movements exist
   */
  async deleteAccount(id: string, usuarioId: string) {
    // Check if account exists and belongs to user
    const account = await prisma.cuenta.findFirst({
      where: {
        id,
        usuario_id: usuarioId,
      },
      include: {
        _count: {
          select: {
            movimientos: true,
            movimientos_destino: true,
            tarjetas: true,
          },
        },
      },
    });

    if (!account) {
      throw new Error('Cuenta no encontrada');
    }

    // Validate: cannot delete if has movements
    if (
      account._count.movimientos > 0 ||
      account._count.movimientos_destino > 0 ||
      account._count.tarjetas > 0
    ) {
      throw new Error(
        'No se puede eliminar una cuenta con movimientos o tarjetas asociadas. Desactívala en su lugar.'
      );
    }

    // Delete account
    await prisma.cuenta.delete({
      where: { id },
    });

    return { message: 'Cuenta eliminada exitosamente' };
  }

  /**
   * Adjust account balance
   * Creates an AJUSTE movement to match the desired balance
   */
  async adjustBalance(id: string, usuarioId: string, data: AdjustBalanceInput) {
    const cuenta = await prisma.cuenta.findFirst({
      where: {
        id,
        usuario_id: usuarioId,
      },
    });

    if (!cuenta) {
      throw new Error('Cuenta no encontrada');
    }

    if (!cuenta.activa) {
      throw new Error('No se puede ajustar el saldo de una cuenta inactiva');
    }

    const saldoActual = Number(cuenta.saldo_actual);
    const nuevoSaldo = data.nuevo_saldo;
    const diferencia = nuevoSaldo - saldoActual;

    // Create adjustment movement and update balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create AJUSTE movement
      await tx.movimiento.create({
        data: {
          usuario_id: usuarioId,
          tipo: 'AJUSTE',
          cuenta_id: id,
          monto: Math.abs(diferencia),
          moneda: cuenta.moneda,
          descripcion: `${data.descripcion} (Ajuste: ${diferencia >= 0 ? '+' : ''}${diferencia.toFixed(2)})`,
          fecha: new Date(),
        },
      });

      // Update account balance
      const updatedCuenta = await tx.cuenta.update({
        where: { id },
        data: {
          saldo_actual: nuevoSaldo,
        },
      });

      return updatedCuenta;
    });

    return result;
  }

  /**
   * Get account summary with calculated totals
   */
  async getAccountSummary(id: string, usuarioId: string) {
    const cuenta = await this.getAccountById(id, usuarioId);
    const balanceCalculado = await this.calculateAccountBalance(id);

    // Get movement summary by type
    const movimientosPorTipo = await prisma.movimiento.groupBy({
      by: ['tipo'],
      where: {
        OR: [{ cuenta_id: id }, { cuenta_destino_id: id }],
      },
      _sum: {
        monto: true,
      },
      _count: true,
    });

    return {
      ...cuenta,
      balance_calculado: balanceCalculado,
      movimientos_por_tipo: movimientosPorTipo,
    };
  }
}

export const accountsService = new AccountsService();
