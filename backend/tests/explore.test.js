const request = require('supertest');
const express = require('express');
const router = require('../routes/explore');
const db = require('../db');

jest.mock('../db'); 

describe('GET /api/explore', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/explore', router);
  });

  it('should return categories and their associated products', async () => {
    const mockCategories = [
      { category_id: 1, category_name: 'Electronics' },
      { category_id: 2, category_name: 'Beverages' }
    ];

    const mockProducts = {
      1: [
        { product_id: 101, product_name: 'cake', image_path: 'images/cake.jpg' },
        { product_id: 102, product_name: 'potatoes', image_path: 'images/potatoes.jpg' }
      ],
      2: [
        { product_id: 201, product_name: 'Cola', image_path: 'images/cola.jpg' }
      ]
    };

    db.query
      .mockResolvedValueOnce([mockCategories]) 
      .mockResolvedValueOnce([mockProducts[1]]) 
      .mockResolvedValueOnce([mockProducts[2]]); 

    const response = await request(app).get('/api/explore');

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
    expect(response.body[0].category_name).toBe('Electronics');
    expect(response.body[0].products.length).toBe(2);
    expect(response.body[1].products[0].product_name).toBe('Cola');
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).get('/api/explore');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Server error');
  });
});
