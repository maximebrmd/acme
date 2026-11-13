import { Schema } from "effect";

/**
 * A breaking change decided on, in released/accepted-changes.json: one the
 * check of the document prints (no `kind`), or one the document cannot
 * show, which is kept as written until the next release: `behaviour`, what
 * an endpoint does or refuses now, and `sdk`, a type the SDKs' generator
 * renamed or narrowed.
 */
export const AcceptedChangeSchema = Schema.Struct({
  // The change, as the check prints it, or in words for a `kind`.
  change: Schema.String,
  kind: Schema.optionalKey(Schema.Literals(["behaviour", "sdk"])),
  // Why it was made, and what clients do about it.
  reason: Schema.NonEmptyString,
});

export type AcceptedChange = typeof AcceptedChangeSchema.Type;

/**
 * The document's breaking changes no one accepted, and the accepted
 * document changes that no longer happen: both fail the check.
 */
export const checkAccepted = (
  breaking: readonly string[],
  accepted: readonly AcceptedChange[]
) => {
  const ofDocument = accepted.filter(({ kind }) => kind === undefined);

  return {
    stale: ofDocument.filter(({ change }) => !breaking.includes(change)),
    unaccepted: breaking.filter(
      (line) => !ofDocument.some(({ change }) => change === line)
    ),
  };
};

/** The accepted changes as the changelog serves them: what, and why. */
export const breakingOf = (accepted: readonly AcceptedChange[]) =>
  accepted.map(({ change, reason }) => ({ change, reason }));
