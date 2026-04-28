import { randomUUID } from 'node:crypto'
import { supabase } from '../lib/supabase.js'
import { assertSuccess, assertOk } from '../lib/db.js'
import type {
  QuickAddMovementInput,
  CreateIncomeInput,
  CreateExpenseInput,
  CreateTransferInput,
  GetMovementsQuery,
  ExpenseWithDiscountInput,
  CreateCardPurchaseInput,
  CreateCardPaymentInput,
} from '../schemas/movements.schema.js'

const MOVEMENT_SELECT = `
  id, tipo, monto, moneda, descripcion, categoria, fecha,
  cuenta_id, cuenta_destino_id, tarjeta_id, movimiento_relacionado_id, metadata,
  cuenta_origen:cuentas!cuenta_id(id, nombre, tipo, moneda),
  cuenta_destino:cuentas!cuenta_destino_id(id, nombre, tipo, moneda),
  tarjeta:tarjetas!tarjeta_id(id, nombre, tipo),
  deuda:deudas!deuda_id(id, acreedor, direccion)
`

export class MovementsService {
  private async updateAccountBalance(accountId: string, delta: number): Promise<void> {
    const { data, error: fetchErr } = await supabase
      .from('cuentas')
      .select('saldo_actual')
      .eq('id', accountId)
      .single()
    if (fetchErr || !data) throw new Error('Cuenta no encontrada al actualizar saldo')
    const { error } = await supabase
      .from('cuentas')
      .update({ saldo_actual: Number((data as any).saldo_actual) + delta })
      .eq('id', accountId)
    assertOk(error)
  }

  private async updateCardLimit(cardId: string, delta: number): Promise<void> {
    const { data, error: fetchErr } = await supabase
      .from('tarjetas')
      .select('limite_comprometido')
      .eq('id', cardId)
      .single()
    if (fetchErr || !data) throw new Error('Tarjeta no encontrada al actualizar límite')
    const { error } = await supabase
      .from('tarjetas')
      .update({ limite_comprometido: Number((data as any).limite_comprometido) + delta })
      .eq('id', cardId)
    assertOk(error)
  }

  /**
   * Get conversion rate between currencies
   */
  private async getConversionRate(
    usuarioId: string,
    fromCurrency: string,
    toCurrency: string,
    providedRate?: number
  ): Promise<number> {
    if (fromCurrency === toCurrency) return 1
    if (providedRate) return providedRate

    const { data: config, error } = await supabase
      .from('configuraciones_moneda')
      .select('tasa_a_principal')
      .eq('usuario_id', usuarioId)
      .eq('moneda', fromCurrency)
      .single()

    if (error || !config) {
      throw new Error(
        `No hay tasa de conversión configurada para ${fromCurrency}. Por favor configúrala primero.`
      )
    }

    return Number((config as any).tasa_a_principal)
  }

  /**
   * Validate account has sufficient balance
   */
  private async validateSufficientBalance(cuentaId: string, monto: number): Promise<void> {
    const { data: cuenta, error } = await supabase
      .from('cuentas')
      .select('saldo_actual, nombre')
      .eq('id', cuentaId)
      .single()

    if (error || !cuenta) throw new Error('Cuenta no encontrada')

    const saldoActual = Number((cuenta as any).saldo_actual)
    if (saldoActual < monto) {
      throw new Error(
        `Saldo insuficiente en ${(cuenta as any).nombre}. Disponible: $${saldoActual.toFixed(2)}, Requerido: $${monto.toFixed(2)}`
      )
    }
  }

  /**
   * Validate account is active
   */
  private async validateAccountActive(cuentaId: string): Promise<void> {
    const { data: cuenta, error } = await supabase
      .from('cuentas')
      .select('activa, nombre')
      .eq('id', cuentaId)
      .single()

    if (error || !cuenta) throw new Error('Cuenta no encontrada')
    if (!(cuenta as any).activa)
      throw new Error(`La cuenta ${(cuenta as any).nombre} está inactiva`)
  }

