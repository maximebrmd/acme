import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { RecyclingRule } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import {
  RepeatsLineView,
  RuleItemView,
} from "#components/recycling/recycling-views.tsx";
import { loadMessages } from "#i18n/messages.ts";
import {
  freshRepeat,
  isResumable,
  keyedTexts,
  ruleOfSource,
  ruleRequestOf,
} from "#recycling/rules.ts";

// Repeating posts in the web app: the request the form sends, and how a
// rule reads, in both languages.

const at = (iso: string) => DateTime.makeUnsafe(iso);

const rule: RecyclingRule = {
  anchorAt: at("2026-06-15T07:00:00Z"),
  coming: [
    { at: at("2026-06-29T07:00:00Z"), occurrence: 3, variant: 1 },
    { at: at("2026-07-13T07:00:00Z"), occurrence: 4, variant: null },
  ],
  count: 10,
  createdAt: at("2026-06-15T07:00:00Z"),
  endedReason: null,
  every: { count: 2, unit: "weeks" },
  id: "0190f3a0-0000-7000-8000-00000000ec01",
  lastDueAt: at("2026-06-15T07:00:00Z"),
  made: 2,
  nextDueAt: at("2026-06-29T07:00:00Z"),
  queueId: null,
  sourcePostId: "0190f3a0-0000-7000-8000-00000000d002",
  startedBy: null,
  startedVia: { id: null, name: null, via: "web" },
  status: "active",
  timeZone: "Europe/Paris",
  until: null,
  variants: [{ overrides: [], text: "Open all summer, as before." }],
};

const render = async (locale: "en" | "fr", node: React.ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      {node}
    </NextIntlClientProvider>
  );

describe("the repeat form's request", () => {
  it("asks for what the form holds, and nothing it leaves empty", () => {
    expect(ruleRequestOf("post", freshRepeat)).toStrictEqual(
      Option.some({
        count: 3,
        every: { count: 1, unit: "weeks" },
        postId: "post",
      })
    );
    expect(
      ruleRequestOf("post", {
        ...freshRepeat,
        ending: "until",
        every: 99,
        unit: "months",
        until: "2026-12-31",
        variants: [
          { key: 1, text: "  Another way  " },
          { key: 2, text: " " },
        ],
      })
    ).toStrictEqual(
      Option.some({
        every: { count: 12, unit: "months" },
        postId: "post",
        until: "2026-12-31",
        variants: [{ text: "Another way" }],
      })
    );
  });

  it("asks for nothing when the date it ends on is left empty", () => {
    expect(
      ruleRequestOf("post", { ...freshRepeat, ending: "until", until: "" })
    ).toStrictEqual(Option.none());
  });

  it("finds the rule going on for a post, and which may resume", () => {
    const ended = {
      ...rule,
      endedReason: "planLimit",
      status: "ended",
    } as const;

    expect(ruleOfSource([rule], rule.sourcePostId)).toBe(rule);
    expect(ruleOfSource([ended], rule.sourcePostId)).toBeUndefined();
    expect([isResumable(ended), isResumable(rule)]).toStrictEqual([
      true,
      false,
    ]);
    expect(keyedTexts(["a", "a"]).map(({ key }) => key)).toStrictEqual([
      "0:a",
      "1:a",
    ]);
  });
});

describe("a rule as the app shows it", () => {
  it("says how often, how far and what comes next, in English and French", async () => {
    const view = (
      <ul>
        <RuleItemView actions={null} rule={rule} source="source" />
      </ul>
    );

    const english = await render("en", view);
    const french = await render("fr", view);

    expect(english).toContain("Every 2 weeks");
    expect(english).toContain("2 of 10");
    expect(english).toContain(", with variant 1");
    expect(french).toContain("Toutes les 2 semaines");
    expect(french).toContain("Prochaines occurrences");
  });

  it("names why a rule ended, and the line a post it made shows", async () => {
    const ended = await render(
      "fr",
      <ul>
        <RuleItemView
          actions={null}
          rule={{ ...rule, endedReason: "queueGone", status: "ended" }}
          source="source"
        />
      </ul>
    );

    const line = await render(
      "en",
      <RepeatsLineView link="link" rule={rule} />
    );

    expect(ended).toContain(
      "Règle terminée : sa file d’attente a été supprimée."
    );
    expect(line).toContain("Repeats: Every 2 weeks, 2 of 10");
  });
});
