import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { dueAt, nextDueAfter } from "#publishing/domain/recycling-interval.ts";
import type { RecyclingInterval } from "#publishing/domain/recycling-interval.ts";
import { RecyclingRuleIdSchema } from "#publishing/domain/recycling-rule-id.ts";
import {
  comingDue,
  editRule,
  endRule,
  isDue,
  maxOccurrences,
  occurrenceMade,
  pauseRule,
  plannedAt,
  resumeRule,
  startRule,
  variantFor,
} from "#publishing/domain/recycling-rule.ts";
import type {
  NewRecyclingRule,
  RecyclingRule,
} from "#publishing/domain/recycling-rule.ts";
import { RecyclingVariant } from "#publishing/domain/recycling-variant.ts";
import { PostIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

const paris = TimeZoneIdSchema.make("Europe/Paris");
const utc = (text: string) => DateTime.makeUnsafe(text);

const iso = (instant: DateTime.Utc) => DateTime.formatIso(instant);

const days = (count: number): RecyclingInterval => ({ count, unit: "days" });
const weeks = (count: number): RecyclingInterval => ({ count, unit: "weeks" });

const months = (count: number): RecyclingInterval => ({
  count,
  unit: "months",
});

const steps = (
  interval: RecyclingInterval,
  anchor: string,
  count: number
): readonly string[] =>
  Array.from({ length: count }, (_, index) =>
    iso(dueAt(interval, utc(anchor), paris, index + 1))
  );

const newRule = (more: Partial<NewRecyclingRule> = {}): NewRecyclingRule => ({
  anchorAt: utc("2026-06-15T07:00:00Z"),
  count: Option.none(),
  id: RecyclingRuleIdSchema.make("00000000-0000-7000-8000-000000000001"),
  interval: weeks(1),
  queueId: Option.none(),
  sourcePostId: PostIdSchema.make("00000000-0000-7000-8000-000000000002"),
  startedBy: Option.none(),
  startedVia: { _tag: "web" },
  timeZone: paris,
  until: Option.none(),
  variants: [],
  workspaceId: WorkspaceIdSchema.make("5b0d3c1e-8f2a-4c6b-9d7e-1a2b3c4d5e6f"),
  ...more,
});

const started = (
  more: Partial<NewRecyclingRule> = {},
  now = "2026-06-15T08:00:00Z"
): RecyclingRule => Result.getOrThrow(startRule(newRule(more), utc(now)));

const variant = (text: string) => new RecyclingVariant({ overrides: [], text });

describe("a rule's due instants", () => {
  it("keep the wall-clock time in the zone across a clock change", () => {
    // 09:00 in Paris, the week before summer time and after it.
    expect(steps(weeks(1), "2026-03-23T08:00:00Z", 2)).toStrictEqual([
      "2026-03-30T07:00:00.000Z",
      "2026-04-06T07:00:00.000Z",
    ]);
  });

  it("count days and weeks", () => {
    expect(steps(days(3), "2026-06-15T07:00:00Z", 2)).toStrictEqual([
      "2026-06-18T07:00:00.000Z",
      "2026-06-21T07:00:00.000Z",
    ]);
    expect(steps(weeks(2), "2026-06-15T07:00:00Z", 1)).toStrictEqual([
      "2026-06-29T07:00:00.000Z",
    ]);
  });

  it("take a shorter month's last day, counted from the anchor", () => {
    // 31 January, 10:00 in Paris: 28 February, then 31 March.
    expect(steps(months(1), "2026-01-31T09:00:00Z", 3)).toStrictEqual([
      "2026-02-28T09:00:00.000Z",
      "2026-03-31T08:00:00.000Z",
      "2026-04-30T08:00:00.000Z",
    ]);
  });

  it("land a leap day on the last of February in other years", () => {
    expect(steps(months(12), "2028-02-29T09:00:00Z", 2)).toStrictEqual([
      "2029-02-28T09:00:00.000Z",
      "2030-02-28T09:00:00.000Z",
    ]);
  });

  it("move a time daylight saving skips to the moment the clocks jump", () => {
    // 02:30 in Paris on 22 March, a week later the clocks jump at 02:00.
    expect(steps(weeks(1), "2026-03-22T01:30:00Z", 1)).toStrictEqual([
      "2026-03-29T01:00:00.000Z",
    ]);
  });

  it("skip the intervals missed, to the first after the instant", () => {
    const anchor = utc("2026-06-15T07:00:00Z");

    expect(
      iso(nextDueAfter(weeks(1), anchor, paris, utc("2026-07-08T12:00:00Z")))
    ).toBe("2026-07-13T07:00:00.000Z");
    expect(
      iso(nextDueAfter(weeks(1), anchor, paris, utc("2026-06-22T07:00:00Z")))
    ).toBe("2026-06-29T07:00:00.000Z");
    expect(
      iso(nextDueAfter(months(1), anchor, paris, utc("2027-01-01T00:00:00Z")))
    ).toBe("2027-01-15T08:00:00.000Z");
    // A source still to come: one interval after it.
    expect(
      iso(nextDueAfter(days(1), anchor, paris, utc("2026-06-01T00:00:00Z")))
    ).toBe("2026-06-16T07:00:00.000Z");
  });
});

describe("a recycling rule", () => {
  it("starts with its source as the first occurrence, the next an interval after it", () => {
    const rule = started();

    expect(rule.made).toBe(1);
    expect(rule.status._tag).toBe("active");
    expect(rule.nextDueAt.pipe(Option.map((at) => iso(at)))).toStrictEqual(
      Option.some("2026-06-22T07:00:00.000Z")
    );
    expect(iso(rule.lastDueAt)).toBe("2026-06-15T07:00:00.000Z");
  });

  it("starts from now on a source published long ago", () => {
    const rule = started({}, "2026-09-02T10:00:00Z");

    expect(rule.nextDueAt.pipe(Option.map((at) => iso(at)))).toStrictEqual(
      Option.some("2026-09-07T07:00:00.000Z")
    );
  });

  it("refuses an ending that leaves nothing to make", () => {
    const ending = startRule(
      newRule({ until: Option.some({ day: 20, month: 6, year: 2026 }) }),
      utc("2026-06-15T08:00:00Z")
    );

    expect(Result.isFailure(ending)).toBeTruthy();
  });

  it("is due once its latest occurrence's time has passed", () => {
    const rule = started({}, "2026-06-15T06:00:00Z");

    expect(isDue(rule, utc("2026-06-15T06:59:00Z"))).toBeFalsy();
    expect(isDue(rule, utc("2026-06-15T07:00:00Z"))).toBeTruthy();
    expect(
      isDue(
        Result.getOrThrow(pauseRule(rule, utc("2026-06-15T07:00:00Z"))),
        utc("2026-06-16T00:00:00Z")
      )
    ).toBeFalsy();
  });

  it("plans a missed occurrence at the next due instant after now", () => {
    const rule = started();

    expect(iso(plannedAt(rule, utc("2026-06-20T00:00:00Z")))).toBe(
      "2026-06-22T07:00:00.000Z"
    );
    expect(iso(plannedAt(rule, utc("2026-07-01T00:00:00Z")))).toBe(
      "2026-07-06T07:00:00.000Z"
    );
  });

  it("takes turns with its variants, then the source's text again", () => {
    const rule = started({ variants: [variant("Second"), variant("Third")] });

    expect(
      [1, 2, 3, 4, 5].map(
        (number) => Option.getOrNull(variantFor(rule, number))?.text ?? null
      )
    ).toStrictEqual([null, "Second", "Third", null, "Second"]);
  });

  it("counts each occurrence and ends completed after its count", () => {
    const rule = started({ count: Option.some(3) });
    const now = utc("2026-06-15T08:00:00Z");

    const second = occurrenceMade(
      rule,
      utc("2026-06-22T07:00:00Z"),
      utc("2026-06-22T07:30:00Z"),
      now
    );

    expect(second.made).toBe(2);
    expect(iso(second.lastDueAt)).toBe("2026-06-22T07:30:00.000Z");
    expect(second.nextDueAt.pipe(Option.map((at) => iso(at)))).toStrictEqual(
      Option.some("2026-06-29T07:00:00.000Z")
    );

    const third = occurrenceMade(
      second,
      utc("2026-06-29T07:00:00Z"),
      utc("2026-06-29T07:00:00Z"),
      now
    );

    expect([third.made, third.status]).toStrictEqual([
      3,
      {
        _tag: "ended",
        endedAt: now,
        reason: "completed",
      },
    ]);
    expect(Option.isNone(third.nextDueAt)).toBeTruthy();
  });

  it("ends completed once the next would come after its date", () => {
    const rule = started({
      until: Option.some({ day: 25, month: 6, year: 2026 }),
    });

    const second = occurrenceMade(
      rule,
      utc("2026-06-22T07:00:00Z"),
      utc("2026-06-22T07:00:00Z"),
      utc("2026-06-15T08:00:00Z")
    );

    expect(second.status._tag).toBe("ended");
  });

  it("stops at the ceiling with no ending", () => {
    let rule = started({ interval: days(1) });

    while (rule.status._tag === "active") {
      rule = occurrenceMade(
        rule,
        Option.getOrThrow(rule.nextDueAt),
        Option.getOrThrow(rule.nextDueAt),
        utc("2026-06-15T08:00:00Z")
      );
    }

    expect(rule.made).toBe(maxOccurrences);
  });

  it("lists its next due instants within its ending", () => {
    const rule = started({ count: Option.some(3) });

    expect(
      comingDue(rule, utc("2026-06-15T08:00:00Z"), 3).map(
        ({ at, occurrence }) => [iso(at), occurrence]
      )
    ).toStrictEqual([
      ["2026-06-22T07:00:00.000Z", 2],
      ["2026-06-29T07:00:00.000Z", 3],
    ]);
  });

  it("resumes after a reason a member can put right, and counts it", () => {
    const rule = started();
    const ended = endRule(rule, "planLimit", utc("2026-06-22T07:00:00Z"));

    const resumed = Result.getOrThrow(
      resumeRule(ended, utc("2026-07-01T00:00:00Z"))
    );

    expect(resumed.status._tag).toBe("active");
    expect(resumed.resumptions).toBe(1);
    expect(resumed.nextDueAt.pipe(Option.map((at) => iso(at)))).toStrictEqual(
      Option.some("2026-07-06T07:00:00.000Z")
    );
    expect(
      Result.isFailure(
        resumeRule(
          endRule(rule, "starterGone", utc("2026-06-22T07:00:00Z")),
          utc("2026-07-01T00:00:00Z")
        )
      )
    ).toBeTruthy();
  });

  it("resumes a paused rule at the instant it planned, while it is still to come", () => {
    const rule = started();

    const paused = Result.getOrThrow(
      pauseRule(rule, utc("2026-06-16T00:00:00Z"))
    );

    const resumed = Result.getOrThrow(
      resumeRule(paused, utc("2026-06-17T00:00:00Z"))
    );

    expect(resumed.nextDueAt.pipe(Option.map((at) => iso(at)))).toStrictEqual(
      Option.some("2026-06-22T07:00:00.000Z")
    );
    expect(resumed.resumptions).toBe(0);
  });

  it("changes no more once ended, and keeps an ending that leaves the next", () => {
    const rule = started();

    expect(
      Result.isFailure(
        editRule(endRule(rule, "stopped", utc("2026-06-16T00:00:00Z")), {
          variants: [],
        })
      )
    ).toBeTruthy();
    expect(
      Result.isFailure(
        editRule(rule, {
          until: Option.some({ day: 16, month: 6, year: 2026 }),
        })
      )
    ).toBeTruthy();
    expect(
      Result.getOrThrow(editRule(rule, { variants: [variant("Again")] }))
        .variants
    ).toHaveLength(1);
  });

  it("stays as it ended when ended again", () => {
    const ended = endRule(started(), "stopped", utc("2026-06-16T00:00:00Z"));

    expect(endRule(ended, "sourceGone", utc("2026-06-17T00:00:00Z"))).toBe(
      ended
    );
  });
});
