import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { subtaskService } from '../services/subtask.service';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

const createSubtaskSchema = z.object({
  title: z.string().min(1).max(255),
  assigned_to_id: z.number().int().positive().optional(),
  sort_order: z.number().int().min(0).optional(),
});

const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  is_completed: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  assigned_to_id: z.number().int().positive().nullable().optional(),
});

const reorderSchema = z.object({
  ordered_ids: z.array(z.number().int().positive()),
});

export class SubtaskController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await subtaskService.listByProject(parseId(req.params.projectId));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createSubtaskSchema.parse(req.body);
      const data = await subtaskService.create({
        project_id: parseId(req.params.projectId),
        ...body,
      });
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSubtaskSchema.parse(req.body);
      const data = await subtaskService.update(parseId(req.params.id), body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await subtaskService.delete(parseId(req.params.id));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async reorder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { ordered_ids } = reorderSchema.parse(req.body);
      const data = await subtaskService.reorder(parseId(req.params.projectId), ordered_ids);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async progress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await subtaskService.getProgress(parseId(req.params.projectId));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}

export const subtaskController = new SubtaskController();
