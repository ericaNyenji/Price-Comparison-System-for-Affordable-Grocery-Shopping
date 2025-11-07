const request = require('supertest');
const express = require('express');
const router = require('../routes/reviews').router;
const db = require('../db');
const jwt = require('jsonwebtoken');

jest.mock('../db'); // Mock the db module

describe('Reviews API', () => {
  let app;
  let token;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/reviews', router);
    token = jwt.sign({ userId: 1, role: 'customer' }, process.env.JWT_SECRET_KEY || 'defaultSecretKey');
  });

  // Test: Fetch reviews for a product at a specific location
  it('should fetch reviews for a product at a specific location', async () => {
    const mockReviews = [
      { review_id: 1, customer_name: 'John Doe', location_name: 'SuperMart Downtown', rating: 4, comment: 'Good product!' },
      { review_id: 2, customer_name: 'Jane Doe', location_name: 'SuperMart Downtown', rating: 5, comment: 'Excellent!' }
    ];

    db.query.mockResolvedValueOnce([mockReviews]); // Mock the db query to return mock reviews

    const response = await request(app)
      .get('/api/reviews/product/1/location/1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockReviews);
  });

  
  it('should return 401 if token is missing when creating a review', async () => {
    const response = await request(app)
      .post('/api/reviews')
      .send({
        product_id: 1,
        location_id: 1,
        rating: 4,
        comment: 'Good product!'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Access token is required');
  });

 
  it('should return 403 if the user is not authorized to delete the review', async () => {
    const anotherUserToken = jwt.sign({ userId: 2, role: 'customer' }, process.env.JWT_SECRET_KEY || 'defaultSecretKey');

    db.query.mockResolvedValueOnce([{ review_id: 1, customer_id: 1 }]); // Simulate a review that belongs to user with ID 1

    const response = await request(app)
      .delete('/api/reviews/1')
      .set('Authorization', `Bearer ${anotherUserToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Not authorized to delete this review');
  });

  

  // Test: Return 401 if token is expired
  it('should return 401 if token is expired when creating a review', async () => {
    const expiredToken = jwt.sign({ userId: 1, role: 'customer' }, process.env.JWT_SECRET_KEY || 'defaultSecretKey', { expiresIn: '1ms' });

    const response = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${expiredToken}`)
      .send({
        product_id: 1,
        location_id: 1,
        rating: 4,
        comment: 'Good product!'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Token expired');
    expect(response.body.message).toBe('Please log in again');
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test to prevent data pollution
  });
});
