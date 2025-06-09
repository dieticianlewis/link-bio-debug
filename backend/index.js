// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma'); // Import Prisma client

const app = express();
const PORT = process.env.PORT || 3001;

// Global Middleware
app.use(cors({ origin: process.env.FRONTEND_URL }));

// Import Routers
const stripeRoutes = require('./routes/stripe');
const userRoutes = require('./routes/users');
const linkRoutes = require('./routes/links');
const publicProfileRoutes = require('./routes/publicProfile');
const { authMiddleware } = require('./middleware/auth');

// Stripe webhook route in stripe.js uses express.raw().
// Mount stripeRoutes; it handles its own body parsing for /webhook.
app.use('/api/stripe', stripeRoutes);

// General JSON parser for all other routes that need it
app.use(express.json());

// Public Routes
app.get('/api', (req, res) => res.send('Link Bio API Running!'));
app.use('/api/public', publicProfileRoutes);

// User routes (protection handled internally within users.js for specific routes)
app.use('/api/users', userRoutes);

// Protected Link Routes
app.use('/api/links', authMiddleware, (req, res, next) => {
  if (!req.localUser) {
    return res.status(403).json({ message: "User profile must be set up to manage links.", code: "PROFILE_REQUIRED" });
  }
  next();
}, linkRoutes);

// Centralized Error Handling
app.use((err, req, res, next) => {
  console.error("Unhandled Express Error:", err.stack || err.message || err);
  if (!res.headersSent) {
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});