import { Console, Effect, Layer, Predicate, Schema } from "effect";
import { CliError, CliOutput } from "effect/cli";

import { JsonObjectSchema } from "#api-error.ts";
import type { JsonObject } from "#api-error.ts";
import { apiKeyVariable, usesApiKey } from "#api-key.ts";
import { jsonFlagName, jsonText } from "#json.ts";

// How a failure is printed, in one place for every command: effect/cli
// hands each one to the formatter (a command's own failure) or to the
// presenter (arguments it could not read), and this replaces both for the
// run. Without --json and without an API key, nothing changes.

/** Whether the arguments ask for JSON: --json before any `--`. */
export const wantsJson = (args: readonly string[]): boolean => {
  const end = args.indexOf("--");

  return (end === -1 ? args : args.slice(0, end)).includes(`--${jsonFlagName}`);
};

const decodeFailure = Schema.decodeUnknownOption(JsonObjectSchema);

const isSignInExpired = Schema.is(
  Schema.Struct({ _tag: Schema.Literal("SignInExpired"), url: Schema.String })
);

// A key the server refused is not a sign-in to renew.
const keyRefused = (url: string): string =>
  `${url} refused the API key in ${apiKeyVariable}: it was revoked, it expired, or it is another server's. An owner or an admin of the workspace creates a key, in the web app's settings.`;

// What --json prints for a failure: the error's own document, or its
// message under a general code.
const failureOf = (cause: unknown, message: string): JsonObject =>
  Predicate.hasProperty(cause, "jsonFailure")
    ? decodeFailure(cause.jsonFailure).pipe((found) =>
        found._tag === "Some" ? found.value : { code: "failed", message }
      )
    : { code: "failed", message };

const document = (error: JsonObject): string =>
  jsonText(JSON.stringify({ error }, null, 2));

/**
 * The run's formatter and presenter. With --json, a failure is one JSON
 * document on stderr, `{"error": {"code", "message", …}}`: the API's error
 * as the server sent it, or the command line's own under a code of its
 * own (`unreachable`, `not_signed_in`, `invalid_usage`…), and stdout stays
 * empty. With an API key, a 401 is told as the key's, not a sign-in's.
 */
export const reporting = (args: readonly string[]) =>
  Layer.unwrap(
    Effect.gen(function* report() {
      const json = wantsJson(args);
      const withKey = yield* usesApiKey;
      const formatter = yield* CliOutput.Formatter;
      const presenter = yield* CliOutput.Presenter;

      const formatError = (error: CliError.CliError): string => {
        if (error._tag !== "UserError") {
          return json
            ? document({ code: "invalid_usage", message: error.message })
            : formatter.formatError(error);
        }

        const keyError =
          withKey && isSignInExpired(error.cause)
            ? {
                code: "api_key_refused",
                message: keyRefused(error.cause.url),
              }
            : undefined;

        if (json) {
          return document(keyError ?? failureOf(error.cause, error.message));
        }

        return keyError === undefined
          ? formatter.formatError(error)
          : formatter.formatError(
              new CliError.UserError({
                cause: error.cause,
                userMessage: keyError.message,
              })
            );
      };

      return Layer.mergeAll(
        CliOutput.layer({
          formatCliError: (error) => formatter.formatCliError(error),
          formatError,
          formatErrors: (errors) => formatter.formatErrors(errors),
          formatHelpDoc: (doc) => formatter.formatHelpDoc(doc),
          formatVersion: (name, version) =>
            formatter.formatVersion(name, version),
        }),
        CliOutput.layerPresenter({
          present: (event) =>
            json && event._tag === "InvalidInvocation"
              ? Console.error(
                  document({
                    code: "invalid_usage",
                    message: event.errors
                      .map(({ message }) => message)
                      .join("\n"),
                  })
                )
              : presenter.present(event),
        })
      );
    })
  );
