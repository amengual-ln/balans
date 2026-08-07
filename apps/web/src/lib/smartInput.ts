import type { Account } from '@/hooks/useAccounts'
import type { Card } from '@/hooks/useCards'
import { CATEGORY_ALIASES, COMMON_CATEGORIES } from './categories'

export const SMART_INPUT_DRAFT_KEY = 'freya_smart_input_draft'

export type ReviewField = 'cuenta' | 'destino' | 'tarjeta' | 'fondo'

export interface SmartMovementIntent {
  tipo: 'INGRESO' | 'GASTO' | 'TRANSFERENCIA'
  monto: number
  descripcion?: string
  categoria?: string
  fecha?: string
  cuentaId?: string
  destinoId?: string
  tarjetaId?: string
  cuotas?: number
  tasa?: number
  descuento?: number
  fondoId?: string
  warnings: string[]
  reviewFields: ReviewField[]
}

export interface SmartDebtIntent {
  tipo: 'PERSONAL'
  direccion: 'POR_PAGAR' | 'POR_COBRAR'
  acreedor: string
  monto: number
  moneda: string
  fecha: string
}

export type SmartInputResult =
  | { kind: 'movement'; value: SmartMovementIntent }
  | { kind: 'debt'; value: SmartDebtIntent }
  | { kind: 'failure'; error: string }

interface ParseContext {
  accounts: Account[]
  cards: Card[]
  now: Date
}

export function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR').trim()
}

function parseNumber(raw: string, thousands = false) {
  const normalized = thousands || raw.includes('.')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(',', '.')
  return Number(normalized)
}

function extractAmount(text: string) {
  const pattern = /\$?\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*(k)?\b/gi
  for (const match of text.matchAll(pattern)) {
    const before = text.slice(Math.max(0, match.index! - 10), match.index).toLowerCase()
    const after = text.slice(match.index! + match[0].length, match.index! + match[0].length + 2)
    if (/tasa\s*$|cuotas?\s*$|\/$/.test(before) || after.startsWith('/') || after.trimStart().startsWith('%')) continue
    const value = parseNumber(match[1], match[1].includes('.')) * (match[2] ? 1000 : 1)
    if (value > 0) return { value, raw: match[0].trim() }
  }
}

function localDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function extractDate(text: string, now: Date): { value?: string; error?: string } {
  const normalized = normalizeText(text)
  const date = new Date(now)
  date.setHours(12, 0, 0, 0)
  if (/\bayer\b/.test(normalized)) date.setDate(date.getDate() - 1)
  else {
    const explicit = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/)
    if (explicit) {
      date.setFullYear(explicit[3] ? Number(explicit[3]) : now.getFullYear(), Number(explicit[2]) - 1, Number(explicit[1]))
      if (date.getDate() !== Number(explicit[1]) || date.getMonth() !== Number(explicit[2]) - 1) {
        return { error: 'La fecha no es válida.' }
      }
    }
  }
  const today = new Date(now)
  today.setHours(23, 59, 59, 999)
  if (date > today) return { error: 'La fecha no puede ser futura.' }
  return { value: localDate(date) }
}

function matchEntity<T extends { id: string; nombre: string }>(query: string, entities: T[]) {
  const wanted = normalizeText(query)
  const exact = entities.filter((entity) => normalizeText(entity.nombre) === wanted)
  if (exact.length === 1) return exact[0]
  const partial = entities.filter((entity) => {
    const name = normalizeText(entity.nombre)
    return name.includes(wanted) || wanted.includes(name)
  })
  return partial.length === 1 ? partial[0] : undefined
}

