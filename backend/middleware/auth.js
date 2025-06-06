// backend/middleware/auth.js
const { createClient } = require('@supabase/supabase-js');
const { prisma } = require('../lib/db');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // CRITICAL: Use a distinct variable

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "FATAL BACKEND ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from backend/.env. Authentication middleware will fail."
  );
  // In a real app, you might want to prevent the server from starting or throw a hard error.
}

// Initialize Supabase client with SERVICE ROLE KEY for admin/validation operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

const authMiddleware = async (req, res, next) => {
  console.log(`[AuthMiddleware] Request to: ${req.method} ${req.originalUrl}`);
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("[AuthMiddleware] Failed: No token or malformed header.");
    return res.status(401).json({ message: 'Unauthorized: No token provided or malformed header' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    console.log("[AuthMiddleware] Failed: No token found after 'Bearer '.");
    return res.status(401).json({ message: 'Unauthorized: No token found after Bearer' });
  }

  console.log("[AuthMiddleware] Token extracted. Attempting to validate with Supabase...");

  try {
    const { data: { user: supabaseUser }, error: supabaseError } = await supabaseAdmin.auth.getUser(token);

    if (supabaseError || !supabaseUser) {
      console.error('[AuthMiddleware] Supabase token validation failed or no user found:', supabaseError?.message || 'No user object returned by Supabase.');
      return res.status(401).json({ message: `Unauthorized: ${supabaseError?.message || 'Invalid token or Supabase user not found'}` });
    }

    console.log(`[AuthMiddleware] Supabase token validated. User ID: ${supabaseUser.id}, Email: ${supabaseUser.email}`);

    // Attach Supabase user to req object
    req.supabaseUser = supabaseUser; // Contains id, email, user_metadata, etc. from Supabase Auth

    // Now, attempt to find the corresponding user in your application's database (Prisma User table)
    // This part is specific to your application logic.
    // For GET /api/users/me, we expect to find a localUser.
    // For POST /api/users/profile, localUser might be null initially.
    try {
      console.log(`[AuthMiddleware] Attempting to find local user with supabaseAuthId: ${supabaseUser.id}`);
      const localUser = await prisma.user.findUnique({
        where: { supabaseAuthId: supabaseUser.id },
      });

      if (!localUser) {
        console.warn(`[AuthMiddleware] No local Prisma user profile found for Supabase Auth ID: ${supabaseUser.id}.`);
        // It's up to the route handler to decide if this is an error or expected.
        // For /api/users/me, this would typically lead to a 404 by that route handler.
      } else {
        console.log(`[AuthMiddleware] Local Prisma user found: ID ${localUser.id}, Username: ${localUser.username}`);
      }
      req.localUser = localUser; // Attach Prisma user (or null) to req object
    } catch (prismaError) {
      console.error('[AuthMiddleware] Error querying Prisma for local user:', prismaError);
      // This is an internal server error because the DB query failed.
      return res.status(500).json({ message: 'Internal server error finding local user profile' });
    }

    next();
  } catch (error) {
    // This outer catch block is for unexpected errors during the Supabase auth.getUser or other parts.
    console.error('[AuthMiddleware] Unexpected general error:', error);
    return res.status(500).json({ message: 'Internal server error during authentication process' }); // This is likely what your frontend saw
  }
};

module.exports = { authMiddleware };