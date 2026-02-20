import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { JwtPayload } from '../types';
import { UnauthorizedError, AppError, NotFoundError } from '../utils/errors';
import { createAuditLog } from '../utils/audit';

function parseDeviceInfo(userAgent?: string): string {
  if (!userAgent) return 'Unknown Device';
  if (/mobile/i.test(userAgent)) {
    if (/android/i.test(userAgent)) return 'Android Mobile';
    if (/iphone/i.test(userAgent)) return 'iPhone';
    return 'Mobile Device';
  }
  if (/ipad/i.test(userAgent)) return 'iPad';
  if (/windows/i.test(userAgent)) {
    if (/edg/i.test(userAgent)) return 'Windows — Edge';
    if (/chrome/i.test(userAgent)) return 'Windows — Chrome';
    if (/firefox/i.test(userAgent)) return 'Windows — Firefox';
    return 'Windows Browser';
  }
  if (/macintosh/i.test(userAgent)) {
    if (/chrome/i.test(userAgent)) return 'macOS — Chrome';
    if (/safari/i.test(userAgent)) return 'macOS — Safari';
    return 'macOS Browser';
  }
  if (/linux/i.test(userAgent)) return 'Linux Browser';
  return 'Unknown Browser';
}

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export class AuthService {
  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.is_active) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // DB-based lockout check
    if (user.locked_until && user.locked_until > new Date()) {
      const minutesLeft = Math.ceil((user.locked_until.getTime() - Date.now()) / 60000);
      throw new AppError(`Account locked. Try again in ${minutesLeft} minutes.`, 423);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const newCount = user.failed_login_count + 1;
      const updateData: Record<string, unknown> = { failed_login_count: newCount };

      if (newCount >= MAX_FAILED_ATTEMPTS) {
        updateData.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS);
        logger.warn(`Account locked: ${email} after ${newCount} failed attempts`);
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });

      await createAuditLog({
        userId: user.id,
        action: 'login_failed',
        resourceType: 'auth',
        ipAddress,
        userAgent,
      });

      const remaining = MAX_FAILED_ATTEMPTS - newCount;
      if (remaining > 0) {
        throw new UnauthorizedError(`Invalid email or password. ${remaining} attempts remaining.`);
      }
      throw new AppError('Account locked due to too many failed attempts. Try again in 15 minutes.', 423);
    }

    // Reset failed attempts on successful login
    if (user.failed_login_count > 0 || user.locked_until) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failed_login_count: 0, locked_until: null },
      });
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        user_id: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        device_info: parseDeviceInfo(userAgent),
        ip_address: ipAddress ?? null,
        last_used_at: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      action: 'login_success',
      resourceType: 'auth',
      ipAddress,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshTokenStr: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenStr },
      include: { user: true },
    });

    if (!stored || stored.expires_at < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (!stored.user.is_active) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Carry over device info from old token before deleting
    const deviceInfo = stored.device_info;
    const storedIpAddress = stored.ip_address;

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const accessToken = this.generateAccessToken(stored.user);
    const newRefreshToken = this.generateRefreshToken(stored.user);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        user_id: stored.user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        device_info: deviceInfo,
        ip_address: storedIpAddress,
        last_used_at: new Date(),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshTokenStr: string, userId?: number) {
    try {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshTokenStr },
      });

      if (userId) {
        await createAuditLog({
          userId,
          action: 'logout',
          resourceType: 'auth',
        });
      }
    } catch (error) {
      logger.error('Logout error', { error });
    }
  }

  async logoutAll(userId: number) {
    await prisma.refreshToken.deleteMany({
      where: { user_id: userId },
    });

    await createAuditLog({
      userId,
      action: 'logout_all',
      resourceType: 'auth',
    });
  }

  async getSessions(userId: number) {
    return prisma.refreshToken.findMany({
      where: { user_id: userId, expires_at: { gt: new Date() } },
      orderBy: { last_used_at: 'desc' },
      select: {
        id: true,
        device_info: true,
        ip_address: true,
        last_used_at: true,
        created_at: true,
        expires_at: true,
      },
    });
  }

  async getAllSessionsForAdmin(targetUserId: number) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, first_name: true, last_name: true, email: true, role: true },
    });
    if (!user) throw new NotFoundError('User not found');
    const sessions = await this.getSessions(targetUserId);
    return { user, sessions };
  }

  async revokeSession(sessionId: number, requestingUserId: number, requestingRole: string) {
    const session = await prisma.refreshToken.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError('Session not found');

    if (session.user_id !== requestingUserId && requestingRole !== 'super_admin' && requestingRole !== 'admin') {
      throw new AppError('You cannot revoke another user\'s session', 403);
    }

    await prisma.refreshToken.delete({ where: { id: sessionId } });

    await createAuditLog({
      userId: requestingUserId,
      action: 'session_revoked',
      resourceType: 'auth',
      resourceId: session.user_id,
    });
  }

  async revokeOtherSessions(userId: number, currentToken: string) {
    await prisma.refreshToken.deleteMany({
      where: { user_id: userId, token: { not: currentToken } },
    });

    await createAuditLog({
      userId,
      action: 'other_sessions_revoked',
      resourceType: 'auth',
    });
  }

  async getLoginHistory(userId: number, page = 1, limit = 20, adminView = false, filterUserId?: number) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {
      resource_type: 'auth',
      action: { in: ['login_success', 'login_failed'] },
    };

    if (!adminView || filterUserId) {
      where.user_id = filterUserId ?? userId;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { id: true, first_name: true, last_name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) throw new UnauthorizedError('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: newHash },
    });

    await prisma.refreshToken.deleteMany({ where: { user_id: userId } });

    await createAuditLog({
      userId,
      action: 'password_changed',
      resourceType: 'user',
      resourceId: userId,
    });
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  private generateAccessToken(user: { id: number; email: string; role: string }): string {
    const secret = process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_EXPIRES_IN || '15m';

    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role } as JwtPayload,
      secret,
      { expiresIn }
    );
  }

  private generateRefreshToken(user: { id: number; email: string; role: string }): string {
    const secret = process.env.JWT_REFRESH_SECRET!;
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role } as JwtPayload,
      secret,
      { expiresIn }
    );
  }
}

export const authService = new AuthService();
