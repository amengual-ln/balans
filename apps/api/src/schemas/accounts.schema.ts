import { z } from 'zod';

// Enum for account types matching Prisma schema
export const TipoCuentaSchema = z.enum(['BANCO', 'BILLETERA', 'BROKER', 'EFECTIVO', 'FONDO_DESCUENTO']);

// Common currency codes
const VALID_CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU'] as const;

export const createAccountSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  tipo: TipoCuentaSchema,
  moneda: z.enum(VALID_CURRENCIES, {
    errorMap: () => ({ message: 'Moneda no válida' }),
  }),
  saldo_inicial: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .pipe(z.number().nonnegative('El saldo inicial debe ser mayor o igual a 0'))
    .optional()
    .default(0),
  activa: z.boolean().optional().default(true),
});

export const updateAccountSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
  activa: z.boolean().optional(),
  // Note: moneda cannot be changed if account has movements (validated in service)
});

export const adjustBalanceSchema = z.object({
  nuevo_saldo: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .pipe(z.number().nonnegative('El saldo debe ser mayor o igual a 0')),
  descripcion: z
    .string()
    .min(1, 'La descripción del ajuste es requerida')
    .max(200, 'La descripción no puede exceder 200 caracteres')
    .trim(),
});

export const getAccountsQuerySchema = z.object({
  activa: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  tipo: TipoCuentaSchema.optional(),
});

// Type exports for use in controllers/services
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type AdjustBalanceInput = z.infer<typeof adjustBalanceSchema>;
export type GetAccountsQuery = z.infer<typeof getAccountsQuerySchema>;
