const express = require('express');
const jwt = require("jsonwebtoken");//.....used to decode JWT
const router = express.Router();
//const db = require('../db');
const { getConnection } = require("../db");

router.get('/', async (req, res) => {
  const { query, supermarketType, lat, lng, radius } = req.query;
  let userCountry = null;

  
  try {
    const db = await getConnection();//AIVEN MYSQL
    // Decode JWT to get country (from login token)
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      const SECRET = process.env.JWT_SECRET_KEY || "defaultSecretKey";//...secret key to decode JWT
      const decoded = jwt.verify(token, SECRET);
      userCountry = decoded.country; // country comes from login token
    }

    if (!userCountry) {
      return res.status(400).json({ error: "User country not found" });
    }

  // Build SQL dynamically
let sql = `
  WITH product_search AS (
    SELECT DISTINCT
      p.product_id,
      p.product_name,
      p.image_path
    FROM products p
    WHERE 1=1 
    ${query && query !== 'all' ? 'AND p.product_name LIKE ?' : ''}
  ),
  location_filtered AS (
    SELECT 
      ps.*,
      s.supermarket_id,
      s.supermarket_name,
      s.image_path AS supermarket_image,
      sl.location_id,
      sl.location_name,
      sl.latitude,
      sl.longitude,
      sl.country,
      pr.price,
      pr.last_updated,
      pr.on_deal,
      ${lat && lng ? `
        (6371 * acos(
          cos(radians(${lat})) * 
          cos(radians(sl.latitude)) * 
          cos(radians(sl.longitude) - radians(${lng})) + 
          sin(radians(${lat})) * 
          sin(radians(sl.latitude))
        )) as distance
      ` : '0 as distance'}
    FROM product_search ps
    JOIN prices pr ON ps.product_id = pr.product_id
    JOIN supermarket_locations sl ON pr.location_id = sl.location_id
    JOIN supermarkets s ON sl.supermarket_id = s.supermarket_id
    WHERE sl.country = ?   -- filter by user's country
`;

const params = [];

// push LIKE value if query present
if (query && query !== 'all') {
  params.push(`%${query}%`);
}

// always push country
params.push(userCountry);

//  optional filters
if (supermarketType) {
  sql += ` AND s.supermarket_id = ?`;
  params.push(supermarketType);
}

if (lat && lng && radius) {
  sql += ` HAVING distance <= ?`;
  params.push(radius);
}


    // .....Group and find cheapest price within country
    sql += `
      )
      SELECT 
        lf.*,
        (SELECT MIN(price) 
         FROM location_filtered lf2 
         WHERE lf2.product_id = lf.product_id) as min_price
      FROM location_filtered lf
      WHERE lf.price = (
        SELECT MIN(price) 
        FROM location_filtered lf2 
        WHERE lf2.product_id = lf.product_id
      )
      ORDER BY lf.product_name
    `;

    // If supermarket type is selected, find cheapest within that supermarket
    // Otherwise, find cheapest across all supermarkets
    // if (supermarketType) {
    //   sql += `
    //     )
    //     SELECT 
    //       lf.*,
    //       (SELECT MIN(price) 
    //        FROM location_filtered lf2 
    //        WHERE lf2.product_id = lf.product_id 
    //        AND lf2.supermarket_id = lf.supermarket_id) as min_price
    //     FROM location_filtered lf
    //     WHERE lf.price = (
    //       SELECT MIN(price) 
    //       FROM location_filtered lf2 
    //       WHERE lf2.product_id = lf.product_id 
    //       AND lf2.supermarket_id = lf.supermarket_id
    //     )
    //     ORDER BY lf.product_name
    //   `;
    // } else {
    //   sql += `
    //     )
    //     SELECT 
    //       lf.*,
    //       (SELECT MIN(price) 
    //        FROM location_filtered lf2 
    //        WHERE lf2.product_id = lf.product_id) as min_price
    //     FROM location_filtered lf
    //     WHERE lf.price = (
    //       SELECT MIN(price) 
    //       FROM location_filtered lf2 
    //       WHERE lf2.product_id = lf.product_id
    //     )
    //     ORDER BY lf.product_name
    //   `;
    // }

    const [results] = await db.query(sql, params);

    // Format the results
    const formattedResults = results.map(product => ({
      product_id: product.product_id,
      product_name: product.product_name,
      image_path: product.image_path,
      supermarket_name: product.supermarket_name,
      supermarket_image: product.supermarket_image,
      location_name: product.location_name,
      country: product.country,
      price: product.price,
      last_updated: product.last_updated,
      on_deal: product.on_deal,
      distance: product.distance
    }));

    res.json({ data: formattedResults });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;



// const express = require('express');
// const router = express.Router();
// const db = require('../db');

// router.get('/', async (req, res) => {//// /api/search route:
//   const { query } = req.query;

//   try {
//     const [rows] = await db.execute(
//       `SELECT 
//         p. product_id,
//         p.product_name,
//         p.image_path,
//         pr.price,
//         sn.supermarket_name,
//         sl.location_name
//       FROM prices pr
//       JOIN (
//         SELECT product_id, MIN(price) AS min_price
//         FROM prices
//         GROUP BY product_id
//       ) AS min_prices 
//         ON pr.product_id = min_prices.product_id 
//         AND pr.price = min_prices.min_price
//       JOIN products p ON p.product_id = pr.product_id
//       JOIN supermarket_locations sl ON pr.location_id = sl.location_id
//       JOIN supermarkets sn ON sl.supermarket_id = sn.supermarket_id
//       WHERE p.product_name LIKE CONCAT('%', ?, '%');`,
//       [query]
//     );
    
    
//     //Sample API Response
//     //{
// //   "data": [
// //     {
// //       "product_name": "Milk (1 liter)",
// //       "image_path": "/images/milk.jpg",
// //       "price": 400,
// //       "supermarket_name": "Aldi",
// //       "location_name": "Nyugati pályaudvar"
// //     }
// //   ]
// // }

//     res.json({ data: rows });// //"Here's the data I'm sending back to you, frontend — it's in JSON format."
//    // res.json({ status: 'success', data: results });//wraps results in an object-->>
//     // {
//     //   "status": "success",
//     //   "data": [ /* array of items */ ]
//     // }
//     ///You expect response.data to be an array, but it's actually an object.

//   } catch (error) {
//     console.error("Search error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// module.exports = router;


