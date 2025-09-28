import Stripe from "stripe";

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
      apiVersion: "2024-06-20",
    });
  }

  return global.stripeClient;
}
