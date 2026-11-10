import { Array, Effect, Layer, Option } from "effect";
import { CurrentMember } from "peal-contract";
import type { Member } from "peal-contract";

import { ConnectToolsLive } from "#app/mcp/connect-handlers.ts";
import { findTools, summaryOf } from "#app/mcp/catalogue.ts";
import { MediaToolsLive } from "#app/mcp/media-handlers.ts";
import { PeopleToolsLive } from "#app/mcp/people-handlers.ts";
import { PostToolsLive } from "#app/mcp/posts-handlers.ts";
import { ReportToolsLive } from "#app/mcp/reports-handlers.ts";
import { ToolRefused } from "#app/mcp/tool-refused.ts";
import { BasicTools } from "#app/mcp/tools.ts";
import { WebhookToolsLive } from "#app/mcp/webhooks-handlers.ts";
import { toChannelView } from "#channels/api/channel-view.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { actorOf } from "#shared/api/actor.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { makeDatabasePing } from "#shared/infrastructure/database-ping.ts";
import { userPrincipalOf } from "#workspace/api/principal.ts";
import { AccountDirectory } from "#workspace/application/account-directory.ts";
import { Accounts } from "#workspace/application/accounts.ts";
import { CredentialNames } from "#workspace/application/credential-names.ts";

const refuse = (message: string) => () =>
  Effect.fail(new ToolRefused({ message }));

const BasicToolsLive = BasicTools.toLayer(
  Effect.gen(function* pealTools() {
    const accounts = yield* Accounts;
    const directory = yield* AccountDirectory;
    const names = yield* CredentialNames;
    const listChannels = yield* ListChannels;
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

      if (Option.isNone(workspace) || member.principal._tag !== "apiKey") {
        return yield* new ToolRefused({
          message:
            "The workspace this API key belongs to no longer exists. Use a key of another workspace.",
        });
      }

      const { apiKeyId } = member.principal;

      const name = yield* names
        .apiKey(workspaceId, apiKeyId)
        .pipe(Effect.catchTag("DatabaseError", Effect.die));

      return {
        apiKey: { id: apiKeyId, name: Option.getOrElse(name, () => "") },
        workspace: workspace.value,
      };
    });

    return BasicTools.of({
      find_tools: (search) =>
        CurrentMember.pipe(
          Effect.map(({ principal }) => ({
            tools: findTools(search).map(({ description, ...tool }) => ({
              ...tool,
              // An API key carries permissions, not scopes.
              scopeGranted:
                principal._tag === "user" && principal.oauth !== undefined
                  ? principal.oauth.scopes.includes(tool.scope)
                  : null,
              summary: summaryOf(description),
            })),
          }))
        ),
      list_channels: () =>
        Effect.gen(function* channels() {
          const actor = actorOf(yield* CurrentMember);

          const found = yield* listChannels.list(actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: refuse(
                "This connection may not see the workspace's channels."
              ),
            })
          );

          return { channels: found.map(toChannelView) };
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
  MediaToolsLive,
  ReportToolsLive,
  PeopleToolsLive,
  WebhookToolsLive,
  ConnectToolsLive
);
