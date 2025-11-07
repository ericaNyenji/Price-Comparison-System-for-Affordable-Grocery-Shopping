const request = require('supertest');
const express = require('express');
const router = require('../routes/users'); 
const db = require('../db');
const jwt = require('jsonwebtoken');

jest.mock('../db');
jest.mock('jsonwebtoken');

describe('GET /api/users/:id', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/users', router);
  });

  it('should return user data for owner role with valid token', async () => {
    const mockUserId = 1;
    const token = 'validToken';
    const decodedToken = { userId: mockUserId, role: 'owner' };

    jwt.verify.mockReturnValue(decodedToken);
    const mockUserData = [{
      user_id: mockUserId,
      username: 'owneruser',
      email: 'owner@example.com',
      location: 'Downtown Branch'
    }];
    db.query.mockResolvedValueOnce([mockUserData]);

    const response = await request(app)
      .get(`/api/users/${mockUserId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(mockUserData[0]);
    expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
  });

  it('should return user data for customer role with valid token', async () => {
    const mockUserId = 2;
    const token = 'validCustomerToken';
    const decodedToken = { userId: mockUserId, role: 'customer' };

    jwt.verify.mockReturnValue(decodedToken);
    const mockCustomerData = [{
      user_id: mockUserId,
      username: 'customeruser',
      email: 'customer@example.com'
    }];
    db.query.mockResolvedValueOnce([mockCustomerData]);

    const response = await request(app)
      .get(`/api/users/${mockUserId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(mockCustomerData[0]);
  });

  it('should return 404 if user not found', async () => {
    jwt.verify.mockReturnValue({ userId: 3, role: 'customer' });
    db.query.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .get('/api/users/3')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('User not found');
  });

  it('should return 401 if no token is provided', async () => {
    const response = await request(app).get('/api/users/1');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('No token provided');
  });

  it('should return 401 for expired token', async () => {
    jwt.verify.mockImplementation(() => {
      const err = new Error('Token expired');
      err.name = 'TokenExpiredError';
      throw err;
    });

    const response = await request(app)
      .get('/api/users/1')
      .set('Authorization', 'Bearer expiredToken');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Token expired');
    expect(response.body.message).toBe('Please log in again');
  });

  it('should return 500 for other server errors', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('Unknown token error');
    });

    const response = await request(app)
      .get('/api/users/1')
      .set('Authorization', 'Bearer badToken');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Server error');
  });
});
