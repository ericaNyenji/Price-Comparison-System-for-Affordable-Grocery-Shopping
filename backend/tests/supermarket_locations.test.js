const request = require('supertest');
const express = require('express');
const router = require('../routes/supermarket_locations'); 
const db = require('../db');

jest.mock('../db'); 

describe('Supermarket Locations API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/supermarket-locations', router); 
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/supermarket-locations', () => {
    it('should return all supermarket locations', async () => {
      const mockData = [
        { location_id: 1, supermarket_id: 1, location_name: 'Budapest - West' },
        { location_id: 2, supermarket_id: 2, location_name: 'Budapest - East' }
      ];

      db.query.mockResolvedValueOnce([mockData]);

      const response = await request(app).get('/api/supermarket-locations');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(mockData);
    });

    it('should handle DB error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/supermarket-locations');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error occurred');
      consoleSpy.mockRestore();
    });
  });

  describe('GET /api/supermarket-locations/supermarket/:id', () => {
    it('should return locations for a specific supermarket ID', async () => {
      const mockData = [
        { location_id: 1, supermarket_id: 1, location_name: 'Downtown' }
      ];

      db.query.mockResolvedValueOnce([mockData]);

      const response = await request(app).get('/api/supermarket-locations/supermarket/1');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual(mockData);
    });

    it('should return 404 if no locations found', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const response = await request(app).get('/api/supermarket-locations/supermarket/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Supermarket locations not found');
    });
  });

  describe('POST /api/supermarket-locations', () => {
    it('should create a new supermarket location', async () => {
      const input = { supermarket_id: 2, location_name: 'Újbuda' };
      db.query.mockResolvedValueOnce([{ insertId: 123 }]);

      const response = await request(app).post('/api/supermarket-locations').send(input);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual({
        location_id: 123,
        supermarket_id: input.supermarket_id,
        location_name: input.location_name
      });
    });
  });

  describe('PUT /api/supermarket-locations/:id', () => {
    it('should update a supermarket location', async () => {
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app).put('/api/supermarket-locations/1').send({
        supermarket_id: 2,
        location_name: 'Updated Location'
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Supermarket location updated');
    });

    it('should return 404 if location not found', async () => {
      db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app).put('/api/supermarket-locations/999').send({
        supermarket_id: 2,
        location_name: 'Does Not Exist'
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Supermarket location not found');
    });
  });

  describe('DELETE /api/supermarket-locations/:id', () => {
    it('should delete a supermarket location', async () => {
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app).delete('/api/supermarket-locations/1');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Supermarket location deleted');
    });

    it('should return 404 if location does not exist', async () => {
      db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app).delete('/api/supermarket-locations/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Supermarket location not found');
    });
  });
});
