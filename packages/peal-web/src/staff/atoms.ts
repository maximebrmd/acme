import { PealApi } from "#api/client.ts";

// What staff do from the console, each sent from the browser with its
// session cookie, so the API checks the page's origin. The pages refresh
// after each.

export const banUser = PealApi.mutation("staff", "ban");

export const unbanUser = PealApi.mutation("staff", "unban");

export const revokeUserSessions = PealApi.mutation("staff", "revokeSessions");

export const resendVerification = PealApi.mutation(
  "staff",
  "resendVerification"
);

export const impersonateUser = PealApi.mutation("staff", "impersonate");

export const applyContractRequest = PealApi.mutation(
  "contractRequestsDesk",
  "apply"
);

export const closeContractRequest = PealApi.mutation(
  "contractRequestsDesk",
  "close"
);
