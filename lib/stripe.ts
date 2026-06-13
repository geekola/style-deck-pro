import Stripe from "stripe";

// Lazily construct the Stripe client so that builds (which collect route
// metadata without runtime env vars) don't throw on a missing API key.
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeClient;
}
