import { Context, Effect, Layer, Ref } from "effect";

import { MailDeliveryFailed } from "#notifications/application/mail-delivery-failed.ts";
import { Mailer } from "#notifications/application/mailer.ts";
import type { EmailMessage } from "#notifications/application/mailer.ts";

/** How the test mailer answers. */
export type MailerMode = "accept" | "refuseForNow" | "refuse";

/** A mailer that records what it sends, and refuses as it is told. */
export class TestMailer extends Context.Service<
  TestMailer,
  {
    readonly sent: Effect.Effect<readonly EmailMessage[]>;
    readonly setMode: (mode: MailerMode) => Effect.Effect<void>;
    /** Refuses these addresses for now, whatever the mode. */
    readonly refuseForNowTo: (
      addresses: readonly string[]
    ) => Effect.Effect<void>;
  }
>()("peal-server/test/notifications/TestMailer") {
  static readonly layer = Layer.effectContext(
    Effect.gen(function* TestMailerLive() {
      const sent = yield* Ref.make<readonly EmailMessage[]>([]);
      const mode = yield* Ref.make<MailerMode>("accept");
      const refusedForNow = yield* Ref.make<ReadonlySet<string>>(new Set());

      const send = (message: EmailMessage) =>
        Effect.all([Ref.get(mode), Ref.get(refusedForNow)]).pipe(
          Effect.map(([current, refused]): MailerMode =>
            refused.has(message.to) ? "refuseForNow" : current
          ),
          Effect.flatMap((current) =>
            current === "accept"
              ? Ref.update(sent, (all) => [...all, message])
              : Effect.fail(
                  new MailDeliveryFailed({
                    cause: new Error("Relay access denied"),
                    retryable: current === "refuseForNow",
                  })
                )
          )
        );

      return Context.make(Mailer, Mailer.of({ send })).pipe(
        Context.add(
          TestMailer,
          TestMailer.of({
            sent: Ref.get(sent),
            refuseForNowTo: (addresses) =>
              Ref.set(refusedForNow, new Set(addresses)),
            setMode: (next) => Ref.set(mode, next),
          })
        )
      );
    })
  );
}
