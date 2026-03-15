import { Router, Request, Response } from 'express';
import { inversionesService } from '../services/inversiones.service.js';
import {
  createInversionSchema,
  updateInversionSchema,
  registrarRetornoSchema,
  registrarPrecioSchema,
} from '../schemas/inversiones.schema.js';
import { ZodError } from 'zod';

const router = Router();

const getUserId = (req: Request): string => req.headers['x-user-id'] as string;

// GET /api/inversiones
router.get('/', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const result = await inversionesService.getInversiones(usuarioId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching inversiones:', error);
    res.status(500).json({ error: 'Error al obtener inversiones' });
  }
});

// POST /api/inversiones
router.post('/', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const data = createInversionSchema.parse(req.body);
    const result = await inversionesService.createInversion(usuarioId, data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating inversion:', error);
    res.status(500).json({ error: 'Error al crear inversión' });
  }
});

// POST /api/inversiones/ticker/:ticker/precio
router.post('/ticker/:ticker/precio', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { ticker } = req.params;
    const data = registrarPrecioSchema.parse(req.body);
    const result = await inversionesService.registrarPrecioByTicker(usuarioId, ticker, data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('No se encontraron')) {
        return res.status(404).json({ error: message });
      }
    }
    console.error('Error registering precio by ticker:', error);
    res.status(500).json({ error: 'Error al registrar precio de mercado' });
  }
});

// GET /api/inversiones/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;
    const result = await inversionesService.getInversionById(usuarioId, id);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error fetching inversion:', error);
    res.status(500).json({ error: 'Error al obtener inversión' });
  }
});

// PUT /api/inversiones/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;
    const data = updateInversionSchema.parse(req.body);
    const result = await inversionesService.updateInversion(usuarioId, id, data);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error instanceof Error && error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error updating inversion:', error);
    res.status(500).json({ error: 'Error al actualizar inversión' });
  }
});

// DELETE /api/inversiones/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;
    await inversionesService.deleteInversion(usuarioId, id);
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
    console.error('Error deleting inversion:', error);
    res.status(500).json({ error: 'Error al eliminar inversión' });
  }
});

// POST /api/inversiones/:id/retorno
router.post('/:id/retorno', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;
    const data = registrarRetornoSchema.parse(req.body);
    const result = await inversionesService.registrarRetorno(usuarioId, id, data);
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
    }
    console.error('Error registering retorno:', error);
    res.status(500).json({ error: 'Error al registrar retorno de inversión' });
  }
});

// POST /api/inversiones/:id/precio
router.post('/:id/precio', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;
    const data = registrarPrecioSchema.parse(req.body);
    const result = await inversionesService.registrarPrecio(usuarioId, id, data);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error instanceof Error && error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error registering precio:', error);
    res.status(500).json({ error: 'Error al registrar precio de mercado' });
  }
});

// GET /api/inversiones/:id/precio-history
router.get('/:id/precio-history', async (req: Request, res: Response) => {
  try {
    const usuarioId = getUserId(req);
    const { id } = req.params;
    const limit = parseInt((req.query.limit as string) ?? '50', 10);
    const result = await inversionesService.getPriceHistory(usuarioId, id, isNaN(limit) ? 50 : limit);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('no encontrada')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error fetching precio history:', error);
    res.status(500).json({ error: 'Error al obtener historial de precios' });
  }
});

export default router;
