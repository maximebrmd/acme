import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { AuditEventIdSchema } from "#staff/domain/audit-event-id.ts";
import { AuditEvent } from "#staff/domain/audit-event.ts";
import type { StaffReason } from "#staff/domain/staff-reason.ts";

import { AuditLog } from "./ports/audit-log.ts";
import { ShortLinkDesk } from "./ports/short-link-desk.ts";
import type { StaffShortLinkSummary } from "./ports/short-link-desk.ts";
import { ShortLinkNotFound } from "./short-link-not-found.ts";

/** The most short links staff read of a workspace at once. */
export const staffShortLinks = 100;

/** What staff ask of a short link, and why. */
export interface ShortLinkAction {
  readonly code: string;
  readonly reason: StaffReason;
  readonly staffId: UserId;
}

/**
 * Short links in the staff console: one read by its code, and turned off
 * (it answers 410) or on again, each recorded in the audit log, with the
 * link's workspace, its code and the reason, before it is done. A code no
 * link has records nothing.
 */
export class StaffShortLinks extends Context.Service<
  StaffShortLinks,
  {
    readonly find: (
      code: string
    ) => Effect.Effect<
      StaffShortLinkSummary,
      DatabaseError | ShortLinkNotFound
    >;
    readonly disable: (
      action: ShortLinkAction
    ) => Effect.Effect<
      StaffShortLinkSummary,
      DatabaseError | ShortLinkNotFound
    >;
    readonly enable: (
      action: ShortLinkAction
    ) => Effect.Effect<
      StaffShortLinkSummary,
      DatabaseError | ShortLinkNotFound
    >;
    /** A workspace's links, newest first, `staffShortLinks` at most. */
    readonly ofWorkspace: (workspaceId: WorkspaceId) => Effect.Effect<
      {
        readonly links: readonly StaffShortLinkSummary[];
        readonly total: number;
      },
      DatabaseError
    >;
    /**
     * Turns off every link of the workspace still on, recorded once, with
     * the reason and the workspace, before it is done; says how many.
     */
    readonly disableWorkspace: (action: {
      readonly reason: StaffReason;
      readonly staffId: UserId;
      readonly workspaceId: WorkspaceId;
    }) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/staff/application/StaffShortLinks") {
  static readonly layer = Layer.effect(
    StaffShortLinks,
    Effect.gen(function* StaffShortLinksLive() {
      const desk = yield* ShortLinkDesk;
      const log = yield* AuditLog;
      const ports = yield* Effect.context<Ids>();

      const find = (code: string) =>
        desk.find(code).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new ShortLinkNotFound({ code })),
              onSome: Effect.succeed,
            })
          )
        );

      const turned = (disabled: boolean) =>
        Effect.fn("StaffShortLinks.turn")(
          function* turn({ code, reason, staffId }: ShortLinkAction) {
            const link = yield* find(code);

            yield* log.record(
              new AuditEvent({
                action: disabled ? "disableShortLink" : "enableShortLink",
                at: yield* DateTime.now,
                banExpiresAt: Option.none(),
                id: yield* newId(AuditEventIdSchema),
                objectIds: { code: link.code },
                reason: Option.some(reason),
                staffId: Option.some(staffId),
                targetId: Option.none(),
                workspaceId: Option.some(link.workspaceId),
              })
            );

            const changed = yield* desk.setDisabled(link.code, disabled);

            return yield* Option.match(changed, {
              onNone: () => Effect.fail(new ShortLinkNotFound({ code })),
              onSome: Effect.succeed,
            });
          },
          Effect.provideContext(ports),
          (effect, { code, staffId }) =>
            effect.pipe(
              Effect.annotateLogs({
                action: disabled ? "disableShortLink" : "enableShortLink",
                code,
                staffId,
              })
            )
        );

      const disableWorkspace = Effect.fn("StaffShortLinks.disableWorkspace")(
        function* disableWorkspace({
          reason,
          staffId,
          workspaceId,
        }: {
          readonly reason: StaffReason;
          readonly staffId: UserId;
          readonly workspaceId: WorkspaceId;
        }) {
          const { total } = yield* desk.ofWorkspace(workspaceId, 1);

          yield* log.record(
            new AuditEvent({
              action: "disableWorkspaceShortLinks",
              at: yield* DateTime.now,
              banExpiresAt: Option.none(),
              id: yield* newId(AuditEventIdSchema),
              objectIds: { links: String(total) },
              reason: Option.some(reason),
              staffId: Option.some(staffId),
              targetId: Option.none(),
              workspaceId: Option.some(workspaceId),
            })
          );

          return yield* desk.disableWorkspace(workspaceId);
        },
        Effect.provideContext(ports)
      );

      return StaffShortLinks.of({
        disable: turned(true),
        disableWorkspace,
        enable: turned(false),
        find,
        ofWorkspace: (workspaceId) =>
          desk.ofWorkspace(workspaceId, staffShortLinks),
      });
    })
  );
}
