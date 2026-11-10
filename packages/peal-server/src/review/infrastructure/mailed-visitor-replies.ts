import { Effect, Layer } from "effect";

import { SendVisitorEmail } from "#notifications/application/send-visitor-email.ts";
import { VisitorMail } from "#review/application/ports/visitor-mail.ts";

/**
 * Answers told to visitors through the notifications context's mail, sent
 * in the background: the request that brought the answer does not wait.
 */
export const MailedVisitorReplies = Layer.effect(
  VisitorMail,
  Effect.gen(function* MailedVisitorReplies() {
    const mail = yield* SendVisitorEmail;

    return VisitorMail.of({
      replied: (contacts) =>
        Effect.forEach(
          contacts,
          ({ email, locale }) => mail.reviewReply({ locale, to: email }),
          { concurrency: 2, discard: true }
        ).pipe(Effect.forkDetach, Effect.asVoid),
    });
  })
);