  /**
   * Get user's default (most recently used active) account
   */
  private async getDefaultAccount(usuarioId: string): Promise<string> {
    const { data: lastMovement } = await supabase
      .from('movimientos')
      .select('cuenta_id')
      .eq('usuario_id', usuarioId)
      .in('tipo', ['GASTO', 'INGRESO'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastMovement) {
      const { data: cuenta } = await supabase
        .from('cuentas')
        .select('id, activa')
        .eq('id', (lastMovement as any).cuenta_id)
        .maybeSingle()

      if ((cuenta as any)?.activa) return (lastMovement as any).cuenta_id
    }

    const { data: firstAccount, error } = await supabase
      .from('cuentas')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('activa', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error || !firstAccount) throw new Error('No hay cuentas activas disponibles')
    return (firstAccount as any).id
  }

  /**
   * Quick add movement (minimal fields, optimized for QuickAdd component)
   */
  async quickAddMovement(usuarioId: string, data: QuickAddMovementInput) {
    const cuentaId = data.cuenta_id || (await this.getDefaultAccount(usuarioId))

    const { data: cuenta, error: cuentaErr } = await supabase
      .from('cuentas')
      .select('moneda, activa, nombre')
      .eq('id', cuentaId)
      .single()
    if (cuentaErr || !cuenta) throw new Error('Cuenta no encontrada')
    if (!(cuenta as any).activa) throw new Error('La cuenta seleccionada está inactiva')

    if (data.tipo === 'GASTO') {
      await this.validateSufficientBalance(cuentaId, data.monto)
    }

    // 1. Insert movement
    const { data: newMovimiento, error: movErr } = await supabase
      .from('movimientos')
      .insert({
        id: randomUUID(),
        usuario_id: usuarioId,
        tipo: data.tipo,
        cuenta_id: cuentaId,
        monto: data.monto,
        moneda: (cuenta as any).moneda,
        descripcion: data.descripcion || (data.tipo === 'GASTO' ? 'Gasto' : 'Ingreso'),
        categoria: data.categoria,
        fecha: data.fecha ?? new Date(),
      })
      .select('*')
      .single()
    assertSuccess(newMovimiento, movErr)

    // 2. Update account balance
    const delta = data.tipo === 'INGRESO' ? data.monto : -data.monto
    await this.updateAccountBalance(cuentaId, delta)

    return newMovimiento
  }

  /**
   * Create income movement
   */
  async createIncome(usuarioId: string, data: CreateIncomeInput) {
    await this.validateAccountActive(data.cuenta_id)

    const { data: cuenta, error: cuentaErr } = await supabase
      .from('cuentas')
      .select('moneda')
      .eq('id', data.cuenta_id)
      .single()
    if (cuentaErr || !cuenta) throw new Error('Cuenta no encontrada')

    const moneda = data.moneda || (cuenta as any).moneda
    const tasaConversion =
      moneda !== (cuenta as any).moneda
        ? await this.getConversionRate(
            usuarioId,
            moneda,
            (cuenta as any).moneda,
            data.tasa_conversion
          )
        : undefined

    const montoEnMonedaCuenta = tasaConversion ? data.monto * tasaConversion : data.monto

    // 1. Insert movement
    const { data: newMovimiento, error: movErr } = await supabase
      .from('movimientos')
      .insert({
        id: randomUUID(),
        usuario_id: usuarioId,
        tipo: 'INGRESO',
        cuenta_id: data.cuenta_id,
        monto: data.monto,
        moneda,
        descripcion: data.descripcion,
        categoria: data.categoria,
        fecha: data.fecha,
        tasa_conversion: tasaConversion,
      })
      .select('*')
      .single()
    assertSuccess(newMovimiento, movErr)

    // 2. Credit account balance
    await this.updateAccountBalance(data.cuenta_id, montoEnMonedaCuenta)

    return newMovimiento
  }

  /**
   * Create expense movement
   */
  async createExpense(usuarioId: string, data: CreateExpenseInput) {
    await this.validateAccountActive(data.cuenta_id)

    const { data: cuenta, error: cuentaErr } = await supabase
      .from('cuentas')
      .select('moneda')
      .eq('id', data.cuenta_id)
      .single()
    if (cuentaErr || !cuenta) throw new Error('Cuenta no encontrada')

    const moneda = data.moneda || (cuenta as any).moneda
    const tasaConversion =
      moneda !== (cuenta as any).moneda
        ? await this.getConversionRate(
            usuarioId,
            moneda,
            (cuenta as any).moneda,
            data.tasa_conversion
          )
        : undefined

    const montoEnMonedaCuenta = tasaConversion ? data.monto * tasaConversion : data.monto
    await this.validateSufficientBalance(data.cuenta_id, montoEnMonedaCuenta)

    // 1. Insert movement
    const { data: newMovimiento, error: movErr } = await supabase
      .from('movimientos')
      .insert({
        id: randomUUID(),
        usuario_id: usuarioId,
        tipo: 'GASTO',
        cuenta_id: data.cuenta_id,
        monto: data.monto,
        moneda,
        descripcion: data.descripcion,
        categoria: data.categoria,
        fecha: data.fecha,
        tasa_conversion: tasaConversion,
      })
      .select('*')
      .single()
    assertSuccess(newMovimiento, movErr)

    // 2. Debit account balance
    await this.updateAccountBalance(data.cuenta_id, -montoEnMonedaCuenta)

    return newMovimiento
  }

  /**
   * Create transfer between accounts (two linked movements)
   */
  async createTransfer(usuarioId: string, data: CreateTransferInput) {
    if (data.cuenta_origen_id === data.cuenta_destino_id) {
      throw new Error('La cuenta origen y destino no pueden ser la misma')
    }

    await this.validateAccountActive(data.cuenta_origen_id)
    await this.validateAccountActive(data.cuenta_destino_id)

    const [{ data: cuentaOrigen, error: errO }, { data: cuentaDestino, error: errD }] =
      await Promise.all([
        supabase.from('cuentas').select('moneda, nombre').eq('id', data.cuenta_origen_id).single(),
        supabase.from('cuentas').select('moneda, nombre').eq('id', data.cuenta_destino_id).single(),
      ])
    if (errO || !cuentaOrigen || errD || !cuentaDestino) throw new Error('Cuenta no encontrada')

    await this.validateSufficientBalance(data.cuenta_origen_id, data.monto)

    const o = cuentaOrigen as any
    const d = cuentaDestino as any
    const tasaConversion =
      o.moneda !== d.moneda
        ? await this.getConversionRate(usuarioId, o.moneda, d.moneda, data.tasa_conversion)
        : undefined

    const montoDestino = tasaConversion ? data.monto * tasaConversion : data.monto
    const descripcion = data.descripcion || `${o.nombre} → ${d.nombre}`

    // 1. Create outgoing movement (without related ID yet)
    const { data: movSalida, error: errSalida } = await supabase
      .from('movimientos')
      .insert({
        id: randomUUID(),
        usuario_id: usuarioId,
        tipo: 'TRANSFERENCIA',
        cuenta_id: data.cuenta_origen_id,
        cuenta_destino_id: data.cuenta_destino_id,
        monto: data.monto,
        moneda: o.moneda,
        descripcion,
        fecha: data.fecha,
        tasa_conversion: tasaConversion,
      })
      .select('id')
      .single()
    assertSuccess(movSalida, errSalida)

    // 2. Create incoming movement linked to outgoing
    const { data: movEntrada, error: errEntrada } = await supabase
      .from('movimientos')
      .insert({
        id: randomUUID(),
        usuario_id: usuarioId,
        tipo: 'TRANSFERENCIA',
        cuenta_id: data.cuenta_destino_id,
        monto: montoDestino,
        moneda: d.moneda,
        descripcion,
        fecha: data.fecha,
        movimiento_relacionado_id: (movSalida as any).id,
        tasa_conversion: tasaConversion,
      })
      .select('id')
      .single()
    assertSuccess(movEntrada, errEntrada)

    // 3. Back-link outgoing to incoming
    const { error: linkErr } = await supabase
      .from('movimientos')
      .update({ movimiento_relacionado_id: (movEntrada as any).id })
      .eq('id', (movSalida as any).id)
    assertOk(linkErr)

    // 4. Update both account balances
    await this.updateAccountBalance(data.cuenta_origen_id, -data.monto)
    await this.updateAccountBalance(data.cuenta_destino_id, montoDestino)

    return {
      movimientoSalida: movSalida,
      movimientoEntrada: movEntrada,
    }
  }

  /**
   * Create an expense split between a personal account and a discount fund.
   * Two linked movements: GASTO_CON_DESCUENTO + SUBSIDIO.
   */
  async createExpenseWithDiscount(usuarioId: string, data: ExpenseWithDiscountInput) {
    await this.validateAccountActive(data.cuenta_pago_id)
    await this.validateAccountActive(data.fondo_descuento_id)

    const [{ data: cuentaPago, error: errP }, { data: fondoCuenta, error: errF }] =
      await Promise.all([
        supabase.from('cuentas').select('moneda, nombre').eq('id', data.cuenta_pago_id).single(),
        supabase
          .from('cuentas')
          .select('tipo, moneda, nombre')
          .eq('id', data.fondo_descuento_id)
          .single(),
      ])
    if (errP || !cuentaPago) throw new Error('Cuenta de pago no encontrada')
    if (errF || !fondoCuenta) throw new Error('Fondo de descuento no encontrado')

    if ((fondoCuenta as any).tipo !== 'FONDO_DESCUENTO') {
      throw new Error(
        `La cuenta "${(fondoCuenta as any).nombre}" no es un fondo de descuento. Solo se permiten cuentas de tipo FONDO_DESCUENTO.`
      )
    }

    const montoSubsidio = parseFloat(
      (data.monto_total * (data.porcentaje_descuento / 100)).toFixed(2)
    )
    const montoPagado = parseFloat((data.monto_total - montoSubsidio).toFixed(2))

    await this.validateSufficientBalance(data.cuenta_pago_id, montoPagado)
    await this.validateSufficientBalance(data.fondo_descuento_id, montoSubsidio)

    const descripcionBase = data.descripcion || 'Gasto con descuento de fondo'
    const metadata = {
      monto_total: data.monto_total,
      porcentaje_descuento: data.porcentaje_descuento,
    }

    // 1. GASTO_CON_DESCUENTO
    const { data: gastoMov, error: errGasto } = await supabase
      .from('movimientos')
      .insert({
        id: randomUUID(),
        usuario_id: usuarioId,
        tipo: 'GASTO_CON_DESCUENTO',
        cuenta_id: data.cuenta_pago_id,
        monto: montoPagado,
        moneda: (cuentaPago as any).moneda,
        descripcion: descripcionBase,
        categoria: data.categoria,
        fecha: data.fecha,
        metadata,
      })
      .select('id')
      .single()
    assertSuccess(gastoMov, errGasto)

    // 2. SUBSIDIO
    const { data: subsidioMov, error: errSubsidio } = await supabase
      .from('movimientos')
      .insert({
        id: randomUUID(),
        usuario_id: usuarioId,
        tipo: 'SUBSIDIO',
        cuenta_id: data.fondo_descuento_id,
        monto: montoSubsidio,
        moneda: (fondoCuenta as any).moneda,
        descripcion: descripcionBase,
        categoria: data.categoria,
        fecha: data.fecha,
        movimiento_relacionado_id: (gastoMov as any).id,
        metadata,
      })
      .select('id')
      .single()
    assertSuccess(subsidioMov, errSubsidio)

    // 3. Cross-link gasto back to subsidio
    const { error: linkErr } = await supabase
      .from('movimientos')
      .update({ movimiento_relacionado_id: (subsidioMov as any).id })
      .eq('id', (gastoMov as any).id)
    assertOk(linkErr)

    // 4. Debit both accounts
    await this.updateAccountBalance(data.cuenta_pago_id, -montoPagado)
    await this.updateAccountBalance(data.fondo_descuento_id, -montoSubsidio)

    return { gastoMovimiento: gastoMov, subsidioMovimiento: subsidioMov }
  }

  /**
   * Compute the first cuota due date based on purchase date and card billing cycle.
   */
  private computeFirstDueDate(fechaCompra: Date, diaCierre: number, diaVencimiento: number): Date {
    const year = fechaCompra.getFullYear()
    const month = fechaCompra.getMonth()
    const day = fechaCompra.getDate()

    let dueYear = year
    let dueMonth = month

    if (day > diaCierre) {
      dueMonth = month + 1
      if (dueMonth > 11) {
        dueMonth = 0
        dueYear = year + 1
      }
    }

    return new Date(dueYear, dueMonth, diaVencimiento)
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date)
    result.setMonth(result.getMonth() + months)
    return result
  }

