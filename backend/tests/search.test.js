const request = require('supertest');  
const express = require('express');
const router = require('../routes/search'); 
const db = require('../db'); 

jest.mock('../db'); 

describe('GET /api/search', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/search', router); 
  });

  it('should return a list of products matching the query', async () => {
    const mockProducts = [
      {
        product_id: 1,
        product_name: "Milk (1 liter)",
        image_path: "/images/milk.jpg",
        supermarket_name: "Aldi",
        location_name: "Nyugati pályaudvar",
        price: 400,
        last_updated: "2025-04-30",
        on_deal: true,
        distance: 2.5
      },
      {
        product_id: 2,
        product_name: "Bread (1 loaf)",
        image_path: "/images/bread.jpg",
        supermarket_name: "Lidl",
        location_name: "Kossuth Lajos tér",
        price: 150,
        last_updated: "2025-04-30",
        on_deal: false,
        distance: 1.0
      }
    ];

    db.query.mockResolvedValueOnce([mockProducts]); 

    const response = await request(app)
      .get('/api/search')
      .query({ query: 'milk' });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(mockProducts);
    expect(response.body.data.length).toBe(2);
    expect(response.body.data[0].product_name).toBe('Milk (1 liter)');
  });

  it('should return a 500 error if there is a database error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    db.query.mockRejectedValueOnce(new Error('Database error')); 

    const response = await request(app).get('/api/search').query({ query: 'milk' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal server error');

    consoleSpy.mockRestore(); 
  });

  it('should return a filtered list of products based on supermarket type', async () => {
    const mockProducts = [
      {
        product_id: 1,
        product_name: "Milk (1 liter)",
        image_path: "/images/milk.jpg",
        supermarket_name: "Aldi",
        location_name: "Nyugati pályaudvar",
        price: 400,
        last_updated: "2025-04-30",
        on_deal: true,
        distance: 2.5
      }
    ];

    db.query.mockResolvedValueOnce([mockProducts]); 

    const response = await request(app)
      .get('/api/search')
      .query({ query: 'milk', supermarketType: '1' });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(mockProducts);
    expect(response.body.data[0].supermarket_name).toBe('Aldi');
  });

  it('should return a filtered list of products within a specific radius', async () => {
    const mockProducts = [
      {
        product_id: 1,
        product_name: "Milk (1 liter)",
        image_path: "/images/milk.jpg",
        supermarket_name: "Aldi",
        location_name: "Nyugati pályaudvar",
        price: 400,
        last_updated: "2025-04-30",
        on_deal: true,
        distance: 2.5
      }
    ];

    db.query.mockResolvedValueOnce([mockProducts]); 

    const response = await request(app)
      .get('/api/search')
      .query({ query: 'milk', lat: '47.4979', lng: '19.0402', radius: '5' }); 

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(mockProducts);
    expect(response.body.data[0].distance).toBeLessThanOrEqual(5);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test to prevent data pollution
  });
});
