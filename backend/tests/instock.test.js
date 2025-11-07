const request = require('supertest');
const express = require('express');
const router = require('../routes/instock');
const db = require('../db');

jest.mock('../db');

describe('Instock API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/instock', router);
  });

  describe('GET /api/instock', () => {
    it('should return products for a valid locationId', async () => {
      const mockData = [
        {
          product_id: 1,
          product_name: 'Product A',
          image_path: '/images/a.jpg',
          category_id: 10,
          category_name: 'Category X',
          price: 9.99
        },
        {
          product_id: 2,
          product_name: 'Product B',
          image_path: '/images/b.jpg',
          category_id: 11,
          category_name: 'Category Y',
          price: 14.99
        }
      ];

      db.query.mockResolvedValueOnce([mockData]);

      const res = await request(app).get('/api/instock?locationId=123');

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toEqual(mockData);
    });

    it('should return 400 if locationId is missing', async () => {
      const res = await request(app).get('/api/instock');

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('locationId is required');
    });

    it('should return 500 on database error', async () => {
      db.query.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).get('/api/instock?locationId=999');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });
});
