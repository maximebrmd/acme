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
  commentsReceived: {
    action: "Read the comments",
    body: "A post of {workspaceName} received new comments ({count}) where it was published.",
    ignore:
      "You receive this email because you wrote this post in {workspaceName} on Peal, or answer comments there, and chose to hear about new comments by email. Choose which notifications you receive by email in your notification preferences.",
    subject: "New comments on a post",
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
      "its channel was turned off before it went out. Turn the channel back on, then schedule it in a new post.",
    channelDisconnected:
      "its channel was disconnected from the workspace before it went out.",
    contentRejected: "the platform refused its text or its format.",
    mediaRejected: "the platform refused one of its images or videos.",
    mediaRemoved:
      "one of its images or videos was deleted from the media library before it went out.",
    missed:
      "Peal was unavailable at the scheduled time, and the post came too late to send.",
    notPublished: "someone checked the platform and did not find it.",
    paymentMethodRequired:
      "X bills each post, which Peal passes on at X's rates, and the workspace's billing account has no payment method. Nothing was sent. Add one on the billing page, then post it again.",
    partsNotSent:
      "its first parts are live, and Peal cannot send the parts after them: it has no post to reply to, as the part before them was found by hand or is gone from the platform. Sending it again from Peal is not possible: post the rest on the platform, as replies to the last part that is live.",
    planLimit:
      "the workspace’s plan had no room for it when it was due: it has more channels connected than the plan allows, or the month’s posts were used up. Nothing was sent. Disconnect channels or move to a larger plan, then post it again.",
    quotaExceeded:
      "the platform's daily allowance stayed used up (its uploads, or on YouTube the quota a first comment also spends), for this Peal server or for the account, and Peal stopped waiting.",
    rateLimited:
      "the platform kept turning requests away, and Peal stopped trying.",
    repliesNotAllowed:
      "its first part is live, and the platform did not let this server's app post the parts after it as replies: on X, an app on self-serve access may reply only to a post whose author mentioned or quoted the account. Sending it again from Peal would meet the same refusal: post the rest on the platform, as replies to the last part that is live.",
    tokenExpired:
      "the account’s authorization stopped working. Reconnect it, then post again.",
    unavailable: "the platform could not be reached.",
    xCeilingReached:
      "it would have passed the billing account's monthly ceiling for X, or what it may be billed before its first invoice is paid. Nothing was sent. Raise the ceiling on the billing page, or post it again next month.",
    paymentFailed:
      "X bills each post, which Peal passes on at X's rates, and the billing account's last payment failed: nothing past what is included goes out until it is paid. Nothing was sent. Update the payment method from the billing page, then post it again.",
    perAccountPricingRequired:
      "X bills each post, which Peal passes on at X's rates, and the workspace's plan is one from before per-account pricing, which bills no use of X. Nothing was sent. Move to per-account pricing on the billing page, then post it again.",
    xThreadCut:
      "the thread was cut: its first parts are live, and X's meter refused the next one, as the billing account cannot be billed for it now (no payment method, a payment failing, a plan from before per-account pricing, or its monthly ceiling for X: the billing page says which). Once it can, send the rest again, or keep the live parts as the post.",
  },
  feedStopReasons: {
    gone: "its site says the feed is gone for good.",
    notAFeed:
      "for seven days, its address has given something that is not a feed.",
    queueGone: "the queue it puts posts on was deleted.",
    starterGone:
      "whoever added it can no longer make posts there. Whoever resumes it takes it over: its posts are then theirs.",
    unreachable: "it could not be read for seven days.",
  },
  feedStopped: {
    action: "Open the feeds",
    body: "A feed of {workspaceName} no longer makes posts: {reason} The posts it already made stay as they are. Once that is put right, resume it from the feeds in the workspace’s settings.",
    ignore:
      "You receive this email because you added this feed in {workspaceName} on Peal, or schedule posts there. Choose which notifications you receive by email in your notification preferences.",
    subject: "A feed no longer makes posts",
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
    "Today it holds more than the free plan allows: {over}. From that day, nothing is scheduled or published until it is back within the free plan: posts already scheduled fail when due, and can be posted again afterwards. Add a payment method, or choose which accounts stay, on the billing page.",
  plans: {
    agency: "Agency",
    business: "Business",
    payAsYouGo: "Per-account pricing",
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
  firstCommentFailed: {
    action: "Open the post",
    body: "A post of {workspaceName} is live on {channel}, but its first comment did not go out: {reason} The post itself stays live: from Peal, send the comment again, or settle the post without it.",
    ignore:
      "You receive this email because you wrote this post in {workspaceName} on Peal, or schedule posts there. Choose which notifications you receive by email in your notification preferences.",
    subject: "A first comment did not go out on {channel}",
  },
  laterPartsFailed: {
    action: "Open the post",
    body: "A post of {workspaceName} is live on {channel}, but the parts after its first did not go out: {reason} The post itself stays live: send the rest again from Peal.",
    ignore:
      "You receive this email because you wrote this post in {workspaceName} on Peal, or schedule posts there. Choose which notifications you receive by email in your notification preferences.",
    subject: "The rest of a thread did not go out on {channel}",
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
  recoveryCodesLeft: {
    none: "You have no recovery code left: make new ones in your account settings.",
    one: "You have {count} recovery code left.",
    other: "You have {count} recovery codes left.",
  },
  recyclingEndReasons: {
    contentRejected: "a platform refuses what the next post would say.",
    noChannels: "none of its channels is connected any more.",
    planLimit: "the plan has no room left for posts that month.",
    queueFull: "its queue has no free slot.",
    queueGone: "its queue was deleted.",
    sourceGone: "the post it repeats was deleted.",
    sourceWithdrawn:
      "the post it repeats was cancelled or taken back to draft: schedule it again, then resume the repeat.",
    starterGone: "whoever started it can no longer schedule posts there.",
  },
  recyclingEnded: {
    action: "Open the repeating posts",
    body: "A post of {workspaceName} no longer repeats: {reason} The posts it already made stay as they are. Once that is put right, resume it or start it again from the repeating posts in the workspace’s settings.",
    ignore:
      "You receive this email because you started this repeat in {workspaceName} on Peal, or schedule posts there. Choose which notifications you receive by email in your notification preferences.",
    subject: "A post no longer repeats",
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
    action: "Add a payment method",
    body: "The {plan} trial of {workspaceName} ends on {endsAt}. Nothing is charged: unless someone orders a plan before then, the workspace moves to the free plan. {standing}",
    ignore:
      "You receive this email because you manage billing for {workspaceName} on Peal. Billing emails are always sent: keep this one, it is your record.",
    subject: "Your {plan} trial ends on {endsAt}",
  },
  perAccountStarted: {
    action: "Open billing",
    body: "Thank you: {workspaceName} is on per-account pricing since {startedAt}: {rates}, excluding tax, counted by the day each account is connected; each use past its monthly allowance is billed at the rate card's price. Nothing is charged now: an invoice follows each month, for the month past, renewed until cancelled. You asked for it to start at once: as a consumer you may still withdraw within 14 days, with Withdraw from contract here, at the foot of every page and on the billing page, and then pay only for what was used. You can cancel at any time with Cancel your contract, in the same places. The terms of service apply; they hold the model withdrawal form.",
    ignore:
      "You receive this email because you manage billing for {workspaceName} on Peal. Billing emails are always sent: keep this one, it is your record.",
    subject: "Per-account pricing has started",
  },
  rates: {
    band: "accounts {from} to {to} at {price} a month each",
    free: "accounts 1 to {count} free",
    lastBand: "accounts {from} and up at {price} a month each",
  },
  paymentMethodNeeded: {
    action: "Add a payment method",
    body: "{workspaceName} holds {accounts} connected accounts, more than the {allowed} the free tier includes. Until {graceUntil} it still schedules and publishes on the accounts it held when billing began, and connects no more. After that day nothing is published until a payment method is added on the billing page, or {allowed} accounts are kept: posts scheduled then fail when due, and can be posted again afterwards.",
    ignore:
      "You receive this email because you manage billing for {workspaceName} on Peal. Billing emails are always sent: keep this one, it is your record.",
    subject: "Add a payment method to {workspaceName} before {graceUntil}",
  },
  allowanceReached: {
    action: "Add a payment method",
    body: "{workspaceName} used the {allowed} {meter} its billing account includes this month without a payment method. Until {resetsAt}, the meter pauses: no more messages are sent and no new ads are recorded; reading, publishing and everything else go on. Add a payment method on the billing page to go on now: what is used past the allowance is then billed at the rate card's price.",
    ignore:
      "You receive this email because you manage billing for {workspaceName} on Peal. Billing emails are always sent: keep this one, it is your record.",
    subject: "{workspaceName} used this month's {meter}",
  },
  xCeilingNearing: {
    action: "Open the billing page",
    body: "{workspaceName}'s billing account has spent {percent}% of its monthly ceiling for X, {ceiling} excluding tax, at X's own rates. Once it is reached, posts to X and the reading of X's counts stop until {resetsAt}. Raise the ceiling on the billing page if you need more.",
    ignore:
      "You receive this email because you manage billing for {workspaceName} on Peal. Billing emails are always sent: keep this one, it is your record.",
    subject: "{workspaceName} spent {percent}% of its X ceiling",
  },
  xCeilingReached: {
    action: "Raise the ceiling",
    body: "{workspaceName}'s billing account reached its monthly ceiling for X, {ceiling} excluding tax, at X's own rates. Until {resetsAt}, posts to X fail without being sent and X's counts are not read; every other platform goes on. Raise the ceiling on the billing page to go on now.",
    ignore:
      "You receive this email because you manage billing for {workspaceName} on Peal. Billing emails are always sent: keep this one, it is your record.",
    subject: "{workspaceName} reached its X ceiling",
  },
  meters: {
    assistantImages: "writing assistant images",
    assistantRequests: "writing assistant requests",
    managedAds: "managed ads",
    outboundMessages: "inbox messages sent",
    xApi: "X API usage",
  },
  trialStarted: {
    action: "Open billing",
    body: "{workspaceName} is trying {plan} since {startedAt}, until {endsAt}. Nothing is charged, and no payment method was asked for. Unless someone orders {plan} ({price} excluding VAT a month) before then, the workspace moves back to the free plan when the trial ends. You can end the trial at any time from the billing page, or with Cancel your contract, at the foot of every page.",
    ignore:
      "You receive this email because you manage billing for {workspaceName} on Peal. Billing emails are always sent: keep this one, it is your record.",
    subject: "Your {plan} trial has started: it ends on {endsAt}",
  },
  twoStepChanged: {
    recoveryCodeUsed: {
      action: "Open my account settings",
      body: "A recovery code was just used to sign in to your Peal account, in place of a code from your authenticator app. It works no more. {left}",
      ignore:
        "If it was not you, change your password and sign out your other sessions from your account settings, then tell whoever runs this Peal server.",
      subject: "A recovery code was used to sign in to Peal",
    },
    recoveryCodesRenewed: {
      action: "Open my account settings",
      body: "New recovery codes were just made for your Peal account’s two-step verification. The codes you had before no longer work.",
      ignore:
        "If it was not you, change your password and sign out your other sessions from your account settings, then tell whoever runs this Peal server.",
      subject: "New recovery codes for your Peal account",
    },
    resetByStaff: {
      action: "Open my account settings",
      body: "The people who run this Peal server turned off two-step verification on your account: its authenticator and recovery codes are deleted, the browsers it trusted are forgotten, and every session is signed out. Sign in with your password, then turn it on again in your account settings.",
      ignore:
        "If you did not ask for it, change your password at once, turn two-step verification on again, and tell whoever runs this Peal server.",
      subject: "Two-step verification was reset on your Peal account",
    },
    turnedOff: {
      action: "Open my account settings",
      body: "Two-step verification was just turned off for your Peal account: signing in asks for your password alone.",
      ignore:
        "If it was not you, change your password and sign out your other sessions from your account settings, then tell whoever runs this Peal server.",
      subject: "Two-step verification is off for your Peal account",
    },
    turnedOn: {
      action: "Open my account settings",
      body: "Two-step verification was just turned on for your Peal account: signing in asks for a code from your authenticator app after your password. Keep your recovery codes somewhere safe.",
      ignore:
        "If it was not you, change your password and sign out your other sessions from your account settings, then tell whoever runs this Peal server.",
      subject: "Two-step verification is on for your Peal account",
    },
  },
  unknownChannel: "a disconnected channel",
  verifyEmail: {
    action: "Confirm my email",
    body: "Welcome to Peal. Confirm your email address to finish creating your account.",
    ignore:
      "If you did not create a Peal account, ignore this email. The link expires in an hour.",
    subject: "Confirm your email for Peal",
  },
  webhookDeliveriesFailing: {
    action: "Open the delivery log",
    body: "A delivery to the webhook endpoint at {host} in {workspaceName} failed for good: every attempt failed over about a day, so the system behind it missed an event. The endpoint is still on. Fix its receiver, then send the failed deliveries again from the delivery log. After 5 days of failures, Peal turns the endpoint off.",
    ignore:
      "You receive this email because you manage the webhooks of {workspaceName} on Peal, at most once a day for each endpoint. Choose which notifications you receive by email in your notification preferences.",
    subject: "Webhook deliveries are failing: {host}",
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
  weeklyDigest: {
    action: "Open my agenda",
    calendar: "Open the calendar of {workspaceName}",
    counts: {
      awaitingApproval: {
        one: "{count} waiting for approval",
        other: "{count} waiting for approval",
      },
      failed: { one: "{count} failed", other: "{count} failed" },
      scheduled: {
        one: "{count} scheduled this week",
        other: "{count} scheduled this week",
      },
      unconfirmed: {
        one: "{count} to check on its platform",
        other: "{count} to check on their platforms",
      },
      wentOut: {
        one: "{count} post went out",
        other: "{count} posts went out",
      },
    },
    engagement:
      "Engagement with the week’s posts, as last counted: {engagement}.",
    ignore:
      "You receive this email because you turned on the weekly digest on Peal. To stop it, turn it off in {preferences}.",
    impressions: "Impressions: {impressions}.",
    intro:
      "What went out from {from} to {to}, and what is planned until {until}, in the workspaces whose posts you may read. Days and times are in UTC.",
    more: { one: "and {count} more", other: "and {count} more" },
    noText: "No text",
    plannedHeading: "Planned",
    preferences: "your notification preferences",
    subject: "Your week on Peal: {from} to {to}",
    wentOutHeading: "Went out",
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
