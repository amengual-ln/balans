import { Router, Request, Response } from 'express';
import { debtsService } from '../services/debts.service';
import {
  createDebtSchema,
  updateDebtSchema,
  payDebtSchema,
} from '../schemas/debts.schema';
import { ZodError } from 'zod';

const router = Router();

const getUserId = (req: Request): string => {
  return req.headers['x-user-id'] as string;
};

// GET /api/deudas - Get all debts for user
router.get('/', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const direccion = req.query.direccion as string | undefined;

    const debts = await debtsService.getDebts(usuarioId, direccion);
    res.json(debts);
  } catch (error) {
    console.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Error al obtener deudas' });
  }
});

// POST /api/deudas - Create a new debt
router.post('/', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const data = createDebtSchema.parse(req.body);

    const debt = await debtsService.createDebt(usuarioId, data);
    res.status(201).json(debt);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creating debt:', error);
    res.status(500).json({ error: 'Error al crear deuda' });
  }
});

// POST /api/deudas/:id/pagar - Pay a debt (works for both POR_PAGAR and POR_COBRAR)
router.post('/:id/pagar', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;
    const data = payDebtSchema.parse(req.body);

    const result = await debtsService.payDebt(usuarioId, id, data);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('Deuda no encontrada')) {
        return res.status(404).json({ error: message });
      }
      if (
        message.includes('no puede exceder') ||
        message.includes('insuficiente') ||
        message.includes('saldada') ||
        message.includes('no está activa')
      ) {
        return res.status(400).json({ error: message });
      }
    }
    console.error('Error paying debt:', error);
    res.status(500).json({ error: 'Error al procesar pago de deuda' });
  }
});

// GET /api/deudas/:id - Get a specific debt
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;

    const debt = await debtsService.getDebtById(usuarioId, id);
    res.json(debt);
  } catch (error) {
    if (error instanceof Error && error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error fetching debt:', error);
    res.status(500).json({ error: 'Error al obtener deuda' });
  }
});

// PUT /api/deudas/:id - Update a debt
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;
    const data = updateDebtSchema.parse(req.body);

    const debt = await debtsService.updateDebt(usuarioId, id, data);
    res.json(debt);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('Deuda no encontrada')) {
        return res.status(404).json({ error: message });
      }
      if (message.includes('saldada')) {
        return res.status(400).json({ error: message });
      }
    }
    console.error('Error updating debt:', error);
    res.status(500).json({ error: 'Error al actualizar deuda' });
  }
});

// DELETE /api/deudas/:id - Delete a debt
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;

    await debtsService.deleteDebt(usuarioId, id);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('Deuda no encontrada')) {
        return res.status(404).json({ error: message });
      }
      if (message.includes('No se puede eliminar')) {
        return res.status(400).json({ error: message });
      }
    }
    console.error('Error deleting debt:', error);
    res.status(500).json({ error: 'Error al eliminar deuda' });
  }
});

export default router;
