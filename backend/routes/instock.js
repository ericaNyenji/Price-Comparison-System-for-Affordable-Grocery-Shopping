const express = require('express');
const router = express.Router();
//const db = require('../db');
const { getConnection } = require("../db");

router.get('/', async (req, res) => {
  const { locationId } = req.query;
  console.log("📥 Request received for locationId:", locationId);

  if (!locationId) return res.status(400).json({ error: "locationId is required" });

  try {
    const db = await getConnection();//AIVEN MYSQL
    const [rows] = await db.query(
      `SELECT
        p.product_id,
        p.product_name,
        p.image_path,
        p.category_id,
        c.category_name,      
        pr.price
      FROM products p
      JOIN prices pr ON pr.product_id = p.product_id
      JOIN categories c ON p.category_id = c.category_id  
      WHERE pr.location_id = ?
      
    `, [locationId]);

    res.json({ status: "success", data: rows });
  } catch (error) {
    console.error("❌ SQL Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

// const express = require('express');
// const router = express.Router();
// const db = require('../db');

// // Get in-stock products for the logged-in owner's location
// router.get('/', (req, res) => {
//   const locationId = req.query.locationId; // Assuming you pass the owner_id as a query parameter

//   if (!locationId) {
//     return res.status(400).json({ error: "Location ID is required" });
//   }

//   const sql = `
//     SELECT 
//       p.product_id, 
//       p.product_name, 
//       p.image_path,
//       pr.price
//     FROM products p
//     JOIN prices pr 
//       ON pr.product_id = p.product_id
//     JOIN owners o 
//       ON pr.location_id = o.location_id
//     WHERE o.location_id = ?
//   `;

//   db.query(sql, [locationId], (err, results) => {
//     if (err) {
//       console.error('Database error:', err);
//       return res.status(500).json({ error: 'Database error' });
//     }

//     res.json({ status: 'success', data: results });
//   });
// });

// module.exports = router;