  /**
   * Create installment card purchase — RN-004
   */
  async createCardPurchase(usuarioId: string, data: CreateCardPurchaseInput) {
    const { data: tarjeta, error: cardErr } = await supabase
      .from('tarjetas')
      .select('*')
      .eq('id', data.tarjeta_id)
      .eq('usuario_id', usuarioId)
      .single()
    if (cardErr || !tarjeta) throw new Error('Tarjeta no encontrada')
    if (!(tarjeta as any).activa)
      throw new Error(`La tarjeta "${(tarjeta as any).nombre}" está inactiva`)

    const t = tarjeta as any
    const montoTotal = data.monto
    const cantidadCuotas = data.cantidad_cuotas ?? 1
    const limiteDisponible = Number(t.limite_total) - Number(t.limite_comprometido)

    if (limiteDisponible < montoTotal) {
      throw new Error(
        `Límite de crédito insuficiente en "${t.nombre}". Disponible: $${limiteDisponible.toFixed(2)}, Requerido: $${montoTotal.toFixed(2)}`
      )
    }

    const montoPorCuotaBase = Math.round((montoTotal / cantidadCuotas) * 100) / 100
    const sumaAnteriores = montoPorCuotaBase * (cantidadCuotas - 1)
    const montoUltimaCuota = Math.round((montoTotal - sumaAnteriores) * 100) / 100

    const fechaCompra = data.fecha ?? new Date()
    const firstDueDate = this.computeFirstDueDate(fechaCompra, t.dia_cierre, t.dia_vencimiento)
    const moneda = data.moneda ?? t.moneda

    // 1. Create GASTO_TARJETA movement
    const movimientoId = randomUUID()
    const { data: movimiento, error: movErr } = await supabase
      .from('movimientos')
      .insert({
        id: movimientoId,
        usuario_id: usuarioId,
        tipo: 'GASTO_TARJETA',
        cuenta_id: t.cuenta_id,
        tarjeta_id: t.id,
        monto: montoTotal,
        moneda,
        descripcion: data.descripcion,
        categoria: data.categoria,
        fecha: fechaCompra,
        tasa_conversion: data.tasa_conversion,
      })
      .select('id')
      .single()
    assertSuccess(movimiento, movErr)

    // 2. Create CompraEnCuotas record
    const compraId = randomUUID()
    const { data: compra, error: compraErr } = await supabase
      .from('compras_en_cuotas')
      .insert({
        id: compraId,
        usuario_id: usuarioId,
        tarjeta_id: t.id,
        movimiento_id: (movimiento as any).id,
        descripcion: data.descripcion,
        monto_total: montoTotal,
        cantidad_cuotas: cantidadCuotas,
        monto_por_cuota: montoPorCuotaBase,
        fecha_compra: fechaCompra,
        categoria: data.categoria,
      })
      .select('id')
      .single()
    assertSuccess(compra, compraErr)

    // 3. Bulk insert cuotas
    const cuotasData = Array.from({ length: cantidadCuotas }, (_, i) => ({
      id: randomUUID(),
      compra_id: (compra as any).id,
      numero_cuota: i + 1,
      monto: i === cantidadCuotas - 1 ? montoUltimaCuota : montoPorCuotaBase,
      fecha_vencimiento: this.addMonths(firstDueDate, i),
    }))

    const { error: cuotaErr } = await supabase.from('cuotas').insert(cuotasData)
    assertOk(cuotaErr)

    // 4. Increment card limite_comprometido
    await this.updateCardLimit(t.id, montoTotal)

    return { movimiento, compra, cuotas_creadas: cantidadCuotas }
  }

