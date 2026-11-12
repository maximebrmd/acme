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

// Turns an account's two-step verification off, for its person who lost
// their phone and recovery codes.
export const resetTwoStep = PealApi.mutation("staff", "resetTwoStep");

// Turns a short link off, or on again.
export const disableShortLink = PealApi.mutation("staff", "disableShortLink");

export const enableShortLink = PealApi.mutation("staff", "enableShortLink");

// Turns every short link of a workspace off at once.
export const disableWorkspaceShortLinks = PealApi.mutation(
  "staff",
  "disableWorkspaceShortLinks"
);

// Opens a partner account for a workspace.
export const grantPartner = PealApi.mutation("staff", "grantPartner");

// Records a legal request, then answers it: for staff who hold the legal
// role.
export const answerLegalRequest = PealApi.mutation("legal", "answer");

export const applyContractRequest = PealApi.mutation(
  "contractRequestsDesk",
  "apply"
);

export const closeContractRequest = PealApi.mutation(
  "contractRequestsDesk",
  "close"
);
