const { getConnection } = require("./db");

(async () => {
  const conn = await getConnection();
  if (!conn) return;

  try {
    const [rows] = await conn.query("SELECT NOW() AS `current_time`;");
    console.log("🕒 Current time from DB:", rows[0].current_time);
  } catch (err) {
    console.error("❌ Query failed:", err.message);
  } finally {
    await conn.end();
  }
})();
