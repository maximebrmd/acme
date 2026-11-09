import { CurrentMember } from "acme-contract";
import { Array, Effect, Option } from "effect";

import { ToolRefused } from "#app/mcp/tool-refused.ts";
import { AcmeTools } from "#app/mcp/tools.ts";
import { toChannelView } from "#channels/api/channel-view.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { actorOf } from "#shared/api/actor.ts";
import { makeDatabasePing } from "#shared/infrastructure/database-ping.ts";
import { userPrincipalOf } from "#workspace/api/principal.ts";
import { Accounts } from "#workspace/application/accounts.ts";

const refuse = (message: string) => () =>
  Effect.fail(new ToolRefused({ message }));

/**
 * What the tools do, through the use cases of each context, as the member
 * that the MCP endpoint's authentication provides (CurrentMember).
 */
export const AcmeToolsLive = AcmeTools.toLayer(
  Effect.gen(function* acmeTools() {
    const accounts = yield* Accounts;
    const listChannels = yield* ListChannels;
    const pingDatabase = yield* makeDatabasePing;

    // The user's account, as this connection sees it.
    const currentAccount = Effect.gen(function* currentAccount() {
      const member = yield* CurrentMember;
      const { principal } = member;

      // The MCP endpoint takes OAuth access tokens only, which act for users.
      if (principal._tag !== "user") {
        return yield* Effect.die("An MCP request acted for an API key");
      }

      const current = yield* accounts.current(userPrincipalOf(principal)).pipe(
        Effect.catchTags({
          BannedUser: refuse("This account has been suspended."),
          DirectoryUnavailable: Effect.die,
          NotSignedIn: refuse(
            "This account no longer exists. Connect to Acme again."
          ),
        })
      );

      return { current, member };
    });

    return AcmeTools.of({
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
        currentAccount.pipe(
          Effect.map(({ current, member }) => ({
            workspaces: current.workspaces.map(({ membership }) => ({
              connected: membership.id === member.workspaceId,
              id: membership.id,
              name: membership.name,
              role: membership.role,
              slug: membership.slug,
            })),
          }))
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
          const { current, member } = yield* currentAccount;

          const connected = Array.findFirst(
            current.workspaces,
            ({ membership }) => membership.id === member.workspaceId
          );

          if (Option.isNone(connected)) {
            return yield* new ToolRefused({
              message:
                "You no longer belong to the workspace this connection acts in. Connect to Acme again and pick another.",
            });
          }

          const { membership } = connected.value;
          const { account } = current;

          return {
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
