import { Array, Effect, Layer, Option } from "effect";
import { CurrentMember } from "peal-contract";
import type { Member } from "peal-contract";

import { AdsToolsLive } from "#app/mcp/ads-handlers.ts";
import { CapabilityToolsLive } from "#app/mcp/capabilities-handlers.ts";
import { findTools, scopesLetCall, summaryOf } from "#app/mcp/catalogue.ts";
import { ConnectToolsLive } from "#app/mcp/connect-handlers.ts";
import { InboxToolsLive } from "#app/mcp/inbox-handlers.ts";
import { MediaToolsLive } from "#app/mcp/media-handlers.ts";
import { PeopleToolsLive } from "#app/mcp/people-handlers.ts";
import { PostToolsLive } from "#app/mcp/posts-handlers.ts";
import { notAllowed } from "#app/mcp/refusals.ts";
import { ReportToolsLive } from "#app/mcp/reports-handlers.ts";
import { ReviewToolsLive } from "#app/mcp/review-handlers.ts";
import { SavedToolsLive } from "#app/mcp/saved-handlers.ts";
import { TagToolsLive } from "#app/mcp/tags-handlers.ts";
import { ToolRefused } from "#app/mcp/tool-refused.ts";
import { BasicTools } from "#app/mcp/tools.ts";
import { WebhookToolsLive } from "#app/mcp/webhooks-handlers.ts";
import { toChannelView } from "#channels/api/channel-view.ts";
import type { ChannelPage } from "#channels/application/channel-repository.ts";
import { ChannelSettings } from "#channels/application/channel-settings.ts";
import {
  ListChannels,
  maxChannelPageSize,
} from "#channels/application/list-channels.ts";
import { actorOf } from "#shared/api/actor.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { makeDatabasePing } from "#shared/infrastructure/database-ping.ts";
import { userPrincipalOf } from "#workspace/api/principal.ts";
import { AccountDirectory } from "#workspace/application/account-directory.ts";
import { Accounts } from "#workspace/application/accounts.ts";
import { CredentialNames } from "#workspace/application/credential-names.ts";

const refuse = (message: string) => () =>
  Effect.fail(new ToolRefused({ message }));

const readingFailures = {
  DatabaseError: Effect.die,
  MissingPermission: refuse(
    "This connection may not see the workspace's channels."
  ),
} as const;

// How naming a channel, or turning it off or on, is refused.
const settingFailures = (doing: string) =>
  ({
    ChannelNotFound: refuse(
      "The workspace has no channel with this id: list_channels answers its channels. Nothing was changed."
    ),
    DatabaseError: Effect.die,
    MissingPermission: notAllowed(doing),
  }) as const;

