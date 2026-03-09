import { supabase } from '../lib/supabase.js'
import { assertSuccess, assertOk } from '../lib/db.js'
import type {
  CreateSuscripcionInput,
  UpdateSuscripcionInput,
  PagarSuscripcionInput,
} from '../schemas/suscripciones.schema.js'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function calculateProximaFecha(
  fechaInicio: Date,
  frecuencia: string,
  diaPago: number,
): Date {
  const start = new Date(fechaInicio)
  start.setHours(0, 0, 0, 0)

  switch (frecuencia) {
    case 'MENSUAL':
    case 'TRIMESTRAL':
    case 'ANUAL': {
      const maxDayCurrentMonth = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        0,
      ).getDate()
      const candidateDay = Math.min(diaPago, maxDayCurrentMonth)
      const candidate = new Date(start.getFullYear(), start.getMonth(), candidateDay)
      if (candidate >= start) {
        return candidate
      }
      const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1)
      const maxDayNextMonth = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth() + 1,
        0,
      ).getDate()
      nextMonth.setDate(Math.min(diaPago, maxDayNextMonth))
      return nextMonth
    }
    case 'SEMANAL': {
      const targetDay = diaPago === 7 ? 0 : diaPago
      const result = new Date(start)
      const currentDay = result.getDay()
      let daysAhead = targetDay - currentDay
      if (daysAhead < 0) daysAhead += 7
      result.setDate(result.getDate() + daysAhead)
      return result
    }
    case 'QUINCENAL':
    default: {
      return new Date(start)
    }
  }
}

function advanceProximaFecha(
  current: Date,
  frecuencia: string,
  diaPago: number,
): Date {
  const date = new Date(current)
  date.setHours(0, 0, 0, 0)

  switch (frecuencia) {
    case 'SEMANAL': {
      date.setDate(date.getDate() + 7)
      return date
    }
    case 'QUINCENAL': {
      date.setDate(date.getDate() + 14)
      return date
    }
    case 'MENSUAL': {
      const next = new Date(date.getFullYear(), date.getMonth() + 1, 1)
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(diaPago, maxDay))
      return next
    }
    case 'TRIMESTRAL': {
      const next = new Date(date.getFullYear(), date.getMonth() + 3, 1)
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(diaPago, maxDay))
      return next
    }
    case 'ANUAL': {
      const next = new Date(date.getFullYear() + 1, date.getMonth(), 1)
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(diaPago, maxDay))
      return next
    }
    default:
      return date
  }
}

// ─── Select string ────────────────────────────────────────────────────────────

const SUSCRIPCION_SELECT = `
  id, nombre, descripcion, monto, moneda, frecuencia, dia_pago,
  proxima_fecha_pago, fecha_inicio, fecha_fin, activo, categoria,
  created_at, updated_at,
  cuenta:cuentas!cuenta_id(id, nombre, moneda),
  movimientos!suscripcion_id(count)
`

