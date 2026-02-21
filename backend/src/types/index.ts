import { UserRole } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload {
  userId: number;
  email: string;
  role: UserRole;
  companyId: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type RoleHierarchy = Record<UserRole, number>;

export const ROLE_HIERARCHY: RoleHierarchy = {
  super_admin: 100,
  admin: 80,
  senior_designer: 40,
  designer: 20,
  production: 20,
};
