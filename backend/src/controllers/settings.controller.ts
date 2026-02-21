import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { settingsService } from '../services/settings.service';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

const createNotificationRuleSchema = z.object({
  rule_name: z.string().min(1),
  rule_type: z.string().min(1),
  trigger_condition: z.string().min(1),
  threshold_value: z.number().optional(),
  threshold_unit: z.string().optional(),
  target_roles: z.string().optional(),
  channels: z.string().optional(),
  is_active: z.boolean().optional(),
});

const updateNotificationRuleSchema = z.object({
  rule_name: z.string().min(1).optional(),
  trigger_condition: z.string().optional(),
  threshold_value: z.number().optional(),
  threshold_unit: z.string().optional(),
  target_roles: z.string().optional(),
  channels: z.string().optional(),
  is_active: z.boolean().optional(),
});

const upsertWorkScheduleSchema = z.object({
  userId: z.number().int().positive().optional(),
  monday: z.boolean().optional(),
  tuesday: z.boolean().optional(),
  wednesday: z.boolean().optional(),
  thursday: z.boolean().optional(),
  friday: z.boolean().optional(),
  saturday: z.boolean().optional(),
  sunday: z.boolean().optional(),
  work_start_time: z.string().optional(),
  work_end_time: z.string().optional(),
});

const createHolidaySchema = z.object({
  country_code: z.string().min(1),
  holiday_name: z.string().min(1),
  holiday_date: z.string().min(1),
  is_recurring: z.boolean().optional(),
});

const upsertPermissionSchema = z.object({
  role: z.enum(['super_admin', 'admin', 'senior_designer', 'designer', 'production']),
  resource_type: z.string().min(1),
  field_name: z.string().min(1),
  can_view: z.boolean(),
  can_edit: z.boolean(),
  can_delete: z.boolean().optional(),
});

export class SettingsController {
  async getNotificationRules(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getNotificationRules();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async createNotificationRule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createNotificationRuleSchema.parse(req.body);
      const data = await settingsService.createNotificationRule({ ...body, createdById: req.user!.userId });
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async updateNotificationRule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateNotificationRuleSchema.parse(req.body);
      const data = await settingsService.updateNotificationRule(parseId(req.params.id), body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async deleteNotificationRule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await settingsService.deleteNotificationRule(parseId(req.params.id));
      res.json({ success: true, message: 'Rule deleted' });
    } catch (err) { next(err); }
  }

  async getWorkSchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const data = await settingsService.getWorkSchedule(userId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async upsertWorkSchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = upsertWorkScheduleSchema.parse(req.body);
      const data = await settingsService.upsertWorkSchedule(body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getHolidays(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getHolidays(req.query.country as string | undefined);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async createHoliday(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createHolidaySchema.parse(req.body);
      const data = await settingsService.createHoliday({
        country_code: body.country_code,
        holiday_name: body.holiday_name,
        holiday_date: new Date(body.holiday_date),
        is_recurring: body.is_recurring,
      });
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async deleteHoliday(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await settingsService.deleteHoliday(parseId(req.params.id));
      res.json({ success: true, message: 'Holiday deleted' });
    } catch (err) { next(err); }
  }

  async getPermissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getPermissionOverrides();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async upsertPermission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = upsertPermissionSchema.parse(req.body);
      const data = await settingsService.upsertPermissionOverride({ ...body, set_by_id: req.user!.userId });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async bulkUpsertPermissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        permissions: z.array(upsertPermissionSchema),
      });
      const { permissions } = schema.parse(req.body);
      const results = await Promise.all(
        permissions.map((p) => settingsService.upsertPermissionOverride({ ...p, set_by_id: req.user!.userId }))
      );
      res.json({ success: true, data: results });
    } catch (err) { next(err); }
  }
}

export const settingsController = new SettingsController();
