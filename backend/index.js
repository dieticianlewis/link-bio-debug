// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware Configuration ---

// 1. More Robust CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL, // e.g., 'http://localhost:3000'
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow these methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
  optionsSuccessStatus: 200 // For pre-flight requests
};
app.use(cors(corsOptions));
// The 'cors' middleware with these options will automatically handle preflight OPTIONS requests.

// Route for Stripe webhooks (must come before express.json())
const stripeRoutes = require('./routes/stripe');
app.use('/api/stripe', stripeRoutes);

// Global JSON parser for all other routes
app.use(express.json());

// --- Route Imports ---
const { authMiddleware } = require('./middleware/auth');
const userRoutes = require('./routes/users');
const linkRoutes = require('./routes/links');
const publicProfileRoutes = require('./routes/publicProfile');

// --- Route Definitions ---
app.get('/api', (req, res) => res.send('Link Bio API Running!'));
app.use('/api/public', publicProfileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/links', authMiddleware, linkRoutes);

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});