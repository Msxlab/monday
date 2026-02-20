import prisma from '../utils/prisma';

interface ListAuditParams {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
}

function buildWhere(params: ListAuditParams) {
  const where: Record<string, unknown> = {};
  if (params.action) where.action = { contains: params.action };
  if (params.resource) where.resource_type = params.resource;
  if (params.userId) where.user_id = params.userId;
  if (params.dateFrom || params.dateTo) {
    const created_at: Record<string, Date> = {};
    if (params.dateFrom) created_at.gte = new Date(params.dateFrom);
    if (params.dateTo) {
      const to = new Date(params.dateTo);
      to.setHours(23, 59, 59, 999);
      created_at.lte = to;
    }
    where.created_at = created_at;
  }
  return where;
}

export class AuditService {
  async list(params: ListAuditParams) {
    const page = params.page || 1;
    const limit = params.limit || 30;
    const skip = (page - 1) * limit;
    const where = buildWhere(params);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { id: true, first_name: true, last_name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async exportCsv(params: ListAuditParams) {
    const where = buildWhere(params);
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 10000,
      include: {
        user: { select: { id: true, first_name: true, last_name: true, email: true, role: true } },
      },
    });

    const headers = ['ID', 'Tarih', 'Kullanıcı', 'E-posta', 'Rol', 'İşlem', 'Kaynak Tipi', 'Kaynak ID', 'IP Adresi'];
    const rows = logs.map((log) => [
      log.id,
      new Date(log.created_at).toLocaleString('tr-TR'),
      log.user ? `${log.user.first_name} ${log.user.last_name}` : '-',
      log.user?.email ?? '-',
      log.user?.role ?? '-',
      log.action,
      log.resource_type,
      log.resource_id ?? '',
      log.ip_address ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    return '\uFEFF' + [headers.join(','), ...rows].join('\n');
  }
}

export const auditService = new AuditService();
