import { DateTime, Effect, Match, Option } from "effect";
import type { Schema } from "effect";
import type { HttpClientError } from "effect/http";
import type { HttpApiError } from "effect/http-api";
import {
  duplicateWindowHours,
  maxImportRows,
  queueHorizonDays,
} from "peal-contract";
import type {
  AdAccountUnusable,
  BoostViolation,
  CommentInvalid,
  ContentViolation,
  DuplicateOnChannel,
  ImportUnreadable,
  MediaSourceFailure,
  NotRecyclableReason,
  PostNotPromotable,
  WebhookUrlRefused,
} from "peal-contract";
import type { TextUnit } from "peal-contract/post-text";

import { money } from "#ads-money.ts";
import type { MinorUnitDigits } from "#ads-money.ts";
import { apiErrorJson } from "#api-error.ts";
import type { ApiError } from "#api-error.ts";
import { requestFailed } from "#api-request-failed.ts";
import type { ApiRequestFailed } from "#api-request-failed.ts";
import { PealApi } from "#api.ts";
import { CredentialStore } from "#credentials.ts";
import { livePostRefusalWords } from "#live-post-refusals.ts";
import { planLimitReason } from "#plan-limit.ts";
import { Refused } from "#refused.ts";
import { SignInExpired } from "#sign-in-expired.ts";

/** Whatever a signed-in command's request may fail with. */
export type ApiFailure =
  | ApiError
  | HttpApiError.BadRequest
  | HttpClientError.HttpClientError
  | Schema.SchemaError;

const mebibyte = 1024 * 1024;

// A size as people compare it with a limit: in MiB, to one decimal.
const size = (bytes: number): string => `${(bytes / mebibyte).toFixed(1)} MiB`;

const seconds = (milliseconds: number): string =>
  `${String(milliseconds / 1000)} s`;

// Why the assistant's provider made nothing usable, and what to do.
const assistantFailures = {
  declined:
    "The image provider refused this description, under its content rules: nothing was stored, and the requests it cost are spent. Try another description.",
  invalidAnswer:
    "The image provider answered with nothing Peal stores as an image: nothing was stored, and the requests it cost are spent.",
  timedOut:
    "The image provider took too long to answer: nothing was stored, and the requests it cost are spent, as it may have made the image.",
  unreachable:
    "The image provider could not be reached: nothing was spent or stored. Try again in a few minutes.",
} as const;

/** What a platform counts a text in. */
export const units: Readonly<Record<TextUnit, string>> = {
  codePoints: "characters",
  emojiBytes: "characters, an emoji counting for its bytes",
  graphemes: "characters",
  utf16Units: "UTF-16 units",
  utf8Bytes: "bytes",
  weighted: "weighted characters",
};

// Why Peal delivers nothing to an address, and what would make it one.
const urlRefusals: Readonly<Record<WebhookUrlRefused["reason"], string>> = {
  credentials:
    "The address carries a user name or a password: leave them out, and check each delivery's signature instead.",
  malformed:
    "The address is not a URL: give it whole, such as https://hooks.example.com/peal.",
  notHttps:
    "The address must be HTTPS, on the default port (443): Peal delivers nowhere else.",
  notPublic:
    "The address's host is not a public address (loopback, private or link-local): Peal delivers only to hosts anyone on the internet can reach.",
  tooLong: "The address is longer than 2048 characters.",
  unknownHost:
    "The address's host name does not resolve: check its spelling, and that its DNS record exists.",
};

// Why a post cannot repeat, as the user puts it right.
const notRecyclable: Readonly<Record<NotRecyclableReason, string>> = {
  awaitingApproval:
    "The post waits for an approval: it repeats once it is scheduled.",
  cancelled:
    "The post was cancelled: only a post on its way, or that went out, repeats.",
  draft: "The post is a draft: schedule it first, then make it repeat.",
  noChannels: "None of the post's channels is connected any more.",
  occurrence:
    "A recycling rule made this post: make its source repeat instead.",
  repeating:
    "Another rule repeats this post already: peal recycling list shows it, and peal recycling end stops it.",
};

