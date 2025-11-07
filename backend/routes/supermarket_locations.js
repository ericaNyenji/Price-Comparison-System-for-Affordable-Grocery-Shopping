const express = require('express');
const router = express.Router();
//const db = require('../db');  
const { getConnection } = require("../db");

// GET all supermarket locations
router.get('/', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const [results] = await db.query('SELECT * FROM supermarket_locations');
    res.json({ status: 'success', data: results });
  } catch (err) {
    console.error('Database query error:', err.message);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// GET supermarket locations by supermarket_id
router.get('/supermarket/:id', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const supermarketId = req.params.id;
    const [results] = await db.query('SELECT * FROM supermarket_locations WHERE supermarket_id = ?', [supermarketId]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Supermarket locations not found' });
    }
    res.json({ status: 'success', data: results });
  } catch (err) {
    console.error('Database query error:', err.message);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// POST a new supermarket location
router.post('/', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const { supermarket_id, location_name } = req.body;
    const [result] = await db.query(
      'INSERT INTO supermarket_locations (supermarket_id, location_name) VALUES (?, ?)',
      [supermarket_id, location_name]
    );
    res.status(201).json({ 
      status: 'success', 
      data: { 
        location_id: result.insertId, 
        supermarket_id, 
        location_name 
      } 
    });
  } catch (err) {
    console.error('Database query error:', err.message);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// PUT (update) a supermarket location by location_id
router.put('/:id', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const locationId = req.params.id;
    const { supermarket_id, location_name } = req.body;
    const [result] = await db.query(
      'UPDATE supermarket_locations SET supermarket_id = ?, location_name = ? WHERE location_id = ?',
      [supermarket_id, location_name, locationId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Supermarket location not found' });
    }
    res.json({ status: 'success', message: 'Supermarket location updated' });
  } catch (err) {
    console.error('Database query error:', err.message);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// DELETE a supermarket location by ID
router.delete('/:id', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const locationId = req.params.id;
    const [result] = await db.query('DELETE FROM supermarket_locations WHERE location_id = ?', [locationId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Supermarket location not found' });
    }
    res.json({ status: 'success', message: 'Supermarket location deleted' });
  } catch (err) {
    console.error('Database query error:', err.message);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

module.exports = router;
