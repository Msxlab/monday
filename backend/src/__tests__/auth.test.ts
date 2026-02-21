import request from 'supertest';
import { createTestApp } from './setup';

const app = createTestApp();

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    it('should reject empty body with 400', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: '123456' });
      expect(res.status).toBe(400);
    });

    it('should reject non-existent user with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexist@test.com', password: 'SomePass1!' });
      expect(res.status).toBe(401);
    });

    it('should login with valid seed credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@designertracker.com', password: 'Admin@123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('super_admin');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reject weak password (no uppercase)', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'fake-token', password: 'weakpass1!' });
      expect(res.status).toBe(400);
    });

    it('should reject weak password (no special char)', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'fake-token', password: 'WeakPass1' });
      expect(res.status).toBe(400);
    });

    it('should reject weak password (no number)', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'fake-token', password: 'WeakPass!' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return user data with valid token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@designertracker.com', password: 'Admin@123456' });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin@designertracker.com');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should always return success (no email enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
