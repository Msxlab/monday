import { PrismaClient } from '@prisma/client';
import logger from './logger';
import { getTenantCompanyId } from './tenant-context';

const TENANT_MODELS = new Set([
  'User',
  'Project',
  'Leave',
  'Notification',
  'ProductionOrder',
  'AuditLog',
]);

const rawClient = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
});

const prisma = rawClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const companyId = getTenantCompanyId();

        if (!model || !companyId || !TENANT_MODELS.has(model)) {
          return query(args);
        }

        if (operation === 'create') {
          args.data = { ...(args.data || {}), company_id: companyId };
          return query(args);
        }

        if (operation === 'createMany') {
          const data = Array.isArray(args.data) ? args.data : [args.data];
          args.data = data.map((item) => ({ ...item, company_id: companyId }));
          return query(args);
        }

        if (['findMany', 'findFirst', 'count', 'updateMany', 'deleteMany', 'aggregate'].includes(operation)) {
          args.where = { ...(args.where || {}), company_id: companyId };
          return query(args);
        }

        return query(args);
      },
    },
  },
});

rawClient.$on('error', (e) => {
  logger.error('Prisma error', { message: e.message });
});

if (process.env.NODE_ENV === 'development') {
  rawClient.$on('query', (e) => {
    logger.debug('Prisma query', {
      query: e.query,
      duration: `${e.duration}ms`,
    });
  });
}

export default prisma;
