const express = require('express');//imports the Express module
const cors = require('cors');
require('dotenv').config();
const path = require('path');  //ADD THIS LINE BEFORE USING `path
const app = express();//Creating an instance of an Express application. Creates an express instance. This app object is the main part of my server. It has methods to : 1. define routes:app.get(), app.post() 2. Add middleware:app.use() 3. start the server: app.listen 4. Handle configuration and settings
const PORT = process.env.PORT || 5000;//process because it's a built-in Node.js object that gives us access to the environment in which the app is running.In other words, process lets your code interact with the system it's running on 

app.use('/images', express.static(path.join(__dirname, 'public/images')));


// //1.First, Socket.IO is initialized on the server:
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://price-comparison-frontend-t96z.onrender.com" // add my deployed frontend URL
];
const io = new Server(server, { 
  cors: { 
    origin: allowedOrigins, // allow both local & deployed frontend
    methods: ["GET", "POST"],
    credentials: true
  } 
});





// Import scheduled tasks
const { removeExpiredDeals, activateDeals, createDealExpirationAlerts } = require('./scheduledTasks');

// Initialize socket.io for alerts
const alertsModule = require('./routes/alerts');
alertsModule.initializeSocket(io);

// Initialize socket.io for reviews
const reviewsModule = require('./routes/reviews');
reviewsModule.initializeSocket(io);

// Initialize socket.io for price submissions
const priceSubmissionsModule = require('./routes/priceSubmissions');
priceSubmissionsModule.initializeSocket(io);


//  Socket.IO server-side setup....Socket.io connection handling-->  — handling real-time WebSocket connections.
// 3.The server sets up connection handling and room management:
io.on('connection', (socket) => {// sets up a listener for when a new client (browser/user) connects to your Socket.IO server.....socket is the individual connection object for that client — you can think of it like a private channel between the server and this one user.
  console.log('📡 A user connected with ID:', socket.id);// socket.id is a unique ID that Socket.IO automatically gives to each connected user.


  // Inside the connection
  socket.on('join', (userId) => {//Listens for a custom event called 'join' from the client.
    const roomName = `user_${userId}`;//The client sends a userId..........
    socket.join(roomName);
    console.log(`User ${userId} joined room ${roomName}`);
  });

  socket.on('joinOwnerRoom', (locationId) => {//The client sends a locationId (maybe a store or location they "own").
    const roomName = `owner_${locationId}`;
    socket.join(roomName);//The server makes a room like owner_456 and adds the socket to it.
    console.log(`Owner joined room ${roomName}`);
  });// Now you can do real-time updates to just the owners of a specific store/location.

  socket.on('disconnect', () => {
    console.log('❌User disconnected:', socket.id);
  });
});



app.set('io', io); 

// Middleware

//app.use(cors());



app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));//ADDED FOR AIVEN





app.use(express.json());
// const path = require('path');
app.use(express.static(path.join(__dirname, 'public'))); 
// Routes..Connect routes
app.use('/api/alerts', require('./routes/alerts').router);
app.use('/api/auth', require("./routes/auth"));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/register', require("./routes/register"));
app.use('/api/products', require('./routes/products'));
app.use('/api/supermarkets', require('./routes/supermarkets'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/reviews', require('./routes/reviews').router);
app.use('/api/explore', require('./routes/explore'));
app.use('/api/prices', require('./routes/prices'));
app.use('/api/users', require('./routes/users'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/supermarket_locations', require('./routes/supermarket_locations'));
app.use('/api/search', require('./routes/search'));
app.use('/api/category', require('./routes/category'));
app.use('/api/productsbycategory', require('./routes/productsbycategory'));
app.use('/api/instock', require('./routes/instock'));
app.use('/api/price-submissions', require('./routes/priceSubmissions').router);
app.use('/uploads', express.static('uploads'));//So images can be accessed like:   //http://localhost:5000/uploads/evidence/yourimage.jpg






app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Run scheduled tasks
// Check for expired deals every hour
setInterval(removeExpiredDeals, 60 * 60 * 1000);

// Check for deals that should become active every hour
setInterval(activateDeals, 60 * 60 * 1000);

// Check for deals that will expire soon every hour
setInterval(() => createDealExpirationAlerts(io), 60 * 60 * 1000);

// Run tasks immediately on server start
removeExpiredDeals();
activateDeals();

//Start the server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// }); 

//since am using http.createServer(app) for socket.io, I should listen on http, not app: Otherwise, Socket.io won't work properly. You created http with require('http').createServer(app);, and io is hooked to that, not app.listen.
// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

