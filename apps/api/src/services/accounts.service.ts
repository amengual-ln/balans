import { supabase } from '../lib/supabase.js'
import { assertSuccess, assertOk } from '../lib/db.js'
import type {
  CreateAccountInput,
  UpdateAccountInput,
  AdjustBalanceInput,
} from '../schemas/accounts.schema.js'

export class AccountsService {
  /**
   * Calculate account balance based on movements (RN-001)
   * Fetches all movements for the account and aggregates in-memory.
   */
  private async calculateAccountBalance(cuentaId: string): Promise<number> {
    const { data, error } = await supabase
      .from('movimientos')
      .select('tipo, monto, cuenta_id, cuenta_destino_id')
      .or(`cuenta_id.eq.${cuentaId},cuenta_destino_id.eq.${cuentaId}`)
    assertOk(error)

    let total = 0
    for (const row of data ?? []) {
      const monto = Number(row.monto)
      const isOutgoing = row.cuenta_id === cuentaId
      const isIncoming = row.cuenta_destino_id === cuentaId

      if (isOutgoing) {
        switch (row.tipo) {
          case 'INGRESO_INICIAL':
          case 'INGRESO':
          case 'RETORNO_INVERSION':
          case 'AJUSTE':
            total += monto
            break
          case 'GASTO':
          case 'PAGO_TARJETA':
          case 'GASTO_TARJETA':
          case 'PAGO_DEUDA':
          case 'INVERSION':
          case 'TRANSFERENCIA':
          case 'GASTO_CON_DESCUENTO':
          case 'SUBSIDIO':
            total -= monto
            break
        }
      }
      if (isIncoming && row.tipo === 'TRANSFERENCIA') {
        total += monto
      }
    }

    return total
  }

  /**
   * Get all accounts for a user
   */
  async getAccounts(usuarioId: string, filters?: { activa?: boolean; tipo?: string }) {
    let q = supabase
      .from('cuentas')
      .select(`
        id, nombre, tipo, moneda, saldo_actual, recarga_mensual, activa, created_at, updated_at,
        movimientos!cuenta_id(count)
      `)
      .eq('usuario_id', usuarioId)
      .order('activa', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters?.activa !== undefined) q = q.eq('activa', filters.activa)
    if (filters?.tipo) q = q.eq('tipo', filters.tipo)

    const { data, error } = await q
    assertOk(error)

    return (data ?? []).map((c: any) => {
      const { movimientos: movsArr, ...rest } = c
      return {
        ...rest,
        _count: { movimientos: movsArr?.[0]?.count ?? 0 },
      }
    })
  }

  /**
   * Get single account by ID
   */
  async getAccountById(id: string, usuarioId: string) {
    const { data, error } = await supabase
      .from('cuentas')
      .select(`
        *,
        movimientos_origen:movimientos!cuenta_id(count),
        tarjetas!cuenta_id(count)
      `)
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()

    const cuenta = assertSuccess(data, error, 'Cuenta no encontrada') as any
    const { movimientos_origen: movsArr, tarjetas: tarjetasArr, ...rest } = cuenta

    const shaped = {
      ...rest,
      _count: {
        movimientos: movsArr?.[0]?.count ?? 0,
        tarjetas: tarjetasArr?.[0]?.count ?? 0,
      },
    }

    // Recalculate and verify balance
    const balanceCalculado = await this.calculateAccountBalance(id)
    const balanceAlmacenado = Number(shaped.saldo_actual)

    if (Math.abs(balanceCalculado - balanceAlmacenado) > 0.01) {
      console.warn(
        `Balance mismatch for account ${id}: calculated=${balanceCalculado}, stored=${balanceAlmacenado}`,
      )
    }

    return shaped
  }

