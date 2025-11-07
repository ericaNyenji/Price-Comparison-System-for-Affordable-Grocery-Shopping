const express = require('express');
const router = express.Router();
//const db = require('../db');
const { getConnection } = require("../db");//for AIVEN mysql

// Get all prices
router.get('/', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const [results] = await db.query('SELECT * FROM prices');
    res.json({ status: 'success', data: results });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get prices for a specific product
router.get('/product/:productId', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const [results] = await db.query('SELECT * FROM prices WHERE product_id = ?', [req.params.productId]);
    res.json({ status: 'success', data: results });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// POST price
router.post('/', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const { product_id, price, location_id } = req.body;
    // Check if the product already exists for this location
    const [existing] = await db.query('SELECT * FROM prices WHERE product_id = ? AND location_id = ?', [product_id, location_id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Product already exists in the supermarket' });
    }
    const [result] = await db.query('INSERT INTO prices (product_id, price, location_id) VALUES (?, ?, ?)', [product_id, price, location_id]);
    res.status(201).json({ status: 'success', data: { id: result.insertId, product_id, price, location_id } });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT price
router.put('/:id', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const { product_id, price, location_id } = req.body;
    const [result] = await db.query('UPDATE prices SET product_id = ?, price = ?, location_id = ? WHERE id = ?', [product_id, price, location_id, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
    res.json({ status: 'success', message: 'Price updated' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE price
router.delete('/:id', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const [result] = await db.query('DELETE FROM prices WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
    res.json({ status: 'success', message: 'Price deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
