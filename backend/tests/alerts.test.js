const request = require('supertest');
const express = require('express');
const alertsModule = require('../routes/alerts'); 
const db = require('../db');
const jwt = require('jsonwebtoken');

jest.mock('../db');
jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/alerts', alertsModule.router);

describe('Alerts API', () => {
  const token = 'valid.token.here';
  const decodedUser = { userId: 1, role: 'customer' };

  beforeEach(() => {
    jwt.verify.mockImplementation(() => decodedUser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /alerts/:userId', () => {
    it('should fetch alerts for a user', async () => {
      db.query.mockResolvedValueOnce([[
        { alert_id: 1, message: 'Test alert', product_name: 'Apple', location_name: 'Store A' }
      ]]);

      const res = await request(app).get('/alerts/1');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([
        expect.objectContaining({ message: 'Test alert' })
      ]);
    });

    it('should return 500 if db query fails', async () => {
      db.query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app).get('/alerts/1');
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /alerts/:alertId/read', () => {
    it('should mark an alert as read', async () => {
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .put('/alerts/10/read')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Alert marked as read');
    });

    it('should return 401 for missing token', async () => {
      const res = await request(app).put('/alerts/10/read');
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for expired token', async () => {
      jwt.verify.mockImplementation(() => { throw { name: 'TokenExpiredError' }; });

      const res = await request(app)
        .put('/alerts/10/read')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Token expired');
    });
  });

  describe('DELETE /alerts/:alertId', () => {
    it('should delete an alert', async () => {
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .delete('/alerts/10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Alert deleted');
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app).delete('/alerts/10');
      expect(res.statusCode).toBe(401);
    });

    it('should handle db deletion error', async () => {
      db.query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .delete('/alerts/10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });
});