// What breaks a platform's rule, as the author fixes it.
const brokenRule = (violation: ContentViolation): string =>
  Match.valueTags(violation, {
    altTextTooLong: ({ length, maximum }) =>
      `its description has ${String(length)} characters, and the platform keeps ${String(maximum)}`,
    aspectRatioUnsupported: ({ height, maximum, minimum, width }) =>
      `it is ${String(width)}×${String(height)}, and the platform takes a width over height from ${String(minimum)} to ${String(maximum)}`,
    empty: () => "the post would go out with no text and no media",
    forbiddenCharacters: ({ characters }) =>
      `the text holds characters the platform refuses: ${characters.join(" ")}`,
    mediaRequired: () =>
      "the platform publishes nothing without an image or a video",
    mediaTooLarge: ({ byteSize, maximum }) =>
      `it weighs ${size(byteSize)}, and the platform takes ${size(maximum)}`,
    mediaTooSmall: ({ byteSize, minimum }) =>
      `it weighs ${String(byteSize)} bytes, and the platform takes ${String(minimum)} at least`,
    mediaTypeUnsupported: ({ contentType }) =>
      `the platform takes no ${contentType} file`,
    mixedMedia: () => "the platform never shows images and videos in one post",
    noChannels: () => "the post is for no channel",
    optionInvalid: () => "the platform refuses this value",
    optionMissing: () =>
      "the platform needs this option, and the post has none",
    optionTooLong: ({ length, maximum }) =>
      `it has ${String(length)} characters, and the platform takes ${String(maximum)}`,
    optionsForOtherPlatform: ({ optionsPlatform }) =>
      `its options are ${optionsPlatform}'s, not this channel's platform's`,
    optionsWithoutChannel: () =>
      "options are given for a channel the post is not for",
    overrideWithoutChannel: () =>
      "a text is given for a channel the post is not for",
    sideOutOfRange: ({ height, maximum, minimum, width }) =>
      `it is ${String(width)}×${String(height)}, and the platform takes sides from ${String(minimum)} to ${String(maximum)} pixels`,
    textTooLong: ({ length, maximum, unit }) =>
      `the text has ${String(length)} ${units[unit]}, and the platform takes ${String(maximum)}`,
    tooManyHashtags: ({ count, maximum }) =>
      `${String(count)} hashtags, and the platform takes ${String(maximum)}`,
    tooManyLinks: ({ count, maximum }) =>
      `${String(count)} different links, and the platform takes ${String(maximum)}`,
    tooManyMedia: ({ count, maximum }) =>
      `${String(count)} images and videos, and the platform takes ${String(maximum)}`,
    tooManyMentions: ({ count, maximum }) =>
      `${String(count)} mentions, and the platform takes ${String(maximum)}`,
    tooManyParts: ({ count, maximum }) =>
      maximum === 1
        ? "the platform takes a post alone, with no part after it"
        : `${String(count)} parts, and the platform takes ${String(maximum)}`,
    tooManyPixels: ({ height, maximum, width }) =>
      `it is ${String(width)}×${String(height)}, and the platform takes ${String(maximum)} pixels in all`,
    tooManyVideos: ({ count, maximum }) =>
      `${String(count)} videos, and the platform takes ${String(maximum)}`,
    videoTooLong: ({ durationMs, maximumMs }) =>
      `it lasts ${seconds(durationMs)}, and the platform takes ${seconds(maximumMs)}`,
    videoTooShort: ({ durationMs, minimumMs }) =>
      `it lasts ${seconds(durationMs)}, and the platform takes ${seconds(minimumMs)} at least`,
  });

// Where a violation is: its channel and platform, then the option or the
// media it names.
const placeOf = (violation: ContentViolation): string =>
  [
    "channelId" in violation
      ? `channel ${violation.channelId}${"platform" in violation ? ` (${violation.platform})` : ""}`
      : [],
    "part" in violation && violation.part !== undefined
      ? `part ${String(violation.part + 1)}`
      : [],
    "field" in violation ? `option ${violation.field}` : [],
    "mediaId" in violation ? `media ${violation.mediaId}` : [],
  ]
    .flat()
    .join(", ");

/**
 * One violation: its name, as the API gives it, where it is, and what it
 * means.
 */
export const violationOf = (violation: ContentViolation): string => {
  const place = placeOf(violation);

  return `${violation._tag}${place === "" ? "" : ` on ${place}`}: ${brokenRule(violation)}`;
};

/** The channels that already have a post's content, each with its post. */
export const duplicateChannels = (
  duplicates: readonly DuplicateOnChannel[]
): string =>
  duplicates
    .map(({ channelId, postId }) => `channel ${channelId} (post ${postId})`)
    .join(", ");

// Why a file is not posts, and what would make it a list of them.
const unreadableImport = ({ column, problem }: ImportUnreadable): string => {
  const named = column === null ? "" : `, ${column}`;

  const reasons: Readonly<Record<ImportUnreadable["problem"], string>> = {
    empty:
      "The file is empty: its first line names the columns, and each line under it is a post.",
    missingColumn: `The file's first line lacks a column it needs${named}: text, channels and at are required.`,
    repeatedColumn: `The file's first line names a column twice${named}.`,
    strayQuote:
      'A cell of the file holds a double quote without being written between quotes, or goes on after its closing quote: write such a cell between double quotes, and each quote inside it twice ("").',
    tooManyRows: `The file has more than ${String(maxImportRows)} rows under its first line, the most one import takes: split it.`,
    unknownColumn: `The file's first line names a column Peal does not know${named}: it reads text, channels, media, at, time_zone, allow_duplicate and idempotency_key.`,
    unterminatedQuote:
      'A quoted cell of the file never ends: close it with a double quote, and write a quote inside a cell twice ("").',
  };

  return `${reasons[problem]} Nothing was made.`;
};

