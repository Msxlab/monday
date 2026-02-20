import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { projectService } from '../services/project.service';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

export const createProjectSchema = z.object({
  nj_number: z.string().min(1, 'NJ number required'),
  title: z.string().min(1, 'Title required'),
  project_type: z.enum(['single_unit', 'multi_unit', 'drawing', 'revision']).optional(),
  assigned_designer_id: z.number().int().optional(),
  priority: z.enum(['normal', 'urgent', 'critical']).optional(),
  start_date: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  deadline: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  estimated_finish_date: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  country_target: z.enum(['china', 'india', 'both']).optional(),
  notes: z.string().optional(),
  admin_notes: z.string().optional(),
});

export const updateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  project_type: z.enum(['single_unit', 'multi_unit', 'drawing', 'revision']).optional(),
  assigned_designer_id: z.number().int().optional(),
  priority: z.enum(['normal', 'urgent', 'critical']).optional(),
  status: z.enum(['new', 'designing', 'revision', 'review', 'approved', 'in_production', 'done', 'cancelled', 'blocked']).optional(),
  start_date: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  deadline: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  estimated_finish_date: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  country_target: z.enum(['china', 'india', 'both']).optional(),
  notes: z.string().optional(),
  admin_notes: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['new', 'designing', 'revision', 'review', 'approved', 'in_production', 'done', 'cancelled', 'blocked']),
  reason: z.string().optional(),
});

export class ProjectController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createProjectSchema.parse(req.body);
      const project = await projectService.create(
        data as Parameters<typeof projectService.create>[0],
        req.user!.userId,
        req.user!.role
      );

      res.status(201).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const project = await projectService.findById(id, req.user!.role, req.user!.userId);

      res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const params = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        status: req.query.status as string | undefined,
        priority: req.query.priority as string | undefined,
        assigned_designer_id: req.query.designer_id
          ? parseInt(req.query.designer_id as string, 10)
          : undefined,
        search: req.query.search as string | undefined,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const result = await projectService.list(
        params as Parameters<typeof projectService.list>[0],
        req.user!.role,
        req.user!.userId
      );

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const data = updateProjectSchema.parse(req.body);
      const project = await projectService.update(
        id,
        data as Parameters<typeof projectService.update>[1],
        req.user!.userId,
        req.user!.role
      );

      res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const { status, reason } = updateStatusSchema.parse(req.body);

      const project = await projectService.updateStatus(
        id,
        status,
        req.user!.userId,
        req.user!.role,
        reason
      );

      res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await projectService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async clone(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const { new_nj_number } = z.object({ new_nj_number: z.string().min(1, 'NJ number required') }).parse(req.body);
      const project = await projectService.clone(id, new_nj_number, req.user!.userId, req.user!.role);
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  async exportCsv(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await projectService.list(
        { limit: 10000 },
        req.user!.role,
        req.user!.userId
      );
      const projects = result.data as Record<string, unknown>[];

      const headers = ['NJ Number', 'Title', 'Status', 'Priority', 'Designer', 'Deadline', 'Created At'];
      const rows = projects.map((p) => {
        const designer = p.assigned_designer as { first_name: string; last_name: string } | null;
        return [
          p.nj_number,
          `"${String(p.title ?? '').replace(/"/g, '""')}"`,
          p.status,
          p.priority,
          designer ? `${designer.first_name} ${designer.last_name}` : '',
          p.deadline ? new Date(p.deadline as string).toLocaleDateString('tr-TR') : '',
          p.created_at ? new Date(p.created_at as string).toLocaleDateString('tr-TR') : '',
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=projects-${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\uFEFF' + csv);
    } catch (error) {
      next(error);
    }
  }

  async bulkUpdateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { ids, status } = z.object({
        ids: z.array(z.number().int().positive()).min(1),
        status: z.enum(['new', 'designing', 'revision', 'review', 'approved', 'in_production', 'done', 'cancelled', 'blocked']),
      }).parse(req.body);

      await projectService.bulkUpdateStatus(ids, status, req.user!.userId);
      res.json({ success: true, message: `${ids.length} proje güncellendi` });
    } catch (error) {
      next(error);
    }
  }

  async bulkCancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { ids } = z.object({ ids: z.array(z.number().int().positive()).min(1) }).parse(req.body);
      await projectService.bulkCancel(ids, req.user!.userId);
      res.json({ success: true, message: `${ids.length} proje iptal edildi` });
    } catch (error) {
      next(error);
    }
  }

  async requestDeadlineExtension(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { requested_date, reason } = z.object({
        requested_date: z.string().datetime(),
        reason: z.string().min(1),
      }).parse(req.body);

      await projectService.requestDeadlineExtension(
        parseId(req.params.id),
        new Date(requested_date),
        reason,
        req.user!.userId,
        req.user!.role
      );
      res.json({ success: true, message: 'Deadline uzatma talebi gönderildi' });
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
