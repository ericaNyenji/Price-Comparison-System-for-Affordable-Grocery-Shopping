const request = require('supertest');
const express = require('express');
const router = require('../routes/locations');
const db = require('../db');

jest.mock('../db');

describe('Locations API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/locations', router);
  });

  describe('GET /api/locations', () => {
    it('should return a list of locations', async () => {
      const mockLocations = [
        { location_id: 1, location_name: 'Downtown' },
        { location_id: 2, location_name: 'Uptown' }
      ];

      db.query.mockResolvedValueOnce([mockLocations]);

      const res = await request(app).get('/api/locations');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockLocations);
    });

    it('should return 500 if database query fails', async () => {
      db.query.mockRejectedValueOnce(new Error('Database failure'));

      const res = await request(app).get('/api/locations');

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to fetch locations' });
    });
  });
});
