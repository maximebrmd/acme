import { Console, Effect, Schema } from "effect";
import { Flag } from "effect/cli";

import type { JsonObject } from "#api-error.ts";
import { actsOnTerminal } from "#print.ts";

/** The flag's name, as `report.ts` looks for it among the arguments. */
export const jsonFlagName = "json";

/**
 * `--json`, on the commands a script or an agent reads: the API's answer
 * as one JSON document on stdout, and nothing else there. A failure is one
 * JSON document too, on stderr, with a non-zero exit (`report.ts`).
 */
export const jsonFlag = Flag.Boolean(jsonFlagName).pipe(
  Flag.withDescription(
    'Print the API\'s answer as one JSON document on stdout, and nothing else there: instants are ISO 8601, in UTC, and an answer without a body is null. A failure is one JSON document on stderr, {"error": {"code", "message", "requestId", …}}, with exit code 1: for a refusal of the API, its error as the server sent it.'
  ),
  Flag.withDefault(false)
);

const escaped = (character: string): string =>
  `\\u${(character.codePointAt(0) ?? 0).toString(16).padStart(4, "0")}`;

/**
 * JSON as a terminal shows it and never acts on it. JSON.stringify escapes
 * the C0 controls; DEL, the C1 controls and the marks that reorder text
 * are escaped here the same way, so a parser reads back exactly what the
 * server holds, and the console has nothing left to replace. They only
 * ever stand inside strings, where an escape is JSON.
 */
export const jsonText = (json: string): string =>
  Array.from(json, (character) =>
    actsOnTerminal(character.codePointAt(0) ?? 0)
      ? escaped(character)
      : character
  ).join("");

/** Prints what the API answered, encoded as its contract's schema says. */
export const printJson = <S extends Schema.Top>(schema: S, value: S["Type"]) =>
  Schema.encodeEffect(Schema.toCodecJson(schema))(value).pipe(
    Effect.orDie,
    Effect.flatMap((encoded) =>
      Console.log(jsonText(JSON.stringify(encoded, null, 2)))
    )
  );

/** Prints a document of the command line's own, as `printJson` would. */
export const printDocument = (document: JsonObject | null) =>
  Console.log(jsonText(JSON.stringify(document, null, 2)));

/** Prints what an answer without a body is in JSON: null. */
export const printNothing = printDocument(null);
