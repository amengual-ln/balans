import { Router, Request, Response } from 'express';
import { cardsService } from '../services/cards.service';
import { createCardSchema, updateCardSchema } from '../schemas/cards.schema';
import { z } from 'zod';

const router = Router();

const getUserId = (req: Request): string => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.user_id as string);
  if (!userId) throw new Error('Usuario no autenticado');
  return userId;
};

/**
 * GET /api/tarjetas
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const cards = await cardsService.getCards(usuarioId);
    res.json({ success: true, data: cards, count: cards.length });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener tarjetas',
    });
  }
});

/**
 * GET /api/tarjetas/:id/cuotas-pendientes
 * Must be defined before /:id to avoid conflict
 */
router.get('/:id/cuotas-pendientes', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const cuotas = await cardsService.getPendingInstallments(usuarioId, req.params.id);
    res.json({ success: true, data: cuotas, count: cuotas.length });
  } catch (error) {
    if (error instanceof Error && error.message === 'Tarjeta no encontrada') {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener cuotas pendientes',
    });
  }
});

/**
 * GET /api/tarjetas/:id/saldo-a-pagar
 */
router.get('/:id/saldo-a-pagar', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const saldo = await cardsService.getBalanceToPay(usuarioId, req.params.id);
    res.json({ success: true, data: saldo });
  } catch (error) {
    if (error instanceof Error && error.message === 'Tarjeta no encontrada') {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener saldo a pagar',
    });
  }
});

/**
 * GET /api/tarjetas/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const card = await cardsService.getCardById(usuarioId, req.params.id);
    res.json({ success: true, data: card });
  } catch (error) {
    if (error instanceof Error && error.message === 'Tarjeta no encontrada') {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener tarjeta',
    });
  }
});

/**
 * POST /api/tarjetas
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const data = createCardSchema.parse(req.body);
    const card = await cardsService.createCard(usuarioId, data);
    res.status(201).json({ success: true, message: 'Tarjeta creada exitosamente', data: card });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Datos inválidos', details: error.errors });
    }
    if (error instanceof Error && error.message === 'Cuenta no encontrada') {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear tarjeta',
    });
  }
});

/**
 * PUT /api/tarjetas/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const data = updateCardSchema.parse(req.body);
    const card = await cardsService.updateCard(usuarioId, req.params.id, data);
    res.json({ success: true, message: 'Tarjeta actualizada exitosamente', data: card });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Datos inválidos', details: error.errors });
    }
    if (error instanceof Error && error.message === 'Tarjeta no encontrada') {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar tarjeta',
    });
  }
});

/**
 * DELETE /api/tarjetas/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const result = await cardsService.deleteCard(usuarioId, req.params.id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    if (error instanceof Error && error.message === 'Tarjeta no encontrada') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error instanceof Error && error.message.includes('No se puede eliminar')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar tarjeta',
    });
  }
});

export default router;
