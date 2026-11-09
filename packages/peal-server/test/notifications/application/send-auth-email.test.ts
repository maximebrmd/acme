import { assert, describe, it } from "@effect/vitest";
import { Effect, Fiber, Layer, Ref } from "effect";
import { TestClock } from "effect/testing";

import { MailDeliveryFailed } from "#notifications/application/mail-delivery-failed.ts";
import { Mailer } from "#notifications/application/mailer.ts";
import type { EmailMessage } from "#notifications/application/mailer.ts";
import { SendAuthEmail } from "#notifications/application/send-auth-email.ts";
import { Ids } from "#shared/application/ids.ts";

// A mailer that fails the first `failures` sends, then accepts.
const flakyMailer = (failures: number, retryable: boolean) =>
  Effect.gen(function* makeFlakyMailer() {
    const attempts = yield* Ref.make<readonly EmailMessage[]>([]);

    const layer = Layer.succeed(
      Mailer,
      Mailer.of({
        send: (message) =>
          Ref.updateAndGet(attempts, (sent) => [...sent, message]).pipe(
            Effect.flatMap((sent) =>
              sent.length <= failures
                ? Effect.fail(
                    new MailDeliveryFailed({
                      cause: new Error("Connection refused"),
                      retryable,
                    })
                  )
                : Effect.void
            )
          ),
      })
    );

    return { attempts, layer };
  });

const verifyEmail = {
  _tag: "VerifyEmail",
  locale: "fr",
  to: "ada@example.test",
  url: "https://app.example.test/api/auth/verify-email?token=abc",
} as const;

const sendWith = (layer: Layer.Layer<Mailer>) =>
  Effect.gen(function* send() {
    const fiber = yield* SendAuthEmail.use((emails) =>
      emails.send(verifyEmail)
    ).pipe(
      Effect.provide(
        SendAuthEmail.layer.pipe(Layer.provide([layer, Ids.layerTest]))
      ),
      Effect.forkChild
    );

    yield* TestClock.adjust("1 minute");
    yield* Fiber.join(fiber);
  });

describe(SendAuthEmail, () => {
  it.effect("renders the email in its reader's language", () =>
    Effect.gen(function* renders() {
      const { attempts, layer } = yield* flakyMailer(0, true);

      yield* sendWith(layer);

      const [sent] = yield* Ref.get(attempts);

      assert.strictEqual(sent?.to, "ada@example.test");
      assert.strictEqual(
        sent?.subject,
        "Confirmez votre adresse e-mail pour Acme"
      );
    })
  );

  it.effect(
    "retries a transport that is briefly down, with one idempotency key",
    () =>
      Effect.gen(function* retries() {
        const { attempts, layer } = yield* flakyMailer(2, true);

        yield* sendWith(layer);

        const sent = yield* Ref.get(attempts);

        assert.lengthOf(sent, 3);
        assert.lengthOf(
          new Set(sent.map((message) => message.idempotencyKey)),
          1
        );
      })
  );

  it.effect("gives up after four attempts without failing", () =>
    Effect.gen(function* givesUp() {
      const { attempts, layer } = yield* flakyMailer(10, true);

      yield* sendWith(layer);

      assert.lengthOf(yield* Ref.get(attempts), 4);
    })
  );

  it.effect("does not retry an email the transport refused for good", () =>
    Effect.gen(function* refused() {
      const { attempts, layer } = yield* flakyMailer(10, false);

      yield* sendWith(layer);

      assert.lengthOf(yield* Ref.get(attempts), 1);
    })
  );
});
