import { Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';
import { AuthRequest } from '../types';

export class AuditController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, action, resource, userId, dateFrom, dateTo } = req.query as Record<string, string>;
      const result = await auditService.list({
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        action,
        resource,
        userId: userId ? parseInt(userId) : undefined,
        dateFrom,
        dateTo,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async exportCsv(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { action, resource, userId, dateFrom, dateTo } = req.query as Record<string, string>;
      const csv = await auditService.exportCsv({
        action,
        resource,
        userId: userId ? parseInt(userId) : undefined,
        dateFrom,
        dateTo,
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=audit-log-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
