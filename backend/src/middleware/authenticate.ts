import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload } from '../types';
import { UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';
import prisma from '../utils/prisma';
import { setTenantCompanyId } from '../utils/tenant-context';

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token required');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      logger.error('JWT_SECRET is not defined');
      throw new UnauthorizedError('Server configuration error');
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Token revocation check: verify user is still active and not locked
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { is_active: true, locked_until: true, company_id: true, active_company_id: true },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedError('Account is deactivated');
    }

    if (user.locked_until && user.locked_until > new Date()) {
      throw new UnauthorizedError('Account is locked');
    }

    const effectiveCompanyId = user.active_company_id ?? user.company_id;
    if (decoded.companyId !== effectiveCompanyId) {
      throw new UnauthorizedError('Token tenant is invalid');
    }

    setTenantCompanyId(decoded.companyId);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid or expired token'));
      return;
    }
    next(error);
  }
};
