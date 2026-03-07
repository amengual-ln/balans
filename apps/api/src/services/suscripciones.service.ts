import { prisma } from '../lib/prisma';
import {
  CreateSuscripcionInput,
  UpdateSuscripcionInput,
  PagarSuscripcionInput,
} from '../schemas/suscripciones.schema';

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Calculate the first proxima_fecha_pago given a start date, frequency, and dia_pago.
 */
function calculateProximaFecha(
  fechaInicio: Date,
  frecuencia: string,
  diaPago: number,
): Date {
  const start = new Date(fechaInicio);
  start.setHours(0, 0, 0, 0);

  switch (frecuencia) {
    case 'MENSUAL':
    case 'TRIMESTRAL':
    case 'ANUAL': {
      // Find first occurrence of dia_pago on or after fechaInicio in the same month
      const maxDayCurrentMonth = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        0,
      ).getDate();
      const candidateDay = Math.min(diaPago, maxDayCurrentMonth);
      const candidate = new Date(start.getFullYear(), start.getMonth(), candidateDay);
      if (candidate >= start) {
        return candidate;
      }
      // Move to next month
      const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const maxDayNextMonth = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth() + 1,
        0,
      ).getDate();
      nextMonth.setDate(Math.min(diaPago, maxDayNextMonth));
      return nextMonth;
    }
    case 'SEMANAL': {
      // dia_pago: 1=Mon...7=Sun; JS getDay(): 0=Sun, 1=Mon...6=Sat
      const targetDay = diaPago === 7 ? 0 : diaPago;
      const result = new Date(start);
      const currentDay = result.getDay();
      let daysAhead = targetDay - currentDay;
      if (daysAhead < 0) daysAhead += 7;
      result.setDate(result.getDate() + daysAhead);
      return result;
    }
    case 'QUINCENAL':
    default: {
      return new Date(start);
    }
  }
}

/**
 * Advance proxima_fecha_pago by one period.
 */
function advanceProximaFecha(
  current: Date,
  frecuencia: string,
  diaPago: number,
): Date {
  const date = new Date(current);
  date.setHours(0, 0, 0, 0);

  switch (frecuencia) {
    case 'SEMANAL': {
      date.setDate(date.getDate() + 7);
      return date;
    }
    case 'QUINCENAL': {
      date.setDate(date.getDate() + 14);
      return date;
    }
    case 'MENSUAL': {
      const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(diaPago, maxDay));
      return next;
    }
    case 'TRIMESTRAL': {
      const next = new Date(date.getFullYear(), date.getMonth() + 3, 1);
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(diaPago, maxDay));
      return next;
    }
    case 'ANUAL': {
      const next = new Date(date.getFullYear() + 1, date.getMonth(), 1);
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(diaPago, maxDay));
      return next;
    }
    default:
      return date;
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

const SUSCRIPCION_SELECT = {
  id: true,
  nombre: true,
  descripcion: true,
  monto: true,
  moneda: true,
  frecuencia: true,
  dia_pago: true,
  proxima_fecha_pago: true,
  fecha_inicio: true,
  fecha_fin: true,
  activo: true,
  categoria: true,
  created_at: true,
  updated_at: true,
  cuenta: { select: { id: true, nombre: true, moneda: true } },
  _count: { select: { movimientos: true } },
} as const;

export class SuscripcionesService {
  async getSuscripciones(usuarioId: string) {
    return prisma.suscripcion.findMany({
      where: { usuario_id: usuarioId },
      select: SUSCRIPCION_SELECT,
      orderBy: [{ activo: 'desc' }, { proxima_fecha_pago: 'asc' }],
    });
  }

  async getSuscripcionById(usuarioId: string, id: string) {
    const sub = await prisma.suscripcion.findUnique({
      where: { id },
      select: { ...SUSCRIPCION_SELECT, usuario_id: true },
    });

    if (!sub || sub.usuario_id !== usuarioId) {
      throw new Error('Suscripción no encontrada');
    }

    return sub;
  }

  async createSuscripcion(usuarioId: string, data: CreateSuscripcionInput) {
    const proxima =
      data.proxima_fecha_pago ??
      calculateProximaFecha(data.fecha_inicio, data.frecuencia, data.dia_pago);

    return prisma.suscripcion.create({
      data: {
        usuario_id: usuarioId,
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        monto: data.monto,
        moneda: data.moneda,
        cuenta_id: data.cuenta_id,
        frecuencia: data.frecuencia,
        dia_pago: data.dia_pago,
        proxima_fecha_pago: proxima,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin ?? null,
        activo: data.activo,
        categoria: data.categoria ?? null,
      },
      select: SUSCRIPCION_SELECT,
    });
  }

