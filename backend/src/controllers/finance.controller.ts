import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { financeService } from '../services/finance.service';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

const upsertFinancialSchema = z.object({
  project_id: z.number().int().positive(),
  client_budget: z.number().min(0, 'Client budget cannot be negative').optional(),
  project_price: z.number().min(0, 'Project price cannot be negative').optional(),
  cost_price: z.number().min(0, 'Cost price cannot be negative').optional(),
  profit_margin: z.number().optional(),
  payment_status: z.enum(['pending', 'partial', 'paid', 'overdue']).optional(),
  invoice_details: z.string().optional(),
}).refine(
  (data) => {
    if (data.cost_price != null && data.project_price != null) {
      return data.cost_price <= data.project_price;
    }
    return true;
  },
  { message: 'Cost price cannot exceed project price', path: ['cost_price'] }
);

const updatePaymentStatusSchema = z.object({
  payment_status: z.enum(['pending', 'partial', 'paid', 'overdue']),
});

export class FinanceController {
  async getByProjectId(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = parseId(req.params.projectId);
      const data = await financeService.getByProjectId(projectId, req.user?.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async upsert(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = upsertFinancialSchema.parse(req.body);
      const data = await financeService.upsert(
        body as Parameters<typeof financeService.upsert>[0],
        req.user!.userId
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updatePaymentStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = parseId(req.params.projectId);
      const { payment_status } = updatePaymentStatusSchema.parse(req.body);
      const data = await financeService.updatePaymentStatus(
        projectId,
        payment_status,
        req.user!.userId
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await financeService.getSummary();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async listAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const data = await financeService.listAll(page, limit);
      res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }
}

export const financeController = new FinanceController();
