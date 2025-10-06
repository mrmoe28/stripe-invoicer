import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY_NEW || process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_NEW is not set");
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-08-27.basil",
});

declare global {
  var stripeClient: Stripe | undefined;
}

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY_NEW || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }

  if (!global.stripeClient) {
    global.stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });
  }

  return global.stripeClient;
}
