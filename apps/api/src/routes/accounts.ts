import { Router, Request, Response } from 'express';
import { accountsService } from '../services/accounts.service';
import {
  createAccountSchema,
  updateAccountSchema,
  adjustBalanceSchema,
  getAccountsQuerySchema,
  recargarFondoSchema,
} from '../schemas/accounts.schema';
import { z } from 'zod';

const router = Router();

/**
 * Middleware to extract user ID from request
 * In production, this should come from authenticated JWT token
 * For now, we'll use a header or query parameter
 */
const getUserId = (req: Request): string => {
  // TODO: Replace with actual JWT token extraction
  const userId = req.headers['x-user-id'] as string || req.query.user_id as string;

  if (!userId) {
    throw new Error('Usuario no autenticado');
  }

  return userId;
};

/**
 * GET /api/cuentas
 * Get all accounts for the authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);

    // Validate query parameters
    const filters = getAccountsQuerySchema.parse(req.query);

    const cuentas = await accountsService.getAccounts(usuarioId, filters);

    res.json({
      success: true,
      data: cuentas,
      count: cuentas.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de consulta inválidos',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener cuentas',
    });
  }
});

/**
 * GET /api/cuentas/:id
 * Get single account by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;

    const cuenta = await accountsService.getAccountById(id, usuarioId);

    res.json({
      success: true,
      data: cuenta,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Cuenta no encontrada') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener cuenta',
    });
  }
});

/**
 * GET /api/cuentas/:id/resumen
 * Get account summary with calculated balance and movement breakdown
 */
router.get('/:id/resumen', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;

    const resumen = await accountsService.getAccountSummary(id, usuarioId);

    res.json({
      success: true,
      data: resumen,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Cuenta no encontrada') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener resumen',
    });
  }
});

/**
 * POST /api/cuentas
 * Create a new account (CU-001)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);

    // Validate request body
    const data = createAccountSchema.parse(req.body);

    const cuenta = await accountsService.createAccount(usuarioId, data);

    res.status(201).json({
      success: true,
      message: 'Cuenta creada exitosamente',
      data: cuenta,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear cuenta',
    });
  }
});

/**
 * PUT /api/cuentas/:id
 * Update an existing account (CU-002)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;

    // Validate request body
    const data = updateAccountSchema.parse(req.body);

    const cuenta = await accountsService.updateAccount(id, usuarioId, data);

    res.json({
      success: true,
      message: 'Cuenta actualizada exitosamente',
      data: cuenta,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }

    if (error instanceof Error && error.message === 'Cuenta no encontrada') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar cuenta',
    });
  }
});

/**
 * DELETE /api/cuentas/:id
 * Delete an account (CU-003)
 * Can only delete if no movements exist
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;

    const result = await accountsService.deleteAccount(id, usuarioId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Cuenta no encontrada') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (
      error instanceof Error &&
      error.message.includes('No se puede eliminar')
    ) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar cuenta',
    });
  }
});

/**
 * POST /api/cuentas/:id/ajustar
 * Adjust account balance
 * Creates an AJUSTE movement to match the desired balance
 */
router.post('/:id/ajustar', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;

    // Validate request body
    const data = adjustBalanceSchema.parse(req.body);

    const cuenta = await accountsService.adjustBalance(id, usuarioId, data);

    res.json({
      success: true,
      message: 'Saldo ajustado exitosamente',
      data: cuenta,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }

    if (error instanceof Error && error.message === 'Cuenta no encontrada') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (
      error instanceof Error &&
      error.message.includes('cuenta inactiva')
    ) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al ajustar saldo',
    });
  }
});

/**
 * POST /api/cuentas/:id/recargar
 * Recharge discount fund (FONDO_DESCUENTO accounts only)
 * Creates an INGRESO movement with the specified amount
 */
router.post('/:id/recargar', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;

    // Validate request body
    const data = recargarFondoSchema.parse(req.body);

    const cuenta = await accountsService.recargarFondo(id, usuarioId, data.monto);

    res.json({
      success: true,
      message: 'Fondo recargado exitosamente',
      data: cuenta,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }

    if (error instanceof Error && error.message === 'Cuenta no encontrada') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes('FONDO_DESCUENTO') || error.message.includes('inactiva') || error.message.includes('monto'))
    ) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al recargar fondo',
    });
  }
});

export default router;
