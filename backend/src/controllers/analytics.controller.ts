import { Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { AuthRequest } from '../types';

export class AnalyticsController {
  async getOverview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const data = await analyticsService.getOverview(dateFrom, dateTo);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getDesignerPerformance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const designerId = req.query.designerId ? parseInt(req.query.designerId as string) : undefined;
      const data = await analyticsService.getDesignerPerformance(designerId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getMonthlyTrend(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const designerId = req.query.designerId ? parseInt(req.query.designerId as string) : undefined;
      const data = await analyticsService.getMonthlyTrend(designerId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getSlaStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getSlaStats();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getRevisionAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getRevisionAnalysis();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const analyticsController = new AnalyticsController();
