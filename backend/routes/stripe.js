// backend/routes/stripe.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../lib/prisma'); // Using the separated Prisma client
const { authMiddleware } = require('../middleware/auth');

console.log("[Stripe Router] File loaded and router instance created."); // Log on file load

// 1. Create Stripe Connect Account and Onboarding Link
router.post('/connect/onboard-user', authMiddleware, async (req, res) => {
  console.log("[Stripe Router] POST /connect/onboard-user hit.");
  try {
    const appUserId = req.localUser?.id; 
    if (!appUserId) {
      console.log("[Stripe Router /onboard-user] Error: User application profile not found.");
      return res.status(403).json({ message: 'User application profile not found. Please complete your profile before connecting Stripe.' });
    }

    let user = req.localUser; 
    // Re-fetch if stripeAccountId seems missing, though localUser should be up-to-date from authMiddleware's fetch.
    // This is more of a safeguard or if you don't select stripeAccountId when fetching localUser in authMiddleware.
    if (user.stripeAccountId === undefined && user.id) { 
        console.log("[Stripe Router /onboard-user] Refetching user for stripeAccountId.");
        user = await prisma.user.findUnique({ where: { id: user.id }});
        if (!user) {
            console.log("[Stripe Router /onboard-user] Error: User not found in database on refetch.");
            return res.status(404).json({ message: 'User not found in database.' });
        }
    }
    
    let stripeAccountId = user.stripeAccountId;

    if (!stripeAccountId) {
      console.log(`[Stripe Router /onboard-user] No Stripe Account ID for user ${appUserId}. Creating new Stripe Express account.`);
      const platformBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const userProfileUrl = `${platformBaseUrl}/${user.username || 'profile'}`; // Fallback if username is null
      const productDescription = `Receiving tips and support via their page on ${process.env.PLATFORM_DISPLAY_NAME || 'our platform'}.`;

      const account = await stripe.accounts.create({
        type: 'express',
        country: user.country || 'US', // Default or from user profile
        email: req.user.email, // Email from Supabase Auth user (req.user)
        business_type: 'individual',
        business_profile: {
          url: userProfileUrl,
          mcc: '8999', // Professional Services (generic for creators/tips)
          product_description: productDescription,
        },
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      });
      stripeAccountId = account.id;
      console.log(`[Stripe Router /onboard-user] Created Stripe Account ${stripeAccountId} for user ${appUserId}.`);
      await prisma.user.update({
        where: { id: appUserId },
        data: { stripeAccountId: stripeAccountId, stripeOnboardingComplete: false },
      });
      console.log(`[Stripe Router /onboard-user] Updated user ${appUserId} with Stripe Account ID.`);
    } else {
      console.log(`[Stripe Router /onboard-user] User ${appUserId} already has Stripe Account ID: ${stripeAccountId}.`);
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.FRONTEND_URL}/connect-stripe?reauth=true&stripe_account_id=${stripeAccountId}`,
      return_url: `${process.env.FRONTEND_URL}/connect-stripe?status=success&stripe_account_id=${stripeAccountId}`,
      type: 'account_onboarding',
    });
    console.log(`[Stripe Router /onboard-user] Created account link for ${stripeAccountId}. URL: ${accountLink.url.substring(0,50)}...`);
    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('[Stripe Router /onboard-user] Stripe Connect onboarding error:', error.message, error.stack);
    res.status(500).json({ message: 'Error creating Stripe onboarding link', error: error.message });
  }
});

// 2. Get Stripe Account Status
router.get('/connect/account-status', authMiddleware, async (req, res) => {
  console.log("[Stripe Router] GET /connect/account-status hit.");
  try {
    const appUserId = req.localUser?.id;
    if (!appUserId) {
      console.log("[Stripe Router /account-status] Error: User profile not found (no localUser.id).");
      return res.status(403).json({ message: 'User profile not found.' });
    }

    const user = req.localUser;
    if (!user.stripeAccountId) {
      console.log(`[Stripe Router /account-status] User ${appUserId} has no Stripe Account ID.`);
      return res.status(404).json({ message: 'Stripe account not connected for this user.' });
    }
    console.log(`[Stripe Router /account-status] Fetching Stripe account details for ${user.stripeAccountId}`);
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    const onboardingComplete = !!(account.charges_enabled && account.details_submitted && account.payouts_enabled);

    if (user.stripeOnboardingComplete !== onboardingComplete) {
      console.log(`[Stripe Router /account-status] Updating onboarding status for user ${appUserId} to ${onboardingComplete}.`);
      await prisma.user.update({
        where: { id: appUserId },
        data: { stripeOnboardingComplete: onboardingComplete }
      });
    }
    console.log(`[Stripe Router /account-status] Sending status for Stripe Account ${user.stripeAccountId}:`, { onboardingComplete });
    res.json({
      stripeAccountId: user.stripeAccountId,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      onboardingComplete: onboardingComplete
    });
  } catch (error) {
    console.error('[Stripe Router /account-status] Error fetching Stripe account status:', error.message, error.stack);
    res.status(500).json({ message: 'Error fetching Stripe account status', error: error.message });
  }
});

// 3. Create Stripe Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  console.log("[Stripe Router] POST /create-checkout-session hit. Body:", req.body);
  const { amount, recipientUsername } = req.body;

  if (!amount || !recipientUsername || isNaN(parseFloat(amount)) || parseFloat(amount) < 0.50) {
    console.log("[Stripe Router /create-checkout-session] Error: Invalid input.", { amount, recipientUsername });
    return res.status(400).json({ message: 'Valid amount (e.g., at least $0.50) and recipient username are required.' });
  }
  const amountInCents = Math.round(parseFloat(amount) * 100);

  try {
    console.log(`[Stripe Router /create-checkout-session] Looking up recipient: ${recipientUsername}`);
    const recipientUser = await prisma.user.findUnique({
      where: { username: recipientUsername },
      select: { id: true, username: true, displayName: true, stripeAccountId: true, stripeOnboardingComplete: true }
    });

    if (!recipientUser) {
      console.log(`[Stripe Router /create-checkout-session] Error: Recipient user ${recipientUsername} not found.`);
      return res.status(404).json({ message: 'Recipient user not found.' });
    }
    if (!recipientUser.stripeAccountId || !recipientUser.stripeOnboardingComplete) {
      console.log(`[Stripe Router /create-checkout-session] Error: Recipient ${recipientUsername} not set up for payments.`);
      return res.status(400).json({ message: 'This creator is not currently set up to receive payments.' });
    }

    const platformFeePercentage = 0.10; // 10%
    const platformFeeInCents = Math.floor(amountInCents * platformFeePercentage);

    if (amountInCents - platformFeeInCents < 50) { // Min 50 cents to creator
        console.log(`[Stripe Router /create-checkout-session] Error: Amount too small after fee for ${recipientUsername}. Amount: ${amountInCents}, Fee: ${platformFeeInCents}`);
        return res.status(400).json({ message: 'Payment amount is too small after platform fees.' });
    }
    
    const productName = `Support for ${recipientUser.displayName || recipientUser.username} via ${process.env.PLATFORM_DISPLAY_NAME || 'Our Platform'}`;
    console.log(`[Stripe Router /create-checkout-session] Creating session for ${recipientUsername} (Stripe ID: ${recipientUser.stripeAccountId}), Amount: ${amountInCents}, Fee: ${platformFeeInCents}`);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: { currency: 'usd', product_data: { name: productName }, unit_amount: amountInCents },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&recipient=${recipientUsername}`,
      cancel_url: `${process.env.FRONTEND_URL}/${recipientUsername}?payment_cancelled=true`,
      payment_intent_data: {
        application_fee_amount: platformFeeInCents > 0 ? platformFeeInCents : undefined,
        transfer_data: { destination: recipientUser.stripeAccountId },
        description: `Payment to ${recipientUser.username} via ${process.env.PLATFORM_DISPLAY_NAME || 'Our Platform'}`,
      },
      metadata: {
        appRecipientUserId: recipientUser.id,
        appRecipientUsername: recipientUser.username,
        platformFeeCharged: platformFeeInCents.toString(),
        totalAmountPaidByDonor: amountInCents.toString(),
      },
    });
    console.log(`[Stripe Router /create-checkout-session] Session created: ${session.id}`);
    res.json({ id: session.id });
  } catch (error) {
    console.error('[Stripe Router /create-checkout-session] Error creating Stripe Checkout session:', error.message, error.stack);
    res.status(500).json({ message: 'Error creating payment session', error: error.message });
  }
});