  async updateSuscripcion(
    usuarioId: string,
    id: string,
    data: UpdateSuscripcionInput,
  ) {
    const sub = await prisma.suscripcion.findUnique({
      where: { id },
      select: { usuario_id: true },
    });

    if (!sub || sub.usuario_id !== usuarioId) {
      throw new Error('Suscripción no encontrada');
    }

    return prisma.suscripcion.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        monto: data.monto,
        moneda: data.moneda,
        cuenta_id: data.cuenta_id,
        frecuencia: data.frecuencia,
        dia_pago: data.dia_pago,
        fecha_fin: data.fecha_fin,
        activo: data.activo,
        categoria: data.categoria,
      },
      select: SUSCRIPCION_SELECT,
    });
  }

  async deleteSuscripcion(usuarioId: string, id: string) {
    const sub = await prisma.suscripcion.findUnique({
      where: { id },
      select: {
        usuario_id: true,
        _count: { select: { movimientos: true } },
      },
    });

    if (!sub || sub.usuario_id !== usuarioId) {
      throw new Error('Suscripción no encontrada');
    }

    if (sub._count.movimientos > 0) {
      throw new Error('No se puede eliminar una suscripción con pagos registrados');
    }

    return prisma.suscripcion.delete({ where: { id }, select: { id: true } });
  }

  async pagarSuscripcion(
    usuarioId: string,
    id: string,
    data: PagarSuscripcionInput,
  ) {
    const sub = await prisma.suscripcion.findUnique({
      where: { id },
      select: {
        usuario_id: true,
        nombre: true,
        monto: true,
        moneda: true,
        activo: true,
        fecha_fin: true,
        frecuencia: true,
        dia_pago: true,
        proxima_fecha_pago: true,
        cuenta_id: true,
      },
    });

    if (!sub || sub.usuario_id !== usuarioId) {
      throw new Error('Suscripción no encontrada');
    }

    if (!sub.activo) {
      throw new Error('La suscripción no está activa');
    }

    if (sub.fecha_fin && new Date() > sub.fecha_fin) {
      throw new Error('La suscripción ha finalizado');
    }

    const montoNum = data.monto ?? parseFloat(sub.monto.toString());
    const cuentaId = data.cuenta_id;

    const cuenta = await prisma.cuenta.findUnique({
      where: { id: cuentaId },
      select: { usuario_id: true, saldo_actual: true, activa: true },
    });

    if (!cuenta || cuenta.usuario_id !== usuarioId) {
      throw new Error('Cuenta no encontrada');
    }

    if (!cuenta.activa) {
      throw new Error('La cuenta no está activa');
    }

    const saldoNum = parseFloat(cuenta.saldo_actual.toString());
    const nuevoSaldo = Math.max(0, saldoNum - montoNum);

    const nuevaProximaFecha = advanceProximaFecha(
      sub.proxima_fecha_pago,
      sub.frecuencia,
      sub.dia_pago,
    );

    return prisma.$transaction(async tx => {
      const movimiento = await tx.movimiento.create({
        data: {
          usuario_id: usuarioId,
          tipo: 'SUSCRIPCION',
          cuenta_id: cuentaId,
          suscripcion_id: id,
          monto: montoNum,
          moneda: sub.moneda,
          descripcion: data.descripcion ?? `Pago suscripción: ${sub.nombre}`,
          fecha: data.fecha ?? new Date(),
          categoria: null,
        },
      });

      await tx.cuenta.update({
        where: { id: cuentaId },
        data: { saldo_actual: nuevoSaldo },
      });

      const updatedSub = await tx.suscripcion.update({
        where: { id },
        data: { proxima_fecha_pago: nuevaProximaFecha },
        select: SUSCRIPCION_SELECT,
      });

      return { success: true, movimiento_id: movimiento.id, suscripcion: updatedSub };
    });
  }

  async getProximosPagos(usuarioId: string, dias: number) {
    const now = new Date();
    const limit = new Date(now);
    limit.setDate(limit.getDate() + dias);

    return prisma.suscripcion.findMany({
      where: {
        usuario_id: usuarioId,
        activo: true,
        proxima_fecha_pago: { lte: limit },
        OR: [{ fecha_fin: null }, { fecha_fin: { gt: now } }],
      },
      select: SUSCRIPCION_SELECT,
      orderBy: { proxima_fecha_pago: 'asc' },
    });
  }
}

export const suscripcionesService = new SuscripcionesService();
