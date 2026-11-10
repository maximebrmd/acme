import { Schema } from "effect";

import type { FieldNotes } from "./field-description.ts";
import type { LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { invalid, missing } from "./option-problem.ts";
import type { OptionProblem } from "./option-problem.ts";
import { PostTextSchema } from "./post-text.ts";
import { measureText } from "./text-length.ts";

// A local post of the My Business API v4 (accounts.locations.localPosts):
// its `topicType`, the `event` an event or an offer is given (a title and a
// schedule), its `callToAction` (an action type and the address it opens)
// and the `offer` of an offer (a coupon code, an address to redeem it at,
// terms and conditions). The post's `summary` is its text on the channel.

/**
 * What kind of post it is: Google's `topicType`. An `event` has a title and
 * dates; an `offer` has them too, and may add a coupon code, an address to
 * redeem it at and terms. Google's fourth type, the alert, is not offered:
 * it is "not always available for authoring".
 */
export const GoogleBusinessPostTypeSchema = Schema.Literals([
  "standard",
  "event",
  "offer",
]);

export type GoogleBusinessPostType = typeof GoogleBusinessPostTypeSchema.Type;

/** The post type of options that name none. */
export const defaultGoogleBusinessPostType: GoogleBusinessPostType = "standard";

/**
 * The button under the post: Google's `actionType`. Every one opens
 * `callToActionUrl`, but `call`, which rings the location's own number.
 */
export const GoogleBusinessCallToActionSchema = Schema.Literals([
  "book",
  "order",
  "shop",
  "learnMore",
  "signUp",
  "call",
]);

export type GoogleBusinessCallToAction =
  typeof GoogleBusinessCallToActionSchema.Type;

/**
 * The longest title of an event or an offer, in characters: the figure
 * commonly reported for Google's editor. Google's own pages name none: not
 * the localPosts reference (`LocalPostEvent.title`, "Name of the event"),
 * nor Business Profile Help's page on posts, as read in November 2026. A
 * title Google finds too long fails the post with Google's own refusal.
 */
export const maxGoogleBusinessTitleLength = 58;

/**
 * A day and a time on the location's own clock, to the minute, as
 * `2026-11-27T09:00`: Google takes an event's dates without a time zone.
 */
export const googleBusinessLocalTimePattern =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hours>\d{2}):(?<minutes>\d{2})$/u;

/** A day and a time, as Google's `Date` and `TimeOfDay` take them. */
export interface GoogleBusinessLocalTime {
  readonly day: number;
  readonly hours: number;
  readonly minutes: number;
  readonly month: number;
  readonly year: number;
}

