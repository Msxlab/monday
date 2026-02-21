import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import prisma from '../utils/prisma';

type PermissionField = 'can_view' | 'can_edit' | 'can_delete';

const ACTION_PERMISSION_MAP: Record<string, PermissionField> = {
  view: 'can_view',
  list: 'can_view',
  read: 'can_view',
  export_csv: 'can_view',

  edit: 'can_edit',
  create: 'can_edit',
  update: 'can_edit',
  bulk_status: 'can_edit',
  bulk_update: 'can_edit',

  delete: 'can_delete',
  remove: 'can_delete',
};

const resolvePermissionField = (action: string): PermissionField => {
  return ACTION_PERMISSION_MAP[action] ?? 'can_edit';
};

const hasPermission = (
  permissionField: PermissionField,
  permission: { can_view: boolean; can_edit: boolean; can_delete?: boolean }
): boolean => {
  return Boolean(permission[permissionField]);
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError('You do not have permission to access this resource'));
      return;
    }

    next();
  };
};

export const authorizeAction = (action: string, resourceType: string, defaultRoles: UserRole[]) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const role = req.user.role;

    if (['super_admin', 'admin'].includes(role)) {
      next();
      return;
    }

    const permissionField = resolvePermissionField(action);

    try {
      const [roleOverride, userOverride] = await Promise.all([
        prisma.permissionOverride.findUnique({
          where: {
            role_field_name_resource_type: {
              role: role as never,
              field_name: action,
              resource_type: resourceType,
            },
          },
        }),
        prisma.userPermissionOverride.findUnique({
          where: {
            user_id_field_name_resource_type: {
              user_id: req.user.userId,
              field_name: action,
              resource_type: resourceType,
            },
          },
        }),
      ]);

      const now = new Date();
      const activeUserOverride = userOverride && (!userOverride.expires_at || userOverride.expires_at > now)
        ? userOverride
        : null;

      // User override takes precedence, then role override, then default role fallback.
      if (activeUserOverride) {
        if (hasPermission(permissionField, activeUserOverride)) {
          next();
          return;
        }

        next(new ForbiddenError('Bu işlem için yetkiniz bulunmuyor'));
        return;
      }

      if (roleOverride) {
        if (hasPermission(permissionField, roleOverride)) {
          next();
          return;
        }

        next(new ForbiddenError('Bu işlem için yetkiniz bulunmuyor'));
        return;
      }
    } catch (_err) {
      // Fail-closed: DB hatası durumunda erişimi reddet
      next(new ForbiddenError('Permission check failed — access denied'));
      return;
    }

    if (!defaultRoles.includes(role)) {
      next(new ForbiddenError('Bu işlem için yetkiniz bulunmuyor'));
      return;
    }

    next();
  };
};
