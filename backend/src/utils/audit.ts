import prisma from './prisma';
import logger from './logger';

interface AuditParams {
  userId?: number;
  companyId?: number;
  action: string;
  resourceType: string;
  resourceId?: number;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    let companyId = params.companyId;
    if (!companyId && params.userId) {
      const user = await prisma.user.findUnique({ where: { id: params.userId }, select: { active_company_id: true, company_id: true } });
      companyId = user?.active_company_id ?? user?.company_id;
    }

    if (!companyId) {
      logger.warn('Skipping audit log without tenant context', { params });
      return;
    }

    await prisma.auditLog.create({
      data: {
        company_id: companyId,
        user_id: params.userId,
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        old_value: params.oldValue ? JSON.parse(JSON.stringify(params.oldValue)) : undefined,
        new_value: params.newValue ? JSON.parse(JSON.stringify(params.newValue)) : undefined,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log', { error, params });
  }
}
