import type { EmailCatalog } from "./email-catalog.ts";

export const english: EmailCatalog = {
  channel: "{platform} ({handle})",
  channelReconnectRequired: {
    action: "Reconnect the account",
    body: "Acme can no longer post as {handle} on {platform} in {workspaceName}: the account’s authorization stopped working. Nothing is posted there until someone reconnects it.",
    ignore:
      "You receive this email because you manage the channels of {workspaceName} on Acme. Choose which notifications you receive by email in your notification preferences.",
    subject: "Reconnect {handle} on {platform}",
  },
  channelReconnectSoon: {
    action: "Reconnect the account",
    body: "The authorization Acme holds for {handle} on {platform}, in {workspaceName}, ends on {expiresAt}, and {platform} does not let Acme renew it. Reconnect the account before then to keep posting.",
    ignore:
      "You receive this email because you manage the channels of {workspaceName} on Acme. Choose which notifications you receive by email in your notification preferences.",
    subject: "Reconnect {handle} on {platform} by {expiresAt}",
  },
  failureReasons: {
    contentRejected: "the platform refused its text or its format.",
    mediaRejected: "the platform refused one of its images or videos.",
    missed:
      "Acme was unavailable at the scheduled time, and the post came too late to send.",
    notPublished: "someone checked the platform and did not find it.",
    rateLimited:
      "the platform kept turning requests away, and Acme stopped trying.",
    tokenExpired:
      "the account’s authorization stopped working. Reconnect it, then post again.",
    unavailable: "the platform could not be reached.",
  },
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
  platforms: {
    bluesky: "Bluesky",
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    mastodon: "Mastodon",
    pinterest: "Pinterest",
    threads: "Threads",
    tiktok: "TikTok",
    x: "X",
    youtube: "YouTube",
  },
  postFailed: {
    action: "Open the post",
    body: "A post of {workspaceName} did not go out on {channel}: {reason}",
    ignore:
      "You receive this email because you schedule posts in {workspaceName} on Acme. Choose which notifications you receive by email in your notification preferences.",
    subject: "A post did not go out on {channel}",
  },
  postPublished: {
    action: "See the post",
    body: "A post of {workspaceName} is live on {channel}.",
    ignore:
      "You receive this email because you schedule posts in {workspaceName} on Acme. Choose which notifications you receive by email in your notification preferences.",
    subject: "Published on {channel}",
  },
  postUnconfirmed: {
    action: "Open the post",
    body: "Acme sent a post of {workspaceName} to {channel} but got no answer, so it may or may not be live. Check the platform before you post it again, then tell Acme what you found.",
    ignore:
      "You receive this email because you schedule posts in {workspaceName} on Acme. Choose which notifications you receive by email in your notification preferences.",
    subject: "Check {channel}: a post may have gone out",
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
  unknownChannel: "a disconnected channel",
  verifyEmail: {
    action: "Confirm my email",
    body: "Welcome to Acme. Confirm your email address to finish creating your account.",
    ignore:
      "If you did not create an Acme account, ignore this email. The link expires in an hour.",
    subject: "Confirm your email for Acme",
  },
};
