const request = require('supertest'); 
const express = require('express');
const router = require('../routes/deals'); 
const db = require('../db'); 

jest.mock('../db'); 

describe('Deals API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Mock socket.io instance
    const fakeIO = { emit: jest.fn(), to: () => ({ emit: jest.fn() }) };
    app.set('io', fakeIO);

    app.use('/api/deals', router);
  });

  describe('GET /api/deals', () => {
    it('should return a list of active deals on success', async () => {
      const mockDeals = [
        {
          product_id: 1,
          product_name: 'iPhone',
          image_path: 'images/iphone.jpg',
          price: 1000,
          deal_percentage: 10,
          deal_start_date: '2024-01-01T00:00:00.000Z',
          deal_end_date: '2025-12-31T23:59:59.000Z',
          location_name: 'Downtown',
          supermarket_name: 'SuperMart',
          location_id: 1,
          deal_price: 900,
        },
      ];

      db.query.mockResolvedValueOnce([mockDeals]);

      const res = await request(app).get('/api/deals');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockDeals);
    });

    it('should return 500 if there is a DB error', async () => {
      db.query.mockRejectedValueOnce(new Error('DB Error'));

      const res = await request(app).get('/api/deals');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to fetch deals');
    });
  });
});
