import { Cause, Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";

// What a field filled by a lookup offers on a channel: the values its
// platform answers for the account, read when the composer opens the
// channel's options (`POST …/channels/:id/lookups/:name`).

/** A value the account has, as the field's list shows it. */
export interface LookupChoice {
  readonly label: string;
  readonly value: string;
}

/** Why the platform's answer could not be had. */
export type LookupFailure =
  | "disabled"
  | "rateLimited"
  | "reconnect"
  | "unreachable";

/** The values a lookup field offers, or why it has none yet. */
export type LookupChoices =
  | { readonly _tag: "loading" }
  | { readonly _tag: "failed"; readonly reason: LookupFailure }
  | {
      readonly _tag: "loaded";
      readonly choices: readonly LookupChoice[];
      /** The account has more than the composer read. */
      readonly truncated: boolean;
    };

/** Every page read of a lookup, as far as the composer goes. */
export interface LookupItems<Item> {
  readonly items: readonly Item[];
  /** Pages were left unread. */
  readonly truncated: boolean;
}

const decodeRefusal = Schema.decodeUnknownOption(
  Schema.Union([
    Schema.Struct({
      _tag: Schema.Literal("ChannelCannotPost"),
      reason: Schema.Literals(["disabled", "reconnect"]),
    }),
    Schema.Struct({ _tag: Schema.Literal("PlatformRateLimited") }),
  ])
);

const failureOf = (cause: Cause.Cause<unknown>): LookupFailure =>
  Cause.findErrorOption(cause).pipe(
    Option.flatMap(decodeRefusal),
    Option.match({
      onNone: (): LookupFailure => "unreachable",
      onSome: (refusal) =>
        refusal._tag === "ChannelCannotPost" ? refusal.reason : "rateLimited",
    })
  );

/** The choices a lookup's result gives, each item shown by `choiceOf`. */
export const choicesOf = <Item>(
  result: AsyncResult.AsyncResult<LookupItems<Item>, unknown>,
  choiceOf: (item: Item) => LookupChoice
): LookupChoices => {
  if (AsyncResult.isSuccess(result)) {
    return {
      _tag: "loaded",
      choices: result.value.items.map(choiceOf),
      truncated: result.value.truncated,
    };
  }

  return AsyncResult.isFailure(result)
    ? { _tag: "failed", reason: failureOf(result.cause) }
    : { _tag: "loading" };
};
