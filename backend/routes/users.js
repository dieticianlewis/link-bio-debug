// backend/routes/users.js
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma'); // Using the separated Prisma client
const { authMiddleware } = require('../middleware/auth');

// GET current logged-in user's application profile
router.get('/me', authMiddleware, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }
  if (!req.localUser) { // localUser is from your Prisma User table, linked by supabaseAuthId
    return res.status(404).json({ 
      message: 'Application profile not found. Please complete your profile setup.',
      code: 'PROFILE_NOT_FOUND' 
    });
  }
  res.json(req.localUser);
});

// POST Create or Update user's application profile
router.post('/profile', authMiddleware, async (req, res) => {
  // Destructure profileImageUrl along with other fields
  const { username, displayName, bio, profileImageUrl } = req.body; 
  
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Authentication error: Supabase user ID missing." });
  }
  const supabaseAuthId = req.user.id;
  const userEmail = req.user.email; // Get email from authenticated Supabase user

  if (!username || typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({ message: "Username is required and cannot be empty." });
  }
  const trimmedUsername = username.trim();
  if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(trimmedUsername)) {
    return res.status(400).json({ message: "Username must be 3-20 characters (letters, numbers, _, ., -)." });
  }

  try {
    // Check if username is already taken by *another* user
    const existingUserByUsername = await prisma.user.findFirst({
      where: { 
        username: { equals: trimmedUsername, mode: 'insensitive' }, // Case-insensitive check
        NOT: { supabaseAuthId: supabaseAuthId } // Exclude the current user from this check
      },
    });

    if (existingUserByUsername) {
      return res.status(409).json({ message: "Username is already taken by another user." }); // 409 Conflict
    }

    // Prepare data for upsert
    const dataToUpsert = {
      username: trimmedUsername,
      displayName: displayName || null,
      bio: bio || null,
      email: userEmail, // Keep email in sync with Supabase auth
      profileImageUrl: profileImageUrl || null, // Save the image URL (can be null)
      supabaseAuthId: supabaseAuthId, // This is the link for the 'create' part
    };

    // Data specifically for the update part (don't try to update supabaseAuthId if record exists)
    const dataForUpdate = {
        username: trimmedUsername,
        displayName: displayName || null,
        bio: bio || null,
        email: userEmail,
        profileImageUrl: profileImageUrl || null,
    };

    const upsertedUser = await prisma.user.upsert({
      where: { supabaseAuthId: supabaseAuthId }, // Unique constraint to find existing user
      update: dataForUpdate,
      create: dataToUpsert, // Use dataToUpsert which includes supabaseAuthId for creation
    });

    console.log(`POST /api/users/profile: Profile successfully upserted for Supabase user ${supabaseAuthId}`);
    res.status(200).json(upsertedUser); // Send back the created/updated profile

  } catch (error) {
    console.error(`POST /api/users/profile error for Supabase user ${supabaseAuthId}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      // This database-level unique constraint check is a fallback
      return res.status(409).json({ message: "This username is already registered (database constraint)." });
    }
    res.status(500).json({ message: "An error occurred while saving the profile.", error: error.message });
  }
});

module.exports = router;