  /**
   * Create card payment — RN-005 (FIFO installment clearing)
   */
  async createCardPayment(usuarioId: string, data: CreateCardPaymentInput) {
    await this.validateSufficientBalance(data.cuenta_id, data.monto)
    await this.validateAccountActive(data.cuenta_id)

    const { data: tarjeta, error: cardErr } = await supabase
      .from('tarjetas')
      .select('*')
      .eq('id', data.tarjeta_id)
      .eq('usuario_id', usuarioId)
      .single()
    if (cardErr || !tarjeta) throw new Error('Tarjeta no encontrada')

    const { data: cuenta } = await supabase
      .from('cuentas')
      .select('moneda')
      .eq('id', data.cuenta_id)
      .maybeSingle()

    const t = tarjeta as any
    const moneda = data.moneda ?? (cuenta as any)?.moneda ?? t.moneda

    // 1. Create PAGO_TARJETA movement
    const { data: movimiento, error: movErr } = await supabase
      .from('movimientos')
      .insert({
        id: randomUUID(),
        usuario_id: usuarioId,
        tipo: 'PAGO_TARJETA',
        cuenta_id: data.cuenta_id,
        tarjeta_id: t.id,
        monto: data.monto,
        moneda,
        descripcion: data.descripcion || `Pago tarjeta ${t.nombre}`,
        fecha: data.fecha ?? new Date(),
        tasa_conversion: data.tasa_conversion,
      })
      .select('id')
      .single()
    assertSuccess(movimiento, movErr)

    // 2. Debit source account
    await this.updateAccountBalance(data.cuenta_id, -data.monto)

    // 3. Fetch all compra IDs for this card, then unpaid cuotas FIFO
    const { data: compras, error: compraFetchErr } = await supabase
      .from('compras_en_cuotas')
      .select('*')
      .eq('tarjeta_id', t.id)
      .eq('usuario_id', usuarioId)
    assertOk(compraFetchErr)

    if (compras && compras.length > 0) {
      const compraIds = (compras as any[]).map((c) => c.id)
      const compraMap = new Map((compras as any[]).map((c) => [c.id, c]))

      const { data: cuotasPendientes, error: cuotaFetchErr } = await supabase
        .from('cuotas')
        .select('id, monto, compra_id')
        .eq('pagada', false)
        .in('compra_id', compraIds)
        .order('fecha_vencimiento', { ascending: true })
      assertOk(cuotaFetchErr)

      // 4. FIFO loop — collect cuota IDs to mark paid
      let montoRestante = data.monto
      let cuotasPagadasCount = 0
      const cuotasToPay: string[] = []
      const comprasMap = new Map<string, number>() // compra_id → count paid this run

      for (const cuota of cuotasPendientes ?? []) {
        const montoCuota = Number((cuota as any).monto)
        if (montoRestante < montoCuota) break
        cuotasToPay.push((cuota as any).id)
        montoRestante -= montoCuota
        cuotasPagadasCount++
        const prev = comprasMap.get((cuota as any).compra_id) ?? 0
        comprasMap.set((cuota as any).compra_id, prev + 1)
      }

      // 5. Bulk mark cuotas paid
      if (cuotasToPay.length > 0) {
        const { error: markErr } = await supabase
          .from('cuotas')
          .update({ pagada: true, fecha_pago: (data.fecha ?? new Date()).toISOString() })
          .in('id', cuotasToPay)
        assertOk(markErr)
      }

      // 6. Update cuotas_pagadas on each affected compra; release limit if fully paid
      for (const [compraId, pagadasEnEstePago] of comprasMap.entries()) {
        const compra = compraMap.get(compraId)
        if (!compra) continue

        const nuevosCuotasPagadas = compra.cuotas_pagadas + pagadasEnEstePago
        const { error: compraUpdateErr } = await supabase
          .from('compras_en_cuotas')
          .update({ cuotas_pagadas: nuevosCuotasPagadas })
          .eq('id', compraId)
        assertOk(compraUpdateErr)

        const limitReduction = pagadasEnEstePago * Number(compra.monto_por_cuota)
        await this.updateCardLimit(t.id, -limitReduction)
      }

      return { movimiento, cuotas_pagadas: cuotasPagadasCount }
    }

    return { movimiento, cuotas_pagadas: 0 }
  }

