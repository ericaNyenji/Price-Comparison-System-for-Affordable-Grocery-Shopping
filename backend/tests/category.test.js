const request = require('supertest');  // For making requests to the API
const express = require("express");
const router = require("../routes/category"); 
const db = require("../db"); 
const { memoryStorage } = require('multer');
jest.mock("../db");

describe('GET /api/category', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/category", router); 
  });

  it('should return a list of categories on success', async () => {
    const mockCategories = [
      { category_id: 1, category_name: "Electronics" },
      { category_id: 2, category_name: "Beverages" },
      { category_id: 3, category_name: "Furniture" }
    ];

    db.query.mockResolvedValueOnce([mockCategories]); // Mock DB return

    const response = await request(app).get('/api/category');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(mockCategories);
    expect(response.body.data.length).toBe(3);
    expect(response.body.data[0].category_name).toBe("Electronics");
  });

  it('should return a 500 error if there is a database error', async () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  db.query.mockRejectedValueOnce(new Error('Database error'));

  const response = await request(app).get('/api/category');

  expect(response.status).toBe(500);
  expect(response.body.error).toBe('Failed to fetch categories');

  consoleSpy.mockRestore(); // Restore after test
});

});






