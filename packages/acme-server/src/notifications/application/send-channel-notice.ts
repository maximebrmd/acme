import { Context, DateTime, Effect, Layer, Schedule } from "effect";

import type { ChannelNotice } from "#notifications/domain/channel-notice.ts";
import { renderChannelEmail } from "#notifications/domain/render-channel-email.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { AppLinks } from "./app-links.ts";
import { Mailer } from "./mailer.ts";
import { NoticeLog } from "./notice-log.ts";
import { NoticeRecipients } from "./notice-recipients.ts";
import type { Recipient } from "./notice-recipients.ts";

// A transport that is briefly down gets three more tries, over a few
// seconds; past that the notice is released, and the next check sends it.
const backoff = Schedule.exponential("500 millis");

const retries = 3;

/** One channel notice to a workspace. */
export interface ChannelNoticeRequest {
  /**
   * Names the event, such as `channel:<id>:reconnect-required:<since>`: a
   * notice whose key was sent before is not sent again.
   */
  readonly key: string;
  readonly notice: ChannelNotice;
  /** The web app's page the email links to. */
  readonly path: string;
  readonly workspaceId: WorkspaceId;
}

/**
 * Emails a channel notice to the members who manage the workspace's channels,
 * each in their language, once per key. It never fails: a notice nobody
 * received is logged and released, for the next check to send again.
 */
export class SendChannelNotice extends Context.Service<
  SendChannelNotice,
  { readonly send: (request: ChannelNoticeRequest) => Effect.Effect<void> }
>()("acme-server/notifications/application/SendChannelNotice") {
  static readonly layer = Layer.effect(
    SendChannelNotice,
    Effect.gen(function* sendChannelNotice() {
      const mailer = yield* Mailer;
      const log = yield* NoticeLog;
      const recipients = yield* NoticeRecipients;
      const links = yield* AppLinks;

      const deliver = (
        request: ChannelNoticeRequest,
        workspaceName: string,
        recipient: Recipient
      ) =>
        mailer
          .send({
            ...renderChannelEmail({
              locale: recipient.locale,
              notice: request.notice,
              url: links.url(request.path, recipient.locale),
              workspaceName,
            }),
            idempotencyKey: `${request.key}:${recipient.id}`,
            to: recipient.email,
          })
          .pipe(
            Effect.retry({
              schedule: backoff,
              times: retries,
              while: (failure) => failure.retryable,
            }),
            Effect.as(true),
            Effect.catchTag("MailDeliveryFailed", (failure) =>
              Effect.logError(
                "A channel notice was not sent",
                failure.cause
              ).pipe(Effect.as(false))
            )
          );

      const send = Effect.fn("SendChannelNotice.send")(
        function* send(request: ChannelNoticeRequest) {
          const claimed = yield* log.claim(request.key, yield* DateTime.now);

          if (!claimed) {
            return;
          }

          // Released unless someone received it, so the next check retries.
          const delivered = yield* recipients
            .channelManagers(request.workspaceId)
            .pipe(
              Effect.flatMap(({ recipients: people, workspaceName }) =>
                Effect.forEach(
                  people,
                  (recipient) => deliver(request, workspaceName, recipient),
                  { concurrency: 4 }
                ).pipe(
                  Effect.map(
                    (sent) => people.length === 0 || sent.includes(true)
                  )
                )
              ),
              Effect.tapError(() => log.release(request.key))
            );

          if (!delivered) {
            yield* log.release(request.key);
          }
        },
        (effect, request) =>
          effect.pipe(
            Effect.catchCause((cause) =>
              Effect.logError("A channel notice could not be sent", cause)
            ),
            Effect.annotateLogs({ notice: request.notice._tag })
          )
      );

      return SendChannelNotice.of({ send });
    })
  );
}
