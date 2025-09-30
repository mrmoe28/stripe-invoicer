import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

declare global {
  var stripeClient: Stripe | undefined;
}

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
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
