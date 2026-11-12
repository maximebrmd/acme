import { Option, Schema } from "effect";
import type {
  NewRecyclingRule,
  RecyclingInterval,
  RecyclingRule,
  RecyclingUnit,
} from "peal-contract";
import { maxRecyclingInterval } from "peal-contract";

// What the repeat form holds, and the rule it asks for: plain values the
// views and the tests read without the API.

/** How a rule ends, as the form asks it. */
export const EndingChoiceSchema = Schema.Literals(["count", "until", "never"]);

export type EndingChoice = typeof EndingChoiceSchema.Type;

/** A variant being written, under a key of its own while it is. */
export interface DraftVariant {
  readonly key: number;
  readonly text: string;
}

/** What the repeat form holds while it is written. */
export interface RepeatDraft {
  readonly count: number;
  readonly ending: EndingChoice;
  readonly every: number;
  /** A queue's id, or "" for the post's own time each interval. */
  readonly queueId: string;
  readonly unit: RecyclingUnit;
  readonly until: string;
  readonly variants: readonly DraftVariant[];
}

/** A weekly rule, three posts in all, no variant. */
export const freshRepeat: RepeatDraft = {
  count: 3,
  ending: "count",
  every: 1,
  queueId: "",
  unit: "weeks",
  until: "",
  variants: [],
};

/** The interval, kept within what its unit allows. */
export const intervalOf = ({
  every,
  unit,
}: RepeatDraft): RecyclingInterval => ({
  count: Math.min(Math.max(Math.round(every), 1), maxRecyclingInterval[unit]),
  unit,
});

// The fields a value gives, or none.
const given = <A, B extends object>(
  value: Option.Option<A>,
  fields: (present: A) => B
) => Option.match(value, { onNone: () => ({}), onSome: fields });

/**
 * The rule the form asks the server to start on the post; none while it is
 * to end on a date left empty, which would start a rule with no ending.
 */
export const ruleRequestOf = (
  postId: string,
  draft: RepeatDraft
): Option.Option<NewRecyclingRule> => {
  if (draft.ending === "until" && draft.until === "") {
    return Option.none();
  }

  const variants = draft.variants
    .map(({ text }) => text.trim())
    .filter((text) => text !== "")
    .map((text) => ({ text }));

  const request: NewRecyclingRule = {
    every: intervalOf(draft),
    postId,
    ...given(
      Option.some(draft.count).pipe(
        Option.filter(() => draft.ending === "count")
      ),
      (count) => ({ count })
    ),
    ...given(
      Option.some(draft.until).pipe(
        Option.filter((day) => draft.ending === "until" && day !== "")
      ),
      (until) => ({ until })
    ),
    ...given(
      Option.some(draft.queueId).pipe(Option.filter((id) => id !== "")),
      (queueId) => ({ queueId })
    ),
    ...given(
      Option.some(variants).pipe(Option.filter((kept) => kept.length > 0)),
      (kept) => ({ variants: kept })
    ),
  };

  return Option.some(request);
};

/** The rule that repeats the post and goes on, if one does. */
export const ruleOfSource = (
  rules: readonly RecyclingRule[],
  postId: string
): RecyclingRule | undefined =>
  rules.find(
    ({ sourcePostId, status }) => sourcePostId === postId && status !== "ended"
  );

/** Whether the rule can be resumed, as the server decides it. */
export const isResumable = ({ endedReason, status }: RecyclingRule): boolean =>
  status === "paused" ||
  (status === "ended" &&
    (endedReason === "planLimit" ||
      endedReason === "contentRejected" ||
      endedReason === "noChannels" ||
      endedReason === "queueFull" ||
      endedReason === "sourceWithdrawn"));

/** A key no variant of the draft has yet. */
export const nextVariantKey = ({ variants }: RepeatDraft): number => {
  let highest = 0;

  for (const { key } of variants) {
    highest = Math.max(highest, key);
  }

  return highest + 1;
};

/**
 * Texts with a key each for a list: the text, and how many times it came
 * before, so two equal variants keep apart.
 */
export const keyedTexts = (
  texts: readonly string[]
): readonly { readonly key: string; readonly text: string }[] => {
  const seen = new Map<string, number>();

  return texts.map((text) => {
    const before = seen.get(text) ?? 0;

    seen.set(text, before + 1);

    return { key: `${String(before)}:${text}`, text };
  });
};
