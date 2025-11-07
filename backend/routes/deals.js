const express = require('express');
const router = express.Router();
//const db = require('../db');
const { getConnection } = require("../db");//AIVEN MYSQL
const { createDealExpirationAlerts } = require('../scheduledTasks');

// Get all active deals
router.get('/', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const query = `
      SELECT 
        p.product_id,
        p.product_name,
        p.image_path,
        pr.price,
        d.deal_percentage,
        d.deal_start_date,
        d.deal_end_date,
        sl.location_name,
        s.supermarket_name,
        s.image_path AS supermarket_image,
        d.location_id,
        ROUND(pr.price * (1 - d.deal_percentage/100), 2) AS deal_price
      FROM deals d
      JOIN products p ON d.product_id = p.product_id
      JOIN prices pr ON d.product_id = pr.product_id AND d.location_id = pr.location_id
      JOIN supermarket_locations sl ON d.location_id = sl.location_id
      JOIN supermarkets s ON sl.supermarket_id = s.supermarket_id
      WHERE NOW() BETWEEN d.deal_start_date AND d.deal_end_date
    `;
    // const { rows } = await db.query(query);
    const [rows] = await db.query(query);
    //res.json({ success: true, data: rows });
    res.json({ success: true, data: rows || [] }); 
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deals' });
  }
});

// Add a product to deals
router.post('/', async (req, res) => {
  try {
    const db = await getConnection(); // AIVEN MySQL
    const { productId, dealStartDate, dealEndDate, locationId, PercentageDiscount } = req.body;

    // Validate required fields
    if (!productId || !dealStartDate || !dealEndDate || !locationId || !PercentageDiscount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Check if a deal already exists
    const [existingDeals] = await db.query(
      'SELECT * FROM deals WHERE product_id = ? AND location_id = ?',
      [productId, locationId]
    );

    if (existingDeals.length > 0) {
      return res.status(400).json({ success: false, error: 'A deal already exists for this product at this location' });
    }

    // Insert the new deal
    const [result] = await db.query(
      `INSERT INTO deals (product_id, location_id, deal_percentage, deal_start_date, deal_end_date)
       VALUES (?, ?, ?, ?, ?)`,
      [productId, locationId, PercentageDiscount, dealStartDate, dealEndDate]
    );

    // Update prices table to mark product as on deal
    await db.query(
      `UPDATE prices 
       SET on_deal = true 
       WHERE product_id = ? AND location_id = ?`,
      [productId, locationId]
    );

    // Fetch the full deal info for socket emission
    const [dealRows] = await db.query(
      `SELECT 
        p.product_id,
        p.product_name,
        p.image_path,
        pr.price,
        d.deal_percentage,
        d.deal_start_date,
        d.deal_end_date,
        sl.location_name,
        s.supermarket_name,
        s.image_path AS supermarket_image,
        d.location_id,
        ROUND(pr.price * (1 - d.deal_percentage/100), 2) AS deal_price
      FROM deals d
      JOIN products p ON d.product_id = p.product_id
      JOIN prices pr ON d.product_id = pr.product_id AND d.location_id = pr.location_id
      JOIN supermarket_locations sl ON d.location_id = sl.location_id
      JOIN supermarkets s ON sl.supermarket_id = s.supermarket_id
      WHERE d.product_id = ? AND d.location_id = ?`,
      [productId, locationId]
    );

    // Emit socket event if deal exists
    if (dealRows.length > 0) {
      req.app.get('io').emit('newDeal', dealRows[0]);
      try {
        await createDealExpirationAlerts(req.app.get('io'));
        console.log('✅ Checked for expiring deals');
      } catch (error) {
        console.error('Error checking expiring deals:', error);
      }
    }

    res.json({
      success: true,
      message: 'Product added to deals successfully',
      dealId: result.insertId
    });

  } catch (error) {
    console.error('Error adding product to deals:', error);
    res.status(500).json({ success: false, error: 'Failed to add product to deals' });
  }
});


// Remove a product from deals
router.delete('/:productId', async (req, res) => {
  const { productId } = req.params;
  const { locationId } = req.query;

  try {
    const db = await getConnection(); // AIVEN MySQL

    // Use ? placeholders for MySQL
    await db.query(
      'DELETE FROM deals WHERE product_id = ? AND location_id = ?',
      [productId, locationId]
    );

    await db.query(
      'UPDATE prices SET on_deal = false WHERE product_id = ? AND location_id = ?',
      [productId, locationId]
    );

    // Emit socket event
    req.app.get('io').emit('dealRemoved', { 
      productId: parseInt(productId), 
      locationId: parseInt(locationId) 
    });

    res.json({ success: true, message: 'Product removed from deals successfully' });
  } catch (error) {
    console.error('Error removing deal:', error);
    res.status(500).json({ success: false, error: 'Failed to remove deal' });
  }
});


// Update a deal
router.put('/:productId', async (req, res) => {
  try {
    const db = await getConnection(); // AIVEN MySQL
    const { productId } = req.params;
    const { dealEndDate, locationId, PercentageDiscount } = req.body;

    if (!dealEndDate || !locationId || !PercentageDiscount) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // ✅ Use ? placeholders for MySQL
    await db.query(
      `UPDATE deals 
       SET deal_end_date = ?, deal_percentage = ?
       WHERE product_id = ? AND location_id = ?`,
      [dealEndDate, PercentageDiscount, productId, locationId]
    );

    const dealQuery = `
      SELECT 
        p.product_id,
        p.product_name,
        p.image_path,
        pr.price,
        d.deal_percentage,
        d.deal_start_date,
        d.deal_end_date,
        sl.location_name,
        s.supermarket_name,
        s.image_path AS supermarket_image,
        d.location_id,
        ROUND(pr.price * (1 - d.deal_percentage/100), 2) AS deal_price
      FROM deals d
      JOIN products p ON d.product_id = p.product_id
      JOIN prices pr ON d.product_id = pr.product_id AND d.location_id = pr.location_id
      JOIN supermarket_locations sl ON d.location_id = sl.location_id
      JOIN supermarkets s ON sl.supermarket_id = s.supermarket_id
      WHERE d.product_id = ? AND d.location_id = ?
    `;

    // ✅ Destructure results properly
    const [dealRows] = await db.query(dealQuery, [productId, locationId]);

    if (dealRows.length > 0) {
      req.app.get('io').emit('dealUpdated', dealRows[0]);
    }

    res.json({ success: true, message: 'Deal updated successfully' });
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ success: false, message: 'Error updating deal' });
  }
});

module.exports = router;











