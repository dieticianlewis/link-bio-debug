// backend/routes/users.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/users/me - Get current authenticated user's app profile
router.get('/me', authMiddleware, async (req, res) => {
  console.log("[GET /api/users/me] Handler reached.");
  if (req.localUser) {
    res.status(200).json(req.localUser);
  } else if (req.supabaseUser) {
    res.status(404).json({
      message: "User profile not found. Please complete setup.",
      needsProfileSetup: true,
      email: req.supabaseUser.email
    });
  } else {
    // This state should ideally be caught by authMiddleware sending 401
    res.status(401).json({ message: "User not authenticated." });
  }
});

// POST /api/users/profile - Create or Update user's app profile
router.post('/profile', authMiddleware, async (req, res) => {
  console.log("[POST /api/users/profile] Handler reached. Body:", req.body);
  if (!req.supabaseUser) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const { username, displayName, bio, profileImageUrl } = req.body;
  const supabaseAuthId = req.supabaseUser.id;
  const userEmailFromSupabase = req.supabaseUser.email;

  if (!username || typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({ message: "Username is required and must be a non-empty string." });
  }
  const processedUsername = username.trim().toLowerCase();

  try {
    const existingUserByUsername = await prisma.user.findFirst({
      where: { username: processedUsername, NOT: { supabaseAuthId: supabaseAuthId } },
    });
    if (existingUserByUsername) {
      return res.status(400).json({ message: "Username is already taken." });
    }

    const profileData = {
      username: processedUsername,
      displayName: displayName || '',
      bio: bio || '',
      profileImageUrl: profileImageUrl || null,
    };
    const createData = { ...profileData, email: userEmailFromSupabase, supabaseAuthId };

    const userProfile = await prisma.user.upsert({
      where: { supabaseAuthId: supabaseAuthId },
      update: profileData,
      create: createData,
    });
    console.log(`[POST /api/users/profile] Profile upserted: ${userProfile.username}`);
    res.status(201).json(userProfile);
  } catch (error) {
    console.error("[POST /api/users/profile] Error:", error);
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return res.status(400).json({ message: "Username already taken (DB)." });
    }
    res.status(500).json({ message: "Failed to update profile.", details: error.message });
  }
});

module.exports = router;