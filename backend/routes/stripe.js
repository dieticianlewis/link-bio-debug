// backend/routes/stripe.js
const express = require('express');
const mainRouter = express.Router();
const { prisma } = require('../lib/db');
const { authMiddleware } = require('../middleware/auth');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe;
if (stripeSecretKey) {
  stripe = require('stripe')(stripeSecretKey);
} else {
  console.error("FATAL BACKEND ERROR: STRIPE_SECRET_KEY is missing. Stripe functionality will be disabled.");
}
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// --- Webhook Handler Function (called by index.js with raw body) ---
const handleWebhook = async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured on server." });
  if (!webhookSecret) return res.status(500).json({ error: "Stripe webhook secret not configured." });

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret); // req.body is raw buffer
    console.log('[Stripe Webhook] Event constructed:', event.type, event.id);
  } catch (err) {
    console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('[Stripe Webhook] CheckoutSession completed:', session.id, 'PaymentIntent:', session.payment_intent);
        
        const recipientUserId = session.metadata.app_recipient_user_id;
        const amountTotal = session.amount_total; // Total amount in cents
        const currency = session.currency;
        const stripePaymentIntentId = session.payment_intent;
        
        // application_fee_amount is only available if you direct charge and take a fee.
        // For destination charges, the fee is part of the transfer.
        // Stripe calculates this differently. For now, let's calculate based on our percentage.
        const platformFeePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || "0.05");
        const calculatedPlatformFee = Math.round(amountTotal * platformFeePercentage);

        if (recipientUserId && stripePaymentIntentId) {
          await prisma.payment.create({
            data: {
              stripePaymentIntentId,
              amount: amountTotal,
              currency,
              status: session.payment_status, // e.g., 'paid'
              recipientUserId,
              platformFee: calculatedPlatformFee > 0 ? calculatedPlatformFee : null,
              payerEmail: session.customer_details?.email || null,
              netAmountToRecipient: amountTotal - (calculatedPlatformFee > 0 ? calculatedPlatformFee : 0),
            }
          });
          console.log(`[Stripe Webhook] Payment record created for PI: ${stripePaymentIntentId}`);
        } else {
          console.error('[Stripe Webhook] CheckoutSession missing metadata or PI:', session.id);
        }
        break;

      case 'account.updated':
        const account = event.data.object;
        console.log('[Stripe Webhook] Account updated:', account.id, 'Charges Enabled:', account.charges_enabled, 'Details Submitted:', account.details_submitted);
        if (account.id) {
          const isOnboardingComplete = !!(account.charges_enabled && account.details_submitted && account.payouts_enabled);
          const updated = await prisma.user.updateMany({
            where: { stripeAccountId: account.id },
            data: { stripeOnboardingComplete: isOnboardingComplete }
          });
          if (updated.count > 0) {
            console.log(`[Stripe Webhook] User onboarding status updated to ${isOnboardingComplete} for Stripe Account ${account.id}`);
          }
        }
        break;
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (dbOrProcessingError) {
      console.error(`[Stripe Webhook] Error processing event ${event.type} (ID: ${event.id}):`, dbOrProcessingError);
      return res.status(500).json({ error: `Webhook processing error: ${dbOrProcessingError.message}` });
  }
  res.status(200).json({ received: true });
};

