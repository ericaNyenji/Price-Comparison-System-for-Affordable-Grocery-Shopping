const express = require('express');
const router = express.Router();
//const db = require('../db');
const { getConnection } = require("../db");
const jwt = require('jsonwebtoken');

// Your route: /api/productsbycategory/:categoryId
// GET products by category and customer country
router.get('/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(' ')[1];

  try {
    const db = await getConnection();//AIVEN MYSQL
    // Decode JWT to get customer's country
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || "defaultSecretKey");
    const userCountry = decoded.country;

    if (!userCountry) {
      return res.status(400).json({ error: "Country not found in token" });
    }

    // Get category info
    const [category] = await db.query(
      "SELECT * FROM categories WHERE category_id = ?",
      [categoryId]
    );

    if (!category.length) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Fetch products only for this category *and* user's country
    const [products] = await db.query(
      "SELECT product_id, product_name, image_path FROM products WHERE category_id = ? AND country = ?",
      [categoryId, userCountry]
    );


    // const [products] = await db.query(
    //   "SELECT product_id, product_name, image_path FROM products WHERE category_id = ?",
    //   [categoryId]
    // );

    res.json({
      category_name: category[0].category_name,
      products
    });
  } catch (err) {
    console.error("Error fetching products by category:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
