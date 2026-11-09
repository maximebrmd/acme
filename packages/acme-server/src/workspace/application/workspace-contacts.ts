import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";
import { isBanned } from "#workspace/domain/ban.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import { WorkspaceRoster } from "./workspace-roster.ts";

/** A member to write to, in their language. */
export interface Contact {
  readonly email: string;
  readonly locale: Locale;
  readonly userId: UserId;
}

/**
 * Who to tell about something in a workspace: its members whose roles allow
 * a permission, leaving out banned users. A workspace that no longer exists
 * has nobody to tell.
 */
export class WorkspaceContacts extends Context.Service<
  WorkspaceContacts,
  {
    readonly withPermission: (
      workspaceId: WorkspaceId,
      permission: Permission
    ) => Effect.Effect<
      { readonly contacts: readonly Contact[]; readonly workspaceName: string },
      DirectoryUnavailable
    >;
  }
>()("acme-server/workspace/application/WorkspaceContacts") {
  static readonly layer = Layer.effect(
    WorkspaceContacts,
    Effect.gen(function* WorkspaceContactsLive() {
      const roster = yield* WorkspaceRoster;

      const withPermission = Effect.fn("WorkspaceContacts.withPermission")(
        function* withPermission(
          workspaceId: WorkspaceId,
          permission: Permission
        ) {
          const found = yield* roster.members(workspaceId);
          const now = yield* DateTime.now;

          if (Option.isNone(found)) {
            return { contacts: [], workspaceName: "" };
          }

          const contacts: readonly Contact[] = found.value.members
            .filter(
              (member) =>
                !isBanned(member.ban, now) &&
                permissionsFor(member.role).includes(permission)
            )
            .map(({ email, locale, userId }) => ({ email, locale, userId }));

          return { contacts, workspaceName: found.value.name };
        }
      );

      return WorkspaceContacts.of({ withPermission });
    })
  );
}
