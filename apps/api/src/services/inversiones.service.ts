import { randomUUID } from 'node:crypto'
import { supabase } from '../lib/supabase.js'
import { assertSuccess, assertOk } from '../lib/db.js'
import type {
  CreateInversionInput,
  UpdateInversionInput,
  RegistrarRetornoInput,
  RegistrarPrecioInput,
} from '../schemas/inversiones.schema.js'

const INVERSION_SELECT = `
  id, tipo, descripcion, monto_invertido, monto_recuperado, moneda,
  fecha_inicio, ticker, lote_numero, cantidad, precio_por_unidad, tipo_liquidez,
  estado, created_at, updated_at,
  cuenta_origen:cuentas!cuenta_origen_id(id, nombre, moneda),
  precios_mercado(precio, fecha):precios_mercado(order: fecha.desc, limit: 1),
  movimientos!movimiento_id(count)
`

function shapeInversion(row: any) {
  const { movimientos: movArr, precios_mercado: priceArr, ...rest } = row
  const latestPrice = priceArr?.[0]?.precio ? Number(priceArr[0].precio) : null
  const latestPriceFecha = priceArr?.[0]?.fecha ?? null
  return {
    ...rest,
    precio_mercado_actual: latestPrice,
    precio_fecha: latestPriceFecha,
    _count: { movimientos: (movArr as any)?.[0]?.count ?? 0 },
  }
}

// Group lotes by ticker and aggregate totals
function groupByTicker(lotes: any[]) {
  const grouped = new Map<string, typeof lotes>()
  for (const lote of lotes) {
    const key = lote.ticker
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(lote)
  }

  return Array.from(grouped.entries()).map(([ticker, tickerLotes]) => {
    const canonical = tickerLotes[0]
    let totalInvertido = 0
    let totalRecuperado = 0
    let totalCantidad: number | null = null

    for (const lote of tickerLotes) {
      totalInvertido += Number(lote.monto_invertido)
      totalRecuperado += Number(lote.monto_recuperado)
      if (lote.cantidad) {
        totalCantidad = (totalCantidad ?? 0) + Number(lote.cantidad)
      }
    }

    // Find the lote with the most recent market price
    let mostRecentLote = tickerLotes[0]
    let mostRecentDate = new Date(mostRecentLote.precio_fecha || 0)
    for (const lote of tickerLotes) {
      const loteDate = new Date(lote.precio_fecha || 0)
      if (loteDate > mostRecentDate) {
        mostRecentDate = loteDate
        mostRecentLote = lote
      }
    }

    return {
      ticker,
      tipo: canonical.tipo,
      sector: canonical.sector,
      moneda: canonical.moneda,
      tipo_liquidez: canonical.tipo_liquidez,
      lotes: tickerLotes,
      total_invertido: totalInvertido,
      total_recuperado: totalRecuperado,
      cantidad_total: totalCantidad,
      precio_mercado_actual: mostRecentLote.precio_mercado_actual,
      most_recent_lote_id: mostRecentLote.id,
      estado: canonical.estado,
    }
  })
}

