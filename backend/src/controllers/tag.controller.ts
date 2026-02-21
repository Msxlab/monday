import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { tagService } from '../services/tag.service';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export class TagController {
  async list(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await tagService.listTags();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createTagSchema.parse(req.body);
      const data = await tagService.createTag(body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateTagSchema.parse(req.body);
      const data = await tagService.updateTag(parseId(req.params.id), body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await tagService.deleteTag(parseId(req.params.id));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async addToProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = parseId(req.params.projectId);
      const tagId = parseId(req.params.tagId);
      const data = await tagService.addTagToProject(projectId, tagId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async removeFromProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = parseId(req.params.projectId);
      const tagId = parseId(req.params.tagId);
      const data = await tagService.removeTagFromProject(projectId, tagId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getProjectTags(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await tagService.getProjectTags(parseId(req.params.projectId));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}

export const tagController = new TagController();
