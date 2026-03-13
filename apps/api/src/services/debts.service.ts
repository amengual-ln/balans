import { randomUUID } from 'node:crypto'
import { supabase } from '../lib/supabase.js'
import { assertSuccess, assertOk } from '../lib/db.js'
import type { CreateDebtInput, UpdateDebtInput, PayDebtInput } from '../schemas/debts.schema.js'

const DEBT_LIST_SELECT = `
  id, tipo, direccion, acreedor, monto_total, monto_pendiente, moneda,
  fecha_inicio, cantidad_cuotas, monto_cuota, saldada,
  pagos:pagos_deuda!deuda_id(count)
`

function shapeDebt(row: any) {
  const { pagos: pagosArr, ...rest } = row
  return {
    ...rest,
    _count: { pagos: (pagosArr as any)?.[0]?.count ?? 0 },
  }
}

export class DebtsService {
  async getDebts(usuarioId: string, direccion?: string) {
    let q = supabase
      .from('deudas')
      .select(DEBT_LIST_SELECT)
      .eq('usuario_id', usuarioId)
      .order('saldada', { ascending: true })
      .order('fecha_inicio', { ascending: false })

    if (direccion) {
      q = q.eq('direccion', direccion)
    }

    const { data, error } = await q
    assertOk(error)
    return (data ?? []).map(shapeDebt)
  }

  async getDebtById(usuarioId: string, id: string) {
    const { data, error } = await supabase
      .from('deudas')
      .select(`
        id, tipo, direccion, acreedor, monto_total, monto_pendiente, moneda,
        fecha_inicio, cantidad_cuotas, monto_cuota, saldada,
        pagos:pagos_deuda!deuda_id(
          id, monto, fecha,
          movimiento:movimientos!movimiento_id(
            id, descripcion, fecha,
            cuenta_origen:cuentas!cuenta_id(id, nombre)
          )
        )
      `)
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()

    const debt = assertSuccess(data, error, 'Deuda no encontrada')

    // Sort pagos by fecha desc (simulate Prisma orderBy)
    if (Array.isArray(debt.pagos)) {
      debt.pagos.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    }

    return {
      ...debt,
      _count: { pagos: (debt.pagos as any[]).length },
    }
  }

  async createDebt(usuarioId: string, data: CreateDebtInput) {
    const { data: row, error } = await supabase
      .from('deudas')
      .insert({
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
      })
      .select(DEBT_LIST_SELECT)
      .single()

    return shapeDebt(assertSuccess(row, error))
  }

  async updateDebt(usuarioId: string, id: string, data: UpdateDebtInput) {
    const { data: existing, error: findErr } = await supabase
      .from('deudas')
      .select('id, saldada')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (findErr || !existing) throw new Error('Deuda no encontrada')

    if (existing.saldada) throw new Error('No se puede modificar una deuda saldada')

    const { data: row, error } = await supabase
      .from('deudas')
      .update({
        ...(data.acreedor !== undefined && { acreedor: data.acreedor }),
        ...(data.cantidad_cuotas !== undefined && { cantidad_cuotas: data.cantidad_cuotas || null }),
        ...(data.monto_cuota !== undefined && { monto_cuota: data.monto_cuota || null }),
      })
      .eq('id', id)
      .select(DEBT_LIST_SELECT)
      .single()

    return shapeDebt(assertSuccess(row, error))
  }

  async deleteDebt(usuarioId: string, id: string) {
    const { data: debt, error: findErr } = await supabase
      .from('deudas')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (findErr || !debt) throw new Error('Deuda no encontrada')

    const { count, error: countErr } = await supabase
      .from('pagos_deuda')
      .select('id', { count: 'exact', head: true })
      .eq('deuda_id', id)
    assertOk(countErr)

    if ((count ?? 0) > 0) {
      throw new Error('No se puede eliminar una deuda con pagos registrados')
    }

    const { error } = await supabase.from('deudas').delete().eq('id', id)
    assertOk(error)
    return { id }
  }

  async payDebt(usuarioId: string, id: string, data: PayDebtInput) {
    const { data: debt, error: debtErr } = await supabase
      .from('deudas')
      .select('usuario_id, saldada, direccion, monto_pendiente, acreedor, moneda')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (debtErr || !debt) throw new Error('Deuda no encontrada')
    if (debt.saldada) throw new Error('La deuda ya está saldada')

    const montoPendiente = Number(debt.monto_pendiente)
    const montoNum = Number(data.monto)

    if (montoNum > montoPendiente) {
      throw new Error('El monto no puede exceder el pendiente')
    }

    const { data: cuenta, error: cuentaErr } = await supabase
      .from('cuentas')
      .select('usuario_id, saldo_actual, activa')
      .eq('id', data.cuenta_id)
      .eq('usuario_id', usuarioId)
      .single()
    if (cuentaErr || !cuenta) throw new Error('Cuenta no encontrada')
    if (!cuenta.activa) throw new Error('La cuenta no está activa')

    if (debt.direccion === 'POR_PAGAR') {
      const saldoNum = Number(cuenta.saldo_actual)
      if (saldoNum < montoNum) {
        throw new Error('Saldo insuficiente en la cuenta')
      }
    }

    const nuevoMontoPendiente = parseFloat((montoPendiente - montoNum).toFixed(2))
    const deudaSaldada = nuevoMontoPendiente <= 0
    const tipoMovimiento = debt.direccion === 'POR_PAGAR' ? 'PAGO_DEUDA' : 'COBRO_DEUDA'
    const fechaPago = data.fecha ?? new Date()

    // 1. Insert movement
    const { data: movimiento, error: movErr } = await supabase
      .from('movimientos')
      .insert({
        id: randomUUID(),
        usuario_id: usuarioId,
        tipo: tipoMovimiento,
        cuenta_id: data.cuenta_id,
        deuda_id: id,
        monto: montoNum,
        moneda: debt.moneda,
        descripcion:
          data.descripcion ||
          `${debt.direccion === 'POR_PAGAR' ? 'Pago' : 'Cobro'} deuda ${debt.acreedor}`,
        fecha: fechaPago,
        categoria: null,
      })
      .select('id')
      .single()
    assertSuccess(movimiento, movErr)

    // 2. Update account balance (debit or credit depending on direction)
    const balanceDelta = debt.direccion === 'POR_PAGAR' ? -montoNum : montoNum
    const { error: balErr } = await supabase
      .from('cuentas')
      .update({ saldo_actual: Number(cuenta.saldo_actual) + balanceDelta })
      .eq('id', data.cuenta_id)
    assertOk(balErr)

    // 3. Insert pago_deuda record
    const { error: pagoErr } = await supabase.from('pagos_deuda').insert({
      deuda_id: id,
      movimiento_id: movimiento!.id,
      monto: montoNum,
      fecha: fechaPago,
    })
    assertOk(pagoErr)

    // 4. Update deuda monto_pendiente and saldada flag
    const { error: updateErr } = await supabase
      .from('deudas')
      .update({ monto_pendiente: nuevoMontoPendiente, saldada: deudaSaldada })
      .eq('id', id)
    assertOk(updateErr)

    // Return updated debt
    const { data: updatedDebt, error: fetchErr } = await supabase
      .from('deudas')
      .select(DEBT_LIST_SELECT)
      .eq('id', id)
      .single()

    return {
      success: true,
      deuda: shapeDebt(assertSuccess(updatedDebt, fetchErr)),
    }
  }
}

export const debtsService = new DebtsService()
