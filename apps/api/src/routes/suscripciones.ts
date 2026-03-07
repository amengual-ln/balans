import { Router, Request, Response } from 'express';
import { suscripcionesService } from '../services/suscripciones.service.js';
import {
  createSuscripcionSchema,
  updateSuscripcionSchema,
  pagarSuscripcionSchema,
} from '../schemas/suscripciones.schema.js';
import { ZodError } from 'zod';

const router = Router();

const getUserId = (req: Request): string => req.headers['x-user-id'] as string;

// GET /api/suscripciones/proximos?dias=30  — must come before /:id
router.get('/proximos', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const dias = parseInt((req.query.dias as string) ?? '30', 10);
    const result = await suscripcionesService.getProximosPagos(usuarioId, isNaN(dias) ? 30 : dias);
    res.json(result);
  } catch (error) {
    console.error('Error fetching proximos pagos:', error);
    res.status(500).json({ error: 'Error al obtener próximos pagos' });
  }
});

// GET /api/suscripciones
router.get('/', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const result = await suscripcionesService.getSuscripciones(usuarioId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching suscripciones:', error);
    res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
});

// POST /api/suscripciones
router.post('/', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const data = createSuscripcionSchema.parse(req.body);
    const result = await suscripcionesService.createSuscripcion(usuarioId, data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creating suscripcion:', error);
    res.status(500).json({ error: 'Error al crear suscripción' });
  }
});

// GET /api/suscripciones/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;
    const result = await suscripcionesService.getSuscripcionById(usuarioId, id);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error fetching suscripcion:', error);
    res.status(500).json({ error: 'Error al obtener suscripción' });
  }
});

// PUT /api/suscripciones/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;
    const data = updateSuscripcionSchema.parse(req.body);
    const result = await suscripcionesService.updateSuscripcion(usuarioId, id, data);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error instanceof Error && error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error updating suscripcion:', error);
    res.status(500).json({ error: 'Error al actualizar suscripción' });
  }
});

// DELETE /api/suscripciones/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;
    await suscripcionesService.deleteSuscripcion(usuarioId, id);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('no encontrada')) {
        return res.status(404).json({ error: message });
      }
      if (message.includes('No se puede eliminar')) {
        return res.status(400).json({ error: message });
      }
    }
    console.error('Error deleting suscripcion:', error);
    res.status(500).json({ error: 'Error al eliminar suscripción' });
  }
});

// POST /api/suscripciones/:id/pagar
router.post('/:id/pagar', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;
    const data = pagarSuscripcionSchema.parse(req.body);
    const result = await suscripcionesService.pagarSuscripcion(usuarioId, id, data);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('no encontrada')) {
        return res.status(404).json({ error: message });
      }
      if (message.includes('no está activa') || message.includes('ha finalizado')) {
        return res.status(400).json({ error: message });
      }
    }
    console.error('Error paying suscripcion:', error);
    res.status(500).json({ error: 'Error al registrar pago de suscripción' });
  }
});

export default router;
