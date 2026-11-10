import { Option, Schema } from "effect";
import type { DateTime } from "effect";
import {
  maxBoostAge,
  maxBoostCountries,
  maxBoostPartyLength,
  minBoostAge,
} from "peal-contract";
import type { AdAccount, NewBoost } from "peal-contract";

import {
  dateKey,
  DateKeySchema,
  instantOf,
  parseDate,
} from "#posts/zoned-time.ts";
import type { CalendarDate } from "#posts/zoned-time.ts";

import { parseAmount } from "./money.ts";

// The boost form's fields as a person types them, and the boost they make
// once nothing is missing. The server checks everything again, and more
// (how long the run is, the ceiling, the account): `quoteBoost` says so
// before anything is spent.

/** The boost form, as typed. */
export interface BoostDraft {
  /** The ad account's id; empty until one is chosen. */
  readonly accountId: string;
  readonly ageMax: string;
  readonly ageMin: string;
  /** The budget, in the currency's units: "50" or "50.00". */
  readonly amount: string;
  /** Who benefits from the ad, asked for an audience in the EU. */
  readonly beneficiary: string;
  /** ISO 3166-1 alpha-2 codes in capitals, between commas or spaces. */
  readonly countries: string;
  /**
   * Whether the person declared the ad is of no special category. Peal
   * boosts nothing else.
   */
  readonly declared: boolean;
  /** The last day of the run, `YYYY-MM-DD`, on the account's calendar. */
  readonly endDate: string;
  readonly kind: "daily" | "total";
  /** Who pays for the ad, asked for an audience in the EU. */
  readonly payer: string;
  /** The first day of the run; empty to start now. */
  readonly startDate: string;
}

export const emptyBoostDraft: BoostDraft = {
  accountId: "",
  ageMax: String(maxBoostAge),
  ageMin: String(minBoostAge),
  amount: "",
  beneficiary: "",
  countries: "",
  declared: false,
  endDate: "",
  kind: "total",
  payer: "",
  startDate: "",
};

/** What keeps a draft from being a boost, by field. */
export const BoostProblemSchema = Schema.Literals([
  "account",
  "amount",
  "start",
  "end",
  "endBeforeStart",
  "countries",
  "ages",
  "beneficiary",
  "payer",
  "declaration",
]);

export type BoostProblem = typeof BoostProblemSchema.Type;

// The 27 member states of the European Union, where an ad says who
// benefits from it and who pays for it.
const euCountries: ReadonlySet<string> = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
]);

const countryCode = /^[A-Z]{2}$/u;

const written = (text: string): readonly string[] =>
  text.split(/[\s,;]+/u).filter((code) => code !== "");

/**
 * The countries a field names: codes of two capital letters, each once,
 * 25 at most. None when it names none, or anything else.
 */
export const parseCountries = (
  text: string
): Option.Option<readonly string[]> => {
  const codes = written(text);

  return codes.length > 0 &&
    codes.length <= maxBoostCountries &&
    codes.every((code) => countryCode.test(code)) &&
    new Set(codes).size === codes.length
    ? Option.some(codes)
    : Option.none();
};

/**
 * Whether the field names a country of the European Union, as typed so
 * far: the form then asks who benefits from the ad and who pays for it.
 */
export const targetsEu = (text: string): boolean =>
  written(text).some((code) => euCountries.has(code));

const age = /^\d{2}$/u;

const parseAge = (text: string): Option.Option<number> =>
  Option.some(text.trim()).pipe(
    Option.filter((value) => age.test(value)),
    Option.map(Number),
    Option.filter((years) => years >= minBoostAge && years <= maxBoostAge)
  );

const decodeDateKey = Schema.decodeUnknownOption(DateKeySchema);

const parseDay = (text: string): Option.Option<CalendarDate> =>
  decodeDateKey(text).pipe(Option.flatMap(parseDate));

const isParty = (text: string): boolean =>
  text.trim() !== "" && text.trim().length <= maxBoostPartyLength;

/** What a draft becomes a boost of. */
export interface BoostContext {
  /** The ad account chosen, when the draft's id is one of the workspace's. */
  readonly account: AdAccount | undefined;
  readonly channelId: string;
  readonly postId: string;
  /** The day it is on the account's calendar. */
  readonly today: CalendarDate;
}

/** A draft, checked: the boost it asks for, or what it lacks. */
export interface CheckedBoost {
  readonly boost: Option.Option<NewBoost>;
  readonly problems: readonly BoostProblem[];
}

