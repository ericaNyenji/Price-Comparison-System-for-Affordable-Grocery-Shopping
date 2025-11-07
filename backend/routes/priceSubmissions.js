// routes/priceSubmissions.js
const express = require('express');
const router = express.Router();
//const db = require('../db');
const { getConnection } = require("../db");
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

let io;

// Initialize socket.io
const initializeSocket = (socketIO) => {
  io = socketIO;
};

// Configure multer storage for evidence images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/evidence'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only .jpg, .jpeg, .png allowed'));
    }
    cb(null, true);
  },
});

//  POST - submit new price update (with optional image)
router.post('/', upload.single('evidence_image'), async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || "defaultSecretKey");
    if (decoded.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can submit price updates' });
    }

    const { product_id, location_id, new_price, evidence_url } = req.body;

        // Determine evidence fields
    let evidence_image_path = null;
    let evidence_url_final = null;

    if (req.file) {
    // user uploaded an image
    evidence_image_path = req.file.path;
    } else if (evidence_url && evidence_url.trim() !== "") {
    // user provided a URL (no image file)
    evidence_url_final = evidence_url.trim();
    } 
    // else → neither image nor URL: both stay null

    // await db.query(
    // `DELETE FROM price_submissions 
    // WHERE customer_id = ? AND product_id = ? AND location_id = ? AND status = 'pending'`,
    // [decoded.userId, product_id, location_id]
    // );

    // Always ensure old/stale paths aren’t kept in DB
    const [result] = await db.query(
    `INSERT INTO price_submissions 
    (customer_id, product_id, location_id, new_price, evidence_url, evidence_image, status) 
    VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [decoded.userId, product_id, location_id, new_price, evidence_url_final, evidence_image_path]
    );


    // Fetch the newly created submission with joins for socket message...Fetching the full new record and emit it via Socket.IO so the owner can see it in real time:
    const [newSubmission] = await db.query(`
    SELECT ps.*, c.username AS customer_name, p.product_name
    FROM price_submissions ps
    JOIN customers c ON ps.customer_id = c.user_id
    JOIN products p ON ps.product_id = p.product_id
    WHERE ps.submission_id = ?
    `, [result.insertId]);

    
    if (io) {
    const cleanSubmission = { ...newSubmission[0] };
    if (!req.file) cleanSubmission.evidence_image = null; //  clear old file path
    //io.emit('newPriceSubmission', cleanSubmission);
    }


   // res.status(201).json(newSubmission[0]);



    // Get product + customer name for socket message
    const [[product]] = await db.query('SELECT product_name FROM products WHERE product_id = ?', [product_id]);
    const [[customer]] = await db.query('SELECT username FROM customers WHERE user_id = ?', [decoded.userId]);

    const cleanSubmission = { ...newSubmission[0] };
    if (!req.file) cleanSubmission.evidence_image = null; // clear stale image

    io.to(`owner_${location_id}`).emit('newPriceSubmission', {
    submission: cleanSubmission,
    message: `New price submission for ${product?.product_name} by ${customer?.username}`,
    });


    res.status(201).json({ message: 'Price submission added successfully', submission: cleanSubmission});

  } catch (err) {
    console.error('Error adding price submission:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//  GET - pending submissions for owner
router.get('/pending/:locationId', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || "defaultSecretKey");

    const { locationId } = req.params;
    const [owner] = await db.query(
      'SELECT * FROM owners WHERE user_id = ? AND location_id = ?',
      [decoded.userId, locationId]
    );
    if (!owner.length) return res.status(403).json({ error: 'Not authorized' });

    const [submissions] = await db.query(`
      SELECT ps.*, p.product_name, c.username AS customer_name, pr.price AS current_price
      FROM price_submissions ps
      JOIN products p ON ps.product_id = p.product_id
      JOIN customers c ON ps.customer_id = c.user_id
      JOIN prices pr ON ps.product_id = pr.product_id AND ps.location_id = pr.location_id
      WHERE ps.location_id = ? AND ps.status = 'pending'
    `, [locationId]);

    res.json(submissions);
  } catch (err) {
    console.error('Error fetching pending submissions:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT - approve submission
router.put('/approve/:submissionId', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || "defaultSecretKey");

    const { submissionId } = req.params;
    const [[submission]] = await db.query('SELECT * FROM price_submissions WHERE submission_id = ?', [submissionId]);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const [ownerRows] = await db.query(
      'SELECT * FROM owners WHERE user_id = ? AND location_id = ?',
      [decoded.userId, submission.location_id]
    );
    if (!ownerRows.length) return res.status(403).json({ error: 'Not authorized' });

    try {
    const db = await getConnection();
    await db.query('START TRANSACTION');
    await db.query(
      'UPDATE prices SET price = ? WHERE product_id = ? AND location_id = ?',
      [submission.new_price, submission.product_id, submission.location_id]
    );
    await db.query(
      "UPDATE price_submissions SET status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE submission_id = ?",
      [submissionId]
    );
    await db.query('COMMIT');
    } catch (err) {if (db) await db.query('ROLLBACK');
  console.error('Error approving submission:', err);
  return res.status(500).json({ error: 'Failed to approve submission' });}

    if (io) {
      io.to(`user_${submission.customer_id}`).emit('priceSubmissionApproved', {
        message: `Your price submission for product ${submission.product_id} was approved.`,
      });
    }

    res.json({ message: 'Price update approved successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error approving submission:', err);
    res.status(500).json({ error: 'Failed to approve submission' });
  }
});

//  PUT - reject submission
router.put('/reject/:submissionId', async (req, res) => {
  try {
    const db = await getConnection();//AIVEN MYSQL
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || "defaultSecretKey");

    const { submissionId } = req.params;
    const [[submission]] = await db.query('SELECT * FROM price_submissions WHERE submission_id = ?', [submissionId]);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const [ownerRows] = await db.query(
  'SELECT * FROM owners WHERE user_id = ? AND location_id = ?',
  [decoded.userId, submission.location_id]
);
if (!ownerRows.length) return res.status(403).json({ error: 'Not authorized' });


    await db.query(
      "UPDATE price_submissions SET status = 'rejected', rejected_at = CURRENT_TIMESTAMP WHERE submission_id = ?",
      [submissionId]
    );

    if (io) {
      io.to(`user_${submission.customer_id}`).emit('priceSubmissionRejected', {
        message: `Your price submission for product ${submission.product_id} was rejected.`,
      });
    }

    res.json({ message: 'Price update rejected successfully' });
  } catch (err) {
    console.error('Error rejecting submission:', err);
    res.status(500).json({ error: 'Failed to reject submission' });
  }
});

module.exports = { router, initializeSocket };
