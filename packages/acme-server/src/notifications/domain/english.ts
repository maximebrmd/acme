import type { EmailCatalog } from "./email-catalog.ts";

export const english: EmailCatalog = {
  invitation: {
    action: "Accept the invitation",
    body: "{inviterName} invited you to join {workspaceName} on Acme {role}.",
    ignore:
      "If you were not expecting this invitation, you can ignore this email. It expires in 7 days.",
    subject: "{inviterName} invited you to {workspaceName} on Acme",
  },
  layout: {
    linkFallback: "If the button does not work, open this link:",
    signature: "The Acme team",
    textLink: "{action}: {url}",
  },
  resetPassword: {
    action: "Choose a new password",
    body: "Someone asked to reset the password of your Acme account. Choose a new one with the link below.",
    ignore:
      "If you did not ask for this, ignore this email: your password stays as it is. The link expires in an hour.",
    subject: "Reset your Acme password",
  },
  roles: {
    admin: "as an admin",
    contributor: "as a contributor",
    editor: "as an editor",
    owner: "as an owner",
    viewer: "as a viewer",
  },
  verifyEmail: {
    action: "Confirm my email",
    body: "Welcome to Acme. Confirm your email address to finish creating your account.",
    ignore:
      "If you did not create an Acme account, ignore this email. The link expires in an hour.",
    subject: "Confirm your email for Acme",
  },
};