const sourceFailures: Readonly<Record<MediaSourceFailure, string>> = {
  badStatus: "its host answered something else than the file",
  noAnswer: "its host did not answer, or broke off",
  tooManyRedirects: "it redirects more than three times",
  tooSlow:
    "the file did not arrive within 90 seconds: download it, then upload it with peal media upload",
  unknownHost: "its host has no address",
};

// What is wrong with a comment, as the user fixes it.
const commentProblems: Readonly<Record<CommentInvalid["problem"], string>> = {
  anchor:
    "it is about a channel the post does not go to, or it is an answer, which is about what its thread is about",
  name: "the name is empty, or longer than 80 characters",
  parent:
    "it answers a comment that started no thread of this post: answer the first comment of a thread, which is also the one to resolve",
  selection: "the words it quotes are not in the post's text where it says",
  text: "its text is empty, or longer than 2000 characters",
};

// Why an ad account takes no boost now, and who puts it right.
const unusableAccounts: Readonly<Record<AdAccountUnusable["reason"], string>> =
  {
    permission:
      "The ad account's sign-in did not allow making and running ads: the person who signed in signs in again, in the web app, and allows it. Nothing was sent.",
    reconnectNeeded:
      "The ad network refused the ad account's sign-in: the person who signed in signs in again, in the web app. Nothing was sent.",
    status:
      "The ad account cannot run ads now: its network turned it off, waits for a payment, is reviewing it, or closed it. That is settled at the ad network. Nothing was sent.",
  };

// Why a post is not boosted there.
const notPromotable: Readonly<Record<PostNotPromotable["reason"], string>> = {
  connection:
    "The Instagram account was connected through Instagram Login, which cannot run ads: a person connects it through its Facebook Page, in the web app. Nothing was sent.",
  notPublished:
    "The post is not published on that channel, or the channel was disconnected since: Peal boosts a post once it is live there, and peal posts show tells where it went out. Nothing was sent.",
  platform:
    "Peal boosts posts on Facebook Pages and Instagram only, and that channel is of another platform. Nothing was sent.",
};

/** What breaks one of Peal's rules for a boost, as the user fixes it. */
export const boostViolations: Readonly<Record<BoostViolation, string>> = {
  ageRange: "the youngest age is above the oldest",
  beneficiaryRequired:
    "the audience is in the European Union, where an ad says who benefits from it and who pays for it: give --beneficiary and --payer",
  budgetEmpty: "the budget is zero",
  currencyMismatch:
    "the budget's currency is not the ad account's: give --currency as peal ads accounts shows it",
  endsBeforeStart: "the run ends before it starts, or has ended already",
  runTooLong: "the run is longer than 90 days",
  runTooShort:
    "the run is shorter than a day, or, with a daily budget, not longer than one",
  specialCategory:
    "Peal does not boost ads about housing, employment, financial products or services, or social issues, elections or politics",
  startsTooFarAhead: "the run starts more than 30 days ahead",
};

/** The scope a sign-in needs to manage ad accounts and, with publishing, to spend. */
export const adsScope = "workspace:ads";

const withoutAdsScope =
  "This sign-in was made without the permission to work with ads (the scope workspace:ads), which is asked only on purpose, as it lets an application spend: run peal login --ads again and approve it. Nothing was done.";

// Amounts of an ad account's currency: written in its units when the
// command knows how many decimals it has, and as the API counts them
// otherwise.
const amountsIn = (currency: string, digits: MinorUnitDigits | undefined) => ({
  note:
    digits === undefined
      ? ` Amounts are in ${currency}'s minor units, as the ad network counts them (cents for EUR, yen for JPY).`
      : "",
  of: (amount: number): string =>
    digits === undefined ? String(amount) : money(amount, currency, digits),
});

const refused = (reason: string) => new Refused({ reason });

/**
 * Where a person turns two-step verification on: the account page of the
 * web app, which the API shares its address with.
 */
export const accountPageOf = (url: string): string =>
  `${new URL(url).origin}/app/account`;

const twoStepRequired = (url: string): string =>
  `This workspace requires two-step verification. Turn it on at ${accountPageOf(url)}, then run the command again.`;