interface Run {
  /** None to start now. */
  readonly startsAt: Option.Option<DateTime.Utc>;
  readonly endsAt: Option.Option<DateTime.Utc>;
  readonly problems: readonly BoostProblem[];
}

// The run's instants: its first day from midnight, unless that is today,
// when it starts now, and its last day to its last minute, both on the
// account's calendar.
const runOf = (draft: BoostDraft, today: CalendarDate, zone: string): Run => {
  const start = parseDay(draft.startDate);
  const end = parseDay(draft.endDate);
  const todayKey = dateKey(today);
  const startKey = start.pipe(Option.map(dateKey));
  const firstDay = Option.getOrElse(startKey, () => todayKey);

  const startProblem =
    draft.startDate !== "" &&
    !Option.exists(startKey, (key) => key >= todayKey);

  const endsEarly =
    !startProblem && Option.exists(end, (date) => dateKey(date) <= firstDay);

  const problems: BoostProblem[] = [];

  if (startProblem) {
    problems.push("start");
  }

  if (Option.isNone(end)) {
    problems.push("end");
  }

  if (endsEarly) {
    problems.push("endBeforeStart");
  }

  return {
    endsAt: end.pipe(
      Option.flatMap((date) =>
        instantOf({ date, time: { hour: 23, minute: 59 } }, zone)
      )
    ),
    problems,
    startsAt: start.pipe(
      Option.filter((date) => dateKey(date) > todayKey),
      Option.flatMap((date) =>
        instantOf({ date, time: { hour: 0, minute: 0 } }, zone)
      )
    ),
  };
};

// What the audience lacks: countries, ages, and in the EU who benefits
// and who pays.
const audienceProblems = (draft: BoostDraft): readonly BoostProblem[] => {
  const ageMin = parseAge(draft.ageMin);
  const ageMax = parseAge(draft.ageMax);
  const problems: BoostProblem[] = [];

  if (Option.isNone(parseCountries(draft.countries))) {
    problems.push("countries");
  }

  if (
    !Option.exists(
      Option.all({ ageMax, ageMin }),
      (ages) => ages.ageMin <= ages.ageMax
    )
  ) {
    problems.push("ages");
  }

  if (targetsEu(draft.countries) && !isParty(draft.beneficiary)) {
    problems.push("beneficiary");
  }

  if (targetsEu(draft.countries) && !isParty(draft.payer)) {
    problems.push("payer");
  }

  return problems;
};

/**
 * Checks a draft: the boost it asks for when nothing is missing, and
 * otherwise each field at fault. The special category is `none` only once
 * the person declared it: an undeclared draft is never sent.
 */
export const checkBoost = (
  draft: BoostDraft,
  { account, channelId, postId, today }: BoostContext
): CheckedBoost => {
  if (account === undefined) {
    return { boost: Option.none(), problems: ["account"] };
  }

  const amount = parseAmount(draft.amount, account.minorUnitDigits).pipe(
    Option.filter((minor) => minor > 0)
  );

  const run = runOf(draft, today, account.timeZone);

  const problems: BoostProblem[] = [];

  if (Option.isNone(amount)) {
    problems.push("amount");
  }

  problems.push(...run.problems, ...audienceProblems(draft));

  if (!draft.declared) {
    problems.push("declaration");
  }

  const parties = targetsEu(draft.countries)
    ? { beneficiary: draft.beneficiary.trim(), payer: draft.payer.trim() }
    : {};

  const starts = Option.match(run.startsAt, {
    onNone: () => ({}),
    onSome: (startsAt) => ({ startsAt }),
  });

  const boost = Option.all({
    ageMax: parseAge(draft.ageMax),
    ageMin: parseAge(draft.ageMin),
    amount,
    countries: parseCountries(draft.countries),
    endsAt: run.endsAt,
  }).pipe(
    Option.filter(() => problems.length === 0),
    Option.map((fields): NewBoost => ({
      accountId: account.id,
      audience: {
        ageMax: fields.ageMax,
        ageMin: fields.ageMin,
        countries: fields.countries,
      },
      budget: { amount: fields.amount, kind: draft.kind },
      channelId,
      currency: account.currency,
      endsAt: fields.endsAt,
      postId,
      specialAdCategory: "none",
      ...parties,
      ...starts,
    }))
  );

  return { boost, problems };
};
