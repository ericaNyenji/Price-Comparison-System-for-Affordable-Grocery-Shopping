const express = require("express");
const router = express.Router();
//const db = require("../db"); 
const { getConnection } = require("../db");

router.get("/", async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const [categories] = await db.query("SELECT * FROM categories");

    const exploreData = [];

    for (const category of categories) {
      const [products] = await db.query(
        `SELECT DISTINCT 
           p.product_id, p.product_name, p.image_path
         FROM products p
         WHERE p.category_id = ?`,
        [category.category_id]
      );

      exploreData.push({
        category_id: category.category_id,
        category_name: category.category_name,
        products
      });
    }

    res.json(exploreData);
  } catch (err) {
    console.error("Error fetching explore data:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;