const reasonOf =
  (url: string, digits?: MinorUnitDigits) =>
  (failure: ApiFailure): ApiRequestFailed | Refused | SignInExpired =>
    Match.valueTags(failure, {
      AdAccountBusy: ({ boosts }) =>
        refused(
          `The ad account has ${String(boosts)} ${boosts === 1 ? "boost that runs, may run, is paused or is being made" : "boosts that run, may run, are paused or are being made"}: stop them first, with peal ads boost stop, so nothing spends that Peal no longer follows.`
        ),
      AdAccountNotFound: () =>
        refused(
          "The workspace has no ad account with that id: peal ads accounts lists them."
        ),
      AdAccountSpendCapExceeded: ({ currency, requested, room }) => {
        const amounts = amountsIn(currency, digits);

        return refused(
          `The ad account's own spend cap, set at its ad network, leaves ${amounts.of(room)}, and the boost would commit ${amounts.of(requested)}: nothing was reserved or sent. Make the boost smaller, or have the cap raised at the ad network; Peal never raises it.${amounts.note}`
        );
      },
      AdAccountUnusable: ({ reason }) => refused(unusableAccounts[reason]),
      AdConnectionNotFound: () =>
        refused(
          "The workspace has no such sign-in to an ad network, or it is another member's."
        ),
      AdNetworkUnavailable: ({ retryAfterSeconds }) =>
        refused(
          `The ad network did not answer, asked to slow down, or could not confirm the change: nothing is known to have changed, and the boost stands where it did. Trying again is safe${retryAfterSeconds === null ? ", later" : `, in ${String(retryAfterSeconds)} seconds`}; peal ads boost show tells where it stands.`
        ),
      AdSignInFailed: () =>
        refused(
          "The sign-in to the ad network did not come to a connection: a person starts it again, in the web app."
        ),
      AdSpendingNotEnabled: () =>
        refused(
          "No owner of the workspace allowed this ad account to spend through Peal. An owner turns spending on, with a monthly ceiling, in the web app, signed in themselves: no command, API key or application does it. Nothing was spent."
        ),
      AdSpendingUnavailable: () =>
        refused(
          "This server offers ads for reading only: its operator has not turned spending on (PEAL_ADS=spend). Nothing was spent or changed."
        ),
      AdsUnavailable: () =>
        refused(
          "Ads are off on this server, or the ad network is not set up on it: its operator turns them on (PEAL_ADS)."
        ),
      AlreadyMember: () => refused("That address belongs to a member already."),
      AltTextTooLong: ({ maxLength }) =>
        refused(
          `The description is longer than Peal keeps: ${String(maxLength)} characters at most.`
        ),
      ApprovalChanged: () =>
        refused(
          "The post changed since you read it: it was asked again, or says something else. Nothing was decided. Read it again with peal review show, then decide with the --approval and --subject it prints."
        ),
      ApprovalNotPending: () =>
        refused(
          "The post does not wait for an approval: none was asked, or it was already decided, withdrawn or scheduled. peal approvals list shows those that wait."
        ),
      AssistantFailed: ({ reason }) => refused(assistantFailures[reason]),
      AssistantInputRejected: ({ maxLength, reason }) =>
        refused(
          reason === "empty"
            ? "The prompt is blank: say what the image should show."
            : `The prompt is longer than the ${String(maxLength)} characters the assistant takes: shorten it.`
        ),
      AssistantQuotaExceeded: ({ dailyLimit, planWithRoom }) =>
        refused(
          `The workspace has fewer of its ${String(dailyLimit)} daily assistant requests left than this costs: nothing was made. Try again after midnight UTC${planWithRoom === null ? "" : `, or move to the ${planWithRoom} plan, which allows more`}.`
        ),
      AssistantUnavailable: () =>
        refused(
          "This Peal server makes no images: its operator has not set up an image model. Upload or import a picture instead."
        ),
      BadRequest: () => refused("Peal could not read the request."),
      BoostInvalid: ({ violations }) =>
        refused(
          [
            "Peal refused the boost, and reserved and sent nothing:",
            ...violations.map(
              (violation) => `  ${violation}: ${boostViolations[violation]}`
            ),
          ].join("\n")
        ),
      BoostKeyReused: () =>
        refused(
          "This idempotency key already names a boost of the workspace that asked for something else (another post, account, budget or end): nothing was made. To run that boost again, send exactly what was sent with the key; a new boost takes a new --idempotency-key. peal ads boosts lists the boosts there are."
        ),
      BoostNotFound: () =>
        refused(
          "The workspace has no boost with that id: peal ads boosts lists them."
        ),
      BoostStateConflict: ({ state }) =>
        refused(
          `The boost is ${state}, which does not allow this: only a paused boost resumes, and one that failed, ended or was stopped does not run again. Nothing was changed.`
        ),
      CeilingCurrencyMismatch: ({ accountCurrency }) =>
        refused(
          `The ceiling is in another currency than the ad account's (${accountCurrency}): nothing was changed.`
        ),
      ChannelCannotPost: ({ reason }) =>
        refused(
          reason === "disabled"
            ? "The channel is turned off: turn it back on with peal channels enable, or in the web app, to post to it."
            : "The channel must be reconnected, in the web app, before it can post."
        ),
      ChannelNotFound: () =>
        refused(
          "The workspace has no such channel, or it is not of this platform: peal channels list shows them."
        ),
      ChannelSetNameTaken: () =>
        refused(
          "The workspace already has a channel set of that name, whatever its case: nothing was changed. peal sets list shows them."
        ),
      ChannelSetNotFound: () =>
        refused(
          "The workspace has no such channel set, by id or by name: peal sets list shows them."
        ),
      CommentInvalid: ({ problem }) =>
        refused(`Peal refused the comment: ${commentProblems[problem]}.`),
      CommentNotFound: () =>
        refused("The post has no such comment: peal review show lists them."),
      ConnectFailed: ({ reason }) =>
        refused(
          reason === "notConfigured"
            ? "This server is not set up to connect accounts of this platform: its operator sets the platform's app."
            : "This server cannot connect accounts of this platform."
        ),
      ConnectLinkNotFound: () =>
        refused(
          "The workspace has no connect link with that id: peal links list shows them."
        ),
      DuplicatePost: ({ duplicates }) =>
        refused(
          `The same content already goes to ${duplicateChannels(duplicates)}, less than ${String(duplicateWindowHours)} hours from this post's time: nothing was made. If you mean to post it twice, send it again with --allow-duplicate.`
        ),
      // The server says what is missing and how to get it; one older than
      // that says nothing.
      Forbidden: ({ message, permission, reason, scope }) => {
        // Nothing the command line does turns it on: the person does, in
        // the web app, and the command works again at once.
        if (reason === "twoStepRequired") {
          return refused(twoStepRequired(url));
        }

        // Whatever scope the server names first, a sign-in refused over an
        // ads permission lacks the scope --ads asks for.
        if (
          reason === "missingScope" &&
          (scope === adsScope || permission?.startsWith("ads:") === true)
        ) {
          return refused(withoutAdsScope);
        }

        return refused(
          message === undefined || message === ""
            ? "Peal refused: your role in this workspace does not allow it, or your account was suspended."
            : `Peal refused: ${message}`
        );
      },
      HttpClientError: requestFailed(url),
      IdempotencyKeyReused: () =>
        refused(
          "This idempotency key was sent in the last 24 hours with another post: nothing was made. Send this one under a new --idempotency-key."
        ),
      ImportUnreadable: (unreadable) => refused(unreadableImport(unreadable)),
      InboxActionFailed: ({ reason }) =>
        refused(
          `The platform did not do it (${reason}), and nothing changed in Peal: asking again is safe.`
        ),
      InboxActionUnavailable: ({ ability, standing }) =>
        refused(
          standing === "reconnect"
            ? `This channel may not ${ability} yet: disconnect it and connect the account again, which asks for what it takes, or the channel was disconnected or turned off. Nothing was asked of the platform.`
            : `This channel's platform does not let the account ${ability} here. Nothing was asked of it.`
        ),
      InboxCommentGone: () =>
        refused(
          "The comment is no longer on its platform: it can be neither answered nor moderated."
        ),
      InboxCommentNotFound: () =>
        refused(
          "The workspace has no such comment: peal inbox thread shows a thread's."
        ),
      InboxReplyNotFound: () =>
        refused(
          "The workspace has no such reply: peal inbox thread shows a thread's."
        ),
      InboxThreadNotFound: () =>
        refused(
          "The workspace has no such thread: peal inbox threads lists them."
        ),
      InvalidDateRange: () =>
        refused(
          "The range must end on or after the day it starts, and span 366 days at most."
        ),
      InvalidTimeRange: () =>
        refused(
          "The range ends before it starts: give a --to later than --from."
        ),
      InvalidTimeZone: ({ timeZone }) =>
        refused(
          `${timeZone} is not a time zone Peal knows: give an IANA zone, such as Europe/Paris.`
        ),
      InvitationNotFound: () =>
        refused(
          "The workspace has no pending invitation with that id: it was accepted, declined or revoked."
        ),
      LivePostNotChangeable: ({ reason }) =>
        refused(
          `The post was not deleted from that channel: ${livePostRefusalWords[reason]}. Nothing was asked of the platform.`
        ),
      LookupInputInvalid: () =>
        refused(
          "The lookup refused its input: peal channels lookup <channel-id> lists what each lookup takes, and a cursor must be one a page before named."
        ),
      LookupNotFound: () =>
        refused(
          "This channel's platform has no such lookup: peal channels lookup <channel-id> lists those it has."
        ),
      MediaImportBusy: () =>
        refused(
          "The workspace already imports two files at once, or has two images being made, or the server runs as many as it takes together: nothing was fetched or made. Try again in a moment."
        ),
      MediaNotFound: () => refused("The workspace has no such media."),
      MediaSourceNotPublic: () =>
        refused(
          "Peal does not fetch this address: it takes https URLs on the default port whose host is public, redirects included. Nothing was fetched: download the file, then upload it with peal media upload."
        ),
      MediaSourceUnreachable: ({ reason, status }) =>
        refused(
          `Peal could not fetch the file: ${sourceFailures[reason]}${status === null ? "" : ` (HTTP ${String(status)})`}. Nothing was stored.`
        ),
      MediaStoreUnavailable: () =>
        refused(
          "The server cannot reach its media store right now: try again later."
        ),
      MediaTooLarge: ({ byteSize, kind, maxByteSize }) =>
        refused(
          `The ${kind} weighs ${size(byteSize)}, and Peal stores ${kind}s up to ${size(maxByteSize)}.`
        ),
      PartnerNotFound: () =>
        refused(
          "The workspace has no partner account: an owner or an admin opens one in the web app's settings, where the server lets them, or its operator does."
        ),
      PlanLimitReached: (reached) => refused(planLimitReason(reached)),
      PlatformRateLimited: ({ retryAfterSeconds }) =>
        refused(
          retryAfterSeconds === null
            ? "The platform asked to slow down, or its allowance for today is spent: try again later."
            : `The platform asked to slow down: try again in ${String(retryAfterSeconds)} seconds.`
        ),
      PlatformUnreachable: () =>
        refused(
          "The platform did not answer, or asked to slow down: try again in a few minutes."
        ),
      PostContentInvalid: ({ violations }) =>
        refused(
          [
            "Peal refused the post, and made nothing:",
            ...violations.map((violation) => `  ${violationOf(violation)}`),
          ].join("\n")
        ),
      PostNotFound: () => refused("The workspace has no such post."),
      PostNotPromotable: ({ reason }) => refused(notPromotable[reason]),
      PostNotRecyclable: ({ reason }) => refused(notRecyclable[reason]),
      PostNotReviewable: ({ status }) =>
        refused(
          status === "cancelled"
            ? "The post was cancelled: nothing is left to review."
            : "The post went out, or is going out: nothing is left to review."
        ),
      PostStatusConflict: ({ status }) =>
        refused(`The post is ${status}, which does not allow this.`),
      QueueHasNoRoom: ({ reason }) =>
        refused(
          reason === "noSlots"
            ? "The queue has no slot: add some with peal queues update --slot, or give the post a time with --at. Nothing was made or moved."
            : `Every slot of the queue's next ${String(queueHorizonDays)} days is taken: add slots with peal queues update --slot, or give the post a time with --at. Nothing was made or moved.`
        ),
      QueueNameTaken: () =>
        refused(
          "The workspace already has a queue of that name, whatever its case: nothing was changed. peal queues list shows them."
        ),
      QueueNotFound: () =>
        refused(
          "The workspace has no such queue, or no default queue: peal queues list shows them, and peal queues update --default makes one the default."
        ),
      RecyclingEndsTooSoon: ({ firstDueAt }) =>
        refused(
          `The rule's --until or --count leaves no post to make: the next would be due at ${DateTime.formatIso(firstDueAt)}. Nothing was changed.`
        ),
      RecyclingRuleEnded: ({ reason }) =>
        refused(
          `The rule ended (${reason}) and changes no more: peal recycling resume sets it going again when it ended for the plan's room, a refused text, its channels or its queue's slots; start a new one otherwise.`
        ),
      RecyclingRuleNotFound: () =>
        refused(
          "The workspace has no such recycling rule: peal recycling list shows them."
        ),
      RecyclingVariantsInvalid: ({ variants }) =>
        refused(
          [
            "Peal refused the variants, and saved nothing:",
            ...variants.flatMap(({ variant, violations }) =>
              violations.map(
                (violation) =>
                  `  variant ${String(variant)}: ${violationOf(violation)}`
              )
            ),
          ].join("\n")
        ),
      ReplyInvalid: ({ length, maximum, reason, unit }) =>
        refused(
          reason === "empty" || length === null || maximum === null
            ? "The reply says nothing: nothing was sent."
            : `The reply is too long for its platform: ${String(length)} ${unit ?? "characters"}, where it takes ${String(maximum)} (on Mastodon, the mention of the person answered counts). Nothing was sent.`
        ),
      ReplyPending: ({ replyId }) =>
        refused(
          `A reply to this comment is on its way, or may have gone out (${replyId}): nothing more was sent. If it is unconfirmed, check the platform, then run peal inbox confirm.`
        ),
      ReplyStatusConflict: ({ status }) =>
        refused(
          `The reply is ${status}, which does not allow this: only an unconfirmed reply is confirmed, and only a sent one is withdrawn.`
        ),
      ReturnUrlNotAllowed: () =>
        refused(
          "The return address was refused: it must be HTTPS, on an origin the workspace's partner account registered (peal partner show lists them). A workspace without a partner account takes none."
        ),
      ReviewLinkNotFound: () =>
        refused(
          "The workspace has no such review link: peal review links lists a post's."
        ),
      ScheduleInPast: () =>
        refused("That time has passed: give a later --at, or publish it now."),
      SchemaError: requestFailed(url),
      SignatureNameTaken: () =>
        refused(
          "The workspace already has a signature of that name, whatever its case: nothing was changed. peal signatures list shows them."
        ),
      SignatureNotFound: () =>
        refused(
          "The workspace has no signature with that id: peal signatures list shows them."
        ),
      SpendCeilingExceeded: ({ ceiling, committed, currency, requested }) => {
        const amounts = amountsIn(currency, digits);

        return refused(
          `The boost would pass the ad account's monthly ceiling: the ceiling is ${amounts.of(ceiling)}, its boosts already commit ${amounts.of(committed)}, and this one would add ${amounts.of(requested)}. Nothing was reserved or sent. An owner raises the ceiling in the web app, or make the boost smaller; Peal never raises a ceiling on its own.${amounts.note}`
        );
      },
      TagNameTaken: () =>
        refused(
          "The workspace already has a tag of that name, whatever its case: nothing was changed. peal tags list shows them."
        ),
      TagNotFound: () =>
        refused(
          "The workspace has no tag with that id: peal tags list shows them."
        ),
      TargetStatusConflict: ({ status }) =>
        refused(
          `The post is ${status} on that channel: only a failed or unconfirmed post is posted again, and only an unconfirmed one confirmed.`
        ),
      TooManyChannelSets: ({ allowed }) =>
        refused(
          `The workspace has ${String(allowed)} channel sets, the most it may: delete one first, with peal sets delete.`
        ),
      TooManyConnectLinks: ({ allowed }) =>
        refused(
          `The workspace has ${String(allowed)} connect links waiting, the most it may: revoke some with peal links revoke.`
        ),
      TooManyInvitations: () =>
        refused(
          "The workspace has 100 invitations pending, the most it may: revoke some first."
        ),
      TooManyQueues: ({ allowed }) =>
        refused(
          `The workspace has ${String(allowed)} queues, the most it may: delete one first, with peal queues delete.`
        ),
      TooManyRecyclingRules: ({ allowed }) =>
        refused(
          `The workspace has ${String(allowed)} recycling rules going, the most it may: end one first, with peal recycling end.`
        ),
      TooManyRequests: ({ limit, retryAfterSeconds, windowSeconds }) =>
        refused(
          `Peal takes ${String(limit)} requests every ${String(windowSeconds)} seconds from one sign-in or key, and this one sent more: nothing was done. Try again in ${String(retryAfterSeconds)} seconds.`
        ),
      TooManyReviewLinks: ({ limit }) =>
        refused(
          `The post has ${String(limit)} working review links, the most it may: revoke one first.`
        ),
      TooManySignatures: ({ allowed }) =>
        refused(
          `The workspace has ${String(allowed)} signatures, the most it may: delete one first, with peal signatures delete.`
        ),
      TooManyTags: ({ allowed }) =>
        refused(
          `The workspace has ${String(allowed)} tags, the most it may: delete one first, with peal tags delete.`
        ),
      TooManyWebhookEndpoints: ({ allowed }) =>
        refused(
          `The workspace has ${String(allowed)} webhook endpoints, the most it may, whatever its plan: delete one first, with peal webhooks delete.`
        ),
      TooManyWebhookSends: ({ allowed, retryAfterSeconds }) =>
        refused(
          `The workspace sent ${String(allowed)} of these within an hour, the most it may, or this would send more than are left: nothing was sent. Try again in ${String(retryAfterSeconds)} seconds.`
        ),
      Unauthenticated: () => new SignInExpired({ url }),
      UnknownChannels: ({ channelIds }) =>
        refused(
          `These channels are not the workspace's: ${channelIds.join(", ")}. peal channels list shows them.`
        ),
      UnknownMedia: ({ mediaIds }) =>
        refused(
          `These media are not the workspace's, or not ready: ${mediaIds.join(", ")}.`
        ),
      UnknownTags: ({ tagIds }) =>
        refused(
          `These tags are not the workspace's: ${tagIds.join(", ")}. peal tags list shows them.`
        ),
      UnsupportedMediaType: ({ contentType }) =>
        refused(
          `Peal does not store ${contentType} files: it takes JPEG, PNG, GIF and WebP images, and MP4 and QuickTime videos.`
        ),
      UploadIncomplete: () =>
        refused(
          "The file has not reached the media store whole: upload it again."
        ),
      UploadRejected: ({ reason }) =>
        refused(
          reason === "sizeMismatch"
            ? "The stored file does not have the size declared: Peal deleted it. Upload it again."
            : "The file is not of the type its name says: Peal deleted it. Give it the extension of what it holds, then upload it again."
        ),
      WebhookDeliveryNotFound: () =>
        refused(
          "The endpoint has no delivery with that id: it never existed, or its log no longer keeps it. peal webhooks deliveries lists them."
        ),
      WebhookEndpointDisabled: () =>
        refused(
          "The endpoint is off, so Peal sends it nothing: turn it on first, with peal webhooks update --enable."
        ),
      WebhookEndpointNotFound: () =>
        refused(
          "The workspace has no webhook endpoint with that id: peal webhooks list shows them."
        ),
      WebhookFilterRefused: ({ field }) =>
        refused(
          field === "workspaceIds"
            ? "Only a partner endpoint, in a partner account's home workspace, takes --workspace-id: an endpoint of its own workspace hears that workspace alone."
            : "--channel takes channels of the workspace, as peal channels list shows them."
        ),
      WebhookHeaderValuesRequired: () =>
        refused(
          'The new --url is on another host, and the endpoint has headers, whose values Peal sends only to the host they were given for: give every --header "Name: value" again with --url, or --clear-headers.'
        ),
      WebhookHeadersRefused: () =>
        refused(
          'A header named without a value keeps the one the endpoint has: it has none under that name, so give it with --header "Name: value".'
        ),
      WebhookUrlRefused: ({ reason }) => refused(urlRefusals[reason]),
      WebhooksNotConfigured: () =>
        refused(
          "This server cannot keep a signing secret: its operator must set PEAL_TOKEN_KEYS, the keys that encrypt them, before it has webhooks."
        ),
      WorkspaceNotFound: () =>
        refused("You do not belong to this workspace, or it no longer exists."),
    });