  /**
   * Create a new account (CU-001)
   */
  async createAccount(usuarioId: string, data: CreateAccountInput) {
    // 1. Insert account
    const { data: newCuenta, error: insertErr } = await supabase
      .from('cuentas')
      .insert({
        usuario_id: usuarioId,
        nombre: data.nombre,
        tipo: data.tipo,
        moneda: data.moneda,
        saldo_actual: data.saldo_inicial || 0,
        activa: data.activa ?? true,
        ...(data.recarga_mensual !== undefined && { recarga_mensual: data.recarga_mensual }),
      })
      .select('*')
      .single()

    const cuenta = assertSuccess(newCuenta, insertErr)

    // 2. If there's an initial balance, create INGRESO_INICIAL movement + update balance via RPC
    if (data.saldo_inicial && data.saldo_inicial > 0) {
      const { error: movErr } = await supabase.from('movimientos').insert({
        usuario_id: usuarioId,
        tipo: 'INGRESO_INICIAL',
        cuenta_id: (cuenta as any).id,
        monto: data.saldo_inicial,
        moneda: data.moneda,
        descripcion: 'Saldo inicial',
        fecha: new Date(),
      })
      assertOk(movErr)
      // saldo_actual was set directly on insert, no need to call RPC here
    }

    return cuenta
  }

  /**
   * Update account (CU-002)
   */
  async updateAccount(id: string, usuarioId: string, data: UpdateAccountInput) {
    // Verify ownership
    const { data: existing, error: findErr } = await supabase
      .from('cuentas')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (findErr || !existing) throw new Error('Cuenta no encontrada')

    const updateData: Record<string, unknown> = { updated_at: new Date() }
    if (data.nombre) updateData.nombre = data.nombre
    if (data.activa !== undefined) updateData.activa = data.activa
    if (data.recarga_mensual !== undefined) {
      updateData.recarga_mensual = data.recarga_mensual ? data.recarga_mensual : null
    }

    const { data: updated, error } = await supabase
      .from('cuentas')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    return assertSuccess(updated, error)
  }

  /**
   * Delete account (CU-003) — only if no movements or cards
   */
  async deleteAccount(id: string, usuarioId: string) {
    const { data: account, error: findErr } = await supabase
      .from('cuentas')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (findErr || !account) throw new Error('Cuenta no encontrada')

    const [
      { count: movCount, error: movErr },
      { count: movDestinoCount, error: movDestinoErr },
      { count: tarjetaCount, error: tarjetaErr },
    ] = await Promise.all([
      supabase.from('movimientos').select('id', { count: 'exact', head: true }).eq('cuenta_id', id),
      supabase.from('movimientos').select('id', { count: 'exact', head: true }).eq('cuenta_destino_id', id),
      supabase.from('tarjetas').select('id', { count: 'exact', head: true }).eq('cuenta_id', id),
    ])
    assertOk(movErr)
    assertOk(movDestinoErr)
    assertOk(tarjetaErr)

    if ((movCount ?? 0) > 0 || (movDestinoCount ?? 0) > 0 || (tarjetaCount ?? 0) > 0) {
      throw new Error(
        'No se puede eliminar una cuenta con movimientos o tarjetas asociadas. Desactívala en su lugar.',
      )
    }

    const { error } = await supabase.from('cuentas').delete().eq('id', id)
    assertOk(error)
    return { message: 'Cuenta eliminada exitosamente' }
  }

  /**
   * Adjust account balance — creates an AJUSTE movement
   */
  async adjustBalance(id: string, usuarioId: string, data: AdjustBalanceInput) {
    const { data: cuenta, error: findErr } = await supabase
      .from('cuentas')
      .select('id, activa, saldo_actual, moneda')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (findErr || !cuenta) throw new Error('Cuenta no encontrada')
    if (!(cuenta as any).activa) throw new Error('No se puede ajustar el saldo de una cuenta inactiva')

    const saldoActual = Number((cuenta as any).saldo_actual)
    const nuevoSaldo = data.nuevo_saldo
    const diferencia = nuevoSaldo - saldoActual

    // 1. Create AJUSTE movement
    const { error: movErr } = await supabase.from('movimientos').insert({
      usuario_id: usuarioId,
      tipo: 'AJUSTE',
      cuenta_id: id,
      monto: Math.abs(diferencia),
      moneda: (cuenta as any).moneda,
      descripcion: `${data.descripcion} (Ajuste: ${diferencia >= 0 ? '+' : ''}${diferencia.toFixed(2)})`,
      fecha: new Date(),
    })
    assertOk(movErr)

    // 2. Update balance via RPC
    const { error: rpcErr } = await supabase.rpc('update_account_balance', {
      p_account_id: id,
      p_delta: diferencia,
    })
    assertOk(rpcErr)

    // Return updated account
    const { data: updated, error: fetchErr } = await supabase
      .from('cuentas')
      .select('*')
      .eq('id', id)
      .single()
    return assertSuccess(updated, fetchErr)
  }

