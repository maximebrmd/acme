import { DateTime, Effect, Option, Redacted } from "effect";
import {
  Cookies,
  HttpEffect,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  ChannelNotFound,
  ConnectFailed,
  ConnectLinkNotFound,
  CurrentMember,
  HostedConnectFailed,
  ReturnUrlNotAllowed,
  TooManyConnectLinks,
  connectLinkTokenHeader,
} from "peal-contract";
import type { HostedOutcome as HostedOutcomeView } from "peal-contract";

import { ConnectLinkAddresses } from "#channels/application/connect-link-addresses.ts";
import { ConnectLinks } from "#channels/application/connect-links.ts";
import type { HostedOutcome } from "#channels/application/connect-links.ts";
import type { HostedConnectFailed as HostedFailure } from "#channels/application/hosted-connect-failed.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden } from "#shared/api/forbidden.ts";
import { isSocialPlatform } from "#shared/domain/platform.ts";

import { cookieOf, nonceOf } from "./connect-link-cookie.ts";
import { toConnectLinkView } from "./connect-link-view.ts";

const noLink = () => Effect.fail(new ConnectLinkNotFound());

const noChannel = () => Effect.fail(new ChannelNotFound());

export const ConnectLinksHandlers = HttpApiBuilder.group(
  Api,
  "connectLinks",
  Effect.fn(function* connectLinksHandlers(handlers) {
    const links = yield* ConnectLinks;

    return handlers.handleAll({
      create: ({ payload }) =>
        Effect.gen(function* create() {
          const actor = actorOf(yield* CurrentMember);

          const created = yield* links
            .create(actor, {
              channelId: Option.fromUndefinedOr(payload.channelId),
              connection: Option.fromUndefinedOr(payload.connection),
              expiresInHours: Option.fromUndefinedOr(payload.expiresInHours),
              locale: Option.fromUndefinedOr(payload.locale),
              platform: payload.platform,
              returnUrl: Option.fromUndefinedOr(payload.returnUrl),
            })
            .pipe(
              Effect.catchTags({
                ChannelNotFound: noChannel,
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                PlatformNotConnectable: ({ reason }) =>
                  Effect.fail(
                    new ConnectFailed({
                      reason:
                        reason === "notConfigured"
                          ? "notConfigured"
                          : "platformNotSupported",
                    })
                  ),
                ReturnUrlNotAllowed: () =>
                  Effect.fail(new ReturnUrlNotAllowed()),
                TooManyConnectLinks: ({ allowed }) =>
                  Effect.fail(new TooManyConnectLinks({ allowed })),
              })
            );

          return {
            link: toConnectLinkView(created.link, yield* DateTime.now),
            url: Redacted.value(created.url),
          };
        }),
      get: ({ params }) =>
        Effect.gen(function* get() {
          const actor = actorOf(yield* CurrentMember);

          const link = yield* links.get(actor, params.linkId).pipe(
            Effect.catchTags({
              ConnectLinkNotFound: noLink,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          return toConnectLinkView(link, yield* DateTime.now);
        }),
      list: () =>
        Effect.gen(function* list() {
          const actor = actorOf(yield* CurrentMember);

          const listed = yield* links.list(actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          const now = yield* DateTime.now;

          return listed.map((link) => toConnectLinkView(link, now));
        }),
      revoke: ({ params }) =>
        Effect.gen(function* revoke() {
          const actor = actorOf(yield* CurrentMember);

          const link = yield* links.revoke(actor, params.linkId).pipe(
            Effect.catchTags({
              ConnectLinkNotFound: noLink,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
            })
          );

          return toConnectLinkView(link, yield* DateTime.now);
        }),
    });
  })
);

const hostedFailure = ({ reason, returnTo }: HostedFailure) =>
  Effect.fail(
    new HostedConnectFailed({ reason, returnTo: Option.getOrNull(returnTo) })
  );

// A hosted call's failures, as the page reads them. The server's own are
// defects.
const hostedFailures = {
  ConnectLinkNotFound: noLink,
  DatabaseError: Effect.die,
  HostedConnectFailed: hostedFailure,
};

const outcomeView = (outcome: HostedOutcome): HostedOutcomeView =>
  outcome._tag === "connected"
    ? {
        _tag: "connected",
        // A link connects accounts of a social network only.
        channels: outcome.channels.flatMap((channel) => {
          const { platform } = channel;

          return isSocialPlatform(platform)
            ? [
                {
                  displayName: Option.getOrNull(channel.displayName),
                  handle: channel.handle,
                  platform,
                },
              ]
            : [];
        }),
        returnTo: Option.getOrNull(outcome.returnTo),
      }
    : {
        _tag: "choose",
        accounts: outcome.accounts.map((account) => ({
          accountId: account.accountId,
          avatarUrl: Option.getOrNull(account.avatarUrl),
          connected: account.connected,
          displayName: Option.getOrNull(account.displayName),
          handle: account.handle,
        })),
        expiresAt: outcome.expiresAt,
        selection: outcome.selection,
      };

// The nonce the browser that started a sign-in holds, from its cookie.
const browserNonce = HttpServerRequest.HttpServerRequest.pipe(
  Effect.map((request) => nonceOf(request.cookies))
);

export const HostedConnectHandlers = HttpApiBuilder.group(
  Api,
  "hostedConnect",
  Effect.fn(function* hostedConnectHandlers(handlers) {
    const links = yield* ConnectLinks;
    const addresses = yield* ConnectLinkAddresses;

    return handlers.handleAll({
      choose: ({ headers, payload }) =>
        Effect.gen(function* choose() {
          const outcome = yield* links
            .choose(
              Redacted.make(headers[connectLinkTokenHeader]),
              yield* browserNonce,
              {
                accountIds: payload.accountIds,
                selection: payload.selection,
              }
            )
            .pipe(Effect.catchTags(hostedFailures));

          return outcomeView(outcome);
        }),
      complete: ({ headers, payload }) =>
        Effect.gen(function* complete() {
          const outcome = yield* links
            .complete(
              Redacted.make(headers[connectLinkTokenHeader]),
              yield* browserNonce,
              {
                code: Option.fromUndefinedOr(payload.code),
                error: Option.fromUndefinedOr(payload.error),
                issuer: Option.fromUndefinedOr(payload.iss),
                state: payload.state,
              }
            )
            .pipe(Effect.catchTags(hostedFailures));

          return outcomeView(outcome);
        }),
      open: ({ headers }) =>
        Effect.gen(function* open() {
          const hosted = yield* links
            .open(Redacted.make(headers[connectLinkTokenHeader]))
            .pipe(
              Effect.catchTags({
                ConnectLinkNotFound: noLink,
                DatabaseError: Effect.die,
              })
            );

          return {
            expiresAt: hosted.expiresAt,
            host: {
              logoUrl: Option.getOrNull(hosted.host.logoUrl),
              name: hosted.host.name,
            },
            input: hosted.input,
            platform: hosted.platform,
            reconnecting: Option.getOrNull(hosted.reconnecting),
            returnTo: Option.getOrNull(hosted.returnTo),
            status: hosted.state,
          };
        }),
      start: ({ headers, payload }) =>
        Effect.gen(function* start() {
          const started = yield* links
            .start(Redacted.make(headers[connectLinkTokenHeader]), {
              handle: Option.fromUndefinedOr(payload.handle),
              instance: Option.fromUndefinedOr(payload.instance),
            })
            .pipe(Effect.catchTags(hostedFailures));

          // On the reply itself: a browser hands scripts no Set-Cookie,
          // so the answer's body carries none of it.
          yield* HttpEffect.appendPreResponseHandler((_request, response) =>
            Effect.succeed(
              HttpServerResponse.mergeCookies(
                response,
                Cookies.fromSetCookie([
                  cookieOf(started.browser, addresses.secure),
                ])
              )
            )
          );

          return { authorizationUrl: started.authorizationUrl };
        }),
    });
  })
);