// The request a refusal answers, as the API's errors name it.
const requestOf = (failure: ApiFailure) =>
  "requestId" in failure
    ? { code: failure.code, requestId: failure.requestId }
    : {};

/**
 * What a failed request means, as the user reads it: the sign-in to renew,
 * the server to check, or why it refused, with the request's id when the
 * server gave one. A command that knows how many decimals the ad account's
 * currency has says so (`digits`), and amounts are written in its units.
 */
export const explain =
  (url: string, digits?: MinorUnitDigits) =>
  (failure: ApiFailure): ApiRequestFailed | Refused | SignInExpired => {
    const explained = reasonOf(url, digits)(failure);

    return explained._tag === "Refused"
      ? new Refused({
          error: apiErrorJson(failure),
          reason: explained.reason,
          ...requestOf(failure),
        })
      : explained;
  };

/** The scope a sign-in needs to schedule, publish, move or cancel posts. */
export const publishScope = "workspace:publish";

// Whether the saved sign-in was approved without the scope. One that
// keeps no scope, or cannot be read, does not say.
const signedInWithoutPublishing = Effect.gen(function* withoutPublishing() {
  const { baseUrl } = yield* PealApi;
  const store = yield* CredentialStore;
  const saved = yield* store.read(baseUrl);

  return Option.match(saved, {
    onNone: () => false,
    onSome: ({ scope }) => {
      const scopes = scope.split(/\s+/u).filter((name) => name !== "");

      return scopes.length > 0 && !scopes.includes(publishScope);
    },
  });
}).pipe(Effect.orElseSucceed(() => false));

/**
 * `explain`, for the requests that schedule, publish, move, cancel or
 * follow up a post: refused to a sign-in approved without the permission
 * to schedule and publish, the user signs in again; otherwise their role
 * is why.
 */
export const explainingPublishing =
  (url: string) =>
  <A, R>(request: Effect.Effect<A, ApiFailure, R>) =>
    request.pipe(
      Effect.mapError((failure) =>
        failure._tag === "Forbidden" ? failure : explain(url)(failure)
      ),
      Effect.catchTag("Forbidden", (forbidden) =>
        signedInWithoutPublishing.pipe(
          Effect.flatMap((without) =>
            Effect.fail(
              without
                ? new Refused({
                    error: apiErrorJson(forbidden),
                    reason:
                      "This sign-in was made without the permission to schedule and publish posts: run peal login again and approve it.",
                  })
                : explain(url)(forbidden)
            )
          )
        )
      )
    );
