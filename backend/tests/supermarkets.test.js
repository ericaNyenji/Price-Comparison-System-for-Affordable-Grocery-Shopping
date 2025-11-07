const request = require('supertest');
const express = require('express');
const router = require('../routes/supermarkets'); 
const db = require('../db');

jest.mock('../db');

describe('Supermarkets API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/supermarkets', router); 
  });

  it('should return a list of supermarkets on success', async () => {
    const mockSupermarkets = [
      { supermarket_id: 1, supermarket_name: 'Tesco' },
      { supermarket_id: 2, supermarket_name: 'Aldi' },
      { supermarket_id: 3, supermarket_name: 'Lidl' }
    ];

    db.execute.mockResolvedValueOnce([mockSupermarkets]);

    const response = await request(app).get('/api/supermarkets');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockSupermarkets);
    expect(response.body.length).toBe(3);
    expect(response.body[0].supermarket_name).toBe('Tesco');
  });

  it('should return a 500 error if there is a database error on GET', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    db.execute.mockRejectedValueOnce(new Error('Database failure'));

    const response = await request(app).get('/api/supermarkets');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal Server Error');

    consoleSpy.mockRestore();
  });

  it('should add a new supermarket on POST', async () => {
    const newSupermarket = { supermarket_name: 'Spar' };

    db.execute.mockResolvedValueOnce([{ insertId: 10 }]);

    const response = await request(app)
      .post('/api/supermarkets')
      .send(newSupermarket);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      supermarket_id: 10,
      supermarket_name: 'Spar'
    });
  });

  it('should return 400 if supermarket_name is missing in POST', async () => {
    const response = await request(app)
      .post('/api/supermarkets')
      .send({}); // No name

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Supermarket name is required');
  });

  it('should return 500 if there is a database error on POST', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    db.execute.mockRejectedValueOnce(new Error('Insert failed'));

    const response = await request(app)
      .post('/api/supermarkets')
      .send({ supermarket_name: 'InterSpar' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal Server Error');

    consoleSpy.mockRestore();
  });
});
