const request = require('supertest');
const express = require('express');
const router = require('../routes/products');
const db = require('../db');

jest.mock('../db');

describe('Products API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/products', router);
  });

  describe('GET /api/products/:id', () => {
    it('should return product details with price and deal info', async () => {
      const mockProduct = [{
        product_id: 1,
        product_name: 'Test Product',
        price: 100,
        on_deal: 1
      }];

      const mockDeal = [{
        deal_percentage: 20,
        deal_end_date: '2025-05-01'
      }];

      db.query
        .mockResolvedValueOnce([mockProduct]) 
        .mockResolvedValueOnce([mockDeal]);   

      const response = await request(app).get('/api/products/1?locationId=101');

      expect(response.status).toBe(200);
      expect(response.body.data.product_name).toBe('Test Product');
      expect(response.body.data.deal.deal_price).toBe(80);
    });

    it('should return 404 if product is not found', async () => {
      db.query.mockResolvedValueOnce([[]]); 

      const response = await request(app).get('/api/products/999?locationId=101');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Product not found');
    });

    it('should return 500 on database error', async () => {
      db.query.mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app).get('/api/products/1?locationId=101');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error');
    });
  });


  describe('GET /api/products', () => {
    it('should return a list of products', async () => {
      const products = [
        { product_id: 1, product_name: 'Product A' },
        { product_id: 2, product_name: 'Product B' }
      ];
      db.query.mockResolvedValueOnce([products]);

      const response = await request(app).get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].product_name).toBe('Product A');
    });

    it('should return 500 if database fails', async () => {
      db.query.mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app).get('/api/products');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch products');
    });
  });
});
