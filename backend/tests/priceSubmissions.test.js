const request = require('supertest');
const express = require("express");
const router = require("../routes/priceSubmissions").router;
const db = require("../db");
const jwt = require('jsonwebtoken');

jest.mock("../db");

describe('POST /api/priceSubmissions', () => {
  let app;
  let token;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/priceSubmissions", router);
    token = jwt.sign({ userId: 1, role: 'customer' }, process.env.JWT_SECRET_KEY || 'defaultSecretKey');
  });

 
  it('should return 401 if token is missing', async () => {
    const response = await request(app)
      .post('/api/priceSubmissions')
      .send({
        product_id: 1,
        location_id: 1,
        new_price: 120,
        evidence_url: 'http://example.com/evidence'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Access token is required');
  });

  it('should return 403 if the user is not a customer', async () => {
    const ownerToken = jwt.sign({ userId: 1, role: 'owner' }, process.env.JWT_SECRET_KEY || 'defaultSecretKey');

    const response = await request(app)
      .post('/api/priceSubmissions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        product_id: 1,
        location_id: 1,
        new_price: 120,
        evidence_url: 'http://example.com/evidence'
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Only customers can submit price updates');
  });
});

afterEach(() => {
  jest.clearAllMocks(); // Clear mocks after each test to prevent data pollution
});