export class InversionesService {
  async getInversiones(usuarioId: string) {
    const { data, error } = await supabase
      .from('inversiones')
      .select(INVERSION_SELECT)
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false })
    assertOk(error)
    const shaped = (data ?? []).map(shapeInversion)
    return groupByTicker(shaped)
  }

  async getInversionById(usuarioId: string, id: string) {
    const { data, error } = await supabase
      .from('inversiones')
      .select(`${INVERSION_SELECT}, usuario_id`)
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    return shapeInversion(assertSuccess(data, error, 'Inversión no encontrada'))
  }

  async createInversion(usuarioId: string, data: CreateInversionInput) {
    // Verify account exists and get balance
    const { data: cuenta, error: cuentaErr } = await supabase
      .from('cuentas')
      .select('usuario_id, saldo_actual, activa')
      .eq('id', data.cuenta_id)
      .eq('usuario_id', usuarioId)
      .single()
    if (cuentaErr || !cuenta) throw new Error('Cuenta no encontrada')
    if (!cuenta.activa) throw new Error('La cuenta no está activa')

    const montoNum = data.monto_total
    const saldoActual = Number((cuenta as any).saldo_actual)

    if (saldoActual < montoNum) {
      throw new Error(
        `Saldo insuficiente. Disponible: $${saldoActual.toFixed(2)}, Requerido: $${montoNum.toFixed(2)}`,
      )
    }

    // Count existing lotes for this ticker
    const { count: loteCount, error: countErr } = await supabase
      .from('inversiones')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('ticker', data.ticker)
    assertOk(countErr)
    const loteNumero = (loteCount ?? 0) + 1

    // Create investment
    const inversionId = randomUUID()
    const { data: inversion, error: invErr } = await supabase
      .from('inversiones')
      .insert({
        id: inversionId,
        usuario_id: usuarioId,
        tipo: data.tipo,
        descripcion: data.nombre ?? null,
        sector: data.sector ?? null,
        monto_invertido: montoNum,
        moneda: data.moneda,
        fecha_inicio: data.fecha_inicio,
        cuenta_origen_id: data.cuenta_id,
        ticker: data.ticker,
        lote_numero: loteNumero,
        cantidad: data.cantidad ? Number(data.cantidad) : null,
        precio_por_unidad: data.precio_por_unidad ? Number(data.precio_por_unidad) : null,
        tipo_liquidez: data.tipo_liquidez,
        updated_at: new Date().toISOString(),
      })
      .select(INVERSION_SELECT)
      .single()

    assertSuccess(inversion, invErr)

    // Create INVERSION movement
    const { data: movimiento, error: movErr } = await supabase
      .from('movimientos')
      .insert({
        id: randomUUID(),
        usuario_id: usuarioId,
        tipo: 'INVERSION',
        cuenta_id: data.cuenta_id,
        monto: montoNum,
        moneda: data.moneda,
        descripcion: `Inversión: ${data.nombre}`,
        fecha: data.fecha_inicio,
        categoria: 'Inversión',
        inversion_id: inversionId,
      })
      .select('id')
      .single()
    assertSuccess(movimiento, movErr)

    // Debit account balance
    const { error: balErr } = await supabase
      .from('cuentas')
      .update({ saldo_actual: saldoActual - montoNum })
      .eq('id', data.cuenta_id)
    assertOk(balErr)

    return shapeInversion(inversion)
  }

  async updateInversion(
    usuarioId: string,
    id: string,
    data: UpdateInversionInput,
  ) {
    // Verify ownership
    const { error: checkErr } = await supabase
      .from('inversiones')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (checkErr) throw new Error('Inversión no encontrada')

    const updateData: Record<string, unknown> = {}
    if (data.nombre !== undefined) updateData.descripcion = data.nombre ?? null
    if (data.sector !== undefined) updateData.sector = data.sector ?? null
    if (data.ticker !== undefined) updateData.ticker = data.ticker
    if (data.tipo !== undefined) updateData.tipo = data.tipo
    if (data.tipo_liquidez !== undefined) updateData.tipo_liquidez = data.tipo_liquidez
    if (data.cantidad !== undefined) updateData.cantidad = data.cantidad ? Number(data.cantidad) : null
    if (data.precio_por_unidad !== undefined) updateData.precio_por_unidad = data.precio_por_unidad ? Number(data.precio_por_unidad) : null

    const { data: inversion, error } = await supabase
      .from('inversiones')
      .update(updateData)
      .eq('id', id)
      .select(INVERSION_SELECT)
      .single()

    return shapeInversion(assertSuccess(inversion, error))
  }

  async deleteInversion(usuarioId: string, id: string) {
    const { data: inv, error: findErr } = await supabase
      .from('inversiones')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (findErr || !inv) throw new Error('Inversión no encontrada')

    const { count, error: countErr } = await supabase
      .from('movimientos')
      .select('id', { count: 'exact', head: true })
      .eq('tipo', 'RETORNO_INVERSION')
      .eq('inversion_id', id)
    assertOk(countErr)

    if ((count ?? 0) > 0) {
      throw new Error('No se puede eliminar una inversión con retornos registrados')
    }

    const { error } = await supabase.from('inversiones').delete().eq('id', id)
    assertOk(error)
    return { id }
  }

  async registrarRetorno(
    usuarioId: string,
    id: string,
    data: RegistrarRetornoInput,
  ) {
    const { data: inversion, error: invErr } = await supabase
      .from('inversiones')
      .select('usuario_id, monto_invertido, monto_recuperado, moneda, cantidad, estado')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (invErr || !inversion) throw new Error('Inversión no encontrada')

    // Verify destination account
    const { data: cuenta, error: cuentaErr } = await supabase
      .from('cuentas')
      .select('usuario_id, activa')
      .eq('id', data.cuenta_destino_id)
      .eq('usuario_id', usuarioId)
      .single()
    if (cuentaErr || !cuenta) throw new Error('Cuenta destino no encontrada')
    if (!cuenta.activa) throw new Error('La cuenta destino no está activa')

    const cantidadVendida = Number(data.cantidad_vendida)
    const precioVenta = Number(data.precio_venta)
    const totalRetorno = cantidadVendida * precioVenta

    // Get current balance of destination account
    const { data: destCuenta, error: destErr } = await supabase
      .from('cuentas')
      .select('saldo_actual')
      .eq('id', data.cuenta_destino_id)
      .single()
    if (destErr || !destCuenta) throw new Error('Error al obtener cuenta destino')

    // Create RETORNO_INVERSION movement
    const { data: movimiento, error: movErr } = await supabase
      .from('movimientos')
      .insert({
        id: randomUUID(),
        usuario_id: usuarioId,
        tipo: 'RETORNO_INVERSION',
        cuenta_id: data.cuenta_destino_id,
        monto: totalRetorno,
        moneda: inversion.moneda,
        descripcion: data.descripcion ?? `Retorno inversión: ${cantidadVendida} @ $${precioVenta}`,
        fecha: data.fecha ?? new Date(),
        categoria: 'Retorno Inversión',
        inversion_id: id,
      })
      .select('id')
      .single()
    assertSuccess(movimiento, movErr)

    // Update investment
    const nuevoMontoRecuperado = Number(inversion.monto_recuperado) + totalRetorno
    const montoInvertido = Number(inversion.monto_invertido)
    const estado = nuevoMontoRecuperado >= montoInvertido ? 'FINALIZADA' : 'PARCIALMENTE_RECUPERADA'

    const { data: updatedInv, error: updateErr } = await supabase
      .from('inversiones')
      .update({
        monto_recuperado: nuevoMontoRecuperado,
        estado,
        cantidad: inversion.cantidad ? Number(inversion.cantidad) - cantidadVendida : null,
      })
      .eq('id', id)
      .select(INVERSION_SELECT)
      .single()

    // Credit destination account
    const { error: balErr } = await supabase
      .from('cuentas')
      .update({ saldo_actual: Number(destCuenta.saldo_actual) + totalRetorno })
      .eq('id', data.cuenta_destino_id)
    assertOk(balErr)

    return {
      success: true,
      movimiento_id: movimiento!.id,
      inversion: shapeInversion(assertSuccess(updatedInv, updateErr)),
    }
  }

  async registrarPrecio(
    usuarioId: string,
    id: string,
    data: RegistrarPrecioInput,
  ) {
    // Verify ownership
    const { error: checkErr } = await supabase
      .from('inversiones')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (checkErr) throw new Error('Inversión no encontrada')

    const { data: precio, error } = await supabase
      .from('precios_mercado')
      .insert({
        id: randomUUID(),
        inversion_id: id,
        precio: Number(data.precio),
        fecha: data.fecha ?? new Date(),
      })
      .select('id, precio, fecha')
      .single()

    return assertSuccess(precio, error)
  }

  async getPriceHistory(usuarioId: string, id: string, limit: number = 50) {
    // Verify ownership
    const { error: checkErr } = await supabase
      .from('inversiones')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (checkErr) throw new Error('Inversión no encontrada')

    const { data, error } = await supabase
      .from('precios_mercado')
      .select('id, precio, fecha')
      .eq('inversion_id', id)
      .order('fecha', { ascending: false })
      .limit(limit)

    assertOk(error)
    return (data ?? []).reverse() // oldest first for chart
  }

  async registrarPrecioByTicker(
    usuarioId: string,
    ticker: string,
    data: RegistrarPrecioInput,
  ) {
    // Find most recent lote for this ticker
    const { data: lotes, error: lotesErr } = await supabase
      .from('inversiones')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('ticker', ticker)
      .order('created_at', { ascending: false })
      .limit(1)
    assertOk(lotesErr)

    if (!lotes || lotes.length === 0) {
      throw new Error('No se encontraron inversiones con ese ticker')
    }

    const lote = lotes[0]
    return this.registrarPrecio(usuarioId, lote.id, data)
  }
}

export const inversionesService = new InversionesService()