// --- Other Stripe Routes (expect JSON) ---
mainRouter.post('/connect/onboard-user', authMiddleware, async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured." });
  if (!req.localUser) return res.status(403).json({ message: "Profile setup required." });

  const userId = req.localUser.id;
  let stripeAccountId = req.localUser.stripeAccountId;

  try {
    if (!stripeAccountId) {
      const accountParams = {
        type: 'express',
        email: req.supabaseUser.email, // From Supabase token
        country: 'US', // Or make this configurable / detect
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { app_user_id: userId },
      };
      const account = await stripe.accounts.create(accountParams);
      stripeAccountId = account.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeAccountId: stripeAccountId, stripeOnboardingComplete: false }, // Reset onboarding status
      });
      console.log(`[Stripe Connect] New Express Account: ${stripeAccountId} for user ${userId}`);
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.FRONTEND_URL}/connect-stripe?reauth=true&stripe_account_id=${stripeAccountId}`,
      return_url: `${process.env.FRONTEND_URL}/connect-stripe?success=true&stripe_account_id=${stripeAccountId}`,
      type: 'account_onboarding',
    });
    console.log(`[Stripe Connect] AccountLink created for ${stripeAccountId}`);
    res.json({ url: accountLink.url });
  } catch (error) {
    console.error("[Stripe Connect] Error:", error);
    res.status(500).json({ message: "Stripe onboarding failed.", error: error.message });
  }
});

mainRouter.post('/create-checkout-session', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured." });
  const { amount, recipientUsername } = req.body;
  const parsedAmount = parseFloat(amount);

  if (!parsedAmount || parsedAmount < 0.50 || !recipientUsername) {
    return res.status(400).json({ message: "Valid amount (min $0.50) and recipient required." });
  }

  try {
    const recipientUser = await prisma.user.findUnique({
      where: { username: recipientUsername.toLowerCase() },
    });
    if (!recipientUser || !recipientUser.stripeAccountId || !recipientUser.stripeOnboardingComplete) {
      return res.status(404).json({ message: "Recipient not found or not ready for payments." });
    }

    const amountInCents = Math.round(parsedAmount * 100);
    const platformFeePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || "0.05");
    const applicationFeeAmount = platformFeePercentage > 0 ? Math.round(amountInCents * platformFeePercentage) : 0;
    
    // Ensure application fee is at least 1 cent if it's being charged, or 0
    const finalApplicationFee = applicationFeeAmount > 0 ? Math.max(1, applicationFeeAmount) : 0;


    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: process.env.DEFAULT_CURRENCY || 'usd',
          product_data: { name: `Support for ${recipientUser.displayName || recipientUser.username}` },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&recipient=${recipientUsername}`,
      cancel_url: `${process.env.FRONTEND_URL}/${recipientUsername}?payment_cancelled=true`,
      metadata: {
        app_recipient_user_id: recipientUser.id,
        app_recipient_username: recipientUser.username,
      },
      payment_intent_data: {
        transfer_data: { destination: recipientUser.stripeAccountId },
      }
    };
    
    if (finalApplicationFee > 0) {
        sessionParams.payment_intent_data.application_fee_amount = finalApplicationFee;
    }


    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log(`[Stripe Checkout] Session: ${session.id} for ${recipientUsername}`);
    res.json({ id: session.id });
  } catch (error) {
    console.error("[Stripe Checkout] Error:", error);
    res.status(500).json({ message: "Payment session creation failed.", error: error.message });
  }
});

mainRouter.get('/connect/account-status', authMiddleware, async (req, res) => {
    if (!stripe) return res.status(500).json({ error: "Stripe not configured." });
    if (!req.localUser || !req.localUser.stripeAccountId) {
        return res.status(404).json({ stripeConnected: false, message: "Stripe account not linked." });
    }
    try {
        const account = await stripe.accounts.retrieve(req.localUser.stripeAccountId);
        const isOnboardingComplete = !!(account.charges_enabled && account.payouts_enabled && account.details_submitted);
        
        if (req.localUser.stripeOnboardingComplete !== isOnboardingComplete) {
            await prisma.user.update({
                where: { id: req.localUser.id },
                data: { stripeOnboardingComplete: isOnboardingComplete }
            });
        }
        res.json({
            stripeAccountId: account.id,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            onboardingComplete: isOnboardingComplete,
            dashboard_link: `https://connect.stripe.com/app/express/${account.id}` // Generic link
        });
    } catch (error) {
        console.error("[Stripe Connect] Account status error:", error);
        if (error.type === 'StripeInvalidRequestError' && error.code === 'account_invalid') {
            return res.status(404).json({ stripeConnected: false, message: "Invalid Stripe account ID linked." });
        }
        res.status(500).json({ message: "Failed to fetch Stripe account status.", error: error.message });
    }
});

module.exports = { router: mainRouter, handleWebhook };