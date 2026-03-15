import { z } from 'zod';

const VALID_CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU'] as const;
const VALID_TIPOS = ['PLAZO_FIJO', 'BONOS', 'ACCIONES', 'CRYPTO', 'FCI', 'OTRO'] as const;
const VALID_LIQUIDEZ = ['INMEDIATA', 'DIAS', 'EXTERIOR'] as const;

export const createInversionSchema = z.object({
  cuenta_id: z.string().uuid('La cuenta es requerida'),
  ticker: z.string().min(1, 'El ticker es requerido').max(20).trim(),
  nombre: z.string().max(100).trim().optional().nullable(),
  sector: z.string().max(50).trim().optional().nullable(),
  monto_total: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive('El monto debe ser positivo')),
  tipo: z.enum(VALID_TIPOS, { errorMap: () => ({ message: 'Tipo de inversión inválido' }) }),
  tipo_liquidez: z.enum(VALID_LIQUIDEZ).default('INMEDIATA'),
  cantidad: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive()).optional().nullable(),
  precio_por_unidad: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive()).optional().nullable(),
  moneda: z.enum(VALID_CURRENCIES).default('ARS'),
  fecha_inicio: z.string().or(z.date()).transform(val => new Date(val)),
});

export const updateInversionSchema = z.object({
  ticker: z.string().min(1).max(20).trim().optional(),
  nombre: z.string().max(100).trim().optional().nullable(),
  sector: z.string().max(50).trim().optional().nullable(),
  tipo: z.enum(VALID_TIPOS).optional(),
  tipo_liquidez: z.enum(VALID_LIQUIDEZ).optional(),
  cantidad: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive()).optional().nullable(),
  precio_por_unidad: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive()).optional().nullable(),
});

export const registrarRetornoSchema = z.object({
  cantidad_vendida: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive('Debe ser positivo')),
  precio_venta: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive('Debe ser positivo')),
  cuenta_destino_id: z.string().uuid('La cuenta destino es requerida'),
  fecha: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  descripcion: z.string().max(200).trim().optional(),
});

export const registrarPrecioSchema = z.object({
  precio: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive('El precio debe ser positivo')),
  fecha: z.string().or(z.date()).transform(val => new Date(val)).optional(),
});

export type CreateInversionInput = z.infer<typeof createInversionSchema>;
export type UpdateInversionInput = z.infer<typeof updateInversionSchema>;
export type RegistrarRetornoInput = z.infer<typeof registrarRetornoSchema>;
export type RegistrarPrecioInput = z.infer<typeof registrarPrecioSchema>;
