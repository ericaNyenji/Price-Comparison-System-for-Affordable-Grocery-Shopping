// In routes/locations.js
const express = require('express');
//const db = require('../db'); // Assuming db.js contains the database connection
const { getConnection } = require("../db");
const router = express.Router();

// Fetch all locations
router.get('/', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const [locations] = await db.query('SELECT location_id, location_name FROM supermarket_locations');
    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

module.exports = router;