  /**
   * Get movements with filters and pagination
   */
  async getMovements(usuarioId: string, query: GetMovementsQuery) {
    let q = supabase
      .from('movimientos')
      .select(MOVEMENT_SELECT, { count: 'exact' })
      .eq('usuario_id', usuarioId)

    if (query.desde) {
      q = q.gte('fecha', query.desde.toISOString())
    }
    if (query.hasta) {
      const hastaEnd = new Date(query.hasta)
      hastaEnd.setHours(23, 59, 59, 999)
      q = q.lte('fecha', hastaEnd.toISOString())
    }
    if (query.tipo) {
      q = q.eq('tipo', query.tipo)
    }
    if (query.cuenta_id) {
      q = q.or(`cuenta_id.eq.${query.cuenta_id},cuenta_destino_id.eq.${query.cuenta_id}`)
    }
    if (query.categoria) {
      q = q.eq('categoria', query.categoria)
    }
    if (query.tarjeta_id) {
      q = q.eq('tarjeta_id', query.tarjeta_id)
    }

    q = q.order('fecha', { ascending: false }).range(query.offset, query.offset + query.limit - 1)

    const { data: movimientos, error, count: total } = await q
    assertOk(error)

    let movimientosConBalance: any[] = movimientos ?? []

    if (query.cuenta_id) {
      let balanceAcumulado = 0
      const movimientosOrdenados = [...movimientosConBalance].reverse()

      movimientosConBalance = movimientosOrdenados.map((mov) => {
        const esEntrada =
          mov.tipo === 'INGRESO' ||
          mov.tipo === 'RETORNO_INVERSION' ||
          mov.tipo === 'INGRESO_INICIAL' ||
          mov.tipo === 'COBRO_DEUDA' ||
          (mov.tipo === 'TRANSFERENCIA' && mov.cuenta_destino_id === query.cuenta_id) ||
          (mov.tipo === 'AJUSTE' && Number(mov.monto) > 0)

        const esSalida =
          mov.tipo === 'GASTO' ||
          mov.tipo === 'PAGO_TARJETA' ||
          mov.tipo === 'PAGO_DEUDA' ||
          mov.tipo === 'INVERSION' ||
          mov.tipo === 'GASTO_CON_DESCUENTO' ||
          mov.tipo === 'SUBSIDIO' ||
          (mov.tipo === 'TRANSFERENCIA' && mov.cuenta_id === query.cuenta_id) ||
          (mov.tipo === 'AJUSTE' && Number(mov.monto) < 0)

        const monto = Number(mov.monto)
        if (esEntrada) balanceAcumulado += monto
        else if (esSalida) balanceAcumulado -= monto

        return { ...mov, balance_despues: balanceAcumulado }
      })

      movimientosConBalance = movimientosConBalance.reverse()
    }

    return {
      movimientos: movimientosConBalance,
      total: total ?? 0,
      limit: query.limit,
      offset: query.offset,
      hasMore: query.offset + query.limit < (total ?? 0),
    }
  }

