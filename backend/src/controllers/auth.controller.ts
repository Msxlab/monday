import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../types';

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(email, password, ipAddress, userAgent);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth/refresh',
      });

      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!refreshToken) {
        res.status(401).json({ success: false, message: 'Refresh token required' });
        return;
      }

      const result = await authService.refresh(refreshToken);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth/refresh',
      });

      res.json({
        success: true,
        data: { accessToken: result.accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        await authService.logout(refreshToken, req.user?.userId);
      }

      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { default: prisma } = await import('../utils/prisma');
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          avatar_url: true,
          timezone: true,
          country_code: true,
        },
      });

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      await authService.changePassword(req.user!.userId, currentPassword, newPassword);

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sessions = await authService.getSessions(req.user!.userId);
      res.json({ success: true, data: sessions });
    } catch (error) {
      next(error);
    }
  }

  async getUserSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { parseId } = await import('../utils/parse-id');
      const targetUserId = parseId(req.params.userId);
      const result = await authService.getAllSessionsForAdmin(targetUserId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { parseId } = await import('../utils/parse-id');
      const sessionId = parseId(req.params.sessionId);
      await authService.revokeSession(sessionId, req.user!.userId, req.user!.role);
      res.json({ success: true, message: 'Session revoked' });
    } catch (error) {
      next(error);
    }
  }

  async revokeOtherSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const currentToken = req.cookies?.refreshToken || req.body?.refreshToken || '';
      await authService.revokeOtherSessions(req.user!.userId, currentToken);
      res.json({ success: true, message: 'Other sessions revoked' });
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await authService.logoutAll(req.user!.userId);
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      res.json({ success: true, message: 'All sessions terminated' });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const result = await authService.forgotPassword(email);
      res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token, password } = z.object({
        token: z.string().min(1),
        password: passwordSchema,
      }).parse(req.body);
      const result = await authService.resetPasswordWithToken(token, password);
      res.json({ success: true, message: 'Password has been reset successfully.' });
    } catch (err) {
      next(err);
    }
  }

  async getLoginHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const filterUserId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;
      const isAdmin = req.user!.role === 'super_admin' || req.user!.role === 'admin';
      const result = await authService.getLoginHistory(req.user!.userId, page, limit, isAdmin, filterUserId);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
