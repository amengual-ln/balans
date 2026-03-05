import { z } from 'zod';

const VALID_CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU'] as const;

export const createCardSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  tipo: z.enum(['VISA', 'MASTERCARD', 'OTRA'], {
    errorMap: () => ({ message: 'Tipo inválido' }),
  }),
  cuenta_id: z.string().uuid('ID de cuenta inválido'),
  limite_total: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .pipe(z.number().positive('El límite debe ser mayor a 0')),
  moneda: z.enum(VALID_CURRENCIES).optional().default('ARS'),
  dia_cierre: z.number().int().min(1).max(31),
  dia_vencimiento: z.number().int().min(1).max(31),
});

export const updateCardSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100)
    .trim()
    .optional(),
  activa: z.boolean().optional(),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
