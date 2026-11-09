import { Context, DateTime, Effect, Layer, Option } from "effect";

import {
  audienceOf,
  readerPermissionOf,
  recipientsOf,
} from "#notifications/domain/notice-event.ts";
import type { NoticeEvent } from "#notifications/domain/notice-event.ts";
import { NoticeIdSchema } from "#notifications/domain/notice-id.ts";
import { Notice } from "#notifications/domain/notice.ts";
import {
  defaultPreferences,
  wantsEmail,
} from "#notifications/domain/notification-preferences.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import { NoticeDelivery } from "./notice-delivery.ts";
import { NoticeLog } from "./notice-log.ts";
import { NoticeRecipients } from "./notice-recipients.ts";
import type { NewNotice } from "./notice-store.ts";
import { NoticeStore } from "./notice-store.ts";
import { PreferenceStore } from "./preference-store.ts";
import type { RecipientsUnavailable } from "./recipients-unavailable.ts";

/** One event to tell a workspace's members about. */
export interface NoticeRequest {
  /**
   * For an event about a post: the member who wrote it, when a member did.
   * They hear about it, with those who chose to hear about every post
   * (`recipientsOf`).
   */
  readonly author?: UserId;
  readonly event: NoticeEvent;
  /**
   * Names the event, such as `post-target:<id>:<round>`: an event
   * whose key was notified before notifies nobody again.
   */
  readonly key: string;
  readonly workspaceId: WorkspaceId;
}

/**
 * Tells the members of a workspace an event concerns what happened
 * (`recipientsOf`): a notice in the app for each, and an email for those
 * who want one, in their language, once per key.
 *
 * It runs in one transaction, joining the caller's: the key, the notices
 * and the start of their emails' delivery commit together, or not at all,
 * and then a call again does it all again. The emails go out after the
 * commit.
 */
export class Notify extends Context.Service<
  Notify,
  {
    readonly notify: (
      request: NoticeRequest
    ) => Effect.Effect<void, DatabaseError | RecipientsUnavailable>;
    /**
     * Someone dealt with the event of this key: its notices are marked read
     * for everyone, and emails not sent yet are dropped. In one transaction,
     * joining the caller's.
     */
    readonly resolve: (key: string) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/notifications/application/Notify") {
  static readonly layer = Layer.effect(
    Notify,
    Effect.gen(function* NotifyLive() {
      const delivery = yield* NoticeDelivery;
      const log = yield* NoticeLog;
      const preferences = yield* PreferenceStore;
      const recipients = yield* NoticeRecipients;
      const store = yield* NoticeStore;
      const ids = yield* Ids;
      const { transaction } = yield* TransactionRunner;

      const notifyOnce = Effect.fn("Notify.notifyOnce")(function* notifyOnce(
        request: NoticeRequest
      ) {
        const now = yield* DateTime.now;

        if (!(yield* log.claim(request.key, now))) {
          return;
        }

        const readers = yield* recipients.withPermission(
          request.workspaceId,
          readerPermissionOf(request.event)
        );

        const actors = yield* recipients.withPermission(
          request.workspaceId,
          audienceOf(request.event)
        );

        const mayAct = new Set(actors.recipients.map(({ userId }) => userId));

        const chosen = yield* preferences.forUsers(
          readers.recipients.map(({ userId }) => userId)
        );

        const preferencesOf = (userId: UserId) =>
          chosen.get(userId) ?? defaultPreferences;

        const told = new Set(
          recipientsOf(
            request.event,
            Option.fromUndefinedOr(request.author),
            readers.recipients.map(({ userId }) => ({
              followsEveryPost: preferencesOf(userId).everyPost,
              mayAct: mayAct.has(userId),
              userId,
            }))
          )
        );

        const people = readers.recipients.filter(({ userId }) =>
          told.has(userId)
        );

        const notices = yield* Effect.all(
          people.map(({ userId }) =>
            ids.next.pipe(
              Effect.map((uuid): NewNotice => ({
                email: wantsEmail(preferencesOf(userId), request.event),
                notice: new Notice({
                  createdAt: now,
                  event: request.event,
                  id: NoticeIdSchema.make(uuid),
                  readAt: Option.none(),
                  userId,
                  workspaceId: request.workspaceId,
                }),
              }))
            )
          )
        );

        yield* store.add(request.key, notices);

        if (notices.some(({ email }) => email)) {
          yield* delivery.start(request.key);
        }
      });

      const notify = (request: NoticeRequest) =>
        transaction(notifyOnce(request)).pipe(
          Effect.annotateLogs({ notice: request.event._tag })
        );

      const resolve = (key: string) =>
        transaction(
          DateTime.now.pipe(Effect.flatMap((now) => store.resolve(key, now)))
        );

      return Notify.of({ notify, resolve });
    })
  );
}
