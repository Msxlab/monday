import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { productionService } from '../services/production.service';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

const createOrderSchema = z.object({
  project_id: z.number().int().positive(),
  country: z.enum(['china', 'india', 'both']),
  estimated_arrival: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  tracking_info: z.string().optional(),
  notes: z.string().optional(),
});

const updateOrderSchema = z.object({
  order_status: z.enum(['pending_approval', 'approved', 'ordered', 'shipped', 'in_customs', 'delivered']).optional(),
  estimated_arrival: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  actual_arrival: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  tracking_info: z.string().optional(),
  notes: z.string().optional(),
});

export class ProductionController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createOrderSchema.parse(req.body);
      const order = await productionService.create(
        data as Parameters<typeof productionService.create>[0],
        req.user!.userId
      );
      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, country } = req.query as Record<string, string>;
      const result = await productionService.list({
        page: page ? parseId(page, 'page') : undefined,
        limit: limit ? parseId(limit, 'limit') : undefined,
        status: status as never,
        country: country as never,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const order = await productionService.findById(parseId(req.params.id));
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateOrderSchema.parse(req.body);
      const order = await productionService.update(
        parseId(req.params.id),
        data as Parameters<typeof productionService.update>[1],
        req.user!.userId
      );
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await productionService.getStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  async getApprovedProjects(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projects = await productionService.getApprovedProjects();
      res.json({ success: true, data: projects });
    } catch (err) {
      next(err);
    }
  }
}

export const productionController = new ProductionController();
