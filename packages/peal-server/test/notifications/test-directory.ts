import { Context, Effect, Layer, Ref } from "effect";

import { NoticeRecipients } from "#notifications/application/notice-recipients.ts";
import { ReaderStanding } from "#notifications/application/reader-standing.ts";
import type { Permission } from "#shared/domain/access.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

/** A member of a test workspace, with what their role allows. */
export interface TestMember {
  readonly email: string;
  readonly locale: Locale;
  readonly permissions: readonly Permission[];
  readonly userId: UserId;
}

/**
 * The workspaces' members, as tests set them, with NoticeRecipients reading
 * them (every test workspace is called "Studio Nord") and ReaderStanding
 * (every user may use Peal until the test bans them).
 */
export class TestDirectory extends Context.Service<
  TestDirectory,
  {
    readonly ban: (userId: UserId) => Effect.Effect<void>;
    readonly setMembers: (
      workspaceId: WorkspaceId,
      members: readonly TestMember[]
    ) => Effect.Effect<void>;
  }
>()("peal-server/test/notifications/TestDirectory") {
  static readonly layer = Layer.effectContext(
    Effect.gen(function* TestDirectoryLive() {
      const members = yield* Ref.make<
        ReadonlyMap<WorkspaceId, readonly TestMember[]>
      >(new Map());

      const banned = yield* Ref.make<ReadonlySet<UserId>>(new Set());

      return Context.make(
        NoticeRecipients,
        NoticeRecipients.of({
          withPermission: (workspaceId, permission) =>
            Ref.get(members).pipe(
              Effect.map((all) => ({
                recipients: (all.get(workspaceId) ?? [])
                  .filter((member) => member.permissions.includes(permission))
                  .map(({ email, locale, userId }) => ({
                    email,
                    locale,
                    userId,
                  })),
                workspaceName: "Studio Nord",
              }))
            ),
        })
      ).pipe(
        Context.add(
          ReaderStanding,
          ReaderStanding.of({
            isActive: (userId) =>
              Ref.get(banned).pipe(Effect.map((ids) => !ids.has(userId))),
          })
        ),
        Context.add(
          TestDirectory,
          TestDirectory.of({
            ban: (userId) =>
              Ref.update(banned, (ids) => new Set([...ids, userId])),
            setMembers: (workspaceId, people) =>
              Ref.update(
                members,
                (all) => new Map([...all, [workspaceId, people]])
              ),
          })
        )
      );
    })
  );
}
