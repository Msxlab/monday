import { UserRole } from '@prisma/client';
import prisma from '../utils/prisma';
import { AuthService } from './auth.service';
import { AppError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../utils/audit';

interface CreateUserDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  country_code?: string;
  timezone?: string;
  max_capacity?: number;
}

interface UpdateUserDto {
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  country_code?: string;
  timezone?: string;
  max_capacity?: number;
  is_active?: boolean;
  avatar_url?: string;
  skills?: string;
}

interface ListUsersParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  is_active?: boolean;
  search?: string;
}

export class UserService {
  async create(data: CreateUserDto, createdById?: number, companyId?: number) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('Email already in use', 409);
    }

    const password_hash = await AuthService.hashPassword(data.password);

    let targetCompanyId: number | null = companyId ?? null;
    if (targetCompanyId == null && createdById) {
      const creator = await prisma.user.findUnique({ where: { id: createdById }, select: { active_company_id: true, company_id: true } });
      targetCompanyId = creator?.active_company_id ?? creator?.company_id ?? null;
    }
    if (targetCompanyId == null) {
      throw new AppError('Company context is required to create user', 400);
    }

    const user = await prisma.user.create({
      data: {
        company_id: targetCompanyId,
        active_company_id: targetCompanyId,
        email: data.email,
        password_hash,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        country_code: data.country_code,
        timezone: data.timezone || 'UTC',
        max_capacity: data.max_capacity || 5,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        country_code: true,
        timezone: true,
        max_capacity: true,
        is_active: true,
        created_at: true,
      },
    });

    await createAuditLog({
      userId: createdById,
      action: 'user_created',
      resourceType: 'user',
      resourceId: user.id,
      newValue: { email: user.email, role: user.role },
    });

    return user;
  }

  async findById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        country_code: true,
        timezone: true,
        avatar_url: true,
        max_capacity: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
        _count: {
          select: {
            assigned_projects: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async list(params: ListUsersParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.role) where.role = params.role;
    if (params.is_active !== undefined) where.is_active = params.is_active;
    if (params.search) {
      where.OR = [
        { first_name: { contains: params.search } },
        { last_name: { contains: params.search } },
        { email: { contains: params.search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          country_code: true,
          timezone: true,
          avatar_url: true,
          max_capacity: true,
          skills: true,
          is_active: true,
          last_login_at: true,
          created_at: true,
          _count: {
            select: {
              assigned_projects: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: number, data: UpdateUserDto, updatedById?: number) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    const oldValue = { role: user.role, is_active: user.is_active };

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        country_code: true,
        timezone: true,
        avatar_url: true,
        max_capacity: true,
        is_active: true,
        updated_at: true,
      },
    });

    await createAuditLog({
      userId: updatedById,
      action: 'user_updated',
      resourceType: 'user',
      resourceId: id,
      oldValue,
      newValue: data,
    });

    return updated;
  }

  async resetPassword(id: number, newPassword: string, resetById?: number) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');

    const password_hash = await AuthService.hashPassword(newPassword);
    await prisma.user.update({
      where: { id },
      data: { password_hash },
    });

    await prisma.refreshToken.deleteMany({ where: { user_id: id } });

    await createAuditLog({
      userId: resetById,
      action: 'password_reset',
      resourceType: 'user',
      resourceId: id,
    });
  }

  async softDelete(id: number, deletedById: number) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');
    if (!user.is_active) throw new AppError('User is already deactivated', 400);

    // Prevent deleting yourself
    if (id === deletedById) throw new AppError('You cannot deactivate your own account', 400);

    await prisma.$transaction(async (tx) => {
      // Deactivate user
      await tx.user.update({
        where: { id },
        data: { is_active: false },
      });

      // Revoke all sessions
      await tx.refreshToken.deleteMany({ where: { user_id: id } });

      // Unassign from active projects
      await tx.project.updateMany({
        where: { assigned_designer_id: id, status: { notIn: ['done', 'cancelled'] } },
        data: { assigned_designer_id: null },
      });
    });

    await createAuditLog({
      userId: deletedById,
      action: 'user_deactivated',
      resourceType: 'user',
      resourceId: id,
      oldValue: { is_active: true },
      newValue: { is_active: false },
    });

    return { deactivated: true };
  }

  async restore(id: number, restoredById: number) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');
    if (user.is_active) throw new AppError('User is already active', 400);

    await prisma.user.update({
      where: { id },
      data: { is_active: true },
    });

    await createAuditLog({
      userId: restoredById,
      action: 'user_reactivated',
      resourceType: 'user',
      resourceId: id,
      oldValue: { is_active: false },
      newValue: { is_active: true },
    });

    return { restored: true };
  }

  async getDesigners() {
    return prisma.user.findMany({
      where: {
        role: { in: ['designer', 'senior_designer'] },
        is_active: true,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        role: true,
        avatar_url: true,
        max_capacity: true,
        _count: {
          select: {
            assigned_projects: {
              where: {
                status: { notIn: ['done', 'cancelled'] },
              },
            },
          },
        },
      },
      orderBy: { first_name: 'asc' },
    });
  }
}

export const userService = new UserService();
