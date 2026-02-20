import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { userService } from '../services/user.service';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

const updateProfileSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  avatar_url: z.string().url().optional(),
  timezone: z.string().optional(),
  country_code: z.string().optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(['super_admin', 'admin', 'senior_designer', 'designer', 'production']),
  country_code: z.string().optional(),
  timezone: z.string().optional(),
  max_capacity: z.number().int().min(1).max(20).optional(),
});

const updateUserSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: z.enum(['super_admin', 'admin', 'senior_designer', 'designer', 'production']).optional(),
  country_code: z.string().optional(),
  timezone: z.string().optional(),
  max_capacity: z.number().int().min(1).max(20).optional(),
  is_active: z.boolean().optional(),
  avatar_url: z.string().url().optional(),
  skills: z.string().optional(),
});

export class UserController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createUserSchema.parse(req.body);
      const user = await userService.create(data, req.user!.userId);

      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const user = await userService.findById(id);

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const params = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        role: req.query.role as string | undefined,
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
        search: req.query.search as string | undefined,
      };

      const result = await userService.list(params as Parameters<typeof userService.list>[0]);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const data = updateUserSchema.parse(req.body);
      const user = await userService.update(id, data, req.user!.userId);

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseId(req.params.id);
      const { password } = z.object({ password: z.string().min(8) }).parse(req.body);

      await userService.resetPassword(id, password, req.user!.userId);
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateProfileSchema.parse(req.body);
      const user = await userService.update(req.user!.userId, data, req.user!.userId);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async getDesigners(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const designers = await userService.getDesigners();
      res.json({ success: true, data: designers });
    } catch (error) {
      next(error);
    }
  }

  async uploadAvatar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const { default: prisma } = await import('../utils/prisma');
      const path = await import('path');
      const fs = await import('fs');

      const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { avatar_url: true } });
      if (user?.avatar_url && user.avatar_url.startsWith('/uploads/avatars/')) {
        const oldPath = path.join(__dirname, '..', '..', user.avatar_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const updated = await prisma.user.update({
        where: { id: req.user!.userId },
        data: { avatar_url: avatarUrl },
        select: { id: true, avatar_url: true },
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
