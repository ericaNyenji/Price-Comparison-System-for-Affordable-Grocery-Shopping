const request = require("supertest");
const express = require("express");
const router = require("../routes/register");
const db = require("../db");
const bcrypt = require("bcryptjs");

jest.mock("../db"); 
jest.mock("bcryptjs"); // Mock bcrypt to avoid actual password hashing during testing

describe("POST /api/register", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/register", router);
  });


  it("should return a 500 error if there's a server error", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); 
    
    db.query.mockRejectedValueOnce(new Error("DB Error"));

    const response = await request(app)
      .post("/api/register")
      .send({
        name: "John Doe",
        email: "johndoe@example.com",
        password: "password123",
        role: "customer"
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Server error");
  });
});