// 4. Stripe Webhook Handler
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // Body parser for this specific route
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    // console.log('[Stripe Webhook] Received a request.'); // Log every hit

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[Stripe Webhook] Event received: ${event.type}, ID: ${event.id}`);
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        // console.log('[Stripe Webhook] checkout.session.completed payload:', JSON.stringify(session, null, 2));
        
        const appRecipientUserId = session.metadata?.appRecipientUserId;
        const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
        const platformFeeFromMeta = parseInt(session.metadata?.platformFeeCharged, 10);
        const totalAmountFromMeta = parseInt(session.metadata?.totalAmountPaidByDonor, 10);

        if (appRecipientUserId && paymentIntentId && session.payment_status === 'paid') {
          try {
            if (!paymentIntentId) {
                console.error('[Stripe Webhook] Payment Intent ID missing from session', session.id);
                return res.status(200).json({ received: true, error: "Payment Intent ID missing" });
            }
            const existingPayment = await prisma.payment.findUnique({ where: { stripePaymentIntentId: paymentIntentId }});
            if (existingPayment) {
              console.log(`[Stripe Webhook] Payment ${paymentIntentId} already processed.`);
              return res.status(200).json({ received: true, message: "Already processed" });
            }
            const createdPayment = await prisma.payment.create({
              data: {
                stripePaymentIntentId: paymentIntentId,
                amount: totalAmountFromMeta || session.amount_total,
                currency: session.currency.toLowerCase(),
                status: 'succeeded',
                recipientUserId: appRecipientUserId,
                payerEmail: session.customer_details?.email,
                platformFee: !isNaN(platformFeeFromMeta) ? platformFeeFromMeta : (session.application_fee_amount || 0),
              },
            });
            console.log(`[Stripe Webhook] Payment ${createdPayment.id} (PI: ${paymentIntentId}) recorded for user ${appRecipientUserId}.`);
          } catch (dbError) {
            console.error('[Stripe Webhook] DB error saving payment:', dbError.message, dbError.stack);
            return res.status(500).json({ error: "Database error processing payment" }); 
          }
        } else {
            console.warn('[Stripe Webhook] checkout.session.completed with insufficient data or not paid:', { sessionId: session.id, paymentStatus: session.payment_status, appRecipientUserId, paymentIntentId });
        }
        break;

      case 'account.updated':
        const account = event.data.object;
        console.log(`[Stripe Webhook] account.updated for Stripe Account ID: ${account.id}`);
        try {
          const userToUpdate = await prisma.user.findFirst({ where: { stripeAccountId: account.id } });
          if (userToUpdate) {
            const onboardingComplete = !!(account.charges_enabled && account.details_submitted && account.payouts_enabled);
            if (userToUpdate.stripeOnboardingComplete !== onboardingComplete) {
                await prisma.user.update({
                where: { id: userToUpdate.id },
                data: { stripeOnboardingComplete: onboardingComplete },
                });
                console.log(`[Stripe Webhook] Updated onboarding for user ${userToUpdate.id} (Stripe Acct ${account.id}) to ${onboardingComplete}`);
            }
          } else {
             console.warn(`[Stripe Webhook] Received account.updated for Stripe account ID ${account.id} not in DB.`);
          }
        } catch (dbError) {
          console.error('[Stripe Webhook] DB error updating user from account.updated:', dbError.message, dbError.stack);
        }
        break;
      
      default:
        // console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
    res.status(200).json({ received: true });
  }
);

module.exports = router;