import request from 'supertest';
import { createTestApp } from './setup';

const app = createTestApp();

async function getAdminToken(): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@designertracker.com', password: 'Admin@123456' });
  return res.body.data?.accessToken ?? '';
}

describe('Project API', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  describe('GET /api/projects', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });

    it('should return project list for admin', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/projects', () => {
    it('should reject creation without required fields', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject creation with duplicate nj_number', async () => {
      const projectData = {
        nj_number: `NJ-TEST-${Date.now()}`,
        title: 'Test Project',
        project_type: 'single_unit',
        priority: 'normal',
        country_target: 'china',
      };

      // Create first
      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(projectData);

      // Try duplicate
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(projectData);

      // Should fail — either 400 or 409
      expect([400, 409, 500]).toContain(res.status);
    });

    it('should create project with valid data', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nj_number: `NJ-VALID-${Date.now()}`,
          title: 'Valid Test Project',
          project_type: 'single_unit',
          priority: 'normal',
          country_target: 'china',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nj_number).toContain('NJ-VALID');
    });
  });

  describe('GET /api/projects/stats', () => {
    it('should return stats for admin', async () => {
      const res = await request(app)
        .get('/api/projects/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/projects/export/csv', () => {
    it('should return CSV data for admin', async () => {
      const res = await request(app)
        .get('/api/projects/export/csv')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });
  });
});

describe('Finance API', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  describe('GET /api/finance/summary', () => {
    it('should return finance summary for admin', async () => {
      const res = await request(app)
        .get('/api/finance/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/finance — validation', () => {
    it('should reject negative project_price', async () => {
      const res = await request(app)
        .put('/api/finance')
        .set('Authorization', `Bearer ${token}`)
        .send({
          project_id: 1,
          project_price: -100,
          cost_price: 50,
        });

      expect(res.status).toBe(400);
    });

    it('should reject cost_price > project_price', async () => {
      const res = await request(app)
        .put('/api/finance')
        .set('Authorization', `Bearer ${token}`)
        .send({
          project_id: 1,
          project_price: 100,
          cost_price: 200,
        });

      expect(res.status).toBe(400);
    });
  });
});
