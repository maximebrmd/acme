import { DateTime, Effect, Option, Redacted } from "effect";
import { CurrentMember } from "peal-contract";
import type { CalendarDay } from "peal-contract";

import { ConnectTools } from "#app/mcp/connect-tools.ts";
import { notAllowed, refuse } from "#app/mcp/refusals.ts";
import { partnerUsageView as partnerUsageReportView } from "#billing/api/usage-view.ts";
import { UsageReports } from "#billing/application/usage-reports.ts";
import {
  platformsOf,
  toConnectLinkView,
} from "#channels/api/connect-link-view.ts";
import { ConnectLinks } from "#channels/application/connect-links.ts";
import { actorOf } from "#shared/api/actor.ts";
import {
  customerWorkspacePageView,
  partnerUsageView,
  partnerView,
} from "#workspace/api/partner-view.ts";
import { PartnerAccounts } from "#workspace/application/partner-accounts.ts";
import { PartnerWorkspaces } from "#workspace/application/partner-workspaces.ts";

const noLink = () => refuse("The workspace has no connect link with this id.");

const noPartner = () =>
  refuse(
    "The workspace has no partner account. An owner or an admin opens one in the web app's settings, where the server lets them; otherwise the people who run the server do."
  );

// A day the tool's schema checked, as its first instant (UTC).
const dayFrom = (day: CalendarDay | undefined) =>
  Option.fromUndefinedOr(day).pipe(
    Option.flatMap((given) => DateTime.make(`${given}T00:00:00Z`))
  );

/**
 * What the connect tools do, through the channels context's connect links
 * the workspace context's partner accounts, and billing's report of a
 * partner's usage per customer.
 */
export const ConnectToolsLive = ConnectTools.toLayer(
  Effect.gen(function* connectTools() {
    const links = yield* ConnectLinks;
    const accounts = yield* PartnerAccounts;
    const workspaces = yield* PartnerWorkspaces;
    const reports = yield* UsageReports;

    const actor = CurrentMember.pipe(Effect.map(actorOf));

    return ConnectTools.of({
      create_connect_link: (asked) =>
        Effect.gen(function* create() {
          const platforms = yield* platformsOf(asked);

          const created = yield* links
            .create(yield* actor, {
              channelId: Option.fromUndefinedOr(asked.channelId),
              connection: Option.fromUndefinedOr(asked.connection),
              expiresInHours: Option.fromUndefinedOr(asked.expiresInHours),
              locale: Option.fromUndefinedOr(asked.locale),
              platforms,
              returnUrl: Option.fromUndefinedOr(asked.returnUrl),
            })
            .pipe(
              Effect.catchTags({
                ChannelNotFound: () =>
                  refuse(
                    "The workspace has no channel with this id on this platform: list_channels shows them."
                  ),
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("connect accounts"),
                PlatformNotConnectable: ({ platform }) =>
                  refuse(
                    `This server cannot connect ${platform} accounts: its operator has not set the platform's app, or Peal has no sign-in for it.`
                  ),
                ReturnUrlNotAllowed: () =>
                  refuse(
                    "The return address was refused: it must be HTTPS, on an origin the workspace's partner account registered (get_partner_account lists them). A workspace without a partner account takes none: create the link without it."
                  ),
                TooManyConnectLinks: ({ allowed }) =>
                  refuse(
                    `The workspace has ${String(allowed)} connect links waiting, the most it may: revoke some first.`
                  ),
              })
            );

          return {
            link: toConnectLinkView(created.link, yield* DateTime.now),
            url: Redacted.value(created.url),
          };
        }),
      get_connect_link: ({ linkId }) =>
        Effect.gen(function* get() {
          const link = yield* links.get(yield* actor, linkId).pipe(
            Effect.catchTags({
              ConnectLinkNotFound: noLink,
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read connect links"),
            })
          );

          return toConnectLinkView(link, yield* DateTime.now);
        }),
      get_partner_account: () =>
        Effect.gen(function* partner() {
          const member = yield* actor;

          const { partner: account } = yield* accounts.standing(member).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read the partner account"),
            })
          );

          if (Option.isNone(account)) {
            return { partner: null, usage: null };
          }

          // Closed between the two reads: it then holds nothing.
          const usage = yield* workspaces.usageFor(member).pipe(
            Effect.map(Option.some),
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read the partner account"),
              PartnerNotFound: () => Effect.succeedNone,
            })
          );

          return {
            partner: partnerView(account.value),
            usage: Option.getOrNull(usage.pipe(Option.map(partnerUsageView))),
          };
        }),
      get_partner_usage: ({ before, from, limit, to }) =>
        Effect.gen(function* partnerUsage() {
          const found = yield* reports
            .ofPartner(yield* actor, {
              before: Option.fromUndefinedOr(before),
              from: dayFrom(from),
              limit: Option.fromUndefinedOr(limit),
              to: dayFrom(to),
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidTenantCursor: () =>
                  refuse(
                    "That `before` is not what a page gave as its workspaces' `next`: pass it as it is, or leave it out for the first page."
                  ),
                InvalidUsageRange: ({ maxDays }) =>
                  refuse(
                    `The range must end on or after the day it starts, and span ${String(maxDays)} days at most.`
                  ),
                MissingPermission: notAllowed("read the partner account"),
                NoPartnerAccount: noPartner,
              })
            );

          return partnerUsageReportView(found);
        }),
      list_connect_links: () =>
        Effect.gen(function* list() {
          const found = yield* links.list(yield* actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read connect links"),
            })
          );

          const now = yield* DateTime.now;

          return { links: found.map((link) => toConnectLinkView(link, now)) };
        }),
      list_partner_workspaces: ({ before, externalId, limit, name }) =>
        Effect.gen(function* owned() {
          const page = yield* workspaces
            .listFor(yield* actor, {
              before: Option.fromUndefinedOr(before),
              externalId: Option.fromUndefinedOr(externalId),
              limit: Option.fromUndefinedOr(limit),
              name: Option.fromUndefinedOr(name),
            })
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                InvalidWorkspaceCursor: () =>
                  refuse(
                    "That `before` is not what a page gave as its `next`: pass a page's `next` as it is, or leave it out for the first page."
                  ),
                MissingPermission: notAllowed("read the partner account"),
                PartnerNotFound: noPartner,
              })
            );

          return customerWorkspacePageView(page);
        }),
      revoke_connect_link: ({ linkId }) =>
        Effect.gen(function* revoke() {
          const link = yield* links.revoke(yield* actor, linkId).pipe(
            Effect.catchTags({
              ConnectLinkNotFound: noLink,
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("revoke connect links"),
            })
          );

          return toConnectLinkView(link, yield* DateTime.now);
        }),
    });
  })
);
