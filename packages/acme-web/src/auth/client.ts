import {
  adminClient,
  inferAdditionalFields,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Better Auth's client, for the browser. Without a base URL it calls
// /api/auth on the page's own origin, which the proxy forwards to the
// server, as it does the rest of /api.
export const authClient = createAuthClient({
  plugins: [
    // The language a user keeps on their account, which their emails use.
    inferAdditionalFields({
      user: { locale: { required: false, type: "string" } },
    }),
    organizationClient(),
    adminClient(),
  ],
});