function shapeSuscripcion(row: any) {
  const { movimientos: movArr, ...rest } = row
  return {
    ...rest,
    _count: { movimientos: (movArr as any)?.[0]?.count ?? 0 },
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class SuscripcionesService {
  async getSuscripciones(usuarioId: string) {
    const { data, error } = await supabase
      .from('suscripciones')
      .select(SUSCRIPCION_SELECT)
      .eq('usuario_id', usuarioId)
      .order('activo', { ascending: false })
      .order('proxima_fecha_pago', { ascending: true })
    assertOk(error)
    return (data ?? []).map(shapeSuscripcion)
  }

  async getSuscripcionById(usuarioId: string, id: string) {
    const { data, error } = await supabase
      .from('suscripciones')
      .select(`${SUSCRIPCION_SELECT}, usuario_id`)
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    return shapeSuscripcion(assertSuccess(data, error, 'Suscripción no encontrada'))
  }

  async createSuscripcion(usuarioId: string, data: CreateSuscripcionInput) {
    const proxima =
      data.proxima_fecha_pago ??
      calculateProximaFecha(data.fecha_inicio, data.frecuencia, data.dia_pago)

    const { data: row, error } = await supabase
      .from('suscripciones')
      .insert({
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
      })
      .select(SUSCRIPCION_SELECT)
      .single()

    return shapeSuscripcion(assertSuccess(row, error))
  }

  async updateSuscripcion(
    usuarioId: string,
    id: string,
    data: UpdateSuscripcionInput,
  ) {
    // Verify ownership
    const { error: checkErr } = await supabase
      .from('suscripciones')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (checkErr) throw new Error('Suscripción no encontrada')

    const updateData: Record<string, unknown> = {}
    if (data.nombre !== undefined) updateData.nombre = data.nombre
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion
    if (data.monto !== undefined) updateData.monto = data.monto
    if (data.moneda !== undefined) updateData.moneda = data.moneda
    if (data.cuenta_id !== undefined) updateData.cuenta_id = data.cuenta_id
    if (data.frecuencia !== undefined) updateData.frecuencia = data.frecuencia
    if (data.dia_pago !== undefined) updateData.dia_pago = data.dia_pago
    if (data.fecha_fin !== undefined) updateData.fecha_fin = data.fecha_fin
    if (data.activo !== undefined) updateData.activo = data.activo
    if (data.categoria !== undefined) updateData.categoria = data.categoria

    const { data: row, error } = await supabase
      .from('suscripciones')
      .update(updateData)
      .eq('id', id)
      .select(SUSCRIPCION_SELECT)
      .single()

    return shapeSuscripcion(assertSuccess(row, error))
  }

  async deleteSuscripcion(usuarioId: string, id: string) {
    const { data: sub, error: findErr } = await supabase
      .from('suscripciones')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (findErr || !sub) throw new Error('Suscripción no encontrada')

    const { count, error: countErr } = await supabase
      .from('movimientos')
      .select('id', { count: 'exact', head: true })
      .eq('suscripcion_id', id)
    assertOk(countErr)

    if ((count ?? 0) > 0) {
      throw new Error('No se puede eliminar una suscripción con pagos registrados')
    }

    const { error } = await supabase.from('suscripciones').delete().eq('id', id)
    assertOk(error)
    return { id }
  }

  async pagarSuscripcion(
    usuarioId: string,
    id: string,
    data: PagarSuscripcionInput,
  ) {
    const { data: sub, error: subErr } = await supabase
      .from('suscripciones')
      .select(
        'usuario_id, nombre, monto, moneda, activo, fecha_fin, frecuencia, dia_pago, proxima_fecha_pago, cuenta_id',
      )
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (subErr || !sub) throw new Error('Suscripción no encontrada')

    if (!sub.activo) throw new Error('La suscripción no está activa')
    if (sub.fecha_fin && new Date() > new Date(sub.fecha_fin)) {
      throw new Error('La suscripción ha finalizado')
    }

    const montoNum = data.monto ?? Number(sub.monto)
    const cuentaId = data.cuenta_id

    const { data: cuenta, error: cuentaErr } = await supabase
      .from('cuentas')
      .select('usuario_id, saldo_actual, activa')
      .eq('id', cuentaId)
      .eq('usuario_id', usuarioId)
      .single()
    if (cuentaErr || !cuenta) throw new Error('Cuenta no encontrada')
    if (!cuenta.activa) throw new Error('La cuenta no está activa')

    const nuevaProximaFecha = advanceProximaFecha(
      new Date(sub.proxima_fecha_pago),
      sub.frecuencia,
      sub.dia_pago,
    )

    // 1. Insert movement
    const { data: movimiento, error: movErr } = await supabase
      .from('movimientos')
      .insert({
        usuario_id: usuarioId,
        tipo: 'SUSCRIPCION',
        cuenta_id: cuentaId,
        suscripcion_id: id,
        monto: montoNum,
        moneda: sub.moneda,
        descripcion: data.descripcion ?? `Pago suscripción: ${sub.nombre}`,
        fecha: data.fecha ?? new Date(),
        categoria: null,
      })
      .select('id')
      .single()
    assertSuccess(movimiento, movErr)

    // 2. Debit account balance
    const { error: balErr } = await supabase.rpc('update_account_balance', {
      p_account_id: cuentaId,
      p_delta: -montoNum,
    })
    assertOk(balErr)

    // 3. Advance next payment date
    const { data: updatedSub, error: subUpdateErr } = await supabase
      .from('suscripciones')
      .update({ proxima_fecha_pago: nuevaProximaFecha })
      .eq('id', id)
      .select(SUSCRIPCION_SELECT)
      .single()

    return {
      success: true,
      movimiento_id: movimiento!.id,
      suscripcion: shapeSuscripcion(assertSuccess(updatedSub, subUpdateErr)),
    }
  }

  async getProximosPagos(usuarioId: string, dias: number) {
    const now = new Date()
    const limit = new Date(now)
    limit.setDate(limit.getDate() + dias)

    const { data, error } = await supabase
      .from('suscripciones')
      .select(SUSCRIPCION_SELECT)
      .eq('usuario_id', usuarioId)
      .eq('activo', true)
      .lte('proxima_fecha_pago', limit.toISOString())
      .or(`fecha_fin.is.null,fecha_fin.gt.${now.toISOString()}`)
      .order('proxima_fecha_pago', { ascending: true })
    assertOk(error)
    return (data ?? []).map(shapeSuscripcion)
  }
}

export const suscripcionesService = new SuscripcionesService()
