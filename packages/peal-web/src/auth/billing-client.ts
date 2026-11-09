import { stripeClient } from "@better-auth/stripe/client";
import { createAuthClient } from "better-auth/react";

/**
 * Better Auth's Stripe routes, for the billing page: checkout and the
 * customer portal, for a workspace. On the page's own origin, as
 * `authClient` is.
 */
export const billingClient = createAuthClient({
  plugins: [stripeClient({ subscription: true })],
});
