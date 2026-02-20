import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { commentService } from '../services/comment.service';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

export const createCommentSchema = z.object({
  project_id: z.number().int().positive(),
  content: z.string().min(1, 'Comment content is required'),
  is_internal: z.boolean().optional(),
});

export class CommentController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createCommentSchema.parse(req.body);
      const comment = await commentService.create(data, req.user!.userId, req.user!.role);
      res.status(201).json({ success: true, data: comment });
    } catch (err) {
      next(err);
    }
  }

  async listByProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = parseId(req.params.projectId);
      const page = req.query.page ? parseId(req.query.page as string, 'page') : 1;
      const limit = req.query.limit ? parseId(req.query.limit as string, 'limit') : 50;

      const result = await commentService.listByProject(projectId, req.user!.role, req.user!.userId, page, limit);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const result = await commentService.delete(id, req.user!.userId, req.user!.role);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

export const commentController = new CommentController();
