import { DateTime, Option, Schema } from "effect";
import { LegalRequestSchema } from "peal-contract";
import type { LegalCover, LegalRequest } from "peal-contract";

/** What a legal request names: closed accounts by address, or an id. */
export const subjectKinds = ["email", "userId", "workspaceId"] as const;

export type SubjectKind = (typeof subjectKinds)[number];

/** What a legal request may ask for, in the order the form lists them. */
export const legalCovers: readonly LegalCover[] = [
  "identity",
  "signIn",
  "payments",
  "connections",
];

/** The legal request form's fields, as typed. */
export interface LegalRequestFields {
  readonly authority: string;
  readonly covers: readonly LegalCover[];
  readonly identifier: string;
  readonly kind: SubjectKind;
  readonly legalBasis: string;
  readonly reference: string;
  /** The first day of the connections asked for, as YYYY-MM-DD, or empty. */
  readonly since: string;
  /** Their last day, as YYYY-MM-DD, or empty. */
  readonly until: string;
}

const decode = Schema.decodeUnknownOption(LegalRequestSchema);

// A day as a date field writes it. Anything else is not a period.
const day = /^\d{4}-\d{2}-\d{2}$/u;

// An end of the period: none typed, or the instant its UTC day starts or
// ends at; none of none when what was typed is no day.
const endOf = (
  value: string,
  time: string
): Option.Option<Option.Option<DateTime.Utc>> => {
  if (value === "") {
    return Option.some(Option.none());
  }

  return day.test(value)
    ? Option.map(DateTime.make(`${value}T${time}Z`), Option.some)
    : Option.none();
};

/**
 * The request the form holds, as the API takes it, or none while it lacks
 * its authority, reference, legal basis, subject or what it covers: the
 * server records those before it shows anything, so none may be missing.
 * The period of the connections is whole UTC days, both included.
 */
export const legalRequestOf = (
  fields: LegalRequestFields
): Option.Option<LegalRequest> => {
  const identifier = fields.identifier.trim();

  if (identifier === "") {
    return Option.none();
  }

  return Option.all({
    since: endOf(fields.since, "00:00:00.000"),
    until: endOf(fields.until, "23:59:59.999"),
  }).pipe(
    Option.flatMap(({ since, until }) =>
      decode({
        authority: fields.authority,
        covers: fields.covers,
        legalBasis: fields.legalBasis,
        reference: fields.reference,
        subject: { [fields.kind]: identifier },
        ...Option.match(since, {
          onNone: () => ({}),
          onSome: (from) => ({ since: from }),
        }),
        ...Option.match(until, {
          onNone: () => ({}),
          onSome: (to) => ({ until: to }),
        }),
      })
    )
  );
};
