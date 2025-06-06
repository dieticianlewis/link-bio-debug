// backend/middleware/auth.js

const { createClient } = require('@supabase/supabase-js');

// Create a Supabase admin client using the powerful service_role key.
// This client can bypass RLS and verify any user's JWT.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  // Verify the token using the admin client's auth.getUser method
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error) {
    // The error from Supabase is helpful, send it back.
    // e.g., "Invalid API key", "JWT expired", etc.
    console.error('[AuthMiddleware] Supabase token validation failed:', error.message);
    return res.status(401).json({ message: `Unauthorized: ${error.message}` });
  }

  if (!user) {
    return res.status(401).json({ message: 'Unauthorized: No user found for this token.' });
  }

  req.supabaseUser = user;
  next();
};

module.exports = { authMiddleware };