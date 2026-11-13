import { randomUUID } from "node:crypto";

import { assert, describe, it } from "@effect/vitest";
import { Config, Effect, Redacted, Schema } from "effect";

import { Mailer } from "#notifications/application/mailer.ts";
import { smtpMailer } from "#notifications/infrastructure/smtp-mailer.ts";

// The development stack's Mailpit, or the one SMTP_URL and MAILPIT_URL name.
const smtpUrl = Config.String("SMTP_URL").pipe(
  Config.withDefault("smtp://127.0.0.1:11025")
);

const mailpitUrl = Config.String("MAILPIT_URL").pipe(
  Config.withDefault("http://127.0.0.1:18025")
);

const SearchSchema = Schema.Struct({
  messages: Schema.Array(
    Schema.Struct({
      From: Schema.Struct({ Address: Schema.String, Name: Schema.String }),
      ID: Schema.String,
      Subject: Schema.String,
    })
  ),
});

const MessageSchema = Schema.Struct({
  HTML: Schema.String,
  Text: Schema.String,
});

const getJson = <S extends Schema.Top>(url: string, schema: S) =>
  Effect.promise(async () => {
    const response = await fetch(url);
    const json: unknown = await response.json();

    return json;
  }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(schema)));

describe("the SMTP mailer", () => {
  it.live("delivers the email to the SMTP server", () =>
    Effect.gen(function* delivers() {
      const to = `smtp-test+${randomUUID()}@example.test`;
      const url = yield* smtpUrl;
      const mailpit = yield* mailpitUrl;

      yield* Mailer.use((mailer) =>
        mailer.send({
          headers: {
            "List-Unsubscribe": "<https://app.example.test/api/u/x>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          html: "<p>Bonjour</p>",
          idempotencyKey: "00000000-0000-7000-8000-000000000001",
          subject: "Bonjour",
          text: "Bonjour",
          to,
        })
      ).pipe(
        Effect.provide(
          smtpMailer({
            from: "Peal <noreply@example.test>",
            url: Redacted.make(url),
          })
        )
      );

      // Mailpit stores the email once the SMTP session ends.
      const query = new URLSearchParams({ query: `to:"${to}"` });

      const { messages } = yield* getJson(
        `${mailpit}/api/v1/search?${query.toString()}`,
        SearchSchema
      );

      const [found] = messages;

      assert.isDefined(found);
      assert.strictEqual(found?.Subject, "Bonjour");
      assert.deepStrictEqual(found?.From, {
        Address: "noreply@example.test",
        Name: "Peal",
      });

      const message = yield* getJson(
        `${mailpit}/api/v1/message/${found?.ID ?? ""}`,
        MessageSchema
      );

      assert.strictEqual(message.HTML, "<p>Bonjour</p>");
      assert.strictEqual(message.Text.trim(), "Bonjour");

      const headers = yield* getJson(
        `${mailpit}/api/v1/message/${found?.ID ?? ""}/headers`,
        Schema.Record(Schema.String, Schema.Array(Schema.String))
      );

      assert.deepStrictEqual(headers["List-Unsubscribe"], [
        "<https://app.example.test/api/u/x>",
      ]);
      assert.deepStrictEqual(headers["List-Unsubscribe-Post"], [
        "List-Unsubscribe=One-Click",
      ]);
    })
  );

  it.live("fails, retryable, when the server does not answer", () =>
    Effect.gen(function* refused() {
      const failure = yield* Mailer.use((mailer) =>
        mailer.send({
          html: "<p>Hello</p>",
          idempotencyKey: "00000000-0000-7000-8000-000000000002",
          subject: "Hello",
          text: "Hello",
          to: "nobody@example.test",
        })
      ).pipe(
        Effect.provide(
          smtpMailer({
            from: "noreply@example.test",
            // Nothing listens on port 1.
            url: Redacted.make("smtp://127.0.0.1:1"),
          })
        ),
        Effect.flip
      );

      assert.isTrue(failure.retryable);
    })
  );
});
