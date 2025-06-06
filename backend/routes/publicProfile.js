// backend/routes/publicProfile.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/db');

// GET /api/public/profile/:username
router.get('/profile/:username', async (req, res) => {
  const { username } = req.params;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ message: "Valid username parameter is required." });
  }

  try {
    const userProfile = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        username: true,
        displayName: true,
        bio: true,
        profileImageUrl: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        links: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, title: true, url: true }
        }
      }
    });

    if (!userProfile) {
      return res.status(404).json({ message: "User profile not found." });
    }
    res.json(userProfile);
  } catch (error) {
    console.error(`[GET /api/public/profile/${username}] Error:`, error);
    res.status(500).json({ message: "Failed to fetch user profile." });
  }
});

module.exports = router;