const BasicToolsLive = BasicTools.toLayer(
  Effect.gen(function* pealTools() {
    const accounts = yield* Accounts;
    const directory = yield* AccountDirectory;
    const names = yield* CredentialNames;
    const listChannels = yield* ListChannels;
    const settings = yield* ChannelSettings;
    const pingDatabase = yield* makeDatabasePing;

    // The user's account, as this connection sees it; none for an API
    // key, which is nobody's.
    const currentAccount = Effect.gen(function* currentAccount() {
      const member = yield* CurrentMember;
      const { principal } = member;

      if (principal._tag !== "user") {
        return { current: Option.none(), member };
      }

      const current = yield* accounts.current(userPrincipalOf(principal)).pipe(
        Effect.catchTags({
          BannedUser: refuse("This account has been suspended."),
          DirectoryUnavailable: Effect.die,
          NotSignedIn: refuse(
            "This account no longer exists. Connect to Peal again."
          ),
        })
      );

      return { current: Option.some(current), member };
    });

    // The workspace an API key belongs to, and the key's name: what
    // whoami tells a connection that has no user.
    const keyed = Effect.fn("keyed")(function* keyed(member: Member) {
      const workspaceId = WorkspaceIdSchema.make(member.workspaceId);

      const workspace = yield* directory
        .workspace(workspaceId)
        .pipe(Effect.catchTag("DirectoryUnavailable", Effect.die));

      // A key of the workspace, or of the partner that owns it.
      const apiKeyId =
        member.principal._tag === "partnerKey"
          ? Option.some(member.principal.partnerKeyId)
          : Option.liftPredicate(
              member.principal,
              (principal) => principal._tag === "apiKey"
            ).pipe(Option.map(({ apiKeyId: id }) => id));

      if (Option.isNone(workspace) || Option.isNone(apiKeyId)) {
        return yield* new ToolRefused({
          message:
            "The workspace this API key belongs to no longer exists. Use a key of another workspace.",
        });
      }

      const name = yield* names
        .apiKey(workspaceId, apiKeyId.value)
        .pipe(Effect.catchTag("DatabaseError", Effect.die));

      return {
        apiKey: { id: apiKeyId.value, name: Option.getOrElse(name, () => "") },
        workspace: workspace.value,
      };
    });

    return BasicTools.of({
      disable_channel: ({ channelId }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            settings.turnOff(actorOf(member), channelId)
          ),
          Effect.map(toChannelView),
          Effect.catchTags(settingFailures("turn channels off"))
        ),
      enable_channel: ({ channelId }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            settings.turnOn(actorOf(member), channelId)
          ),
          Effect.map(toChannelView),
          Effect.catchTags(settingFailures("turn channels on"))
        ),
      find_tools: (search) =>
        CurrentMember.pipe(
          Effect.map(({ principal }) => ({
            tools: findTools(search).map(
              ({ description, scopeSets, ...tool }) => ({
                ...tool,
                // An API key carries permissions, not scopes.
                scopeGranted:
                  principal._tag === "user" && principal.oauth !== undefined
                    ? scopesLetCall({ scopeSets }, principal.oauth.scopes)
                    : null,
                summary: summaryOf(description),
              })
            ),
          }))
        ),
      list_channels: ({ platform, search, status }) =>
        Effect.gen(function* channels() {
          const actor = actorOf(yield* CurrentMember);

          // Without a filter, every channel at once, as before the search.
          if (
            platform === undefined &&
            search === undefined &&
            status === undefined
          ) {
            const found = yield* listChannels
              .list(actor)
              .pipe(Effect.catchTags(readingFailures));

            return { channels: found.map(toChannelView) };
          }

          // Every page of those that match: a tool's answer has no cursor.
          const matching = Effect.fn("matching")(function* matching(
            after: Option.Option<ChannelId>
          ): Effect.fn.Return<ChannelPage, ToolRefused, CurrentMember> {
            const page = yield* listChannels
              .search(actor, {
                after,
                limit: maxChannelPageSize,
                platform: Option.fromUndefinedOr(platform),
                query: Option.fromUndefinedOr(search),
                status: Option.fromUndefinedOr(status),
              })
              .pipe(Effect.catchTags(readingFailures));

            if (Option.isNone(page.next)) {
              return page;
            }

            const rest = yield* matching(page.next);

            return { ...rest, items: [...page.items, ...rest.items] };
          });

          const { counts, items } = yield* matching(Option.none());

          return { channels: items.map(toChannelView), counts };
        }),
      list_workspaces: () =>
        Effect.gen(function* workspaces() {
          const { current, member } = yield* currentAccount;

          if (Option.isNone(current)) {
            const { workspace } = yield* keyed(member);

            return {
              workspaces: [
                {
                  connected: true,
                  id: workspace.id,
                  name: workspace.name,
                  role: null,
                  slug: workspace.slug,
                },
              ],
            };
          }

          return {
            workspaces: current.value.workspaces.map(({ membership }) => ({
              connected: membership.id === member.workspaceId,
              id: membership.id,
              name: membership.name,
              role: membership.role,
              slug: membership.slug,
            })),
          };
        }),
      rename_channel: ({ channelId, label }) =>
        CurrentMember.pipe(
          Effect.flatMap((member) =>
            settings.rename(
              actorOf(member),
              channelId,
              Option.fromNullOr(label)
            )
          ),
          Effect.map(toChannelView),
          Effect.catchTags(settingFailures("rename channels"))
        ),
      server_health: () =>
        pingDatabase.pipe(
          Effect.tapError((failure) =>
            Effect.logWarning("The database is unreachable", failure)
          ),
          Effect.match({
            onFailure: () => "down" as const,
            onSuccess: () => "up" as const,
          }),
          Effect.map((database) => ({ database, server: "up" as const }))
        ),
      whoami: () =>
        Effect.gen(function* whoami() {
          const { current: signedIn, member } = yield* currentAccount;

          if (Option.isNone(signedIn)) {
            const { apiKey, workspace } = yield* keyed(member);

            return {
              apiKey,
              user: null,
              workspace: {
                id: workspace.id,
                name: workspace.name,
                permissions: member.permissions,
                role: null,
                slug: workspace.slug,
              },
            };
          }

          const current = signedIn.value;

          const connected = Array.findFirst(
            current.workspaces,
            ({ membership }) => membership.id === member.workspaceId
          );

          if (Option.isNone(connected)) {
            return yield* new ToolRefused({
              message:
                "You no longer belong to the workspace this connection acts in. Connect to Peal again and pick another.",
            });
          }

          const { membership } = connected.value;
          const { account } = current;

          return {
            apiKey: null,
            user: { email: account.email, id: account.id, name: account.name },
            workspace: {
              id: membership.id,
              name: membership.name,
              permissions: member.permissions,
              role: membership.role,
              slug: membership.slug,
            },
          };
        }),
    });
  })
);

/**
 * What the tools do, through the use cases of each context, as the member
 * that the MCP endpoint's authentication provides (CurrentMember).
 */
export const PealToolsLive = Layer.mergeAll(
  BasicToolsLive,
  PostToolsLive,
  TagToolsLive,
  SavedToolsLive,
  MediaToolsLive,
  ReportToolsLive,
  PeopleToolsLive,
  CapabilityToolsLive,
  ReviewToolsLive,
  WebhookToolsLive,
  ConnectToolsLive,
  InboxToolsLive,
  AdsToolsLive
);
