// // const mysql = require('mysql2/promise');
// // require('dotenv').config();

// // const connection = mysql.createPool({
// //   host: process.env.DB_HOST,
// //   user: process.env.DB_USER,
// //   password: process.env.DB_PASSWORD,
// //   database: process.env.DB_NAME,
// // });

// // // Test the connection
// // const testConnection = async () => {
// //   try {
// //     const conn = await connection.getConnection();
// //     console.log('✅ Database connection successful');
// //     conn.release();
// //   } catch (err) {
// //     console.error('❌ Database connection failed:', err);
// //   }
// // };

// // testConnection();

// // module.exports = connection;

// const { Pool } = require('pg');//This version uses Neon’s connection string (DATABASE_URL) from my .env.
// require('dotenv').config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false, // required by Neon
//   },
// });

// (async () => {
//   try {
//     const client = await pool.connect();
//     console.log('✅ Connected to PostgreSQL (Neon)');
//     client.release();
//   } catch (err) {
//     console.error('❌ Database connection failed:', err);
//   }
// })();

// module.exports = pool;



const mysql = require("mysql2/promise");
const fs = require("fs");
require("dotenv").config();

let pool;

async function initDB() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        ca: fs.readFileSync(__dirname + "/ca.pem"), // <-- Use your certificate
      },
    });
    console.log("✅ Connected to Aiven MySQL!");
  }
  return pool;
}

// Helper function — returns a connection for each query
async function getConnection() {
  const db = await initDB();
  return db;
}

module.exports = { getConnection };
