// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { prisma } = require('./lib/db'); // Import prisma from lib/db.js

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware Configuration ---
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // If you need to handle cookies across domains (might not be needed for Supabase JWT via header)
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// --- Route Imports ---
const { authMiddleware } = require('./middleware/auth');
const userRoutes = require('./routes/users');
const linkRoutes = require('./routes/links');
const publicProfileRoutes = require('./routes/publicProfile');
const stripeModule = require('./routes/stripe'); // Import the whole module

// --- Route Definitions ---

// Stripe webhook needs to be defined BEFORE app.use(express.json())
// because it needs the raw request body.
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), stripeModule.handleWebhook);

// Global JSON parser for all *other* routes
app.use(express.json());


// --- API Routes ---
app.get('/api', (req, res) => res.send('Link Bio API Running!'));

// Public routes
app.use('/api/public', publicProfileRoutes);

// User related routes (authMiddleware is applied within specific routes in users.js where needed)
app.use('/api/users', userRoutes);

// Link related routes (all protected by authMiddleware applied here)
app.use('/api/links', authMiddleware, linkRoutes);

// Other Stripe routes (that expect JSON, these are mounted after express.json())
app.use('/api/stripe', stripeModule.router);


// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
  console.error("[Unhandled Error]", err.stack || err.message || err);
  // Avoid sending stack trace to client in production
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : (err.message || 'Something broke!');
  res.status(status).json({ message });
});

// --- Server Startup ---
async function main() {
  // Optional: Test Prisma connection on startup
  try {
    await prisma.$connect();
    console.log("Successfully connected to the database via Prisma.");
  } catch (dbError) {
    console.error("Failed to connect to the database on startup:", dbError);
    process.exit(1); // Exit if DB connection fails critically
  }

  app.listen(PORT, () => {
    console.log(`Backend server is listening on http://localhost:${PORT}`);
    console.log(`Expecting frontend at: ${process.env.FRONTEND_URL}`);
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("WARNING: Supabase URL or Service Role Key might be missing in .env, backend auth will fail.");
    }
    if (!process.env.DATABASE_URL) {
      console.warn("WARNING: DATABASE_URL might be missing in .env, Prisma will fail.");
    }
     if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn("WARNING: Stripe Secret Key or Webhook Secret might be missing. Stripe functionality will be affected.");
    }
  });
}

// Graceful shutdown
const cleanup = async () => {
  console.log("Disconnecting Prisma...");
  await prisma.$disconnect();
  console.log("Prisma disconnected. Exiting.");
  process.exit(0);
};

process.on('SIGINT', cleanup);  // Catch Ctrl+C
process.on('SIGTERM', cleanup); // Catch kill signals

main().catch(async (e) => {
  console.error("Error during server startup:", e);
  await prisma.$disconnect();
  process.exit(1);
});

// No explicit exports needed from index.js if modules import prisma from lib/db.js
// module.exports = { app }; // Only if you need to import `app` elsewhere (e.g., for testing)