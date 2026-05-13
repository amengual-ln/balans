import { randomUUID } from 'node:crypto'
import { supabase } from '../lib/supabase.js'
import { assertSuccess, assertOk } from '../lib/db.js'
import type { CreateCardInput, UpdateCardInput } from '../schemas/cards.schema.js'

export class CardsService {
  /**
   * Get all credit cards for a user (RN-002: compute limite_disponible)
   */
  async getCards(usuarioId: string) {
    const { data, error } = await supabase
      .from('tarjetas')
      .select(
        `
        *,
        cuenta_asociada:cuentas!cuenta_id(nombre, moneda, saldo_actual),
        compras_en_cuotas!tarjeta_id(
          id,
          cantidad_cuotas,
          cuotas!compra_id(
            id,
            monto,
            fecha_vencimiento,
            pagada,
            numero_cuota
          )
        )
      `
      )
      .eq('usuario_id', usuarioId)
      .order('activa', { ascending: false })
      .order('created_at', { ascending: true })
    assertOk(error)

    return (data ?? []).map((card: any) => {
      const allUnpaid = card.compras_en_cuotas
        ?.flatMap((compra: any) => (compra.cuotas ?? []).map((c: any) => ({ ...c, compra })))
        ?.filter((c: any) => !c.pagada)

      const byCompra = new Map<string, any>()
      for (const cuota of allUnpaid ?? []) {
        const existing = byCompra.get(cuota.compra_id)
        if (!existing || new Date(cuota.fecha_vencimiento) < new Date(existing.fecha_vencimiento)) {
          byCompra.set(cuota.compra_id, cuota)
        }
      }

      const nextCuotas = Array.from(byCompra.values()).sort(
        (a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
      )

      const totalProximoPago = nextCuotas.reduce((sum, c) => sum + Number(c.monto), 0)
      const proximo = nextCuotas[0]

      return {
        ...card,
        _count: { compras_en_cuotas: card.compras_en_cuotas?.length ?? 0 },
        limite_disponible: Number(card.limite_total) - Number(card.limite_comprometido),
        proximo_pago:
          totalProximoPago > 0
            ? {
                monto: totalProximoPago,
                moneda: card.moneda,
                fecha: proximo.fecha_vencimiento,
                cuotas_pendientes: allUnpaid?.length ?? 0,
                numero_cuota: proximo.numero_cuota,
                total_cuotas: proximo.compra?.cantidad_cuotas ?? 0,
              }
            : null,
      }
    })
  }

  /**
   * Get single card by ID
   */
  async getCardById(usuarioId: string, id: string) {
    const { data, error } = await supabase
      .from('tarjetas')
      .select(
        `
        *,
        cuenta_asociada:cuentas!cuenta_id(nombre, moneda, saldo_actual),
        compras_en_cuotas!tarjeta_id(count),
        movimientos!tarjeta_id(count)
      `
      )
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()

    const card = assertSuccess(data, error, 'Tarjeta no encontrada') as any
    const { compras_en_cuotas: comprasArr, movimientos: movsArr, ...rest } = card

    return {
      ...rest,
      _count: {
        compras_en_cuotas: comprasArr?.[0]?.count ?? 0,
        movimientos: movsArr?.[0]?.count ?? 0,
      },
      limite_disponible: Number(card.limite_total) - Number(card.limite_comprometido),
    }
  }

  /**
   * Create a new credit card
   */
  async createCard(usuarioId: string, data: CreateCardInput) {
    // Verify associated account belongs to user
    const { data: cuenta, error: cuentaErr } = await supabase
      .from('cuentas')
      .select('id')
      .eq('id', data.cuenta_id)
      .eq('usuario_id', usuarioId)
      .single()
    if (cuentaErr || !cuenta) throw new Error('Cuenta no encontrada')

    const { data: card, error } = await supabase
      .from('tarjetas')
      .insert({
        id: randomUUID(),
        usuario_id: usuarioId,
        cuenta_id: data.cuenta_id,
        nombre: data.nombre,
        tipo: data.tipo,
        limite_total: data.limite_total,
        moneda: data.moneda ?? 'ARS',
        dia_cierre: data.dia_cierre,
        dia_vencimiento: data.dia_vencimiento,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    return assertSuccess(card, error)
  }

  /**
   * Update card (only nombre and activa)
   */
  async updateCard(usuarioId: string, id: string, data: UpdateCardInput) {
    const { data: existing, error: findErr } = await supabase
      .from('tarjetas')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (findErr || !existing) throw new Error('Tarjeta no encontrada')

    const updateData: Record<string, unknown> = { updated_at: new Date() }
    if (data.nombre !== undefined) updateData.nombre = data.nombre
    if (data.activa !== undefined) updateData.activa = data.activa

    const { data: updated, error } = await supabase
      .from('tarjetas')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    return assertSuccess(updated, error)
  }

  /**
   * Delete card — only allowed when no movements or purchases exist
   */
  async deleteCard(usuarioId: string, id: string) {
    const { data: card, error: findErr } = await supabase
      .from('tarjetas')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (findErr || !card) throw new Error('Tarjeta no encontrada')

    // Count movements
    const { count: movCount, error: movErr } = await supabase
      .from('movimientos')
      .select('id', { count: 'exact', head: true })
      .eq('tarjeta_id', id)
    assertOk(movErr)

    // Count purchases
    const { count: compraCount, error: compraErr } = await supabase
      .from('compras_en_cuotas')
      .select('id', { count: 'exact', head: true })
      .eq('tarjeta_id', id)
    assertOk(compraErr)

    if ((movCount ?? 0) > 0 || (compraCount ?? 0) > 0) {
      throw new Error(
        'No se puede eliminar una tarjeta con movimientos asociados. Desactivala en su lugar.'
      )
    }

    const { error } = await supabase.from('tarjetas').delete().eq('id', id)
    assertOk(error)
    return { message: 'Tarjeta eliminada exitosamente' }
  }

  /**
   * Get all unpaid installments for a card, ordered by due date
   */
  async getPendingInstallments(usuarioId: string, tarjetaId: string) {
    const { data: card, error: cardErr } = await supabase
      .from('tarjetas')
      .select('id')
      .eq('id', tarjetaId)
      .eq('usuario_id', usuarioId)
      .single()
    if (cardErr || !card) throw new Error('Tarjeta no encontrada')

    // Get compra IDs for this card
    const { data: compras, error: compraErr } = await supabase
      .from('compras_en_cuotas')
      .select('id')
      .eq('tarjeta_id', tarjetaId)
    assertOk(compraErr)

    if (!compras || compras.length === 0) return []

    const compraIds = compras.map((c: any) => c.id)

    const { data: cuotas, error } = await supabase
      .from('cuotas')
      .select(
        `
        *,
        compra:compras_en_cuotas!compra_id(descripcion, cantidad_cuotas, cuotas_pagadas, fecha_compra)
      `
      )
      .eq('pagada', false)
      .in('compra_id', compraIds)
      .order('fecha_vencimiento', { ascending: true })
    assertOk(error)
    return cuotas ?? []
  }

  /**
   * Get total pending balance for a card (sum of all unpaid cuotas)
   */
  async getBalanceToPay(usuarioId: string, tarjetaId: string) {
    const { data: card, error: cardErr } = await supabase
      .from('tarjetas')
      .select('id, moneda')
      .eq('id', tarjetaId)
      .eq('usuario_id', usuarioId)
      .single()
    if (cardErr || !card) throw new Error('Tarjeta no encontrada')

    // Get compra IDs for this card
    const { data: compras, error: compraErr } = await supabase
      .from('compras_en_cuotas')
      .select('id')
      .eq('tarjeta_id', tarjetaId)
    assertOk(compraErr)

    let saldoPendiente = 0
    if (compras && compras.length > 0) {
      const compraIds = compras.map((c: any) => c.id)
      const { data: cuotas, error: cuotaErr } = await supabase
        .from('cuotas')
        .select('monto')
        .eq('pagada', false)
        .in('compra_id', compraIds)
      assertOk(cuotaErr)
      saldoPendiente = (cuotas ?? []).reduce((sum: number, c: any) => sum + Number(c.monto), 0)
    }

    return {
      tarjeta_id: tarjetaId,
      saldo_pendiente: saldoPendiente,
      moneda: card.moneda,
    }
  }
}

export const cardsService = new CardsService()
