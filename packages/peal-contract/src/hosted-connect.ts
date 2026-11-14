import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import {
  ChannelSchema,
  ChoosableAccountSchema,
  ChooseAccountsSchema,
  ConnectCallbackSchema,
} from "./channels.ts";
import { ConnectLinkIntake } from "./connect-link-intake.ts";
import { ConnectLinkNotFound } from "./connect-link-not-found.ts";
import {
  ConnectLinkStatusSchema,
  maxConnectLinkStarts,
} from "./connect-links.ts";
import { HostedConnectFailed } from "./hosted-connect-failed.ts";
import { PlatformSchema } from "./platform.ts";

/**
 * What a platform's sign-in needs from whoever signs in before it starts:
 * the server their account lives on (`instance`), their handle
 * (`handle`), or nothing (`none`).
 */
export const HostedLinkInputSchema = Schema.Literals([
  "none",
  "instance",
  "handle",
]).annotate({ identifier: "HostedLinkInput" });

/** What a connect link's hosted page shows whoever opens it. */
export const HostedLinkSchema = Schema.Struct({
  expiresAt: Schema.DateTimeUtc,
  // Who asks: the workspace's partner, as its customers know it, or the
  // workspace itself. The logo is shown from its own address, the accent
  // colour (`#RRGGBB`, or null) as a line beside it.
  host: Schema.Struct({
    accentColor: Schema.NullOr(Schema.String),
    logoUrl: Schema.NullOr(Schema.String),
    name: Schema.String,
  }),
  input: HostedLinkInputSchema,
  platform: PlatformSchema,
  // The handle of the account to sign in to, when the link reconnects one.
  reconnecting: Schema.NullOr(Schema.String),
  // Where the page offers to go back to, when the link has a return
  // address.
  returnTo: Schema.NullOr(Schema.String),
  status: ConnectLinkStatusSchema,
}).annotate({ identifier: "HostedLink" });

export type HostedLink = typeof HostedLinkSchema.Type;

export const HostedStartSchema = Schema.Struct({
  // A Bluesky handle, when the link asks for one.
  handle: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
  // A Mastodon instance, when the link asks for one.
  instance: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
}).annotate({ identifier: "HostedStart" });

export const HostedAuthorizationSchema = Schema.Struct({
  authorizationUrl: Schema.String,
}).annotate({ identifier: "HostedAuthorization" });

/** An account a hosted sign-in connected, as its page names it. */
export const HostedChannelSchema = Schema.Struct({
  displayName: ChannelSchema.fields.displayName,
  handle: ChannelSchema.fields.handle,
  platform: PlatformSchema,
}).annotate({ identifier: "HostedChannel" });

/**
 * How a hosted sign-in ended: accounts were connected (`connected`, with
 * where to send the browser back), or the sign-in reached several accounts
 * (`choose`), among which whoever signed in picks before `expiresAt`.
 */
export const HostedOutcomeSchema = Schema.Union([
  Schema.TaggedStruct("connected", {
    channels: Schema.Array(HostedChannelSchema),
    returnTo: Schema.NullOr(Schema.String),
  }),
  Schema.TaggedStruct("choose", {
    accounts: Schema.Array(ChoosableAccountSchema),
    expiresAt: Schema.DateTimeUtc,
    selection: Schema.String,
  }),
]).annotate({ identifier: "HostedOutcome" });

export type HostedOutcome = typeof HostedOutcomeSchema.Type;

/**
 * The header a connect link's token is sent in: never in an address, which
 * servers, proxies and browsers write down.
 */
export const connectLinkTokenHeader = "x-connect-link-token";

const token = Schema.Struct({
  [connectLinkTokenHeader]: Schema.String.check(Schema.isBetweenLength(1, 128)),
});

const hostedErrors = [ConnectLinkNotFound, HostedConnectFailed] as const;

/** The cookie that holds the nonce of the browser that started a sign-in. */
export const connectLinkCookie = "peal_connect_link";

/**
 * What a connect link's hosted page calls, with the link's token, sent in
 * the `x-connect-link-token` header, and no other credential. The web app is their one client: they are not part of
 * the API integrators call.
 */
export class HostedConnectApi extends HttpApiGroup.make("hostedConnect")
  .add(
    HttpApiEndpoint.get("open", "/", {
      error: ConnectLinkNotFound,
      headers: token,
      success: HostedLinkSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "What a connect link's page shows: who asks, for which platform, what the sign-in needs first, and where the link stands. Reading it changes nothing: a link is used by a sign-in that connects an account, never by being opened.",
        summary: "Open a connect link",
      })
    ),
    HttpApiEndpoint.post("start", "/start", {
      error: hostedErrors,
      headers: token,
      payload: HostedStartSchema,
      success: HostedAuthorizationSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Starts the link's sign-in: answers with the platform's sign-in page, where the browser goes next, and sets a cookie only this browser holds, so only it completes the sign-in, within 15 minutes. A link's sign-in can be started ${maxConnectLinkStarts} times.`,
        summary: "Start a connect link's sign-in",
      })
    ),
    HttpApiEndpoint.post("complete", "/complete", {
      error: hostedErrors,
      headers: token,
      payload: ConnectCallbackSchema,
      success: HostedOutcomeSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Completes the link's sign-in with what the platform sent back, for the browser that started it: the account becomes a channel of the link's workspace, and the link is used; or, when the sign-in reached several accounts, the answer lists them to choose among.",
        summary: "Complete a connect link's sign-in",
      })
    ),
    HttpApiEndpoint.post("choose", "/accounts", {
      error: hostedErrors,
      headers: token,
      payload: ChooseAccountsSchema,
      success: HostedOutcomeSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Connects the accounts chosen among those a completed sign-in listed, for the browser that started it: the link is then used.",
        summary: "Choose the accounts a connect link connects",
      })
    )
  )
  .middleware(ConnectLinkIntake)
  .prefix("/api/connect-links") {}
