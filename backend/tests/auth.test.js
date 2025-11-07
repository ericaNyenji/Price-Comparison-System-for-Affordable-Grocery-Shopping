const request = require("supertest"); 
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = require("../routes/auth"); 
const db = require("../db"); 

jest.mock("../db"); 
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mocked_token"), 
}));

describe("POST /api/auth/login", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json()); 
    app.use("/api/auth", router); 
  });

  it("should login successfully with valid credentials (customer)", async () => {
    const mockUser = {
      user_id: 1,
      username: "testuser",
      email: "testuser@example.com",
      password_hash: await bcrypt.hash("password123", 10), 
      location_id: 101,
    };

    db.query.mockResolvedValueOnce([[mockUser]]); 
    const response = await request(app)
      .post("/api/auth")
      .send({ email: "testuser@example.com", password: "password123" });

    expect(response.status).toBe(200); 
    expect(response.body).toHaveProperty("token"); 
    expect(response.body.role).toBe("customer"); 
    expect(response.body.userId).toBe(mockUser.user_id); 
    expect(response.body.name).toBe(mockUser.username); 
    expect(response.body.email).toBe(mockUser.email); 
    expect(response.body.locationId).toBe(mockUser.location_id); 
  });

  it("should login successfully with valid credentials (owner)", async () => {
    const mockUser = {
      user_id: 2,
      username: "owneruser",
      email: "owneruser@example.com",
      password_hash: await bcrypt.hash("password123", 10), 
      location_id: 102,
    };
  
   
    db.query.mockResolvedValueOnce([[]]); 
    db.query.mockResolvedValueOnce([[mockUser]]); 
  
    const response = await request(app)
      .post("/api/auth")
      .send({ email: "owneruser@example.com", password: "password123" });
  
    expect(response.status).toBe(200); 
    expect(response.body).toHaveProperty("token");
    expect(response.body.role).toBe("owner"); 
    expect(response.body.userId).toBe(mockUser.user_id); 
    expect(response.body.name).toBe(mockUser.username); 
    expect(response.body.email).toBe(mockUser.email); 
    expect(response.body.locationId).toBe(mockUser.location_id); 
  });
  
  
  

  it("should return 400 if the user is not found", async () => {
    // Mock no user found in either table
    db.query.mockResolvedValueOnce([[]]); // No user found in 'customers'
    db.query.mockResolvedValueOnce([[]]); // No user found in 'owners'
    
    const response = await request(app)
      .post("/api/auth")
      .send({ email: "nonexistentuser@example.com", password: "password123" });

    expect(response.status).toBe(400); // Should return 400 for user not found
    expect(response.body.error).toBe("User not found"); // Error message should match
  });

  it("should return 400 if the password is incorrect", async () => {
    // Mock a successful query to find the user
    const mockUser = {
      user_id: 1,
      username: "testuser",
      email: "testuser@example.com",
      password_hash: await bcrypt.hash("password123", 10), // Hashed password in DB
      location_id: 101,
    };

    db.query.mockResolvedValueOnce([[mockUser]]); // Mock db query to return the user
    const response = await request(app)
      .post("/api/auth")
      .send({ email: "testuser@example.com", password: "wrongpassword" });

    expect(response.status).toBe(400); // Should return 400 for invalid password
    expect(response.body.error).toBe("Invalid password"); // Error message should match
  });

  it("should handle internal server errors", async () => {
    // Simulate an error in the DB query
    db.query.mockRejectedValueOnce(new Error("Database error"));
    const response = await request(app)
      .post("/api/auth")
      .send({ email: "testuser@example.com", password: "password123" });

    expect(response.status).toBe(500); // Should return 500 for server errors
    expect(response.body.error).toBe("Server error"); // Error message should match
  });
});