  /**
   * Get account summary with calculated totals
   */
  async getAccountSummary(id: string, usuarioId: string) {
    const cuenta = await this.getAccountById(id, usuarioId)
    const balanceCalculado = await this.calculateAccountBalance(id)

    // Get movements grouped by tipo for summary (in-memory aggregation)
    const { data: movs, error } = await supabase
      .from('movimientos')
      .select('tipo, monto')
      .or(`cuenta_id.eq.${id},cuenta_destino_id.eq.${id}`)
    assertOk(error)

    const tipoMap = new Map<string, { _sum: { monto: number }; _count: number }>()
    for (const m of movs ?? []) {
      const entry = tipoMap.get(m.tipo) ?? { _sum: { monto: 0 }, _count: 0 }
      entry._sum.monto += Number(m.monto)
      entry._count++
      tipoMap.set(m.tipo, entry)
    }

    const movimientos_por_tipo = Array.from(tipoMap.entries()).map(([tipo, agg]) => ({
      tipo,
      _sum: agg._sum,
      _count: agg._count,
    }))

    return {
      ...cuenta,
      balance_calculado: balanceCalculado,
      movimientos_por_tipo,
    }
  }

  /**
   * Recharge discount fund (FONDO_DESCUENTO only)
   */
  async recargarFondo(id: string, usuarioId: string, monto?: number) {
    const { data: cuenta, error: findErr } = await supabase
      .from('cuentas')
      .select('id, tipo, activa, saldo_actual, recarga_mensual, moneda')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (findErr || !cuenta) throw new Error('Cuenta no encontrada')

    const c = cuenta as any
    if (c.tipo !== 'FONDO_DESCUENTO') {
      throw new Error('Solo se puede recargar cuentas de tipo FONDO_DESCUENTO')
    }
    if (!c.activa) throw new Error('No se puede recargar una cuenta inactiva')

    const montoCarga = monto ?? (c.recarga_mensual ? Number(c.recarga_mensual) : null)
    if (!montoCarga || montoCarga <= 0) {
      throw new Error(
        'El monto debe ser mayor a 0. Configure recarga_mensual en la cuenta o proporcione un monto.',
      )
    }

    const saldoAnterior = Number(c.saldo_actual)
    const diferencia = montoCarga - saldoAnterior
    const montoMovimiento = Math.abs(diferencia) > 0 ? Math.abs(diferencia) : montoCarga

    // 1. Create AJUSTE movement
    const { error: movErr } = await supabase.from('movimientos').insert({
      usuario_id: usuarioId,
      tipo: 'AJUSTE',
      cuenta_id: id,
      monto: montoMovimiento,
      moneda: c.moneda,
      descripcion: `Recarga mensual fondo — saldo anterior: ${saldoAnterior.toFixed(2)}`,
      fecha: new Date(),
    })
    assertOk(movErr)

    // 2. Set balance directly to montoCarga via delta
    const { error: rpcErr } = await supabase.rpc('update_account_balance', {
      p_account_id: id,
      p_delta: diferencia,
    })
    assertOk(rpcErr)

    // Return updated account
    const { data: updated, error: fetchErr } = await supabase
      .from('cuentas')
      .select('*')
      .eq('id', id)
      .single()
    return assertSuccess(updated, fetchErr)
  }
}

export const accountsService = new AccountsService()
