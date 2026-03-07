import { Router, Request, Response } from 'express';
import { movementsService } from '../services/movements.service.js';
import {
  quickAddMovementSchema,
  createIncomeSchema,
  createExpenseSchema,
  createTransferSchema,
  createCardPurchaseSchema,
  createCardPaymentSchema,
  getMovementsQuerySchema,
  expenseWithDiscountSchema,
} from '../schemas/movements.schema.js';
import { z } from 'zod';

const router = Router();

/**
 * Middleware to extract user ID from request
 * In production, this should come from authenticated JWT token
 */
const getUserId = (req: Request): string => {
  const userId = req.headers['x-user-id'] as string || req.query.user_id as string;

  if (!userId) {
    throw new Error('Usuario no autenticado');
  }

  return userId;
};

/**
 * POST /api/movements/quick
 * Quick add movement (minimal fields, optimized for QuickAdd component)
 * Automatically uses last used account if not specified
 */
router.post('/quick', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);

    // Validate request body
    const data = quickAddMovementSchema.parse(req.body);

    const movimiento = await movementsService.quickAddMovement(usuarioId, data);

    res.status(201).json({
      success: true,
      message: 'Movimiento registrado exitosamente',
      data: movimiento,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes('Saldo insuficiente') ||
        error.message.includes('cuenta inactiva') ||
        error.message.includes('No hay cuentas activas'))
    ) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear movimiento',
    });
  }
});

/**
 * POST /api/movements/income
 * Create income movement
 */
router.post('/income', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);

    // Validate request body
    const data = createIncomeSchema.parse(req.body);

    const movimiento = await movementsService.createIncome(usuarioId, data);

    res.status(201).json({
      success: true,
      message: 'Ingreso registrado exitosamente',
      data: movimiento,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes('Cuenta no encontrada') ||
        error.message.includes('cuenta inactiva') ||
        error.message.includes('tasa de conversión'))
    ) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear ingreso',
    });
  }
});

/**
 * POST /api/movements/expense
 * Create expense movement
 */
router.post('/expense', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);

    // Validate request body
    const data = createExpenseSchema.parse(req.body);

    const movimiento = await movementsService.createExpense(usuarioId, data);

    res.status(201).json({
      success: true,
      message: 'Gasto registrado exitosamente',
      data: movimiento,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes('Saldo insuficiente') ||
        error.message.includes('Cuenta no encontrada') ||
        error.message.includes('cuenta inactiva') ||
        error.message.includes('tasa de conversión'))
    ) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear gasto',
    });
  }
});

/**
 * POST /api/movements/expense-with-discount
 * Create a split expense: personal payment + discount fund subsidy.
 * Atomically creates:
 *  - GASTO_CON_DESCUENTO from cuenta_pago_id
 *  - SUBSIDIO from fondo_descuento_id
 * Both linked via movimiento_relacionado_id.
 */
router.post('/expense-with-discount', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);

    const data = expenseWithDiscountSchema.parse(req.body);

    const result = await movementsService.createExpenseWithDiscount(usuarioId, data);

    res.status(201).json({
      success: true,
      message: 'Gasto con descuento registrado exitosamente',
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes('Saldo insuficiente') ||
        error.message.includes('no encontrada') ||
        error.message.includes('inactiva') ||
        error.message.includes('fondo de descuento'))
    ) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar gasto con descuento',
    });
  }
});

/**
 * POST /api/movements/compra-tarjeta
 * Create installment card purchase (RN-004)
 */
router.post('/compra-tarjeta', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const data = createCardPurchaseSchema.parse(req.body);
    const result = await movementsService.createCardPurchase(usuarioId, data);
    res.status(201).json({
      success: true,
      message: 'Compra en tarjeta registrada exitosamente',
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Datos inválidos', details: error.errors });
    }
    if (
      error instanceof Error &&
      (error.message === 'Tarjeta no encontrada' ||
        error.message.includes('Límite de crédito insuficiente') ||
        error.message.includes('inactiva'))
    ) {
      const status = error.message === 'Tarjeta no encontrada' ? 404 : 400;
      return res.status(status).json({ success: false, error: error.message });
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar compra en tarjeta',
    });
  }
});

/**
 * POST /api/movements/pago-tarjeta
 * Create card payment, FIFO clearing of installments (RN-005)
 */
router.post('/pago-tarjeta', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const data = createCardPaymentSchema.parse(req.body);
    const result = await movementsService.createCardPayment(usuarioId, data);
    res.status(201).json({
      success: true,
      message: 'Pago de tarjeta registrado exitosamente',
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Datos inválidos', details: error.errors });
    }
    if (
      error instanceof Error &&
      (error.message === 'Tarjeta no encontrada' ||
        error.message.includes('Saldo insuficiente') ||
        error.message.includes('inactiva'))
    ) {
      const status = error.message === 'Tarjeta no encontrada' ? 404 : 400;
      return res.status(status).json({ success: false, error: error.message });
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al registrar pago de tarjeta',
    });
  }
});

/**
 * POST /api/movements/transfer
 * Create transfer movement between accounts
 * Creates two linked movements
 */
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);

    // Validate request body
    const data = createTransferSchema.parse(req.body);

    const result = await movementsService.createTransfer(usuarioId, data);

    res.status(201).json({
      success: true,
      message: 'Transferencia registrada exitosamente',
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes('Saldo insuficiente') ||
        error.message.includes('Cuenta no encontrada') ||
        error.message.includes('cuenta inactiva') ||
        error.message.includes('misma cuenta') ||
        error.message.includes('tasa de conversión'))
    ) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear transferencia',
    });
  }
});

/**
 * GET /api/movements
 * Get movements with filters and pagination
 * Query params: desde, hasta, tipo, cuenta_id, categoria, limit, offset
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);

    // Validate query parameters
    const query = getMovementsQuerySchema.parse(req.query);

    const result = await movementsService.getMovements(usuarioId, query);

    res.json({
      success: true,
      data: result.movimientos,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros de consulta inválidos',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener movimientos',
    });
  }
});

/**
 * GET /api/movements/stats
 * Get movement statistics for a date range
 * Query params: desde, hasta
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);

    const desde = req.query.desde ? new Date(req.query.desde as string) : undefined;
    const hasta = req.query.hasta ? new Date(req.query.hasta as string) : undefined;

    const stats = await movementsService.getMovementStats(usuarioId, desde, hasta);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener estadísticas',
    });
  }
});

/**
 * GET /api/movements/:id
 * Get single movement by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;

    const movimiento = await movementsService.getMovements(usuarioId, {
      limit: 1,
      offset: 0,
    });

    // Find the specific movement
    const found = movimiento.movimientos.find((m) => m.id === id);

    if (!found) {
      return res.status(404).json({
        success: false,
        error: 'Movimiento no encontrado',
      });
    }

    res.json({
      success: true,
      data: found,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener movimiento',
    });
  }
});

/**
 * DELETE /api/movements/:id
 * Delete movement and reverse balance changes
 * Cannot delete movements that are part of installment purchases
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;

    const result = await movementsService.deleteMovement(id, usuarioId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Movimiento no encontrado') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes('No se puede eliminar') ||
        error.message.includes('No se pueden eliminar') ||
        error.message.includes('compra en cuotas') ||
        error.message.includes('cuotas ya pagadas') ||
        error.message.includes('AJUSTE'))
    ) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar movimiento',
    });
  }
});

export default router;
