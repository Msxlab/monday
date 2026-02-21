import { NextFunction, Request, Response } from 'express';
import { runWithTenantContext } from '../utils/tenant-context';

export const tenantContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  runWithTenantContext(() => next());
};
