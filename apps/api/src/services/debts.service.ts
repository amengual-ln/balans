import { prisma } from '../lib/prisma.js';
import { CreateDebtInput, UpdateDebtInput, PayDebtInput } from '../schemas/debts.schema.js';

export class DebtsService {
  async getDebts(usuarioId: string, direccion?: string) {
    const where: any = { usuario_id: usuarioId };
    if (direccion) {
      where.direccion = direccion;
    }

    return prisma.deuda.findMany({
      where,
      select: {
        id: true,
        tipo: true,
        direccion: true,
        acreedor: true,
        monto_total: true,
        monto_pendiente: true,
        moneda: true,
        fecha_inicio: true,
        cantidad_cuotas: true,
        monto_cuota: true,
        saldada: true,
        _count: { select: { pagos: true } },
      },
      orderBy: [{ saldada: 'asc' }, { fecha_inicio: 'desc' }],
    });
  }

  async getDebtById(usuarioId: string, id: string) {
    const debt = await prisma.deuda.findUnique({
      where: { id },
      select: {
        id: true,
        usuario_id: true,
        tipo: true,
        direccion: true,
        acreedor: true,
        monto_total: true,
        monto_pendiente: true,
        moneda: true,
        fecha_inicio: true,
        cantidad_cuotas: true,
        monto_cuota: true,
        saldada: true,
        pagos: {
          select: {
            id: true,
            monto: true,
            fecha: true,
            movimiento: {
              select: {
                id: true,
                descripcion: true,
                fecha: true,
                cuenta_origen: { select: { id: true, nombre: true } },
              },
            },
          },
          orderBy: { fecha: 'desc' },
        },
        _count: { select: { pagos: true } },
      },
    });

    if (!debt || debt.usuario_id !== usuarioId) {
      throw new Error('Deuda no encontrada');
    }

    return debt;
  }

  async createDebt(usuarioId: string, data: CreateDebtInput) {
    return prisma.deuda.create({
      data: {
        usuario_id: usuarioId,
        tipo: data.tipo,
        direccion: data.direccion,
        acreedor: data.acreedor,
        monto_total: data.monto_total,
        monto_pendiente: data.monto_total,
        moneda: data.moneda,
        fecha_inicio: data.fecha_inicio,
        cantidad_cuotas: data.cantidad_cuotas || null,
        monto_cuota: data.monto_cuota || null,
      },
      select: {
        id: true,
        tipo: true,
        direccion: true,
        acreedor: true,
        monto_total: true,
        monto_pendiente: true,
        moneda: true,
        fecha_inicio: true,
        cantidad_cuotas: true,
        monto_cuota: true,
        saldada: true,
        _count: { select: { pagos: true } },
      },
    });
  }

  async updateDebt(usuarioId: string, id: string, data: UpdateDebtInput) {
    const debt = await prisma.deuda.findUnique({
      where: { id },
      select: { usuario_id: true, saldada: true },
    });

    if (!debt || debt.usuario_id !== usuarioId) {
      throw new Error('Deuda no encontrada');
    }

    if (debt.saldada) {
      throw new Error('No se puede modificar una deuda saldada');
    }

    return prisma.deuda.update({
      where: { id },
      data: {
        acreedor: data.acreedor,
        cantidad_cuotas: data.cantidad_cuotas || null,
        monto_cuota: data.monto_cuota || null,
      },
      select: {
        id: true,
        tipo: true,
        direccion: true,
        acreedor: true,
        monto_total: true,
        monto_pendiente: true,
        moneda: true,
        fecha_inicio: true,
        cantidad_cuotas: true,
        monto_cuota: true,
        saldada: true,
        _count: { select: { pagos: true } },
      },
    });
  }

