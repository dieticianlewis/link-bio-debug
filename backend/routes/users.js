// backend/routes/users.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../index'); // Ensure this path correctly gets your Prisma client instance
const { authMiddleware } = require('../middleware/auth');

// GET /api/users/me - Get the currently authenticated user's application profile
// This route is protected by authMiddleware.
// authMiddleware should attach `req.supabaseUser` (from Supabase token)
// and `req.localUser` (from your Prisma DB, or null if not found).
router.get('/me', authMiddleware, async (req, res) => {
  console.log("[GET /api/users/me] Route handler reached.");

  if (req.localUser) {
    // If a local Prisma user profile exists for the authenticated Supabase user
    console.log("[GET /api/users/me] Found localUser, returning profile:", req.localUser.username);
    res.status(200).json(req.localUser);
  } else if (req.supabaseUser) {
    // If Supabase user is authenticated but no local Prisma profile exists
    console.log(`[GET /api/users/me] No localUser found for Supabase user ${req.supabaseUser.id}. Client should prompt profile creation.`);
    res.status(404).json({
      message: "User profile not found in application. Please complete your profile.",
      needsProfileSetup: true, // A flag for the frontend
      supabase_user_id: req.supabaseUser.id,
      email: req.supabaseUser.email // Email from Supabase token can be used to prefill forms
    });
  } else {
    // This case should ideally not be reached if authMiddleware is working,
    // as it would have sent a 401 before this. But as a fallback:
    console.error("[GET /api/users/me] Critical error: authMiddleware passed but no supabaseUser on request.");
    res.status(500).json({ message: "Authentication error." });
  }
});

// POST /api/users/profile - Create or Update the user's application profile
// This route is also protected by authMiddleware.
// It uses `req.supabaseUser.id` as the link to your Prisma `User` table.
router.post('/profile', authMiddleware, async (req, res) => {
  console.log("[POST /api/users/profile] Route handler reached.");

  // req.supabaseUser should be populated by authMiddleware
  if (!req.supabaseUser) {
    console.error("[POST /api/users/profile] Critical error: No supabaseUser on request after authMiddleware.");
    return res.status(401).json({ message: "Authentication required." });
  }

  const { username, displayName, bio, profileImageUrl } = req.body;
  const supabaseAuthId = req.supabaseUser.id;
  const userEmailFromSupabase = req.supabaseUser.email;

  if (!username) {
    console.log("[POST /api/users/profile] Validation failed: Username is required.");
    return res.status(400).json({ message: "Username is required to create or update profile." });
  }

  const processedUsername = username.trim().toLowerCase(); // Trim and convert to lowercase

  try {
    // Check if the desired username is already taken by *another* user
    const existingUserByUsername = await prisma.user.findFirst({
      where: {
        username: processedUsername,
        NOT: {
          supabaseAuthId: supabaseAuthId, // Exclude the current user from this check
        },
      },
    });

    if (existingUserByUsername) {
      console.log(`[POST /api/users/profile] Validation failed: Username '${processedUsername}' already taken.`);
      return res.status(400).json({ message: "This username is already taken by another user." });
    }

    // Data for creating or updating the profile
    // Ensure email is only set during creation from the trusted Supabase token,
    // or if you explicitly allow email updates via this endpoint (generally not recommended here).
    const profileUpdateData = {
      username: processedUsername,
      displayName: displayName || null, // Ensure null if empty string, or handle as needed
      bio: bio || null,
      profileImageUrl: profileImageUrl || null,
    };

    const profileCreateData = {
      ...profileUpdateData,
      email: userEmailFromSupabase, // Set email on creation
      supabaseAuthId: supabaseAuthId, // Link to Supabase Auth
    };

    console.log(`[POST /api/users/profile] Attempting to upsert profile for supabaseAuthId: ${supabaseAuthId}`);
    const userProfile = await prisma.user.upsert({
      where: { supabaseAuthId: supabaseAuthId },
      update: profileUpdateData,
      create: profileCreateData,
    });

    console.log(`[POST /api/users/profile] Profile upserted successfully for username: ${userProfile.username}`);
    res.status(201).json(userProfile);

  } catch (error) {
    console.error("[POST /api/users/profile] Error during profile upsert:", error);
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      // This catch is for the unique constraint on username, though our manual check should catch it first.
      return res.status(400).json({ message: "This username is already taken (database constraint)." });
    }
    // Add more specific error handling if needed (e.g., for email unique constraint if you add it)
    res.status(500).json({ message: "Failed to create or update profile due to a server error.", details: error.message });
  }
});

module.exports = router;