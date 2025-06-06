// backend/routes/stripe.js
const express = require('express');
const router = express.Router();
const { prisma } = require('../index');
const { authMiddleware } = require('../middleware/auth'); // For protected Stripe routes

// Initialize Stripe with your secret key
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// --- 1. STRIPE WEBHOOK HANDLER ---
// This endpoint is called BY STRIPE, not your frontend directly.
// It needs to be configured in your Stripe Dashboard.
// IMPORTANT: This specific route needs the raw request body for signature verification.
// So, in index.js, you must apply express.raw BEFORE express.json for this route path.
// Example in index.js:
// app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), stripeRoutes);
// OR if stripeRoutes is loaded after express.json(), you need to apply it here:
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`⚠️  Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('CheckoutSession completed:', session.id);
      // session.metadata should contain your recipientUserId
      const recipientUserId = session.metadata?.recipientUserId;
      const paymentIntentId = session.payment_intent; // string

      if (!recipientUserId || !paymentIntentId) {
        console.error('Checkout session completed but missing recipientUserId or paymentIntentId in metadata.');
        break; // Or handle error more explicitly
      }

      try {
        // Retrieve payment intent to get fees
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ['charges.data.balance_transaction']
        });
        const charge = paymentIntent.charges.data[0];
        const balanceTransaction = charge?.balance_transaction;
        const platformFee = balanceTransaction?.fee || 0; // Stripe fee for the platform

        // TODO: Your platform fee calculation might be different if you used application_fee_amount
        // If you used `application_fee_amount` when creating the session, that's your platform's cut.
        // The `platformFee` above is Stripe's processing fee.
        // Let's assume `session.application_fee_amount` (if set) or calculate from `session.amount_total`
        const applicationFeeAmount = session.application_fee_amount || 0;


        await prisma.payment.create({
          data: {
            stripePaymentIntentId: paymentIntentId,
            amount: session.amount_total, // Total amount paid by tipper (in cents)
            currency: session.currency.toLowerCase(),
            status: 'succeeded', // Or map from session.payment_status
            recipientUserId: recipientUserId,
            payerEmail: session.customer_details?.email, // If available
            platformFee: applicationFeeAmount, // Your platform's cut (in cents)
            // netAmountToRecipient: session.amount_total - applicationFeeAmount, // If applicable
          },
        });
        console.log(`Payment record created for PI: ${paymentIntentId} to user: ${recipientUserId}`);
        // TODO: Notify the recipient user
      } catch (dbError) {
        console.error("Error saving payment to DB:", dbError);
        // Potentially retry or log for manual intervention
      }
      break;

    case 'account.updated':
      const account = event.data.object;
      console.log('Stripe Account updated:', account.id);
      if (account.charges_enabled && account.payouts_enabled && account.details_submitted) {
        try {
          await prisma.user.updateMany({ // updateMany in case somehow multiple users got same stripe id (shouldn't happen)
            where: { stripeAccountId: account.id },
            data: { stripeOnboardingComplete: true },
          });
          console.log(`User onboarding complete for Stripe account: ${account.id}`);
        } catch (dbError) {
          console.error("Error updating user stripeOnboardingComplete status:", dbError);
        }
      } else {
        // Optional: update status to false if they become incomplete
        try {
          await prisma.user.updateMany({
            where: { stripeAccountId: account.id },
            data: { stripeOnboardingComplete: false },
          });
           console.log(`User onboarding INCOMPLETE for Stripe account: ${account.id}`);
        } catch (dbError) {
          console.error("Error updating user stripeOnboardingComplete status to false:", dbError);
        }
      }
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
});


// --- 2. STRIPE CONNECT ONBOARDING (Creator sets up to receive payments) ---
// This endpoint is called by YOUR CREATOR'S BROWSER when they click "Connect Stripe"
router.post('/connect/onboard-user', authMiddleware, async (req, res) => {
  const localUser = req.localUser;

  if (!localUser) {
    return res.status(403).json({ message: "User profile not set up. Cannot connect Stripe." });
  }

  try {
    let stripeAccountId = localUser.stripeAccountId;

    // Create a Stripe Connect account for the user if they don't have one
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express', // or 'standard' or 'custom'
        email: localUser.email, // Pre-fill email
        // You can add more capabilities and pre-filled info here
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
        },
        business_type: 'individual', // Assuming individual creators
        // Add more pre-fill data as needed based on your User model
        // individual: { first_name: ..., last_name: ... }
      });
      stripeAccountId = account.id;
      await prisma.user.update({
        where: { id: localUser.id },
        data: { stripeAccountId: stripeAccountId },
      });
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.FRONTEND_URL}/dashboard/payments?reauth=true`, // URL if link expires
      return_url: `${process.env.FRONTEND_URL}/dashboard/payments?stripe_return=true`,  // URL after completion
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    res.status(500).json({ message: "Failed to create Stripe Connect onboarding link.", error: error.message });
  }
});

// --- 3. CREATE CHECKOUT SESSION (Visitor pays/tips a Creator) ---
// This endpoint is called by YOUR VISITOR'S BROWSER when they click "Send Tip"
router.post('/create-checkout-session', async (req, res) => {
  const { amount, recipientUsername, currency = 'usd' } = req.body; // Amount in smallest unit (e.g., cents)

  if (!amount || !recipientUsername) {
    return res.status(400).json({ message: "Amount and recipient username are required." });
  }
  const parsedAmount = parseInt(amount);
  if (isNaN(parsedAmount) || parsedAmount < 50) { // Stripe has minimums, e.g., $0.50
      return res.status(400).json({ message: "Invalid amount. Minimum is usually 50 cents." });
  }


  try {
    const recipientUser = await prisma.user.findUnique({
      where: { username: recipientUsername.toLowerCase() },
    });

    if (!recipientUser || !recipientUser.stripeAccountId || !recipientUser.stripeOnboardingComplete) {
      return res.status(404).json({ message: "Recipient not found or not set up to receive payments." });
    }

    // Calculate application fee (e.g., 5% for your platform)
    // Ensure it's an integer (cents)
    const applicationFee = Math.round(parsedAmount * 0.05); // 5% example

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency,
          product_data: {
            name: `Tip for ${recipientUser.displayName || recipientUser.username}`,
            // images: [recipientUser.profileImageUrl || 'default_image_url'], // Optional
          },
          unit_amount: parsedAmount, // Amount in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&recipient=${recipientUsername}`,
      cancel_url: `${process.env.FRONTEND_URL}/${recipientUsername}?payment_cancelled=true`,
      payment_intent_data: {
        application_fee_amount: applicationFee > 0 ? applicationFee : undefined, // Only if fee > 0
        transfer_data: {
          destination: recipientUser.stripeAccountId,
        },
      },
      metadata: { // Store your internal IDs for webhook reconciliation
        recipientUserId: recipientUser.id,
        recipientUsername: recipientUser.username,
        // Any other data you want to track
      },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating Stripe Checkout session:", error);
    res.status(500).json({ message: "Failed to create payment session.", error: error.message });
  }
});

module.exports = router;