  async deleteDebt(usuarioId: string, id: string) {
    const debt = await prisma.deuda.findUnique({
      where: { id },
      select: {
        usuario_id: true,
        _count: { select: { pagos: true } },
      },
    });

    if (!debt || debt.usuario_id !== usuarioId) {
      throw new Error('Deuda no encontrada');
    }

    if (debt._count.pagos > 0) {
      throw new Error('No se puede eliminar una deuda con pagos registrados');
    }

    return prisma.deuda.delete({
      where: { id },
      select: {
        id: true,
      },
    });
  }

  async payDebt(usuarioId: string, id: string, data: PayDebtInput) {
    const debt = await prisma.deuda.findUnique({
      where: { id },
      select: {
        usuario_id: true,
        saldada: true,
        direccion: true,
        monto_pendiente: true,
        acreedor: true,
        moneda: true,
      },
    });

    if (!debt || debt.usuario_id !== usuarioId) {
      throw new Error('Deuda no encontrada');
    }

    if (debt.saldada) {
      throw new Error('La deuda ya está saldada');
    }

    const montoPendiente = parseFloat(debt.monto_pendiente.toString());
    const montoNum = parseFloat(data.monto.toString());

    if (montoNum > montoPendiente) {
      throw new Error('El monto no puede exceder el pendiente');
    }

    const cuenta = await prisma.cuenta.findUnique({
      where: { id: data.cuenta_id },
      select: { usuario_id: true, saldo_actual: true, activa: true },
    });

    if (!cuenta || cuenta.usuario_id !== usuarioId) {
      throw new Error('Cuenta no encontrada');
    }

    if (!cuenta.activa) {
      throw new Error('La cuenta no está activa');
    }

    // POR_PAGAR: user is spending money (validate balance)
    // POR_COBRAR: user is receiving money (no balance check needed)
    if (debt.direccion === 'POR_PAGAR') {
      const saldoNum = parseFloat(cuenta.saldo_actual.toString());
      if (saldoNum < montoNum) {
        throw new Error('Saldo insuficiente en la cuenta');
      }
    }

    const nuevoMontoPendiente = parseFloat(
      (montoPendiente - montoNum).toFixed(2)
    );
    const deudaSaldada = nuevoMontoPendiente <= 0;

    return prisma.$transaction(async tx => {
      const tipoMovimiento =
        debt.direccion === 'POR_PAGAR' ? 'PAGO_DEUDA' : 'COBRO_DEUDA';

      const movimiento = await tx.movimiento.create({
        data: {
          usuario_id: usuarioId,
          tipo: tipoMovimiento,
          cuenta_id: data.cuenta_id,
          deuda_id: id,
          monto: montoNum,
          moneda: debt.moneda,
          descripcion:
            data.descripcion ||
            `${debt.direccion === 'POR_PAGAR' ? 'Pago' : 'Cobro'} deuda ${debt.acreedor}`,
          fecha: data.fecha || new Date(),
          categoria: null,
        },
      });

      // POR_PAGAR: decrement account balance
      // POR_COBRAR: increment account balance
      await tx.cuenta.update({
        where: { id: data.cuenta_id },
        data: {
          saldo_actual:
            debt.direccion === 'POR_PAGAR'
              ? { decrement: montoNum }
              : { increment: montoNum },
        },
      });

      await tx.pagoDeuda.create({
        data: {
          deuda_id: id,
          movimiento_id: movimiento.id,
          monto: montoNum,
          fecha: data.fecha || new Date(),
        },
      });

      await tx.deuda.update({
        where: { id },
        data: {
          monto_pendiente: nuevoMontoPendiente,
          saldada: deudaSaldada,
        },
      });

      return {
        success: true,
        deuda: await tx.deuda.findUnique({
          where: { id },
          select: {
            id: true,
            tipo: true,
            direccion: true,
            acreedor: true,
            monto_total: true,
            monto_pendiente: true,
            moneda: true,
            fecha_inicio: true,
            cantidad_cuotas: true,
            monto_cuota: true,
            saldada: true,
            _count: { select: { pagos: true } },
          },
        }),
      };
    });
  }
}

export const debtsService = new DebtsService();
