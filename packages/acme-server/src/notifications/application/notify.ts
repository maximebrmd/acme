import { Context, DateTime, Effect, Layer, Option } from "effect";

import { audienceOf } from "#notifications/domain/notice-event.ts";
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
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { NoticeDelivery } from "./notice-delivery.ts";
import { NoticeLog } from "./notice-log.ts";
import { NoticeRecipients } from "./notice-recipients.ts";
import type { NewNotice } from "./notice-store.ts";
import { NoticeStore } from "./notice-store.ts";
import { PreferenceStore } from "./preference-store.ts";
import type { RecipientsUnavailable } from "./recipients-unavailable.ts";

/** One event to tell a workspace's members about. */
export interface NoticeRequest {
  readonly event: NoticeEvent;
  /**
   * Names the event, such as `post-target:<id>:<round>`: an event
   * whose key was notified before notifies nobody again.
   */
  readonly key: string;
  readonly workspaceId: WorkspaceId;
}

/**
 * Tells the members of a workspace who can act on an event what happened:
 * a notice in the app for each, and an email for those who want one, in
 * their language, once per key.
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

        const { recipients: people } = yield* recipients.withPermission(
          request.workspaceId,
          audienceOf(request.event)
        );

        const chosen = yield* preferences.forUsers(
          people.map(({ userId }) => userId)
        );

        const notices = yield* Effect.all(
          people.map(({ userId }) =>
            ids.next.pipe(
              Effect.map((uuid): NewNotice => ({
                email: wantsEmail(
                  chosen.get(userId) ?? defaultPreferences,
                  request.event
                ),
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

      return Notify.of({ notify });
    })
  );
}
