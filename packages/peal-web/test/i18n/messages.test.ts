import { describe, expect, it } from "@effect/vitest";
import { Predicate } from "effect";
import {
  AttemptResultSchema,
  FailureReasonSchema,
  UnconfirmedReasonSchema,
} from "peal-contract";

import { loadMessages } from "#i18n/messages.ts";
import { routing } from "#i18n/routing.ts";

interface Catalogue {
  readonly [key: string]: string | Catalogue;
}

// Every message as a [dotted key, text] pair.
const entries = (catalogue: Catalogue, prefix = ""): [string, string][] =>
  Object.entries(catalogue).flatMap(([key, value]): [string, string][] =>
    Predicate.isString(value)
      ? [[`${prefix}${key}`, value]]
      : entries(value, `${prefix}${key}.`)
  );

describe("message catalogues", () => {
  it.each(routing.locales)(
    "%s has every English key and no other",
    async (locale) => {
      const english = entries(await loadMessages(routing.defaultLocale));
      const translated = entries(await loadMessages(locale));

      expect(translated.map(([key]) => key).toSorted()).toStrictEqual(
        english.map(([key]) => key).toSorted()
      );
    }
  );

  it.each(routing.locales)("%s has no empty message", async (locale) => {
    const empty = entries(await loadMessages(locale)).filter(
      ([, text]) => text.trim() === ""
    );

    expect(empty).toStrictEqual([]);
  });

  // A reason a select leaves out reads as its raw code, as `other` does.
  it.each(routing.locales)(
    "%s names every reason a post can end with",
    async (locale) => {
      const messages = new Map(entries(await loadMessages(locale)));

      const missing = (key: string, cases: readonly string[]) =>
        cases.flatMap((name) =>
          (messages.get(key) ?? "").includes(` ${name} {`)
            ? []
            : [`${key}: ${name}`]
        );

      expect([
        ...missing("Notices.reason", FailureReasonSchema.literals),
        ...missing("PostDetail.result", AttemptResultSchema.literals),
        ...missing("Staff.reason", [
          ...FailureReasonSchema.literals,
          ...UnconfirmedReasonSchema.literals,
        ]),
      ]).toStrictEqual([]);
    }
  );
});
