import { prisma } from '../lib/prisma.js';
import type { CreateCardInput, UpdateCardInput } from '../schemas/cards.schema.js';

export class CardsService {
  /**
   * Get all credit cards for a user (RN-002: compute limite_disponible)
   */
  async getCards(usuarioId: string) {
    const cards = await prisma.tarjeta.findMany({
      where: { usuario_id: usuarioId },
      include: {
        cuenta_asociada: { select: { nombre: true, moneda: true, saldo_actual: true } },
        _count: { select: { compras_en_cuotas: true } },
      },
      orderBy: [{ activa: 'desc' }, { created_at: 'asc' }],
    });

    return cards.map((card) => ({
      ...card,
      limite_disponible: Number(card.limite_total) - Number(card.limite_comprometido),
    }));
  }

  /**
   * Get single card by ID
   */
  async getCardById(usuarioId: string, id: string) {
    const card = await prisma.tarjeta.findFirst({
      where: { id, usuario_id: usuarioId },
      include: {
        cuenta_asociada: { select: { nombre: true, moneda: true, saldo_actual: true } },
        _count: { select: { compras_en_cuotas: true, movimientos: true } },
      },
    });

    if (!card) {
      throw new Error('Tarjeta no encontrada');
    }

    return {
      ...card,
      limite_disponible: Number(card.limite_total) - Number(card.limite_comprometido),
    };
  }

  /**
   * Create a new credit card
   */
  async createCard(usuarioId: string, data: CreateCardInput) {
    const cuenta = await prisma.cuenta.findFirst({
      where: { id: data.cuenta_id, usuario_id: usuarioId },
    });

    if (!cuenta) {
      throw new Error('Cuenta no encontrada');
    }

    const card = await prisma.tarjeta.create({
      data: {
        usuario_id: usuarioId,
        cuenta_id: data.cuenta_id,
        nombre: data.nombre,
        tipo: data.tipo,
        limite_total: data.limite_total,
        moneda: data.moneda ?? 'ARS',
        dia_cierre: data.dia_cierre,
        dia_vencimiento: data.dia_vencimiento,
      },
    });

    return card;
  }

  /**
   * Update card (only nombre and activa; limit/moneda cannot change after creation)
   */
  async updateCard(usuarioId: string, id: string, data: UpdateCardInput) {
    const existing = await prisma.tarjeta.findFirst({
      where: { id, usuario_id: usuarioId },
    });

    if (!existing) {
      throw new Error('Tarjeta no encontrada');
    }

    const updated = await prisma.tarjeta.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.activa !== undefined && { activa: data.activa }),
        updated_at: new Date(),
      },
    });

    return updated;
  }

  /**
   * Delete card — only allowed when no movements or purchases exist
   */
  async deleteCard(usuarioId: string, id: string) {
    const card = await prisma.tarjeta.findFirst({
      where: { id, usuario_id: usuarioId },
      include: {
        _count: { select: { movimientos: true, compras_en_cuotas: true } },
      },
    });

    if (!card) {
      throw new Error('Tarjeta no encontrada');
    }

    if (card._count.movimientos > 0 || card._count.compras_en_cuotas > 0) {
      throw new Error(
        'No se puede eliminar una tarjeta con movimientos asociados. Desactivala en su lugar.'
      );
    }

    await prisma.tarjeta.delete({ where: { id } });

    return { message: 'Tarjeta eliminada exitosamente' };
  }

  /**
   * Get all unpaid installments for a card, ordered by due date
   */
  async getPendingInstallments(usuarioId: string, tarjetaId: string) {
    const card = await prisma.tarjeta.findFirst({
      where: { id: tarjetaId, usuario_id: usuarioId },
    });

    if (!card) {
      throw new Error('Tarjeta no encontrada');
    }

    const cuotas = await prisma.cuota.findMany({
      where: {
        pagada: false,
        compra: { tarjeta_id: tarjetaId, usuario_id: usuarioId },
      },
      include: {
        compra: {
          select: {
            descripcion: true,
            cantidad_cuotas: true,
            cuotas_pagadas: true,
            fecha_compra: true,
          },
        },
      },
      orderBy: { fecha_vencimiento: 'asc' },
    });

    return cuotas;
  }

  /**
   * Get total pending balance for a card (sum of all unpaid cuotas)
   */
  async getBalanceToPay(usuarioId: string, tarjetaId: string) {
    const card = await prisma.tarjeta.findFirst({
      where: { id: tarjetaId, usuario_id: usuarioId },
    });

    if (!card) {
      throw new Error('Tarjeta no encontrada');
    }

    const result = await prisma.cuota.aggregate({
      where: {
        pagada: false,
        compra: { tarjeta_id: tarjetaId, usuario_id: usuarioId },
      },
      _sum: { monto: true },
    });

    return {
      tarjeta_id: tarjetaId,
      saldo_pendiente: Number(result._sum.monto ?? 0),
      moneda: card.moneda,
    };
  }
}

export const cardsService = new CardsService();
