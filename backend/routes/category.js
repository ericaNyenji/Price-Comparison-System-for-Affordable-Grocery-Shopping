const express = require('express');
const router = express.Router();
//const db = require('../db');
const { getConnection } = require("../db");//AIVEN MYSQL

router.get('/', async (req, res) => {
    try {
      const db = await getConnection();//AIVEN MYSQL
      const query = 'SELECT * FROM categories';
  
      // Fetch categories from the database
      const [results] = await db.query(query);
  
      // Send the categories as a JSON response
      res.json({ data: results });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  module.exports = router;
//   {
//     "data": [
//       {
//         "category_id": 2,
//         "category_name": "Beverages"
//       }
//    }
  