import { z } from 'zod';

const VALID_CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU'] as const;
const VALID_FRECUENCIAS = ['SEMANAL', 'QUINCENAL', 'MENSUAL', 'TRIMESTRAL', 'ANUAL'] as const;

export const createSuscripcionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100).trim(),
  descripcion: z.string().max(300).trim().optional().nullable(),
  monto: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive('El monto debe ser positivo')),
  moneda: z.enum(VALID_CURRENCIES).default('ARS'),
  cuenta_id: z.string().uuid('La cuenta es requerida'),
  frecuencia: z.enum(VALID_FRECUENCIAS, { errorMap: () => ({ message: 'Frecuencia inválida' }) }),
  dia_pago: z.number().int().min(1).max(31),
  fecha_inicio: z.string().or(z.date()).transform(val => new Date(val)),
  fecha_fin: z.string().or(z.date()).transform(val => new Date(val)).optional().nullable(),
  proxima_fecha_pago: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  activo: z.boolean().default(true),
  categoria: z.string().max(100).trim().optional().nullable(),
});

export const updateSuscripcionSchema = z.object({
  nombre: z.string().min(1).max(100).trim().optional(),
  descripcion: z.string().max(300).trim().optional().nullable(),
  monto: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive()).optional(),
  moneda: z.enum(VALID_CURRENCIES).optional(),
  cuenta_id: z.string().uuid().optional(),
  frecuencia: z.enum(VALID_FRECUENCIAS).optional(),
  dia_pago: z.number().int().min(1).max(31).optional(),
  fecha_inicio: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  fecha_fin: z.string().or(z.date()).transform(val => new Date(val)).optional().nullable(),
  activo: z.boolean().optional(),
  categoria: z.string().max(100).trim().optional().nullable(),
});

export const pagarSuscripcionSchema = z.object({
  cuenta_id: z.string().uuid('La cuenta es requerida'),
  monto: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive()).optional(),
  fecha: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  descripcion: z.string().max(200).trim().optional(),
});

export type CreateSuscripcionInput = z.infer<typeof createSuscripcionSchema>;
export type UpdateSuscripcionInput = z.infer<typeof updateSuscripcionSchema>;
export type PagarSuscripcionInput = z.infer<typeof pagarSuscripcionSchema>;
