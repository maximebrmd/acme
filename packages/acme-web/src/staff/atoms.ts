import { AcmeApi } from "#api/client.ts";

// What staff do from the console, each sent from the browser with its
// session cookie, so the API checks the page's origin. The pages refresh
// after each.

export const banUser = AcmeApi.mutation("staff", "ban");

export const unbanUser = AcmeApi.mutation("staff", "unban");

export const revokeUserSessions = AcmeApi.mutation("staff", "revokeSessions");

export const resendVerification = AcmeApi.mutation(
  "staff",
  "resendVerification"
);

export const impersonateUser = AcmeApi.mutation("staff", "impersonate");
