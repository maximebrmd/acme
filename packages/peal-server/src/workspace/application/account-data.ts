import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { AuthoredPostRecord } from "#shared/application/personal-data.ts";
import type { ApiKey } from "#workspace/domain/api-key.ts";
import { ownSessionOrCommandLine } from "#workspace/domain/own-session.ts";
import type { SessionRequired } from "#workspace/domain/session-required.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { AccountStore } from "./account-store.ts";
import type { AccountRecords, WorkspaceSummary } from "./account-store.ts";
import { ApiKeyIssuer } from "./api-key-issuer.ts";
import type { AuthUnavailable } from "./auth-unavailable.ts";
import type { ConnectedAppRecord } from "./connected-app-store.ts";
import { ConnectedAppStore } from "./connected-app-store.ts";
import { ContextRecords } from "./context-records.ts";
import type { UserContent, WorkspaceContent } from "./context-records.ts";
import { NotSignedIn } from "./not-signed-in.ts";

/** A workspace that is the user's alone, with what it holds. */
export interface OwnWorkspace extends WorkspaceContent, WorkspaceSummary {
  readonly apiKeys: readonly ApiKey[];
}

/** A copy of what Acme keeps about a user. */
export interface AccountExport extends UserContent {
  readonly account: AccountRecords;
  /** The posts the user wrote in the workspaces they share. */
  readonly authoredPosts: readonly AuthoredPostRecord[];
  readonly connectedApps: readonly ConnectedAppRecord[];
  readonly exportedAt: DateTime.Utc;
  readonly workspaces: readonly OwnWorkspace[];
}

/**
 * The right of access: a copy of everything tied to the user, for them in
 * person or through Acme's command line, which saves it in their files.
 * Workspaces they share hold the team's work: of those, only their
 * memberships and the posts they wrote are part of it. The workspaces where
 * they are the only member are theirs, and come whole, as deleting the
 * account would delete them.
 */
export class AccountData extends Context.Service<
  AccountData,
  {
    readonly export: (
      principal: UserPrincipal
    ) => Effect.Effect<
      AccountExport,
      AuthUnavailable | DatabaseError | NotSignedIn | SessionRequired
    >;
  }
>()("acme-server/workspace/application/AccountData") {
  static readonly layer = Layer.effect(
    AccountData,
    Effect.gen(function* AccountDataLive() {
      const store = yield* AccountStore;
      const records = yield* ContextRecords;
      const apps = yield* ConnectedAppStore;
      const keys = yield* ApiKeyIssuer;

      const ownWorkspace = Effect.fn("AccountData.ownWorkspace")(
        function* ownWorkspace(summary: WorkspaceSummary) {
          const content = yield* records.exportWorkspace(summary.id);
          const apiKeys = yield* keys.list(summary.id);
          const workspace: OwnWorkspace = { ...summary, ...content, apiKeys };

          return workspace;
        }
      );

      const exportAccount = Effect.fn("AccountData.export")(
        function* exportAccount(principal: UserPrincipal) {
          const userId = yield* Effect.fromResult(
            ownSessionOrCommandLine(principal)
          );

          const account = yield* store.records(userId).pipe(
            Effect.flatMap(
              Option.match({
                onNone: () => Effect.fail(new NotSignedIn()),
                onSome: Effect.succeed,
              })
            )
          );

          const now = yield* DateTime.now;

          const standings = yield* store.standings(userId);

          const alone = standings.filter(
            ({ memberRoles }) => memberRoles.length <= 1
          );

          const shared = standings.flatMap(({ memberRoles, workspaceId }) =>
            memberRoles.length > 1 ? [workspaceId] : []
          );

          const summaries = yield* Effect.all(
            alone.map(({ workspaceId }) => store.workspace(workspaceId))
          );

          const workspaces = yield* Effect.all(
            summaries
              .flatMap((summary) => Option.toArray(summary))
              .map(ownWorkspace)
          );

          const exported: AccountExport = {
            ...(yield* records.exportUser(userId)),
            account,
            authoredPosts: yield* records.exportAuthoredPosts(userId, shared),
            connectedApps: yield* apps.list(userId, now),
            exportedAt: now,
            workspaces,
          };

          return exported;
        }
      );

      return AccountData.of({ export: exportAccount });
    })
  );
}
