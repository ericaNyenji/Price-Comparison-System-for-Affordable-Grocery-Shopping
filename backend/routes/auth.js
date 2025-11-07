//backend login route
// API endpoint the frontend React code is calling when the user logs in.
const express = require("express");//express: Web framework for Node.js.
const jwt = require("jsonwebtoken");//jsonwebtoken: Used to create a signed token after successful login.
const bcrypt = require("bcryptjs");//bcryptjs: For securely comparing hashed passwords.
const router = express.Router();//router: An Express Router instance to define routes.

//const db = require("../db"); // Assuming db.js is for database connection. db: A module (like a db.js file) handling your MySQL or other DB connection.
const { getConnection } = require("../db");//------ADDED FOR AIVEN



// Login endpoint....Login Route
router.post("/", async (req, res) => {//Hey, when someone sends a POST request to /login, here's the function that should run. It'll receive a request (req) and send back a response (res)."..................defines the /api/auth/login POST route. It receives login form data from the frontend.
  const { email, password } = req.body; //Extracts the email and password fields sent in the request.

  // User Lookup
  try {
    // // Find user by email
    // const [user] = await db.query("SELECT * FROM users WHERE email = ?", [email]);//Queries the database to find a user with the provided email.Returns an array, so [user] grabs the first (and only) match. 
    //AFTER DEBUG -->>>This gives you an array of users, and you're assigning user = result[0], but it's not a single user object directly — so if user.password_hash is undefined, it could also mean the destructuring is wrong. 
    // Try to find the user in the 'customers' table
    const db = await getConnection(); //------ADDED FOR AIVEN
    let [rows] = await db.query("SELECT * FROM customers WHERE email = ?", [email]);
    let user = rows[0]; // Get the first result from the array
    let role = "customer";

    // If not found in 'customers', look in the 'owners' table
    if (!user) {
      [rows] = await db.query("SELECT * FROM owners WHERE email = ?", [email]);
      user = rows[0]; // Get the first result from the array
      role = "owner";
    }

    if (!user) {
      return res.status(400).json({ error: "User not found" }); // If no user is found in either table, return a 400 response with an error message.
    }


    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);//Compares the plaintext password from the frontend to the hashed one stored in the DB.
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });//This sends back a response with a status code 400, which means:bad Request (Client sent something incorrect) ..........If it doesn't match, return a 400 error.

    let userCountry = null;
    let currencyCode = null;
    let locationName = null;
    //let currencySymbol = null;

    if (role === "customer") {
      userCountry = user.country;
      currencyCode = user.currency_code || null;
    } else if (role === "owner") {
      // look up country from supermarket_locations using location_id
      const [locationRows] = await db.query(
        "SELECT country, currency_code, location_name FROM supermarket_locations WHERE location_id = ?",
        [user.location_id]
      );
      userCountry = locationRows[0]?.country || null;
      currencyCode = locationRows[0]?.currency_code || null;
      locationName = locationRows[0].location_name;
    }


    // Generate JWT token
    const token = jwt.sign(//YOU CAN USE THIS TOKEN TO VERIFY THE USER ANYWHERE ON BACKEND
      { 
        userId: user.user_id, 
        role: role, // Use the role variable we set earlier
        country: userCountry,  //include country for automatic filtering
        currency_code: currencyCode,
        email: user.email,
        supermarket_location:locationName,//only for owners
        name: user.username
        

      },
      process.env.JWT_SECRET_KEY || "defaultSecretKey",
      {
        expiresIn: "24h",
      }
    );

    // console.log("Sending login response:", {
    //   token,
    //   role,
    //   userId: user.user_id,
    //   name: user.username,
    //   email: user.email,
    //   locationId: user.location_id,
    //   country: userCountry  // ✅ include country in the response
    // });

    // Send response
    res.json({
      token,
      role,
      userId: user.user_id,
      name: user.username,
      email: user.email,
      locationId: user.location_id,
      locationName: locationName,
      country: userCountry,
      currency_code: currencyCode,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });//Catches any unexpected errors (e.g., DB issues) and sends a 500 response.
  }
});

module.exports = router;//Exporting the Router...Exports the route so it can be used in server.js (or wherever routes are mounted).
