import { Schema } from "effect";

import { MediaAssetIdSchema } from "#shared/domain/ids.ts";

import type { FieldNotes } from "./field-description.ts";
import type { LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { invalid } from "./option-problem.ts";
import type { OptionProblem } from "./option-problem.ts";
import { PostTextSchema } from "./post-text.ts";
import { measureText } from "./text-length.ts";

// Instagram's container, POST /{ig-user-id}/media (the IG User Media
// reference and the "Content Publishing" page, read 2026-11-11), the same
// with Instagram Login as with Facebook Login: `share_to_feed`,
// `cover_url`, `thumb_offset`, `audio_name` and `trial_params` are "For
// Reels only"; `collaborators` is "For Feed image, Reels and Carousels
// only", "A list of up to 3 instagram usernames". Which of them a post may
// take depends on its media, which `content-rules.ts` checks. A story is
// `media_type=STORIES`: `collaborators` are "Not supported for Stories",
// and the reel's fields are a reel's only.

/** The most collaborators a post names: "up to 3". */
export const maxInstagramCollaborators = 3;

/**
 * The longest name Peal gives a reel's audio: Peal's ceiling, as
 * Instagram names none.
 */
export const maxInstagramAudioNameLength = 100;

/**
 * The largest cover image of a reel, in bytes: "8MB maximum", as the
 * platform rules read Instagram's 8 MB for images.
 */
export const maxInstagramCoverByteSize = 8 * 1024 * 1024;

/** The type a reel's cover may be: "JPEG". */
export const instagramCoverTypes = ["image/jpeg"] as const;

/**
 * How a trial reel graduates to the account's followers: by hand in the
 * app (`MANUAL`), or by itself when it performs well (`SS_PERFORMANCE`).
 */
export const InstagramTrialReelSchema = Schema.Literals([
  "manual",
  "performance",
]);

export type InstagramTrialReel = typeof InstagramTrialReelSchema.Type;

/**
 * What kind of post goes out: a `story`, or a `feed` post, as when left
 * out (a post of one video being a reel).
 */
export const InstagramFormatSchema = Schema.Literals(["feed", "story"]);

export type InstagramFormat = typeof InstagramFormatSchema.Type;

/** The formats a feed post's own options are taken on. */
const feedOnly: readonly InstagramFormat[] = ["feed"];

// An Instagram username: letters, digits, periods and underscores, 30 at
// most.
const username = /^[A-Za-z0-9._]{1,30}$/u;

// A reel's audio is named on one line.
const audioNameForbidden = ["\n", "\r"] as const;

/** The options a story does not take: a feed post's, a reel's included. */
const instagramFeedFields = [
  "audioName",
  "collaborators",
  "coverMediaId",
  "shareToFeed",
  "thumbOffsetMs",
  "trialReel",
] as const satisfies readonly InstagramField[];

// The options of `fields` that are set, in that order.
const setOn = (
  options: InstagramOptions,
  fields: readonly InstagramField[]
): readonly InstagramField[] =>
  fields.filter((field) => options[field] !== undefined);

// What Instagram would refuse in a target's options.
const instagramProblems = (
  options: InstagramOptions
): readonly OptionProblem<InstagramField>[] => {
  const collaborators = options.collaborators ?? [];
  const audioLength = measureText(options.audioName ?? "", "codePoints");

  // A story takes none of a feed post's options, whatever they hold.
  if (options.format === "story") {
    return setOn(options, instagramFeedFields).map((field) => invalid(field));
  }

  return [
    ...(options.collaborators !== undefined &&
    (collaborators.length === 0 ||
      !collaborators.every((name) => username.test(name)) ||
      new Set(collaborators.map((name) => name.toLowerCase())).size <
        collaborators.length)
      ? [invalid("collaborators")]
      : []),
    ...(options.audioName !== undefined &&
    (options.audioName.trim() === "" ||
      audioNameForbidden.some((character) =>
        (options.audioName ?? "").includes(character)
      ))
      ? [invalid("audioName")]
      : []),
    ...(audioLength > maxInstagramAudioNameLength
      ? [
          {
            _tag: "tooLong" as const,
            field: "audioName" as const,
            length: audioLength,
            maximum: maxInstagramAudioNameLength,
          },
        ]
      : []),
  ];
};

/**
 * How a post goes out on an Instagram account. Nothing is needed. The
 * reel's settings apply to a post of one video, which Instagram makes a
 * reel: `shareToFeed` shows it in the feed too (as Instagram decides when
 * left out), `coverMediaId` names a JPEG of the workspace's library as its
 * cover, or `thumbOffsetMs` the frame used instead (the first when left
 * out; the cover wins when both are given, as Instagram documents),
 * `audioName` names its audio, once, and `trialReel` shares it with
 * non-followers first. `collaborators` invites up to three other accounts,
 * by username, to be co-authors: each receives an invitation, so it is set
 * only for accounts the member named. `format` makes it a `story`, which
 * takes none of these.
 */
export class InstagramOptions extends Schema.Class<InstagramOptions>(
  "peal-server/publishing/domain/InstagramOptions"
)({
  audioName: Schema.optionalKey(PostTextSchema),
  collaborators: Schema.optionalKey(
    Schema.Array(PostTextSchema).check(
      Schema.isMaxLength(maxInstagramCollaborators)
    )
  ),
  coverMediaId: Schema.optionalKey(MediaAssetIdSchema),
  format: Schema.optionalKey(InstagramFormatSchema),
  platform: Schema.tag("instagram"),
  shareToFeed: Schema.optionalKey(Schema.Boolean),
  thumbOffsetMs: Schema.optionalKey(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))
  ),
  trialReel: Schema.optionalKey(InstagramTrialReelSchema),
}) {
  /**
   * What the fields' schemas do not say, for the description clients read
   * (`optionFieldsOn`): every field has an entry.
   */
  static readonly notes: Readonly<
    Record<InstagramField, FieldNotes<LookupName>>
  > = {
    audioName: {
      forbiddenCharacters: audioNameForbidden,
      maxLength: maxInstagramAudioNameLength,
    },
    collaborators: {
      maximum: maxInstagramCollaborators,
      pattern: username.source,
    },
    coverMediaId: {
      contentTypes: instagramCoverTypes,
      maxByteSize: maxInstagramCoverByteSize,
    },
    format: { ifLeftOut: "feed" },
    shareToFeed: {},
    thumbOffsetMs: { ifLeftOut: 0, minimum: 0 },
    trialReel: {},
  };

  /** A story takes none of a feed post's options. */
  static readonly constraints: readonly OptionConstraint<InstagramField>[] =
    instagramFeedFields.map((field) => ({
      _tag: "onlyWith",
      field,
      other: "format",
      values: feedOnly,
    }));

  /** What Instagram would refuse in them. */
  problems(): readonly OptionProblem<InstagramField>[] {
    return instagramProblems(this);
  }
}

/** An option of Instagram's. */
export type InstagramField = Exclude<
  keyof typeof InstagramOptions.fields,
  "platform"
>;

/** The options that only a reel, a post of one video, takes. */
export const instagramReelFields = [
  "audioName",
  "coverMediaId",
  "shareToFeed",
  "thumbOffsetMs",
  "trialReel",
] as const satisfies readonly InstagramField[];
