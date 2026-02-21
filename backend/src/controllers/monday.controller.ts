import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { mondayService } from '../services/monday.service';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

const saveConfigSchema = z.object({
  api_token: z.string().min(1, 'API token is required'),
  board_id: z.string().min(1, 'Board ID is required'),
  column_mappings: z.array(z.object({
    monday_column_id: z.string().min(1),
    local_field: z.string().min(1),
    direction: z.enum(['push', 'pull', 'both']),
  })),
  conflict_resolution: z.enum(['local_wins', 'monday_wins', 'latest_wins']).default('local_wins'),
  sync_enabled: z.boolean().default(true),
});

const testConnectionSchema = z.object({
  api_token: z.string().min(1, 'API token is required'),
});

const getBoardColumnsSchema = z.object({
  api_token: z.string().min(1),
  board_id: z.string().min(1),
});

export class MondayController {
  async getConfig(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const config = await mondayService.getConfig();
      // Mask the API token for security
      if (config) {
        config.api_token = config.api_token.replace(/./g, (c, i) => i < 8 ? c : '*');
      }
      res.json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  }

  async saveConfig(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const config = saveConfigSchema.parse(req.body);
      await mondayService.saveConfig(config, req.user!.userId);
      res.json({ success: true, message: 'Monday.com configuration saved' });
    } catch (err) {
      next(err);
    }
  }

  async testConnection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { api_token } = testConnectionSchema.parse(req.body);
      const result = await mondayService.testConnection(api_token);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getBoardColumns(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { api_token, board_id } = getBoardColumnsSchema.parse(req.body);
      const columns = await mondayService.getBoardColumns(api_token, board_id);
      res.json({ success: true, data: columns });
    } catch (err) {
      next(err);
    }
  }

  async pushProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = parseId(req.params.projectId);
      const result = await mondayService.pushProject(projectId, req.user!.userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async pullProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projectId = parseId(req.params.projectId);
      const result = await mondayService.pullProject(projectId, req.user!.userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getSyncLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const result = await mondayService.getSyncLogs(page, limit);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

export const mondayController = new MondayController();
