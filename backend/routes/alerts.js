const express = require('express');
const router = express.Router();
//const db = require('../db');
const { getConnection } = require("../db");//for AIVEN mysql
const jwt = require('jsonwebtoken');

let io;

// Initialize socket.io
const initializeSocket = (socketIO) => {
    io = socketIO;
};

// Create price change alert - only when price drops
const createPriceChangeAlert = async (userId, userType, productId, locationId, oldPrice, newPrice, customMessage = null) => {
    try {
         const db = await getConnection();//AIVEN mysql
        // Only create an alert if the price has decreased
        if (newPrice < oldPrice) {
            const priceDrop = oldPrice - newPrice;
            const dropPercentage = ((priceDrop / oldPrice) * 100).toFixed(1);
            const message = customMessage || `Price dropped from $${oldPrice} to $${newPrice} (${dropPercentage}% savings)`;
            
            const [result] = await db.query(
                'INSERT INTO alerts (user_id, user_type, message, type, product_id, location_id) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, userType, message, 'price_change', productId, locationId]
            );

            if (io) {
                io.to(`user_${userId}`).emit('newAlert', {
                    alert_id: result.insertId,
                    message,
                    type: 'price_change',
                    product_id: productId,
                    location_id: locationId,
                    created_at: new Date()
                });
            }

            return result.insertId;
        }
        return null; // No alert created if price didn't drop
    } catch (error) {
        console.error('Error creating price change alert:', error);
        throw error;
    }
};

// Create deal expiration alerts
const createDealExpirationAlerts = async (io) => {
  try {
    const db = await getConnection();//AIVEN mysql
    // Get deals that will expire in the next 5 hours
    const [expiringDeals] = await db.query(`
      SELECT 
        d.deal_id,
        d.product_id,
        d.location_id,
        d.deal_end_date,
        p.product_name,
        sl.location_name,
        s.supermarket_name
      FROM deals d
      JOIN products p ON d.product_id = p.product_id
      JOIN supermarket_locations sl ON d.location_id = sl.location_id
      JOIN supermarkets s ON sl.supermarket_id = s.supermarket_id
      WHERE d.deal_end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 5 HOUR)
      AND d.deal_end_date > NOW()
      AND NOT EXISTS (
        SELECT 1 FROM alerts a 
        WHERE a.product_id = d.product_id 
        AND a.location_id = d.location_id 
        AND a.type = 'deal_expiration'
        AND a.created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      )
    `);

    for (const deal of expiringDeals) {
      const [favoriteUsers] = await db.query(
        'SELECT user_id FROM favorites WHERE product_id = ?',
        [deal.product_id]
      );

      for (const user of favoriteUsers) {
        const message = `Hurry! The deal on ${deal.product_name} at ${deal.supermarket_name}, ${deal.location_name} expires in 5 hours!`;
       
        const [result] = await db.query(
          'INSERT INTO alerts (user_id, user_type, message, type, product_id, location_id) VALUES (?, ?, ?, ?, ?, ?)',
          [user.user_id, 'customer', message, 'deal_expiration', deal.product_id, deal.location_id]
        );

        // Emit alert to the user's room
        if (io) {
          io.to(`user_${user.user_id}`).emit('newAlert', {
            alert_id: result.insertId,
            message,
            type: 'deal_expiration',
            product_id: deal.product_id,
            location_id: deal.location_id,
            created_at: new Date()
          });
        }
      }
    }
  } catch (error) {
    console.error('Error creating deal expiration alerts:', error);
  }
};

// Get alerts for a user
router.get('/:userId', async (req, res) => {
    try {
        const db = await getConnection();//AIVEN MYSQL
        const userId = req.params.userId;
        const userType = req.query.userType || 'customer';
        const [alerts] = await db.query(
            `SELECT a.*, p.product_name, sl.location_name
             FROM alerts a
             LEFT JOIN products p ON a.product_id = p.product_id
             LEFT JOIN supermarket_locations sl ON a.location_id = sl.location_id
             WHERE a.user_id = ? AND a.user_type = ?
             ORDER BY a.created_at DESC`,
            [userId, userType]
        );
        res.json(alerts);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// Mark alert as read
router.put('/:alertId/read', async (req, res) => {
    try {
        const db = await getConnection();//AIVEN MYSQL
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Access token is required' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || "defaultSecretKey");
            const alertId = req.params.alertId;
            
            await db.query(
                'UPDATE alerts SET read_at = CURRENT_TIMESTAMP WHERE alert_id = ?',
                [alertId]
            );
            res.json({ message: 'Alert marked as read' });
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token expired', 
                    message: 'Please log in again' 
                });
            }
            throw jwtError;
        }
    } catch (error) {
        console.error('Error marking alert as read:', error);
        res.status(500).json({ error: 'Failed to mark alert as read' });
    }
});

// Delete alert
router.delete('/:alertId', async (req, res) => {
    try {
        const db = await getConnection();//AIVEN MYSQL
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Access token is required' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || "defaultSecretKey");
            const alertId = req.params.alertId;
            
            await db.query('DELETE FROM alerts WHERE alert_id = ?', [alertId]);
            res.json({ message: 'Alert deleted' });
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token expired', 
                    message: 'Please log in again' 
                });
            }
            throw jwtError;
        }
    } catch (error) {
        console.error('Error deleting alert:', error);
        res.status(500).json({ error: 'Failed to delete alert' });
    }
});

module.exports = {
    router,
    initializeSocket,
    createPriceChangeAlert,
    createDealExpirationAlerts
};
