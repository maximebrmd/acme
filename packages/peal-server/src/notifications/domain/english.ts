import type { EmailCatalog } from "./email-catalog.ts";

export const english: EmailCatalog = {
  accountDeleted: {
    action: "Open Peal",
    body: "Your Peal account was deleted, as you asked, with the data tied to it: your profile, your sessions, your memberships, your notifications, and the workspaces where you were the only member, with everything in them.",
    ignore:
      "If you did not ask for this, tell whoever runs this Peal server. Peal sends no more email to this address.",
    subject: "Your Peal account is deleted",
  },
  adBoostBudgetReached: {
    action: "Open the post",
    body: "A boost in {workspaceName} has spent its whole budget of {budget}. The ad network stops showing it; nothing more is spent on it.",
    ignore:
      "You receive this email because you own {workspaceName} on Peal. This email is always sent: an owner answers for what its ads spend.",
    subject: "A boost has used its budget of {budget}",
  },
  adBoostEnded: {
    action: "Open the post",
    body: "A boost in {workspaceName}, with a budget of {budget}, reached its end date ({endsAt}) and no longer runs. What it spent is on the post’s page, and on your ad account’s bill.",
    ignore:
      "You receive this email because you own {workspaceName} on Peal. This email is always sent: an owner answers for what its ads spend.",
    subject: "A boost has ended",
  },
  adBoostFailed: {
    action: "Open the post",
    body: "A boost in {workspaceName}, with a budget of {budget}, could not be made: {reason} Nothing ran, and nothing was spent.",
    ignore:
      "You receive this email because you own {workspaceName} on Peal. This email is always sent: an owner answers for what its ads spend.",
    subject: "A boost could not be made",
  },
  adBoostFailureOther: "the ad network refused it.",
  adBoostFailureReasons: {
    accountSpendCap: "the ad account’s own spend cap leaves too little room.",
    accountUnusable: "the ad account cannot run ads at the moment.",
    budgetTooLow: "the budget is under the ad network’s minimum.",
    ceilingExceeded: "the monthly ceiling leaves too little room.",
    currencyMismatch: "its currency is not the ad account’s.",
    networkUnavailable: "the ad network did not answer for too long.",
    permissionMissing:
      "the sign-in to the ad network lacks a permission ads need.",
    postNotPromotable: "the post cannot be shown as an ad.",
    reconnectNeeded:
      "the ad network refused the sign-in, which its person renews by signing in again.",
    spendingOff: "spending was turned off for the ad account.",
    spendingUnavailable: "this server no longer offers spending on ads.",
  },
  adBoostStarted: {
    action: "Open the post",
    body: "A boost started in {workspaceName}: it may spend up to its budget of {budget}, from your ad account’s payment method, until {endsAt}. Pause or stop it at any time on the post’s page.",
    ignore:
      "You receive this email because you own {workspaceName} on Peal. This email is always sent: an owner answers for what its ads spend.",
    subject: "A boost started: up to {budget} until {endsAt}",
  },
  adBoostUnconfirmed: {
    action: "Open the post",
    body: "Peal told the ad network to run a boost in {workspaceName}, with a budget of {budget}, and could not learn whether it runs. It may be spending. Check it on the post’s page, and stop it there if it should not run: Peal does nothing more to it on its own.",
    ignore:
      "You receive this email because you own {workspaceName} on Peal. This email is always sent: an owner answers for what its ads spend.",
    subject: "Check a boost: Peal could not confirm it",
  },
  adConnectionReconnect: {
    action: "Open ads",
    body: "The ad network refused the sign-in that connects ad accounts to {workspaceName}. Their campaigns and numbers are no longer read, and no boost can be made on them, until the person who signed in does so again. Boosts that run keep running at the network.",
    ignore:
      "You receive this email because you manage the ad accounts of {workspaceName} on Peal. This email is always sent: nothing is read or changed on these accounts until someone acts.",
    subject: "Sign in to your ad network again",
  },
  billingEnded: {
    account:
      "The subscriptions of the workspaces it deleted were cancelled at once: nothing more is charged, and the period already paid for is not refunded, except where the law gives a refund: if you subscribed as a consumer less than 14 days ago, you may withdraw and be refunded the unused part. Their invoices are kept as accounting law requires; ask whoever runs this Peal server for a copy.",
    workspace:
      "Its subscription was cancelled at once: nothing more is charged, and the period already paid for is not refunded, except where the law gives a refund: if you subscribed as a consumer less than 14 days ago, you may withdraw and be refunded the unused part. Its invoices are kept as accounting law requires; ask whoever runs this Peal server for a copy.",
  },
  channel: "{platform} ({handle})",
  channelReconnectRequired: {
    action: "Reconnect the account",
    body: "Peal can no longer post as {handle} on {platform} in {workspaceName}: the account’s authorization stopped working. Nothing is posted there until someone reconnects it.",
    ignore:
      "You receive this email because you manage the channels of {workspaceName} on Peal. Choose which notifications you receive by email in your notification preferences.",
    subject: "Reconnect {handle} on {platform}",
  },
  channelReconnectSoon: {
    action: "Reconnect the account",
    body: "The authorization Peal holds for {handle} on {platform}, in {workspaceName}, ends on {expiresAt}, and {platform} does not let Peal renew it. Reconnect the account before then to keep posting.",
    ignore:
      "You receive this email because you manage the channels of {workspaceName} on Peal. Choose which notifications you receive by email in your notification preferences.",
    subject: "Reconnect {handle} on {platform} by {expiresAt}",
  },
  contractNumber:
    "Contract number: {reference}. Give it in Cancel your contract or Withdraw from contract here, at the foot of every page, and your request is applied at once, without signing in.",
  contractRequest: {
    actions: { confirm: "Apply my request", open: "Open Peal" },
    content:
      "It says: name, {name}; contract: {contract}; acknowledgement to be sent to {email}.",
    contractNotGiven: "not given",
    desired: "Day wanted for the contract to end: {desiredAt}.",
    ignore:
      "You receive this email because this address was given in the form to cancel a contract or withdraw from one on Peal. Keep it: it is your record of the date. If you did not send the request, ignore this email, and tell whoever runs this Peal server if it happens again.",
    outcomes: {
      business:
        "It could not be applied: the contract was concluded by a business, with a verified VAT number, which has no right to withdraw. The contract can be cancelled instead, with Cancel your contract, at the foot of every page.",
      cancelled:
        "It is applied. The contract ends on {effectiveAt}. Until then the workspace keeps its plan; it then moves to the free plan, with its content, and nothing more is charged.",
      cancelledLater:
        "It is applied. The contract ends on {effectiveAt}, the day you asked for: it renews until then, and its last period is charged only up to that day. The workspace keeps its plan until then; it then moves to the free plan, with its content.",
      confirm:
        "This address manages a contract’s billing on Peal, but the request does not give the contract number, so we must make sure it comes from you: follow the link below, within 30 days, and choose the contract. The request is then applied as of {receivedAt}, the date that counts. Nothing changes until then.",
      expired:
        "It could not be applied: the 14 days to withdraw were over when your statement came. The contract can be cancelled instead, with Cancel your contract, at the foot of every page.",
      notSubscribed:
        "It could not be applied: the contract has no subscription to withdraw from.",
      nothingToCancel:
        "There was nothing to cancel: the contract’s subscription is already set to end, or has ended.",
      review:
        "We could not find the contract from what the request says, so a person will look at it and write to you at this address. If it is applied, it is as of {receivedAt}, the date that counts. To have it applied at once, send it again with the contract number, which is in the email that confirmed your subscription.",
      withdrawn:
        "It is applied. The contract ended on {effectiveAt}, and {refunded} is refunded to the payment method used, within 14 days of your statement.",
      withdrawnUnpaid:
        "It is applied. The contract ended on {effectiveAt}. Nothing had been charged for it, so there is nothing to refund.",
    },
    received: {
      cancellation:
        "We received the notification of your cancellation on {receivedAt}.",
      withdrawal: "We received your withdrawal statement on {receivedAt}.",
    },
    renewalRefunded:
      "The plan renewed after your notification came: {refunded} charged since is refunded to the payment method used.",
    subjects: {
      cancellation: "We received the notification of your cancellation",
      withdrawal: "We received your withdrawal statement",
    },
  },
  dataExported: {
    action: "Open my account settings",
    body: "A copy of your Peal account’s data was just downloaded {via}. It holds your profile, your sessions with their addresses, and your workspaces’ content.",
    ignore:
      "If it was not you, change your password and sign out your other sessions from your account settings, then tell whoever runs this Peal server.",
    subject: "A copy of your Peal data was downloaded",
  },
  excess: {
    channels: "{used} channels ({allowed} allowed)",
    mediaStorage: "{used} of media ({allowed} allowed)",
    members: "{used} members ({allowed} allowed)",
  },
  exportChannels: {
    commandLine: "from the command line",
    web: "from the web app",
  },
  failureReasons: {
    appBillingLimit:
      "the platform refused this Peal server’s app until its account with the platform is paid for (on X: its credits ran out or it reached its spending cap). Your post is not at fault: once the server’s operator has fixed it, post it again.",
    appNotAudited:
      "the platform takes only private posts from this server’s app until it approves the app. Make the account private and the post visible to its owner only, or ask the server’s operator.",
    channelDisabled:
      "its channel was turned off before it went out. Disconnect the channel and connect the account again, then schedule it in a new post.",
    channelDisconnected:
      "its channel was disconnected from the workspace before it went out.",
    contentRejected: "the platform refused its text or its format.",
    mediaRejected: "the platform refused one of its images or videos.",
    mediaRemoved:
      "one of its images or videos was deleted from the media library before it went out.",
    missed:
      "Peal was unavailable at the scheduled time, and the post came too late to send.",
    notPublished: "someone checked the platform and did not find it.",
    planLimit:
      "the workspace’s plan had no room for it when it was due: it has more channels connected than the plan allows, or the month’s posts were used up. Nothing was sent. Disconnect channels or move to a larger plan, then post it again.",
    quotaExceeded:
      "the platform's daily allowance of uploads stayed used up, for this Peal server or for the account, and Peal stopped waiting.",
    rateLimited:
      "the platform kept turning requests away, and Peal stopped trying.",
    tokenExpired:
      "the account’s authorization stopped working. Reconnect it, then post again.",
    unavailable: "the platform could not be reached.",
  },
  intervals: { month: "month", year: "year" },
  invitation: {
    action: "Accept the invitation",
    body: "{inviterName} invited you to join {workspaceName} on Peal {role}.",
    ignore:
      "If you were not expecting this invitation, you can ignore this email. It expires in 7 days.",
    subject: "{inviterName} invited you to {workspaceName} on Peal",
  },
  layout: {
    linkFallback: "If the button does not work, open this link:",
    signature: "The Peal team",
    textLink: "{action}: {url}",
  },
  legalHold: {
    connections:
      "This Peal server kept what French law requires of a host, and no longer does: the connections that created content, kept so far, stay {connections} from each, apart, for judicial authorities only, then are deleted.",
    identification:
      "As French law requires of a host, Peal keeps apart, for judicial authorities only, your name and email address for {identity}, and how you signed in and the connections that created content for {account}, then deletes them.",
    years: { one: "{count} year", other: "{count} years" },
  },
  overFreePlan:
    "Today it holds more than the free plan allows: {over}. From that day, nothing is scheduled or published until it is back within the free plan: posts already scheduled fail when due, and can be posted again afterwards. Order a plan, or choose which channels and members stay, on the billing page.",
  plans: {
    agency: "Agency",
    business: "Business",
    pro: "Pro",
    starter: "Starter",
  },
  platforms: {
    bluesky: "Bluesky",
    facebook: "Facebook",
    googleBusiness: "Google Business Profile",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    mastodon: "Mastodon",
    pinterest: "Pinterest",
    threads: "Threads",
    tiktok: "TikTok",
    x: "X",
    youtube: "YouTube",
  },
  postApprovalRequested: {
    action: "Review the post",
    body: "A post of {workspaceName} waits for an approval. It was asked to go out on {scheduledAt}, and will not until someone approves it.",
    ignore:
      "You receive this email because you may approve posts in {workspaceName} on Peal. Choose which notifications you receive by email in your notification preferences.",
    subject: "A post waits for your approval",
  },
  postApproved: {
    action: "Open the post",
    body: "{by} approved a post of {workspaceName}. It is scheduled.",
    ignore:
      "You receive this email because you wrote this post in {workspaceName} on Peal, asked for its approval or took part in its review. Choose which notifications you receive by email in your notification preferences.",
    subject: "A post was approved",
  },
  postApprovedLate: {
    action: "Choose a new time",
    body: "{by} approved a post of {workspaceName}, after the time it was to go out. Nothing was published late: the post is a draft again, still approved. Give it a new time to schedule it.",
    ignore:
      "You receive this email because you wrote this post in {workspaceName} on Peal, asked for its approval or took part in its review. Choose which notifications you receive by email in your notification preferences.",
    subject: "A post was approved after its time",
  },
  postChangesRequested: {
    action: "Open the post",
    body: "{by} asked for changes to a post of {workspaceName}. It is a draft again, with a comment that says what to change.",
    ignore:
      "You receive this email because you wrote this post in {workspaceName} on Peal, asked for its approval or took part in its review. Choose which notifications you receive by email in your notification preferences.",
    subject: "Changes asked for on a post",
  },
  postCommented: {
    action: "Read the comment",
    body: "{by} commented on a post of {workspaceName}.",
    ignore:
      "You receive this email because you wrote this post in {workspaceName} on Peal, asked for its approval or took part in its review. Choose which notifications you receive by email in your notification preferences.",
    subject: "A new comment on a post",
  },
  postFailed: {
    action: "Open the post",
    body: "A post of {workspaceName} did not go out on {channel}: {reason}",
    ignore:
      "You receive this email because you wrote this post in {workspaceName} on Peal, or schedule posts there. Choose which notifications you receive by email in your notification preferences.",
    subject: "A post did not go out on {channel}",
  },
  postPublished: {
    action: "See the post",
    body: "A post of {workspaceName} is live on {channel}.",
    ignore:
      "You receive this email because you wrote this post in {workspaceName} on Peal, or schedule posts there. Choose which notifications you receive by email in your notification preferences.",
    subject: "Published on {channel}",
  },
  postUnconfirmed: {
    action: "Open the post",
    body: "Peal sent a post of {workspaceName} to {channel} but got no answer, so it may or may not be live. Check the platform before you post it again, then tell Peal what you found.",
    ignore:
      "You receive this email because you wrote this post in {workspaceName} on Peal, or schedule posts there. Choose which notifications you receive by email in your notification preferences.",
    subject: "Check {channel}: a post may have gone out",
  },
  renewalDeadline: "Last day to refuse the renewal: {renewsAt}",
  resetPassword: {
    action: "Choose a new password",
    body: "Someone asked to reset the password of your Peal account. Choose a new one with the link below.",
    ignore:
      "If you did not ask for this, ignore this email: your password stays as it is. The link expires in an hour.",
    subject: "Reset your Peal password",
  },
  reviewParties: {
    application: "An application",
    member: "A member",
    visitor: "A reviewer",
  },
  roles: {
    admin: "as an admin",
    contributor: "as a contributor",
    editor: "as an editor",
    owner: "as an owner",
    viewer: "as a viewer",
  },
  subscriptionCancelled: {
    action: "Open billing",
    body: "The {plan} subscription of {workspaceName} is cancelled. It ends on {endsAt}, and nothing more is charged after it: until then the workspace keeps its plan, then it moves to the free plan with its content. This email confirms the cancellation and the date it takes effect.",
    ignore:
      "You receive this email because you manage billing for {workspaceName} on Peal. Billing emails are always sent: keep this one, it is your record.",
    subject: "Your {plan} subscription is cancelled: it ends on {endsAt}",
  },
  subscriptionRenewing: {
    action: "Open billing",
    body: "The yearly {plan} plan of {workspaceName} renews on {renewsAt} for {price}, VAT included. You are free not to renew it: until the date below, cancel the contract on the billing page, or with Cancel your contract, at the foot of every page, without signing in. It then ends on {renewsAt} and nothing more is charged.",
    ignore:
      "You receive this email because you manage billing for {workspaceName} on Peal. Billing emails are always sent: keep this one, it is your record.",
    subject: "Your yearly {plan} plan renews on {renewsAt}",
  },
  subscriptionStarted: {
    action: "Open billing",
    body: "Thank you: {workspaceName} is subscribed to {plan} since {startedAt}, for {price} a {interval}, VAT included, renewed until cancelled. You asked for it to start at once: as a consumer you may still withdraw within 14 days, with Withdraw from contract here, at the foot of every page and on the billing page, and then pay only for the days used. You can cancel at any time with Cancel your contract, in the same places. The terms of service apply; they hold the model withdrawal form.",
    ignore:
      "You receive this email because you manage billing for {workspaceName} on Peal. Billing emails are always sent: keep this one, it is your record.",
    subject: "Your {plan} subscription has started",
  },
  subscriptionWithdrawn: {
    action: "Open billing",
    body: "We received your withdrawal from the {plan} subscription of {workspaceName} on {withdrawnAt}. The subscription ended then, and {refunded} is refunded to the payment method you used, within 14 days. This email acknowledges your withdrawal.",
    ignore:
      "You receive this email because you manage billing for {workspaceName} on Peal. Billing emails are always sent: keep this one, it is your record.",
    subject: "Withdrawal received: your {plan} subscription has ended",
  },
  trialEnding: {
    action: "Choose a plan",
    body: "The {plan} trial of {workspaceName} ends on {endsAt}. Nothing is charged: unless someone orders a plan before then, the workspace moves to the free plan. {standing}",
    ignore:
      "You receive this email because you manage billing for {workspaceName} on Peal. Billing emails are always sent: keep this one, it is your record.",
    subject: "Your {plan} trial ends on {endsAt}",
  },
  trialStarted: {
    action: "Open billing",
    body: "{workspaceName} is trying {plan} since {startedAt}, until {endsAt}. Nothing is charged, and no payment method was asked for. Unless someone orders {plan} ({price} excluding VAT a month) before then, the workspace moves back to the free plan when the trial ends. You can end the trial at any time from the billing page, or with Cancel your contract, at the foot of every page.",
    ignore:
      "You receive this email because you manage billing for {workspaceName} on Peal. Billing emails are always sent: keep this one, it is your record.",
    subject: "Your {plan} trial has started: it ends on {endsAt}",
  },
  unknownChannel: "a disconnected channel",
  verifyEmail: {
    action: "Confirm my email",
    body: "Welcome to Peal. Confirm your email address to finish creating your account.",
    ignore:
      "If you did not create a Peal account, ignore this email. The link expires in an hour.",
    subject: "Confirm your email for Peal",
  },
  webhookEndpointDisabled: {
    action: "Open webhooks",
    body: "Peal turned off the webhook endpoint at {host} in {workspaceName}: {reason} Nothing is sent to it any more, and the events that happen meanwhile are not kept for it. Once its receiver works again, turn the endpoint back on in the workspace’s settings.",
    ignore:
      "You receive this email because you manage the webhooks of {workspaceName} on Peal. This email is always sent: the systems that listened on this endpoint hear nothing more until someone acts.",
    subject: "Webhook endpoint turned off: {host}",
  },
  webhookTurnOffReasons: {
    failing: "every delivery to it failed for 5 days.",
    gone: "it answered 410 Gone, which asks for no more deliveries.",
  },
  withinFreePlan:
    "It holds nothing beyond what the free plan allows, and keeps its content.",
  workspaceDeleted: {
    action: "Open my workspaces",
    body: "The workspace {workspaceName} was deleted, as you asked, with everything in it: its channels, posts, media, analytics, members and API keys.",
    ignore: "If you did not ask for this, tell whoever runs this Peal server.",
    subject: "The workspace {workspaceName} is deleted",
  },
};