function cleanFragment(value: string) {
  return value.replace(/\s+(?:hoy|ayer|el\s+\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s*$/i, '').trim()
}

function descriptionFrom(text: string, amountRaw: string, income: boolean, card: boolean) {
  let source = text
  if (income) source = source.replace(/\ben\s+.+?(?=\s+(?:hoy|ayer|el\s+\d)|$)/i, ' ')
  if (card) source = source.replace(/\bcon\s+(?!descuento\b).+?(?=\s+en\s+\d+\s+cuotas?\b|\s+(?:hoy|ayer|el\s+\d)|$)/i, ' ')
  return source
    .replace(amountRaw, ' ')
    .replace(/(?:^|\s)(?:gast[eé]|cobr[eé]|cobro|ingreso)(?=\s|$)/gi, ' ')
    .replace(/\b(?:de|en|con)\b/gi, ' ')
    .replace(/\b(?:hoy|ayer|categoria\s+\S+|categoría\s+\S+|descuento\s+\d+%?|fondo\s+.+|\d+\s+cuotas?)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferCategory(text: string) {
  const normalized = normalizeText(text)
  const explicit = normalized.match(/\bcategoria\s+([\w_-]+)/)?.[1]
  if (explicit) {
    return COMMON_CATEGORIES.find((category) =>
      [normalizeText(category.id), normalizeText(category.name)].includes(explicit)
    )?.id
  }
  const exactName = COMMON_CATEGORIES.find((category) =>
    new RegExp(`\\b${normalizeText(category.name)}\\b`).test(normalized)
  )
  if (exactName) return exactName.id
  return Object.entries(CATEGORY_ALIASES).find(([alias]) => new RegExp(`\\b${alias}\\b`).test(normalized))?.[1]
}

function debtResult(text: string, amount: number, date: string): SmartInputResult | undefined {
  const normalized = normalizeText(text)
  const receivable = text.match(/^(.+?)\s+me\s+debe\s+/i)
  const payable = text.match(/\bdebo\s+(?:(?:ars|usd|d[oó]lares?)\s+)?(?:\$?\s*[\d.,]+k?\s+)?a\s+(.+?)(?:\s+(?:hoy|ayer|el\s+\d))?$/i)
  const acreedor = cleanFragment(receivable?.[1] ?? payable?.[1] ?? '')
  if (!acreedor) return undefined
  const currency = /\b(?:usd|dolares?)\b/.test(normalized) ? 'USD' : 'ARS'
  return {
    kind: 'debt',
    value: {
      tipo: 'PERSONAL',
      direccion: receivable ? 'POR_COBRAR' : 'POR_PAGAR',
      acreedor,
      monto: amount,
      moneda: currency,
      fecha: date,
    },
  }
}

export function parseSmartInput(text: string, context: ParseContext): SmartInputResult {
  const trimmed = text.trim()
  if (!trimmed) return { kind: 'failure', error: 'Escribí una operación.' }
  const amount = extractAmount(trimmed)
  if (!amount) return { kind: 'failure', error: 'Falta un monto válido.' }
  const parsedDate = extractDate(trimmed, context.now)
  if (parsedDate.error) return { kind: 'failure', error: parsedDate.error }

  const debt = debtResult(trimmed, amount.value, parsedDate.value!)
  if (debt) return debt

  const normalized = normalizeText(trimmed)
  const warnings: string[] = []
  const reviewFields: ReviewField[] = []
  const intent: SmartMovementIntent = {
    tipo: /\b(?:transferi|transferir|transferencia)\b/.test(normalized)
      ? 'TRANSFERENCIA'
      : /\b(?:cobre|cobro|sueldo|ingreso)\b/.test(normalized)
        ? 'INGRESO'
        : 'GASTO',
    monto: amount.value,
    fecha: parsedDate.value,
    warnings,
    reviewFields,
  }

  if (intent.tipo === 'TRANSFERENCIA') {
    const transfer = normalized.match(/\bde\s+(.+?)\s+a\s+(.+?)(?=\s+tasa\b|\s+hoy\b|\s+ayer\b|\s+el\s+\d|$)/)
    if (!transfer) return { kind: 'failure', error: 'Indicá cuenta de origen y destino.' }
    const origin = matchEntity(transfer[1], context.accounts.filter((a) => a.activa && a.tipo !== 'FONDO_DESCUENTO'))
    const destination = matchEntity(transfer[2], context.accounts.filter((a) => a.activa && a.tipo !== 'FONDO_DESCUENTO'))
    if (origin) intent.cuentaId = origin.id
    else { warnings.push(`Revisá la cuenta de origen “${transfer[1]}”.`); reviewFields.push('cuenta') }
    if (destination) intent.destinoId = destination.id
    else { warnings.push(`Revisá la cuenta de destino “${transfer[2]}”.`); reviewFields.push('destino') }
    intent.tasa = Number(normalized.match(/\btasa\s+([\d.,]+)/)?.[1].replace(',', '.') ?? '') || undefined
    return { kind: 'movement', value: intent }
  }

  const cardReference = normalized.match(/\bcon\s+(.+?)(?=\s+en\s+\d+\s+cuotas?\b|\s+hoy\b|\s+ayer\b|\s+el\s+\d|$)/)
  const discount = normalized.match(/\bdescuento\s+(\d{1,3})\s*%/)
  const fundReference = normalized.match(/\bfondo\s+(.+?)(?=\s+hoy\b|\s+ayer\b|\s+el\s+\d|$)/)
  if (cardReference && !cardReference[1].startsWith('descuento')) {
    const card = matchEntity(cardReference[1], context.cards.filter((c) => c.activa))
    if (card) intent.tarjetaId = card.id
    else { warnings.push(`Revisá la tarjeta “${cardReference[1]}”.`); reviewFields.push('tarjeta') }
    intent.cuotas = Number(normalized.match(/\ben\s+(\d+)\s+cuotas?\b/)?.[1] ?? 1)
  } else {
    const accountReference = intent.tipo === 'INGRESO'
      ? normalized.match(/\ben\s+(.+?)(?=\s+hoy\b|\s+ayer\b|\s+el\s+\d|$)/)?.[1]
      : undefined
    if (accountReference) {
      const account = matchEntity(accountReference, context.accounts.filter((a) => a.activa && a.tipo !== 'FONDO_DESCUENTO'))
      if (account) intent.cuentaId = account.id
      else { warnings.push(`Revisá la cuenta “${accountReference}”.`); reviewFields.push('cuenta') }
    }
  }

  if (discount) {
    intent.descuento = Number(discount[1])
    if (intent.descuento < 1 || intent.descuento > 99) return { kind: 'failure', error: 'El descuento debe estar entre 1% y 99%.' }
    if (fundReference) {
      const fund = matchEntity(fundReference[1], context.accounts.filter((a) => a.activa && a.tipo === 'FONDO_DESCUENTO'))
      if (fund) intent.fondoId = fund.id
      else { warnings.push(`Revisá el fondo “${fundReference[1]}”.`); reviewFields.push('fondo') }
    }
  }

  intent.categoria = inferCategory(trimmed)
  intent.descripcion = descriptionFrom(
    trimmed,
    amount.raw,
    intent.tipo === 'INGRESO',
    Boolean(cardReference && !cardReference[1].startsWith('descuento')),
  ) || undefined
  return { kind: 'movement', value: intent }
}