const daysIn = (year: number, month: number): number => {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

    return leap ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

/** The day and time a text names, if it names a real one. */
export const googleBusinessLocalTimeOf = (
  text: string
): GoogleBusinessLocalTime | undefined => {
  const groups = googleBusinessLocalTimePattern.exec(text)?.groups;

  if (groups === undefined) {
    return undefined;
  }

  const time: GoogleBusinessLocalTime = {
    day: Number(groups["day"]),
    hours: Number(groups["hours"]),
    minutes: Number(groups["minutes"]),
    month: Number(groups["month"]),
    year: Number(groups["year"]),
  };

  const real =
    time.year >= 1 &&
    time.month >= 1 &&
    time.month <= 12 &&
    time.day >= 1 &&
    time.day <= daysIn(time.year, time.month) &&
    time.hours <= 23 &&
    time.minutes <= 59;

  return real ? time : undefined;
};

// The post types with an event's title and dates.
const scheduledTypes: readonly GoogleBusinessPostType[] = ["event", "offer"];

// The post types that show a button: Google ignores it on an offer, which
// has its own.
const buttonTypes: readonly GoogleBusinessPostType[] = ["standard", "event"];

const offerTypes: readonly GoogleBusinessPostType[] = ["offer"];

// The buttons that open an address.
const linkingActions: readonly GoogleBusinessCallToAction[] = [
  "book",
  "order",
  "shop",
  "learnMore",
  "signUp",
];

const isBlank = (text: string | undefined): text is undefined =>
  text === undefined || text.trim() === "";

/** Whether the text is an address a browser opens: http or https. */
export const isGoogleBusinessLink = (text: string): boolean => {
  if (!URL.canParse(text)) {
    return false;
  }

  const { hostname, protocol } = new URL(text);

  return (protocol === "https:" || protocol === "http:") && hostname !== "";
};

const scheduleFields = ["title", "startsAt", "endsAt"] as const;

const offerFields = ["couponCode", "redeemUrl", "terms"] as const;

// The title and dates of an event or an offer: all three needed, real
// dates, the end after the start.
const scheduleProblems = (
  options: GoogleBusinessOptions
): readonly OptionProblem<GoogleBusinessField>[] => {
  const start = googleBusinessLocalTimeOf(options.startsAt ?? "");
  const end = googleBusinessLocalTimeOf(options.endsAt ?? "");
  const length = measureText(options.title ?? "", "codePoints");

  return [
    ...scheduleFields.flatMap((field) =>
      isBlank(options[field]) ? [missing(field)] : []
    ),
    ...(length > maxGoogleBusinessTitleLength
      ? [
          {
            _tag: "tooLong" as const,
            field: "title" as const,
            length,
            maximum: maxGoogleBusinessTitleLength,
          },
        ]
      : []),
    ...(!isBlank(options.startsAt) && start === undefined
      ? [invalid("startsAt")]
      : []),
    ...(!isBlank(options.endsAt) && end === undefined
      ? [invalid("endsAt")]
      : []),
    // Both texts have the same shape, so they sort as their times do.
    ...(start !== undefined &&
    end !== undefined &&
    (options.endsAt ?? "") <= (options.startsAt ?? "")
      ? [invalid("endsAt")]
      : []),
  ];
};

const buttonProblems = (
  options: GoogleBusinessOptions,
  type: GoogleBusinessPostType
): readonly OptionProblem<GoogleBusinessField>[] => {
  const { callToAction, callToActionUrl } = options;

  if (callToAction === undefined) {
    return callToActionUrl === undefined ? [] : [invalid("callToActionUrl")];
  }

  if (!buttonTypes.includes(type)) {
    return [invalid("callToAction")];
  }

  if (!linkingActions.includes(callToAction)) {
    return callToActionUrl === undefined ? [] : [invalid("callToActionUrl")];
  }

  if (isBlank(callToActionUrl)) {
    return [missing("callToActionUrl")];
  }

  return isGoogleBusinessLink(callToActionUrl)
    ? []
    : [invalid("callToActionUrl")];
};

// What Google would refuse in a target's options.
const googleBusinessProblems = (
  options: GoogleBusinessOptions
): readonly OptionProblem<GoogleBusinessField>[] => {
  const type = options.postType ?? defaultGoogleBusinessPostType;

  return [
    ...(scheduledTypes.includes(type)
      ? scheduleProblems(options)
      : scheduleFields.flatMap((field) =>
          options[field] === undefined ? [] : [invalid(field)]
        )),
    ...buttonProblems(options, type),
    ...(offerTypes.includes(type)
      ? []
      : offerFields.flatMap((field) =>
          options[field] === undefined ? [] : [invalid(field)]
        )),
    ...(offerTypes.includes(type) &&
    options.redeemUrl !== undefined &&
    !isGoogleBusinessLink(options.redeemUrl)
      ? [invalid("redeemUrl")]
      : []),
  ];
};

/**
 * How a post goes out on a Google Business Profile location. A draft may
 * lack any of them. Left out, `postType` is `standard`: the text, photos
 * and, with `callToAction`, a button. An `event` or an `offer` needs
 * `title`, `startsAt` and `endsAt`, on the location's own clock; only an
 * offer takes `couponCode`, `redeemUrl` and `terms`, and it shows Google's
 * own button, never `callToAction`.
 */
export class GoogleBusinessOptions extends Schema.Class<GoogleBusinessOptions>(
  "peal-server/publishing/domain/GoogleBusinessOptions"
)({
  callToAction: Schema.optionalKey(GoogleBusinessCallToActionSchema),
  // The address the button opens: none for `call`.
  callToActionUrl: Schema.optionalKey(PostTextSchema),
  couponCode: Schema.optionalKey(PostTextSchema),
  // `2026-11-27T18:00`, after `startsAt`.
  endsAt: Schema.optionalKey(PostTextSchema),
  platform: Schema.tag("googleBusiness"),
  postType: Schema.optionalKey(GoogleBusinessPostTypeSchema),
  // Where the offer is redeemed online.
  redeemUrl: Schema.optionalKey(PostTextSchema),
  // `2026-11-27T09:00`.
  startsAt: Schema.optionalKey(PostTextSchema),
  // The offer's terms and conditions.
  terms: Schema.optionalKey(PostTextSchema),
  // The event's or the offer's name.
  title: Schema.optionalKey(PostTextSchema),
}) {
  /**
   * What the fields' schemas do not say, for the description clients read
   * (`optionFieldsOn`): every field has an entry.
   */
  static readonly notes: Readonly<
    Record<GoogleBusinessField, FieldNotes<LookupName>>
  > = {
    callToAction: {},
    callToActionUrl: {},
    couponCode: {},
    endsAt: { pattern: googleBusinessLocalTimePattern.source },
    postType: { ifLeftOut: defaultGoogleBusinessPostType },
    redeemUrl: {},
    startsAt: { pattern: googleBusinessLocalTimePattern.source },
    terms: {},
    title: { maxLength: maxGoogleBusinessTitleLength },
  };

  /**
   * The rules between options that `problems` applies. A `postType` left
   * out counts as `standard`.
   */
  static readonly constraints: readonly OptionConstraint<GoogleBusinessField>[] =
    [
      ...scheduleFields.flatMap(
        (field): readonly OptionConstraint<GoogleBusinessField>[] => [
          {
            _tag: "neededWith",
            field,
            other: "postType",
            values: scheduledTypes,
          },
          {
            _tag: "onlyWith",
            field,
            other: "postType",
            values: scheduledTypes,
          },
        ]
      ),
      {
        _tag: "onlyWith",
        field: "callToAction",
        other: "postType",
        values: buttonTypes,
      },
      {
        _tag: "neededWith",
        field: "callToActionUrl",
        other: "callToAction",
        values: linkingActions,
      },
      {
        _tag: "onlyWith",
        field: "callToActionUrl",
        other: "callToAction",
        values: linkingActions,
      },
      ...offerFields.map((field): OptionConstraint<GoogleBusinessField> => ({
        _tag: "onlyWith",
        field,
        other: "postType",
        values: offerTypes,
      })),
    ];

  /** What Google would refuse in them. */
  problems(): readonly OptionProblem<GoogleBusinessField>[] {
    return googleBusinessProblems(this);
  }
}

/** An option of Google Business Profile's. */
export type GoogleBusinessField = Exclude<
  keyof typeof GoogleBusinessOptions.fields,
  "platform"
>;
