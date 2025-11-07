const { getConnection } = require("./db");

// 🕓 Remove expired deals
async function removeExpiredDeals() {
  try {
    const db = await getConnection(); // Use the pool

    // Update prices table to mark expired deals as not on deal
    await db.query(`
      UPDATE deals d
      JOIN prices p ON d.product_id = p.product_id AND d.location_id = p.location_id
      SET p.on_deal = false
      WHERE NOW() > d.deal_end_date
    `);

    // Remove expired deals
    await db.query(`
      DELETE FROM deals
      WHERE NOW() > deal_end_date
    `);

    console.log("✅ Expired deals removed successfully");
  } catch (error) {
    console.error("❌ Error removing expired deals:", error);
  }
}

// 🟢 Activate valid deals
async function activateDeals() {
  try {
    const db = await getConnection();

    await db.query(`
      UPDATE deals d
      JOIN prices p ON d.product_id = p.product_id AND d.location_id = p.location_id
      SET p.on_deal = true
      WHERE NOW() BETWEEN d.deal_start_date AND d.deal_end_date
    `);

    console.log("✅ Active deals updated successfully");
  } catch (error) {
    console.error("❌ Error activating deals:", error);
  }
}

// 🔔 Create deal expiration alerts
async function createDealExpirationAlerts(io) {
  try {
    const db = await getConnection();

    const [expiringDeals] = await db.query(`
      SELECT 
        d.deal_id,
        d.product_id,
        d.location_id,
        d.deal_end_date,
        p.product_name,
        sl.location_name,
        s.supermarket_name,
        f.user_id
      FROM deals d
      JOIN products p ON d.product_id = p.product_id
      JOIN supermarket_locations sl ON d.location_id = sl.location_id
      JOIN supermarkets s ON sl.supermarket_id = s.supermarket_id
      JOIN favorites f ON d.product_id = f.product_id
      LEFT JOIN alerts a ON d.product_id = a.product_id 
        AND d.location_id = a.location_id 
        AND a.type = 'deal_expiration'
        AND a.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      WHERE d.deal_end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
        AND a.alert_id IS NULL
    `);

    console.log(`⏰ Found ${expiringDeals.length} expiring deals`);

    for (const deal of expiringDeals) {
      const expirationTime = new Date(deal.deal_end_date);
      const hoursUntilExpiration = Math.round((expirationTime - new Date()) / (1000 * 60 * 60));

      const alertMessage = `Hurry! The deal on ${deal.product_name} at ${deal.supermarket_name}, ${deal.location_name} expires in ${hoursUntilExpiration} hours!`;

      const [result] = await db.query(
        `INSERT INTO alerts (user_id, message, created_at, type, product_id, location_id)
         VALUES (?, ?, NOW(), ?, ?, ?)`,
        [deal.user_id, alertMessage, "deal_expiration", deal.product_id, deal.location_id]
      );

      if (io) {
        io.to(`user_${deal.user_id}`).emit("newAlert", {
          alert_id: result.insertId,
          message: alertMessage,
          timestamp: new Date().toISOString(),
          type: "deal_expiration",
          product_id: deal.product_id,
          location_id: deal.location_id,
        });
        console.log(`📢 Expiration alert sent to user ${deal.user_id}`);
      }
    }

    console.log("✅ Deal expiration alerts sent successfully");
  } catch (error) {
    console.error("❌ Error creating deal expiration alerts:", error);
  }
}

module.exports = {
  removeExpiredDeals,
  activateDeals,
  createDealExpirationAlerts,
};
