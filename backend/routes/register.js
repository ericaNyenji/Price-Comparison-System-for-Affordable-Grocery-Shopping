const express = require("express");
const bcrypt = require("bcryptjs");
//const jwt = require("jsonwebtoken");
const router = express.Router();
//const db = require("../db"); 
const { getConnection } = require("../db");//------ADDED FOR AIVEN

// Register endpoint
router.post("/", async (req, res) => {//register will be the final path....NO I EDITED.-->>my backend will match exactly:POST /api/register
  //console.log(" Incoming registration request:", req.body);
  const { name, email, password, country, role, currency_code, supermarketLocation, supermarketType, supermarketName} = req.body;

  try {
    // Check if user already exists in either table
      const db = await getConnection(); //------ADDED FOR AIVEN
    const [existingCustomer] = await db.query("SELECT * FROM customers WHERE email = ?", [email]);
    const [existingOwner] = await db.query("SELECT * FROM owners WHERE email = ?", [email]);
    if (existingCustomer.length > 0 || existingOwner.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert into correct table based on role
    const table = role === "owner" ? "owners" : "customers";
    
    // Prepare the query based on role
    let query, params;
    if (role === "owner") {
      // First, create the supermarket location
      const [locationResult] = await db.query(
        "INSERT INTO supermarket_locations (location_name, supermarket_id, latitude, longitude, country, currency_code) VALUES (?, ?, ?, ?, ?, ?)",
        [supermarketName, supermarketType, supermarketLocation.lat, supermarketLocation.lng, country, currency_code]
      );

      // Then create the owner with the location_id
      query = `INSERT INTO ${table} (username, email, password_hash, location_id) VALUES (?, ?, ?, ?)`;
      params = [name, email, hashedPassword, locationResult.insertId];
    } else {
      query = `INSERT INTO ${table} (username, email, password_hash,country, currency_code) VALUES (?, ?, ?, ?, ?)`;
      params = [name, email, hashedPassword, country, currency_code];
    }

    await db.query(query, params);

    console.log("Sssuccccesssffullll Registration");
    res.status(201).json({ message: `${role} registered successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
