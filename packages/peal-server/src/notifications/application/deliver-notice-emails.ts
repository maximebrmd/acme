import { Context, DateTime, Effect, Layer, Option, Schedule } from "effect";

import {
  pageOf,
  readerPermissionOf,
} from "#notifications/domain/notice-event.ts";
import type { Notice } from "#notifications/domain/notice.ts";
import {
  defaultPreferences,
  wantsEmail,
} from "#notifications/domain/notification-preferences.ts";
import { renderNoticeEmail } from "#notifications/domain/render-notice-email.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { AppLinks } from "./app-links.ts";
import { Mailer } from "./mailer.ts";
import { NoticeLog } from "./notice-log.ts";
import type { Recipient } from "./notice-recipients.ts";
import { NoticeRecipients } from "./notice-recipients.ts";
import { NoticeStore } from "./notice-store.ts";
import type { EmailOutcome } from "./notice-store.ts";
import { PreferenceStore } from "./preference-store.ts";
import type { RecipientsUnavailable } from "./recipients-unavailable.ts";

type Attempt = EmailOutcome | "retry";

// The transaction that records an event starts its delivery, which runs
// once it commits. A message store kept in memory, as in tests, can wake
// the delivery a moment before: it waits up to a second for the record.
const recordWait = Schedule.spaced("50 millis");

const recordWaits = 20;

/**
 * Sends the emails an event's notices wait for. Each is written when it
 * goes, in the language its reader has then, to the address they have then;
 * a reader who no longer belongs to the workspace, or no longer wants the
 * email, gets none.
 */
export class DeliverNoticeEmails extends Context.Service<
  DeliverNoticeEmails,
  {
    /**
     * Sends what is pending, and says how many emails are left that may go
     * out on another try: the transport refused them for now.
     */
    readonly deliver: (
      key: string
    ) => Effect.Effect<number, DatabaseError | RecipientsUnavailable>;
    /** Gives up on the emails still pending, which are not sent. */
    readonly abandon: (key: string) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/notifications/application/DeliverNoticeEmails") {
  static readonly layer = Layer.effect(
    DeliverNoticeEmails,
    Effect.gen(function* DeliverNoticeEmailsLive() {
      const links = yield* AppLinks;
      const log = yield* NoticeLog;
      const mailer = yield* Mailer;
      const preferences = yield* PreferenceStore;
      const recipients = yield* NoticeRecipients;
      const store = yield* NoticeStore;

      const settle = (notice: Notice, outcome: EmailOutcome) =>
        DateTime.now.pipe(
          Effect.flatMap((now) => store.settleEmail(notice.id, outcome, now)),
          Effect.as<Attempt>(outcome)
        );

      const send = (
        notice: Notice,
        recipient: Recipient,
        workspaceName: string
      ) =>
        mailer
          .send({
            ...renderNoticeEmail({
              event: notice.event,
              locale: recipient.locale,
              url: links.url(
                pageOf(notice.event, notice.workspaceId),
                recipient.locale
              ),
              workspaceName,
            }),
            // The same for every try, so a transport that deduplicates sends
            // it once.
            idempotencyKey: `notice:${notice.id}`,
            to: recipient.email,
          })
          .pipe(
            Effect.matchEffect({
              onFailure: (failure) =>
                failure.retryable
                  ? Effect.logWarning(
                      "A notice's email was refused for now",
                      failure.cause
                    ).pipe(Effect.as<Attempt>("retry"))
                  : Effect.logError(
                      "A notice's email was refused",
                      failure.cause
                    ).pipe(Effect.andThen(settle(notice, "failed"))),
              onSuccess: () => settle(notice, "sent"),
            }),
            Effect.annotateLogs({ noticeId: notice.id })
          );

      const deliver = Effect.fn("DeliverNoticeEmails.deliver")(
        function* deliver(key: string) {
          const recorded = yield* log.isClaimed(key).pipe(
            Effect.repeat({
              schedule: recordWait,
              times: recordWaits,
              until: (claimed) => claimed,
            })
          );

          // Rolled back with the transaction that started it.
          if (!recorded) {
            return 0;
          }

          const pending = yield* store.pendingEmails(key);
          const [first] = pending;

          if (first === undefined) {
            return 0;
          }

          // One event's notices share its workspace and its audience: a
          // reader who left the workspace, or may no longer act on a
          // channel, gets no email.
          const { recipients: people, workspaceName } =
            yield* recipients.withPermission(
              first.workspaceId,
              readerPermissionOf(first.event)
            );

          const chosen = yield* preferences.forUsers(
            pending.map(({ userId }) => userId)
          );

          const attempts = yield* Effect.forEach(
            pending,
            (notice) => {
              const recipient = Option.fromUndefinedOr(
                people.find(({ userId }) => userId === notice.userId)
              );

              const wanted = wantsEmail(
                chosen.get(notice.userId) ?? defaultPreferences,
                notice.event
              );

              return Option.isSome(recipient) && wanted
                ? send(notice, recipient.value, workspaceName)
                : settle(notice, "skipped");
            },
            { concurrency: 4 }
          );

          return attempts.filter((attempt) => attempt === "retry").length;
        }
      );

      const abandon = Effect.fn("DeliverNoticeEmails.abandon")(
        function* abandon(key: string) {
          const pending = yield* store.pendingEmails(key);

          yield* Effect.forEach(pending, (notice) => settle(notice, "failed"), {
            discard: true,
          });

          if (pending.length > 0) {
            yield* Effect.logError("Gave up sending a notice's emails").pipe(
              Effect.annotateLogs({ emails: pending.length })
            );
          }
        }
      );

      return DeliverNoticeEmails.of({ abandon, deliver });
    })
  );
}
