import { z } from 'zod';

// Enum for movement types matching Prisma schema
export const TipoMovimientoSchema = z.enum([
  'INGRESO',
  'GASTO',
  'TRANSFERENCIA',
  'PAGO_TARJETA',
  'GASTO_TARJETA',
  'PAGO_DEUDA',
  'INVERSION',
  'RETORNO_INVERSION',
  'AJUSTE',
  'INGRESO_INICIAL',
  'GASTO_CON_DESCUENTO',
  'SUBSIDIO',
]);

// Common currency codes
const VALID_CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU'] as const;

// Base movement schema with common fields
const baseMovementSchema = z.object({
  monto: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .pipe(z.number().positive('El monto debe ser mayor a 0')),
  descripcion: z
    .string()
    .min(1, 'La descripción es requerida')
    .max(200, 'La descripción no puede exceder 200 caracteres')
    .trim(),
  categoria: z.string().max(50).optional(),
  fecha: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .optional()
    .default(() => new Date()),
});

// Quick add schema (minimal fields for QuickAdd component)
export const quickAddMovementSchema = z.object({
  tipo: z.enum(['INGRESO', 'GASTO']),
  monto: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .pipe(z.number().positive('El monto debe ser mayor a 0')),
  categoria: z.string().max(50).optional(),
  cuenta_id: z.string().uuid('ID de cuenta inválido').optional(),
  descripcion: z.string().max(200).trim().optional(),
  fecha: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .optional()
    .default(() => new Date()),
});

// Income movement schema
export const createIncomeSchema = baseMovementSchema.extend({
  cuenta_id: z.string().uuid('ID de cuenta inválido'),
  moneda: z.enum(VALID_CURRENCIES).optional(), // If not provided, use account currency
  tasa_conversion: z.number().positive().optional(), // For multi-currency
});

// Expense movement schema
export const createExpenseSchema = baseMovementSchema.extend({
  cuenta_id: z.string().uuid('ID de cuenta inválido'),
  moneda: z.enum(VALID_CURRENCIES).optional(),
  tasa_conversion: z.number().positive().optional(),
});

// Transfer movement schema
export const createTransferSchema = z.object({
  cuenta_origen_id: z.string().uuid('ID de cuenta origen inválido'),
  cuenta_destino_id: z.string().uuid('ID de cuenta destino inválido'),
  monto: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .pipe(z.number().positive('El monto debe ser mayor a 0')),
  descripcion: z.string().max(200).trim().optional(),
  fecha: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .optional()
    .default(() => new Date()),
  tasa_conversion: z.number().positive().optional(),
});

// Card purchase schema
export const createCardPurchaseSchema = baseMovementSchema.extend({
  tarjeta_id: z.string().uuid('ID de tarjeta inválido'),
  moneda: z.enum(VALID_CURRENCIES).optional(),
  tasa_conversion: z.number().positive().optional(),
  cantidad_cuotas: z.number().int().min(1).max(60).optional(), // For installments
});

// Card payment schema
export const createCardPaymentSchema = baseMovementSchema.extend({
  cuenta_id: z.string().uuid('ID de cuenta inválido'),
  tarjeta_id: z.string().uuid('ID de tarjeta inválido'),
  moneda: z.enum(VALID_CURRENCIES).optional(),
  tasa_conversion: z.number().positive().optional(),
});

// Debt payment schema
export const createDebtPaymentSchema = baseMovementSchema.extend({
  cuenta_id: z.string().uuid('ID de cuenta inválido'),
  deuda_id: z.string().uuid('ID de deuda inválido'),
  moneda: z.enum(VALID_CURRENCIES).optional(),
  tasa_conversion: z.number().positive().optional(),
});

// Investment movement schema
export const createInvestmentSchema = baseMovementSchema.extend({
  cuenta_id: z.string().uuid('ID de cuenta inválido'),
  moneda: z.enum(VALID_CURRENCIES).optional(),
  tasa_conversion: z.number().positive().optional(),
});

// Investment return schema
export const createInvestmentReturnSchema = baseMovementSchema.extend({
  cuenta_id: z.string().uuid('ID de cuenta inválido'),
  moneda: z.enum(VALID_CURRENCIES).optional(),
  tasa_conversion: z.number().positive().optional(),
});

// Query filters for GET /api/movements
export const getMovementsQuerySchema = z.object({
  desde: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .transform((val) => new Date(val))
    .optional(),
  hasta: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .transform((val) => new Date(val))
    .optional(),
  tipo: TipoMovimientoSchema.optional(),
  cuenta_id: z.string().uuid().optional(),
  categoria: z.string().optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(1000))
    .optional()
    .default(() => 100),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().nonnegative())
    .optional()
    .default(() => 0),
});

// Expense-with-discount schema
// Creates two linked movements: GASTO_CON_DESCUENTO (from payment account)
// and SUBSIDIO (from discount fund account), atomically.
export const expenseWithDiscountSchema = z.object({
  monto_total: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .pipe(z.number().positive('El monto total debe ser mayor a 0')),
  porcentaje_descuento: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .pipe(z.number().min(1, 'El porcentaje debe ser al menos 1').max(99, 'El porcentaje no puede superar 99')),
  cuenta_pago_id: z.string().uuid('ID de cuenta de pago inválido'),
  fondo_descuento_id: z.string().uuid('ID de fondo de descuento inválido'),
  categoria: z.string().max(50).optional(),
  descripcion: z.string().max(200).trim().optional(),
  fecha: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .optional()
    .default(() => new Date()),
});

// Type exports
export type QuickAddMovementInput = z.infer<typeof quickAddMovementSchema>;
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type CreateCardPurchaseInput = z.infer<typeof createCardPurchaseSchema>;
export type CreateCardPaymentInput = z.infer<typeof createCardPaymentSchema>;
export type CreateDebtPaymentInput = z.infer<typeof createDebtPaymentSchema>;
export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
export type CreateInvestmentReturnInput = z.infer<typeof createInvestmentReturnSchema>;
export type GetMovementsQuery = z.infer<typeof getMovementsQuerySchema>;
export type ExpenseWithDiscountInput = z.infer<typeof expenseWithDiscountSchema>;
