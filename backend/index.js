// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { prisma } = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL }));
// Stripe webhook endpoint needs raw body BEFORE express.json()
// We'll define stripeRoutes and its specific webhook handler later
// app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), stripeWebhookHandler);
app.use(express.json()); // For parsing application/json for other routes

// Import Routes
const authMiddleware = require('./middleware/auth').authMiddleware; // Corrected import
const userRoutes = require('./routes/users');
const linkRoutes = require('./routes/links');
const publicProfileRoutes = require('./routes/publicProfile');
const stripeRoutes = require('./routes/stripe'); // Create this file

// Public Routes (no auth needed)
app.get('/api', (req, res) => res.send('Link Bio API Running!'));
app.use('/api/public', publicProfileRoutes);

// Routes that might have mixed protection or handle initial user setup
app.use('/api/users', userRoutes); // e.g., POST /api/users/profile to create/update

// Protected Routes (require Supabase JWT validation)
app.use('/api/links', authMiddleware, linkRoutes);

// Stripe Routes (some public like webhook, some protected like connect onboarding)
app.use('/api/stripe', stripeRoutes); // Stripe routes will handle their own auth middleware where needed

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = { prisma }; // Export prisma for use in route files