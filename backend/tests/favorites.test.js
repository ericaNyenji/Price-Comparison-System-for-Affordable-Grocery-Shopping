const request = require('supertest');
const express = require('express');
const router = require('../routes/favorites');
const db = require('../db');

jest.mock('../db');

describe('Favorites API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/favorites', router);
  });

  describe('GET /api/favorites/user/:userId', () => {
    it('should return favorites for a user', async () => {
      const mockFavorites = [
        { user_id: 1, product_id: 101, price_id: 5001 },
        { user_id: 1, product_id: 102, price_id: 5002 }
      ];
      db.query.mockResolvedValueOnce([mockFavorites]);

      const res = await request(app).get('/api/favorites/user/1');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should handle DB errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('DB error'));
      const res = await request(app).get('/api/favorites/user/1');

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/favorites', () => {
    it('should add a new favorite', async () => {
      db.query
        .mockResolvedValueOnce([[]]) // No existing favorite
        .mockResolvedValueOnce([{ insertId: 999 }]); // Inserted successfully

      const res = await request(app)
        .post('/api/favorites')
        .send({ userId: 1, productId: 101, priceId: 5001 });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(999);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app).post('/api/favorites').send({ userId: 1 });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should not add duplicate favorite', async () => {
      db.query.mockResolvedValueOnce([
        [{ user_id: 1, product_id: 101, price_id: 5001 }]
      ]);

      const res = await request(app)
        .post('/api/favorites')
        .send({ userId: 1, productId: 101, priceId: 5001 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('This price is already in favorites');
    });

    it('should handle DB errors on insert', async () => {
      db.query
        .mockResolvedValueOnce([[]]) // No existing
        .mockRejectedValueOnce(new Error('Insert error'));

      const res = await request(app)
        .post('/api/favorites')
        .send({ userId: 1, productId: 101, priceId: 5001 });

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/favorites/:productId', () => {
    it('should delete a favorite successfully', async () => {
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app).delete('/api/favorites/101?userId=1&priceId=5001');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 if favorite not found', async () => {
      db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const res = await request(app).delete('/api/favorites/101?userId=1&priceId=9999');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if userId or priceId missing', async () => {
      const res = await request(app).delete('/api/favorites/101');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle DB error on delete', async () => {
      db.query.mockRejectedValueOnce(new Error('Delete failed'));

      const res = await request(app).delete('/api/favorites/101?userId=1&priceId=5001');

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
