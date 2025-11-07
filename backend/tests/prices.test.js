const request = require('supertest');  
const express = require("express");
const router = require("../routes/prices"); 
const db = require("../db"); 

jest.mock("../db"); 

describe('GET /api/prices', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/prices", router); 
  });

  it('should return a list of prices on success', async () => {
    const mockPrices = [
      { price_id: 1, product_id: 101, price: 19.99, location_id: 1 },
      { price_id: 2, product_id: 102, price: 29.99, location_id: 2 },
      { price_id: 3, product_id: 103, price: 39.99, location_id: 3 }
    ];

    db.query.mockResolvedValueOnce([mockPrices]); 

    const response = await request(app).get('/api/prices');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(mockPrices);
    expect(response.body.data.length).toBe(3);
    expect(response.body.data[0].price).toBe(19.99);
  });

  it('should return a 500 error if there is a database error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    db.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).get('/api/prices');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Database error');

    consoleSpy.mockRestore(); 
  });
});

describe('GET /api/prices/product/:productId', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/prices", router); 
  });

  it('should return prices for a specific product on success', async () => {
    const mockPrices = [
      { price_id: 1, product_id: 101, price: 19.99, location_id: 1 },
      { price_id: 2, product_id: 101, price: 29.99, location_id: 2 }
    ];

    db.query.mockResolvedValueOnce([mockPrices]); // Mock DB return

    const response = await request(app).get('/api/prices/product/101');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(mockPrices);
    expect(response.body.data.length).toBe(2);
    expect(response.body.data[0].product_id).toBe(101);
  });

  it('should return a 500 error if there is a database error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    db.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).get('/api/prices/product/101');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Database error');

    consoleSpy.mockRestore(); // Restore after test
  });
});

describe('POST /api/prices', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/prices", router); 
  });

  it('should add a price to the database on success', async () => {
    const newPrice = { product_id: 104, price: 49.99, location_id: 1 };

   
    db.query.mockResolvedValueOnce([[]]); 

   
    db.query.mockResolvedValueOnce([{ insertId: 1 }]);

    const response = await request(app).post('/api/prices').send(newPrice);

    expect(response.status).toBe(201); 
    expect(response.body.data.product_id).toBe(104);
    expect(response.body.data.price).toBe(49.99);
  });


  it('should return a 400 error if product already exists in the supermarket', async () => {
    const existingPrice = { product_id: 101, price: 19.99, location_id: 1 };

 
    db.query.mockResolvedValueOnce([[existingPrice]]); 

    const response = await request(app).post('/api/prices').send(existingPrice);

    expect(response.status).toBe(400); 
    expect(response.body.error).toBe('Product already exists in the supermarket');
  });
  
  it('should return a 500 error if there is a database error', async () => {
    const newPrice = { product_id: 105, price: 59.99, location_id: 2 };

    db.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).post('/api/prices').send(newPrice);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Database error');
  });
});

describe('PUT /api/prices/:id', () => {
    let app;
  
    beforeAll(() => {
      app = express();
      app.use(express.json());
      app.use("/api/prices", router); 
    });
  
    it('should update a price on success', async () => {
      const updatedPrice = { product_id: 106, price: 69.99, location_id: 1 };
  
      
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
  
      const response = await request(app).put('/api/prices/1').send(updatedPrice);
  
      expect(response.status).toBe(200); 
      expect(response.body.message).toBe('Price updated');
    });
  
    it('should return a 404 error if the price is not found', async () => {
      const updatedPrice = { product_id: 107, price: 79.99, location_id: 1 };
  
      
      db.query.mockResolvedValueOnce([{ affectedRows: 0 }]); 
  
      const response = await request(app).put('/api/prices/999').send(updatedPrice);
  
      expect(response.status).toBe(404); 
      expect(response.body.error).toBe('Not found');
    });
  
    it('should return a 500 error if there is a database error', async () => {
      const updatedPrice = { product_id: 108, price: 89.99, location_id: 2 };
  
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  
      db.query.mockRejectedValueOnce(new Error('Database error')); 
  
      const response = await request(app).put('/api/prices/1').send(updatedPrice);
  
      expect(response.status).toBe(500); 
      expect(response.body.error).toBe('Database error');
  
      consoleSpy.mockRestore(); 
    });
  });
  
  describe('DELETE /api/prices/:id', () => {
    let app;
  
    beforeAll(() => {
      app = express();
      app.use(express.json());
      app.use("/api/prices", router); 
    });
  
    it('should delete a price on success', async () => {
      
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]); 
  
      const response = await request(app).delete('/api/prices/1');
  
      expect(response.status).toBe(200); // Expect 200 on successful deletion
      expect(response.body.message).toBe('Price deleted');
    });
  
    it('should return a 404 error if the price is not found', async () => {
     
      db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
  
      const response = await request(app).delete('/api/prices/999');
  
      expect(response.status).toBe(404); 
      expect(response.body.error).toBe('Not found');
    });
  
    it('should return a 500 error if there is a database error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  
      db.query.mockRejectedValueOnce(new Error('Database error')); 
  
      const response = await request(app).delete('/api/prices/1');
  
      expect(response.status).toBe(500); 
      expect(response.body.error).toBe('Database error');
  
      consoleSpy.mockRestore(); 
    });
  });
  