const express = require('express');
const router = express.Router();
//const db = require('../db');
const { getConnection } = require("../db");//for AIVEN mysql

router.get('/user/:userId', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN mysql
    const userId = req.params.userId;
    const [favorites] = await db.query('SELECT * FROM favorites WHERE user_id = ?', [userId]);
    res.json({ success: true, data: favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch favorites' });
  }
});


router.post('/', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    console.log('Received request body:', req.body);
    const { userId, productId, priceId } = req.body;
    
    if (!userId || !productId || !priceId) {
      console.error('Missing required fields:', { userId, productId, priceId });
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Check if this specific price is already in favorites
    const [existing] = await db.query(
      'SELECT * FROM favorites WHERE user_id = ? AND product_id = ? AND price_id = ?',
      [userId, productId, priceId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'This price is already in favorites' });
    }
    
    // Add to favorites
    const [result] = await db.query(
      'INSERT INTO favorites (user_id, product_id, price_id) VALUES (?, ?, ?)',
      [userId, productId, priceId]
    );
    
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ success: false, error: 'Failed to add to favorites' });
  }
});

router.delete('/:productId', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const productId = req.params.productId;
    const userId = req.query.userId;
    const priceId = req.query.priceId;
    
    if (!userId || !priceId) {
      return res.status(400).json({ success: false, error: 'User ID and Price ID are required' });
    }
    
    const [result] = await db.query(
      'DELETE FROM favorites WHERE user_id = ? AND product_id = ? AND price_id = ?',
      [userId, productId, priceId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Favorite not found' });
    }
    
    res.json({ success: true, message: 'Product removed from favorites' });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ success: false, error: 'Failed to remove from favorites' });
  }
});

module.exports = router;
