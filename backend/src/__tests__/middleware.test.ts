import request from 'supertest';
import { createTestApp } from './setup';
import { authorizeAction } from '../middleware/authorize';
import prisma from '../utils/prisma';
import { ForbiddenError } from '../utils/errors';

const app = createTestApp();

/** Helper: login and return access token */
async function getToken(email = 'admin@designertracker.com', password = 'Admin@123456'): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data?.accessToken ?? '';
}

describe('Authorization Middleware', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await getToken();
  });

  describe('Comment routes — role-based access', () => {
    it('should reject unauthenticated access to comments', async () => {
      const res = await request(app).get('/api/comments/project/1');
      expect(res.status).toBe(401);
    });

    it('should allow admin to access comments', async () => {
      const res = await request(app)
        .get('/api/comments/project/1')
        .set('Authorization', `Bearer ${adminToken}`);
      // 200 — not 401/403
      expect(res.status).toBe(200);
    });
  });

  describe('Upload routes — role-based access', () => {
    it('should reject unauthenticated access to uploads', async () => {
      const res = await request(app).get('/api/uploads/project/1');
      expect(res.status).toBe(401);
    });

    it('should allow admin to list uploads', async () => {
      const res = await request(app)
        .get('/api/uploads/project/1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Admin-only routes', () => {
    it('should reject unauthenticated access to audit logs', async () => {
      const res = await request(app).get('/api/audit-logs');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated access to settings', async () => {
      const res = await request(app).get('/api/settings/notification-rules');
      expect(res.status).toBe(401);
    });
  });
});

describe('Health Check', () => {
  it('GET /api/health should return status info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('ok');
    expect(res.body.uptime).toBeDefined();
    expect(res.body.memory).toBeDefined();
  });
});


describe('authorizeAction regression tests', () => {
  const next = jest.fn();
  const req = {
    user: { userId: 101, role: 'designer', email: 'designer@example.com' },
  } as any;

  beforeEach(() => {
    next.mockReset();
    jest.spyOn(prisma.permissionOverride, 'findUnique').mockResolvedValue(null as never);
    jest.spyOn(prisma.userPermissionOverride, 'findUnique').mockResolvedValue(null as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should deny delete action when role override only has can_edit', async () => {
    jest.spyOn(prisma.permissionOverride, 'findUnique').mockResolvedValue({ can_view: true, can_edit: true, can_delete: false } as never);

    const middleware = authorizeAction('delete', 'project', ['admin']);
    await middleware(req, {} as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('should allow action with active user override even if role override denies', async () => {
    jest.spyOn(prisma.permissionOverride, 'findUnique').mockResolvedValue({ can_view: false, can_edit: false, can_delete: false } as never);
    jest.spyOn(prisma.userPermissionOverride, 'findUnique').mockResolvedValue({
      can_view: true,
      can_edit: false,
      expires_at: new Date(Date.now() + 60_000),
    } as never);

    const middleware = authorizeAction('export_csv', 'project', ['admin']);
    await middleware(req, {} as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should ignore expired user override and fall back to default role check', async () => {
    jest.spyOn(prisma.userPermissionOverride, 'findUnique').mockResolvedValue({
      can_view: true,
      can_edit: true,
      expires_at: new Date(Date.now() - 60_000),
    } as never);

    const middleware = authorizeAction('view', 'project', ['admin']);
    await middleware(req, {} as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});