  /**
   * Delete movement — reverses balance changes
   */
  async deleteMovement(id: string, usuarioId: string) {
    const { data: movimiento, error: findErr } = await supabase
      .from('movimientos')
      .select(
        `
        *,
        movimiento_relacionado:movimientos!movimiento_relacionado_id(
          id, tipo, monto, moneda, cuenta_id, cuenta_destino_id, movimiento_relacionado_id
        )
      `
      )
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    if (findErr || !movimiento) throw new Error('Movimiento no encontrado')

    const mov = movimiento as any

    if (mov.tipo === 'PAGO_TARJETA') {
      throw new Error(
        'No se pueden eliminar pagos de tarjeta. Registrá un movimiento correctivo si es necesario.'
      )
    }

    if (mov.tipo === 'PAGO_DEUDA' || mov.tipo === 'COBRO_DEUDA') {
      throw new Error(
        'No se pueden eliminar pagos de deuda. Registrá un movimiento correctivo si es necesario.'
      )
    }

    // ── GASTO_TARJETA ──────────────────────────────────────────────────────────
    if (mov.tipo === 'GASTO_TARJETA') {
      const { data: compra } = await supabase
        .from('compras_en_cuotas')
        .select('id, tarjeta_id, monto_total, cuotas_pagadas')
        .eq('movimiento_id', id)
        .maybeSingle()

      if (compra && (compra as any).cuotas_pagadas > 0) {
        throw new Error('No se puede eliminar una compra con cuotas ya pagadas')
      }

      if (compra) {
        await this.updateCardLimit((compra as any).tarjeta_id, -Number((compra as any).monto_total))

        // Delete compra — cascades to cuotas at DB level
        const { error: compraDelErr } = await supabase
          .from('compras_en_cuotas')
          .delete()
          .eq('id', (compra as any).id)
        assertOk(compraDelErr)
      }

      const { error: movDelErr } = await supabase.from('movimientos').delete().eq('id', id)
      assertOk(movDelErr)
      return { message: 'Movimiento eliminado exitosamente' }
    }

    // Guard: other movement types associated with an installment purchase
    const { data: compraEnCuotas } = await supabase
      .from('compras_en_cuotas')
      .select('id')
      .eq('movimiento_id', id)
      .maybeSingle()

    if (compraEnCuotas) {
      throw new Error('No se puede eliminar un movimiento que es parte de una compra en cuotas')
    }

    const monto = Number(mov.monto)
    const relatedMovement = mov.movimiento_relacionado

    // ── TRANSFERENCIA ──────────────────────────────────────────────────────────
    if (mov.tipo === 'TRANSFERENCIA') {
      const esMovimientoSalida = !!mov.cuenta_destino_id

      if (relatedMovement) {
        const movSalida = esMovimientoSalida ? mov : relatedMovement
        const movEntrada = esMovimientoSalida ? relatedMovement : mov
        const montoSalida = Number(movSalida.monto)
        const montoEntrada = Number(movEntrada.monto)

        // Reverse balances
        await this.updateAccountBalance(movSalida.cuenta_id, montoSalida)
        await this.updateAccountBalance(movEntrada.cuenta_id, -montoEntrada)

        // Null both FK refs (Postgres RESTRICT prevents deletion otherwise)
        await supabase
          .from('movimientos')
          .update({ movimiento_relacionado_id: null })
          .eq('id', mov.id)
        await supabase
          .from('movimientos')
          .update({ movimiento_relacionado_id: null })
          .eq('id', relatedMovement.id)

        // Delete paired movement
        const { error: delRelErr } = await supabase
          .from('movimientos')
          .delete()
          .eq('id', relatedMovement.id)
        assertOk(delRelErr)
      } else {
        // Orphaned: reverse only this side
        const delta = esMovimientoSalida ? monto : -monto
        await this.updateAccountBalance(mov.cuenta_id, delta)

        if (mov.movimiento_relacionado_id) {
          await supabase
            .from('movimientos')
            .update({ movimiento_relacionado_id: null })
            .eq('id', mov.id)
        }
      }

      const { error: delErr } = await supabase.from('movimientos').delete().eq('id', id)
      assertOk(delErr)
      return { message: 'Movimiento eliminado exitosamente' }
    }

    // ── GASTO_CON_DESCUENTO / SUBSIDIO ─────────────────────────────────────────
    if (mov.tipo === 'GASTO_CON_DESCUENTO' || mov.tipo === 'SUBSIDIO') {
      if (relatedMovement) {
        // Restore both account balances
        await this.updateAccountBalance(mov.cuenta_id, monto)
        await this.updateAccountBalance(relatedMovement.cuenta_id, Number(relatedMovement.monto))

        // Null both FK refs
        await supabase
          .from('movimientos')
          .update({ movimiento_relacionado_id: null })
          .eq('id', mov.id)
        await supabase
          .from('movimientos')
          .update({ movimiento_relacionado_id: null })
          .eq('id', relatedMovement.id)

        // Delete related
        const { error: delRelErr } = await supabase
          .from('movimientos')
          .delete()
          .eq('id', relatedMovement.id)
        assertOk(delRelErr)
      } else {
        // Orphaned: restore only this account
        await this.updateAccountBalance(mov.cuenta_id, monto)

        if (mov.movimiento_relacionado_id) {
          await supabase
            .from('movimientos')
            .update({ movimiento_relacionado_id: null })
            .eq('id', mov.id)
        }
      }

      const { error: delErr } = await supabase.from('movimientos').delete().eq('id', id)
      assertOk(delErr)
      return { message: 'Movimiento eliminado exitosamente' }
    }

    // ── AJUSTE ─────────────────────────────────────────────────────────────────
    if (mov.tipo === 'AJUSTE') {
      throw new Error('No se pueden eliminar movimientos de tipo AJUSTE')
    }

    // ── Simple movements (INGRESO, GASTO, etc.) ────────────────────────────────
    let delta = 0
    if (
      mov.tipo === 'INGRESO' ||
      mov.tipo === 'INGRESO_INICIAL' ||
      mov.tipo === 'RETORNO_INVERSION'
    ) {
      delta = -monto // was added, now subtract
    } else if (
      mov.tipo === 'GASTO' ||
      mov.tipo === 'PAGO_TARJETA' ||
      mov.tipo === 'PAGO_DEUDA' ||
      mov.tipo === 'INVERSION'
    ) {
      delta = monto // was subtracted, now add
    }

    if (delta !== 0) {
      await this.updateAccountBalance(mov.cuenta_id, delta)
    }

    const { error: delErr } = await supabase.from('movimientos').delete().eq('id', id)
    assertOk(delErr)
    return { message: 'Movimiento eliminado exitosamente' }
  }

