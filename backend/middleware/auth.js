// backend/middleware/auth.js
const { createClient } = require('@supabase/supabase-js');
const { prisma } = require('../lib/db');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "FATAL BACKEND ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from backend/.env. Authentication middleware will fail."
  );
}

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  { auth: { persistSession: false } }
);

const authMiddleware = async (req, res, next) => {
  console.log(`[AuthMiddleware] Request: ${req.method} ${req.originalUrl}`);
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("[AuthMiddleware] Denied: No token or malformed header.");
    return res.status(401).json({ message: 'Unauthorized: No token provided or malformed header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log("[AuthMiddleware] Denied: No token found after 'Bearer '.");
    return res.status(401).json({ message: 'Unauthorized: No token found after Bearer' });
  }

  try {
    const { data: { user: supabaseUser }, error: supabaseError } = await supabaseAdmin.auth.getUser(token);

    if (supabaseError || !supabaseUser) {
      console.error('[AuthMiddleware] Denied: Supabase token validation failed -', supabaseError?.message || 'No user object.');
      return res.status(401).json({ message: `Unauthorized: ${supabaseError?.message || 'Invalid token or Supabase user not found'}` });
    }

    console.log(`[AuthMiddleware] Supabase token OK. User ID: ${supabaseUser.id}`);
    req.supabaseUser = supabaseUser;

    try {
      if (!prisma) throw new Error('Prisma client not available');
      const localUser = await prisma.user.findUnique({
        where: { supabaseAuthId: supabaseUser.id },
      });

      if (!localUser) {
        console.warn(`[AuthMiddleware] No local Prisma profile for Supabase ID: ${supabaseUser.id}.`);
      } else {
        console.log(`[AuthMiddleware] Local Prisma user found: ${localUser.username}`);
      }
      req.localUser = localUser;
    } catch (prismaError) {
      console.error('[AuthMiddleware] Prisma Error:', prismaError);
      return res.status(500).json({ message: 'Internal server error finding local user profile' });
    }
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Unexpected Error:', error);
    return res.status(500).json({ message: 'Internal server error during authentication process' });
  }
};

module.exports = { authMiddleware };