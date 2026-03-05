import { z } from 'zod';

const VALID_CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU'] as const;

export const createDebtSchema = z.object({
  tipo: z.enum(['PERSONAL', 'CREDITO_BILLETERA', 'PRESTAMO', 'OTRO']),
  direccion: z.enum(['POR_PAGAR', 'POR_COBRAR']).default('POR_PAGAR'),
  acreedor: z.string().min(1, 'La contraparte es requerida').max(100).trim(),
  monto_total: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive()),
  moneda: z.enum(VALID_CURRENCIES).optional().default('ARS'),
  fecha_inicio: z.string().or(z.date()).transform(val => new Date(val)),
  cantidad_cuotas: z.number().int().positive().optional(),
  monto_cuota: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive()).optional(),
});

export const updateDebtSchema = z.object({
  acreedor: z.string().min(1).max(100).trim().optional(),
  cantidad_cuotas: z.number().int().positive().optional(),
  monto_cuota: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive()).optional(),
});

export const payDebtSchema = z.object({
  cuenta_id: z.string().uuid(),
  monto: z.number().or(z.string().transform(parseFloat)).pipe(z.number().positive()),
  fecha: z.string().or(z.date()).transform(val => new Date(val)).optional(),
  descripcion: z.string().max(200).trim().optional(),
});

export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;
export type PayDebtInput = z.infer<typeof payDebtSchema>;
