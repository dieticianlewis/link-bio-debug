// backend/routes/publicProfile.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/db');

// GET /api/public/profile/:username - Get a user's public profile by their app username
router.get('/profile/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const userProfile = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { // Only select fields safe for public display
        id: true,
        username: true,
        displayName: true,
        bio: true,
        profileImageUrl: true,
        links: { // Include their links
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            url: true,
            // Do not include clicks or other private link data here unless intended
          }
        },
        // IMPORTANT: DO NOT select stripeAccountId, email, supabaseAuthId, etc.
      },
    });

    if (!userProfile) {
      return res.status(404).json({ message: "Profile not found." });
    }

    // Optionally, check if Stripe is connected and ready for payments for this user
    // This helps the frontend decide if the "Send Tip" button should be active.
    const isStripeReady = !!userProfile.stripeAccountId && userProfile.stripeOnboardingComplete; // This won't work as stripeAccountId is not selected above
    // To do the above, you'd need to fetch the user with stripeAccountId and stripeOnboardingComplete
    // then reconstruct the public profile. Or make a separate internal check.

    // For simplicity now, let's just return the profile.
    // Frontend can make another call if it needs to check payment readiness.
    // OR, add a non-sensitive flag to the User model like `acceptsPayments`
    // that you set in backend when stripeOnboardingComplete is true.

    // Let's refine the selection to include payment readiness info carefully
    const userWithStripeStatus = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
        select: {
            id: true,
            username: true,
            displayName: true,
            bio: true,
            profileImageUrl: true,
            stripeAccountId: true, // Needed to check if they can receive payments
            stripeOnboardingComplete: true, // Needed for the same reason
            links: {
                orderBy: { order: 'asc' },
                select: { id: true, title: true, url: true }
            }
        }
    });

    if (!userWithStripeStatus) {
      return res.status(404).json({ message: "Profile not found." });
    }

    const publicProfileData = {
        id: userWithStripeStatus.id,
        username: userWithStripeStatus.username,
        displayName: userWithStripeStatus.displayName,
        bio: userWithStripeStatus.bio,
        profileImageUrl: userWithStripeStatus.profileImageUrl,
        links: userWithStripeStatus.links,
        canReceivePayments: !!userWithStripeStatus.stripeAccountId && userWithStripeStatus.stripeOnboardingComplete,
    };


    res.json(publicProfileData);
  } catch (error) {
    console.error("Error fetching public profile:", error);
    res.status(500).json({ message: "Failed to fetch public profile.", error: error.message });
  }
});

module.exports = router;