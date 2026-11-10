import { Console, Effect, Schema } from "effect";
import { Flag } from "effect/cli";

import { actsOnTerminal } from "#print.ts";

/**
 * `--json`, on the commands a script or an agent reads: the API's answer
 * as one JSON document on stdout, and nothing else there. A refusal still
 * goes to stderr, with a non-zero exit.
 */
export const jsonFlag = Flag.Boolean("json").pipe(
  Flag.withDescription(
    "Print the API's answer as one JSON document on stdout, and nothing else there: instants are ISO 8601, in UTC. A refusal still goes to stderr, with a non-zero exit."
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
