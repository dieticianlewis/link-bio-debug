// backend/routes/stripe.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

// 1. Create Stripe Connect Account and Onboarding Link
router.post('/connect/onboard-user', authMiddleware, async (req, res) => {
  try {
    const appUserId = req.localUser?.id; // From your Prisma User table

    if (!appUserId) {
      return res.status(403).json({ message: 'User application profile not found. Please complete your profile before connecting Stripe.' });
    }

    // req.localUser is your Prisma User object, req.user is the Supabase Auth user object
    const appProfile = req.localUser; 
    const supabaseAuthUser = req.user; 

    if (!appProfile.username) {
        return res.status(400).json({ message: 'Username is required in profile to generate Stripe connection.' });
    }

    let stripeAccountId = appProfile.stripeAccountId;

    if (!stripeAccountId) {
      // Construct the business_profile.url
      const platformBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'; // Fallback for dev
      const userProfileUrl = `${platformBaseUrl}/${appProfile.username}`;

      // Product description
      const productDescription = `Receiving tips and support via their page on ${process.env.PLATFORM_DISPLAY_NAME || 'our platform'}.`;
      // Add PLATFORM_DISPLAY_NAME="Your Site Name" to backend/.env

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US', // Or determine dynamically if you support multiple countries
        email: supabaseAuthUser.email, // Email from Supabase Auth user
        business_type: 'individual',   // PREFILLED
        business_profile: {
          url: userProfileUrl,         // PREFILLED with their public profile on your site
          mcc: '8999',                 // PREFILLED: "Professional Services" (generic, often suitable for creators/tips)
                                       // Other options: 
                                       // 5815 (Digital Goods Media), 
                                       // 7999 (Misc Rec Services - if it's more entertainment)
                                       // Choose the closest one.
          product_description: productDescription, // PREFILLED
          // name: appProfile.displayName || appProfile.username, // Optional: Business name, can be user's display name
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        // You are NOT pre-filling:
        // - individual.first_name, individual.last_name
        // - individual.dob
        // - individual.address
        // - individual.phone
        // - individual.ssn_last_4 (or other ID)
        // Stripe Express onboarding will collect these.
      });
      stripeAccountId = account.id;
      await prisma.user.update({
        where: { id: appUserId },
        data: { stripeAccountId: stripeAccountId, stripeOnboardingComplete: false }, // Reset onboardingComplete status
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.FRONTEND_URL}/connect-stripe?reauth=true&stripe_account_id=${stripeAccountId}`,
      return_url: `${process.env.FRONTEND_URL}/connect-stripe?status=success&stripe_account_id=${stripeAccountId}`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe Connect onboarding error:', error.message, error.stack);
    res.status(500).json({ message: 'Error creating Stripe onboarding link', error: error.message });
  }
});

// ... (rest of your /connect/account-status, /create-checkout-session, /webhook routes) ...

module.exports = router;