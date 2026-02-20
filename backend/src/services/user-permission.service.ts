import prisma from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

export class UserPermissionService {
  async listByUser(userId: number) {
    return prisma.userPermissionOverride.findMany({
      where: { user_id: userId },
      include: {
        set_by: { select: { id: true, first_name: true, last_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async upsert(data: {
    user_id: number;
    field_name: string;
    resource_type: string;
    can_view: boolean;
    can_edit: boolean;
    expires_at?: string | null;
    reason?: string;
    set_by_id: number;
  }) {
    return prisma.userPermissionOverride.upsert({
      where: {
        user_id_field_name_resource_type: {
          user_id: data.user_id,
          field_name: data.field_name,
          resource_type: data.resource_type,
        },
      },
      create: {
        user_id: data.user_id,
        field_name: data.field_name,
        resource_type: data.resource_type,
        can_view: data.can_view,
        can_edit: data.can_edit,
        expires_at: data.expires_at ? new Date(data.expires_at) : null,
        reason: data.reason,
        set_by_id: data.set_by_id,
      },
      update: {
        can_view: data.can_view,
        can_edit: data.can_edit,
        expires_at: data.expires_at ? new Date(data.expires_at) : null,
        reason: data.reason,
        set_by_id: data.set_by_id,
      },
    });
  }

  async delete(id: number) {
    const override = await prisma.userPermissionOverride.findUnique({ where: { id } });
    if (!override) throw new NotFoundError('Override not found');
    await prisma.userPermissionOverride.delete({ where: { id } });
    return { message: 'Override deleted' };
  }

  async listAll() {
    return prisma.userPermissionOverride.findMany({
      include: {
        user: { select: { id: true, first_name: true, last_name: true, role: true, email: true } },
        set_by: { select: { id: true, first_name: true, last_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}

export const userPermissionService = new UserPermissionService();