  /**
   * Get movement statistics for a date range — in-memory aggregation
   */
  async getMovementStats(usuarioId: string, desde?: Date, hasta?: Date) {
    let q = supabase
      .from('movimientos')
      .select('tipo, monto, categoria')
      .eq('usuario_id', usuarioId)

    if (desde) q = q.gte('fecha', desde.toISOString())
    if (hasta) {
      const hastaEnd = new Date(hasta)
      hastaEnd.setHours(23, 59, 59, 999)
      q = q.lte('fecha', hastaEnd.toISOString())
    }

    const { data, error } = await q
    assertOk(error)

    const INCOME_TYPES = new Set(['INGRESO', 'RETORNO_INVERSION', 'COBRO_DEUDA'])
    const EXPENSE_TYPES = new Set(['GASTO', 'PAGO_TARJETA', 'PAGO_DEUDA', 'GASTO_CON_DESCUENTO'])

    let totalIngresos = 0
    let totalGastos = 0

    // Aggregate by tipo
    const tipoMap = new Map<string, { _sum: { monto: number }; _count: number }>()
    // Aggregate by categoria
    const catMap = new Map<string, { _sum: { monto: number }; _count: number }>()

    for (const row of data ?? []) {
      const monto = Number(row.monto)
      if (INCOME_TYPES.has(row.tipo)) totalIngresos += monto
      if (EXPENSE_TYPES.has(row.tipo)) totalGastos += monto

      const tipoEntry = tipoMap.get(row.tipo) ?? { _sum: { monto: 0 }, _count: 0 }
      tipoEntry._sum.monto += monto
      tipoEntry._count++
      tipoMap.set(row.tipo, tipoEntry)

      if (row.categoria) {
        const catEntry = catMap.get(row.categoria) ?? { _sum: { monto: 0 }, _count: 0 }
        catEntry._sum.monto += monto
        catEntry._count++
        catMap.set(row.categoria, catEntry)
      }
    }

    const por_tipo = Array.from(tipoMap.entries()).map(([tipo, agg]) => ({
      tipo,
      _sum: agg._sum,
      _count: agg._count,
    }))

    const por_categoria = Array.from(catMap.entries()).map(([categoria, agg]) => ({
      categoria,
      _sum: agg._sum,
      _count: agg._count,
    }))

    return {
      ingresos: totalIngresos,
      gastos: totalGastos,
      balance: totalIngresos - totalGastos,
      por_categoria,
      por_tipo,
    }
  }

  private readonly EDITABLE_TYPES = new Set(['INGRESO', 'GASTO', 'TRANSFERENCIA', 'AJUSTE', 'INGRESO_INICIAL'])

  async updateMovement(id: string, usuarioId: string, data: { descripcion?: string; categoria?: string | null; fecha?: Date }) {
    const { data: mov, error: fetchErr } = await supabase
      .from('movimientos')
      .select('*')
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .single()
    assertOk(fetchErr)
    if (!mov) throw new Error('Movimiento no encontrado')

    if (!this.EDITABLE_TYPES.has(mov.tipo)) {
      throw new Error(`No se puede editar movimientos de tipo ${mov.tipo}`)
    }

    const updates: Record<string, unknown> = {}
    if (data.descripcion !== undefined) updates.descripcion = data.descripcion
    if (data.categoria !== undefined) updates.categoria = data.categoria
    if (data.fecha !== undefined) updates.fecha = data.fecha

    if (Object.keys(updates).length === 0) return { movimiento: mov }

    const { data: updated, error } = await supabase
      .from('movimientos')
      .update(updates)
      .eq('id', id)
      .select(MOVEMENT_SELECT)
      .single()
    assertOk(error)

    return { movimiento: updated }
  }
}

export const movementsService = new MovementsService()
