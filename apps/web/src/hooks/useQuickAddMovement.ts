import { useSWRConfig } from 'swr'
import { apiPost } from './useAPI'
import type { QuickAddData } from '@/components/QuickAdd'

export function useQuickAddMovement() {
  const { mutate: globalMutate } = useSWRConfig()

  const submitQuickAdd = async (data: QuickAddData) => {
    let endpoint: string
    let body: unknown

    if (data.tipo === 'TARJETA' && data.descuento_activo && data.fondo_descuento_id) {
      endpoint = '/api/movements/compra-tarjeta-descuento'
      body = {
        tarjeta_id: data.tarjeta_id,
        monto_total: data.monto,
        porcentaje_descuento: data.porcentaje_descuento,
        fondo_descuento_id: data.fondo_descuento_id,
        cantidad_cuotas: data.cantidad_cuotas ?? 1,
        descripcion: data.descripcion || 'Compra con tarjeta',
        categoria: data.categoria,
        fecha: data.fecha,
      }
    } else if (data.tipo === 'TARJETA') {
      endpoint = '/api/movements/compra-tarjeta'
      body = {
        tarjeta_id: data.tarjeta_id,
        monto: data.monto,
        cantidad_cuotas: data.cantidad_cuotas ?? 1,
        descripcion: data.descripcion || 'Compra con tarjeta',
        categoria: data.categoria,
        fecha: data.fecha,
      }
    } else if (data.tipo === 'TRANSFERENCIA') {
      endpoint = '/api/movements/transfer'
      body = {
        cuenta_origen_id: data.cuenta_id,
        cuenta_destino_id: data.cuenta_destino_id,
        monto: data.monto,
        descripcion: data.descripcion,
        fecha: data.fecha,
        tasa_conversion: data.tasa_conversion,
      }
    } else if (data.descuento_activo && data.fondo_descuento_id) {
      endpoint = '/api/movements/expense-with-discount'
      body = {
        monto_total: data.monto,
        porcentaje_descuento: data.porcentaje_descuento,
        cuenta_pago_id: data.cuenta_id,
        fondo_descuento_id: data.fondo_descuento_id,
        categoria: data.categoria,
        descripcion: data.descripcion,
        fecha: data.fecha,
      }
    } else {
      endpoint = '/api/movements/quick'
      body = data
    }

    await apiPost(endpoint, body)

    globalMutate((key) => typeof key === 'string' && key.startsWith('/api/movements'))
    globalMutate('/api/cuentas')
    if (data.tipo === 'TARJETA') {
      globalMutate('/api/tarjetas')
    }
  }

  return { submitQuickAdd }
}
