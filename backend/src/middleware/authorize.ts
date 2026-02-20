import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import prisma from '../utils/prisma';

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

    try {
      const override = await prisma.permissionOverride.findUnique({
        where: {
          role_field_name_resource_type: {
            role: role as never,
            field_name: action,
            resource_type: resourceType,
          },
        },
      });

      if (override) {
        if (override.can_edit || override.can_view) {
          next();
          return;
        }
        next(new ForbiddenError('Bu işlem için yetkiniz bulunmuyor'));
        return;
      }
    } catch {
      // DB hatası durumunda default role kontrolüne dön
    }

    if (!defaultRoles.includes(role)) {
      next(new ForbiddenError('Bu işlem için yetkiniz bulunmuyor'));
      return;
    }

    next();
  };
};
