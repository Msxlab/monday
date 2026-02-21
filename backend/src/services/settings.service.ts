import prisma from '../utils/prisma';
import { NotFoundError } from '../utils/errors';
import { createAuditLog } from '../utils/audit';
import { clearPermissionCache } from '../utils/permissions';

export class SettingsService {
  async getNotificationRules() {
    return prisma.notificationRule.findMany({
      orderBy: { created_at: 'asc' },
      include: { created_by: { select: { id: true, first_name: true, last_name: true } } },
    });
  }

  async createNotificationRule(data: {
    rule_name: string;
    rule_type: string;
    trigger_condition: string;
    threshold_value?: number;
    threshold_unit?: string;
    target_roles?: string;
    channels?: string;
    is_active?: boolean;
    createdById: number;
  }) {
    return prisma.notificationRule.create({
      data: {
        rule_name: data.rule_name,
        rule_type: data.rule_type,
        trigger_condition: data.trigger_condition,
        threshold_value: data.threshold_value,
        threshold_unit: data.threshold_unit,
        target_roles: data.target_roles,
        channels: data.channels ?? 'in_app',
        is_active: data.is_active ?? true,
        created_by_id: data.createdById,
      },
    });
  }

  async updateNotificationRule(
    id: number,
    data: Partial<{
      rule_name: string;
      trigger_condition: string;
      threshold_value: number;
      threshold_unit: string;
      target_roles: string;
      channels: string;
      is_active: boolean;
    }>
  ) {
    const rule = await prisma.notificationRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundError('Notification rule not found');
    return prisma.notificationRule.update({ where: { id }, data });
  }

  async deleteNotificationRule(id: number) {
    const rule = await prisma.notificationRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundError('Notification rule not found');
    return prisma.notificationRule.delete({ where: { id } });
  }

  async getWorkSchedule(userId?: number) {
    const where = userId ? { user_id: userId } : { user_id: null };
    return prisma.workSchedule.findFirst({ where });
  }

  async upsertWorkSchedule(data: {
    userId?: number;
    monday?: boolean;
    tuesday?: boolean;
    wednesday?: boolean;
    thursday?: boolean;
    friday?: boolean;
    saturday?: boolean;
    sunday?: boolean;
    work_start_time?: string;
    work_end_time?: string;
  }) {
    const where = data.userId
      ? { user_id: data.userId }
      : { user_id: null as number | null };

    const existing = await prisma.workSchedule.findFirst({ where });
    const scheduleData = {
      monday: data.monday ?? true,
      tuesday: data.tuesday ?? true,
      wednesday: data.wednesday ?? true,
      thursday: data.thursday ?? true,
      friday: data.friday ?? true,
      saturday: data.saturday ?? false,
      sunday: data.sunday ?? false,
      work_start_time: data.work_start_time ?? '09:00',
      work_end_time: data.work_end_time ?? '18:00',
    };

    if (existing) {
      return prisma.workSchedule.update({ where: { id: existing.id }, data: scheduleData });
    }
    return prisma.workSchedule.create({
      data: { ...scheduleData, user_id: data.userId ?? null },
    });
  }

  async getHolidays(countryCode?: string) {
    const where: Record<string, unknown> = {};
    if (countryCode) where.country_code = countryCode;
    return prisma.publicHoliday.findMany({
      where,
      orderBy: { holiday_date: 'asc' },
    });
  }

  async createHoliday(data: {
    country_code: string;
    holiday_name: string;
    holiday_date: Date;
    is_recurring?: boolean;
  }) {
    return prisma.publicHoliday.create({ data });
  }

  async deleteHoliday(id: number) {
    const h = await prisma.publicHoliday.findUnique({ where: { id } });
    if (!h) throw new NotFoundError('Holiday not found');
    return prisma.publicHoliday.delete({ where: { id } });
  }

  async getPermissionOverrides() {
    return prisma.permissionOverride.findMany({
      orderBy: [{ role: 'asc' }, { resource_type: 'asc' }, { field_name: 'asc' }],
    });
  }

  async upsertPermissionOverride(data: {
    role: string;
    field_name: string;
    resource_type: string;
    can_view: boolean;
    can_edit: boolean;
    can_delete?: boolean;
    set_by_id: number;
  }) {
    // Edit→View cascade: if can_edit is true, can_view must also be true
    const can_view = data.can_edit ? true : data.can_view;
    const can_edit = !data.can_view ? false : data.can_edit;
    const can_delete = data.can_delete ?? false;

    const existing = await prisma.permissionOverride.findUnique({
      where: {
        role_field_name_resource_type: {
          role: data.role as never,
          field_name: data.field_name,
          resource_type: data.resource_type,
        },
      },
    });

    const result = await prisma.permissionOverride.upsert({
      where: {
        role_field_name_resource_type: {
          role: data.role as never,
          field_name: data.field_name,
          resource_type: data.resource_type,
        },
      },
      update: { can_view, can_edit, can_delete, set_by_id: data.set_by_id },
      create: {
        role: data.role as never,
        field_name: data.field_name,
        resource_type: data.resource_type,
        can_view,
        can_edit,
        can_delete,
        set_by_id: data.set_by_id,
      },
    });

    // Audit trail
    await createAuditLog({
      userId: data.set_by_id,
      action: 'permission_override_changed',
      resourceType: 'permission_override',
      resourceId: result.id,
      oldValue: existing ? { can_view: existing.can_view, can_edit: existing.can_edit, can_delete: existing.can_delete } : null,
      newValue: { role: data.role, resource_type: data.resource_type, field_name: data.field_name, can_view, can_edit, can_delete },
    });

    // Clear permission cache so changes take effect immediately
    clearPermissionCache();

    return result;
  }
}

export const settingsService = new SettingsService();
