import { Array as Arr, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  duplicateWindowHours,
  idempotencyKeyLifetimeHours,
  maxIdempotencyKeyLength,
  NewPostSchema,
} from "peal-contract";
import type { MediaAttachment, NewPost, PostTiming } from "peal-contract";
import { maxMediaPerPost } from "peal-contract/post-text";

import { explainingPublishing } from "#explain.ts";
import { jsonFlag } from "#json.ts";
import {
  importAddress,
  isAddress,
  statusOf,
  uploadFile,
} from "#media-files.ts";
import type { MediaDestination } from "#media-files.ts";
import {
  channelIdsOf,
  channelsFlag,
  optionsFlag,
  optionsOf,
} from "#post-flags.ts";
import { channelsOf, namesFor, printPost, timeOf } from "#post-result.ts";
import { Refused } from "#refused.ts";
import { instantOf, timeZoneFlag } from "#when.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const refuse = (reason: string) => Effect.fail(new Refused({ reason }));

// A media of the workspace already, as peal media list shows its id.
const isMediaId = (source: string): boolean =>
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu.test(source);

// A post that breaks the contract's own limits is refused before anything
// is sent, rather than read as a broken answer.
const checkPost = (post: NewPost) =>
  Schema.decodeUnknownEffect(NewPostSchema)(post).pipe(
    Effect.mapError(
      (failure) =>
        new Refused({ reason: `The post does not fit: ${failure.message}` })
    )
  );

// One `--media` as the post attaches it: a media of the workspace by its
// id, an address the server imports, or a file uploaded first. Only ready
// media go in a post.
const attached = (
  destination: MediaDestination,
  source: string,
  altText: Option.Option<string>
) =>
  Effect.gen(function* attaching() {
    const attachment = (mediaId: string): MediaAttachment => ({
      altText: Option.getOrElse(altText, () => ""),
      mediaId,
    });

    if (isMediaId(source)) {
      return attachment(source);
    }

    const media = yield* isAddress(source)
      ? importAddress(destination, source, altText)
      : uploadFile(destination, source, altText);

    if (media.status._tag !== "ready") {
      return yield* new Refused({
        reason: `${source} is stored as media ${media.id}, but cannot go in a post (${statusOf(media)}): nothing was posted.`,
      });
    }

    return attachment(media.id);
  });

// What the flags ask for, once they hold together: where the post goes,
// with which options, and when.
const planned = (input: {
  readonly alt: readonly string[];
  readonly at: Option.Option<string>;
  readonly channels: readonly string[];
  readonly idempotencyKey: Option.Option<string>;
  readonly media: readonly string[];
  readonly now: boolean;
  readonly options: readonly string[];
  readonly timeZone: string;
}) =>
  Effect.gen(function* planning() {
    // Everything the command line can tell by itself is checked before a
    // request leaves, so a refusal here sent and stored nothing.
    if (Option.isSome(input.at) === input.now) {
      return yield* refuse(
        input.now
          ? "Give --at or --now, not both."
          : "Say when it goes out: --at <instant> to schedule it, or --now to publish it now. Publishing is never the default."
      );
    }

    const channelIds = channelIdsOf(input.channels);

    if (!Arr.isArrayNonEmpty(channelIds)) {
      return yield* refuse(
        "Name the channels it goes to with --channel: peal channels list shows their ids."
      );
    }

    if (input.alt.length > input.media.length) {
      return yield* refuse(
        "There are more --alt than --media: each describes the --media of its rank."
      );
    }

    if (input.media.length > maxMediaPerPost) {
      return yield* refuse(
        `A post shows ${String(maxMediaPerPost)} images and videos at most.`
      );
    }

    if (
      Option.exists(
        input.idempotencyKey,
        (key) => key === "" || key.length > maxIdempotencyKeyLength
      )
    ) {
      return yield* refuse(
        `--idempotency-key takes 1 to ${String(maxIdempotencyKeyLength)} characters.`
      );
    }

    const when: PostTiming = yield* Option.match(input.at, {
      onNone: () =>
        Effect.succeed<PostTiming>({ _tag: "now", timeZone: input.timeZone }),
      onSome: (given) =>
        instantOf(given, input.timeZone).pipe(
          Effect.map((at): PostTiming => ({
            _tag: "at",
            at,
            timeZone: input.timeZone,
          }))
        ),
    });

    const options = yield* Effect.all(input.options.map(optionsOf));

    return { channelIds, options, when };
  });

export const post = Command.make(
  "post",
  {
    allowDuplicate: Flag.Boolean("allow-duplicate").pipe(
      Flag.withDescription(
        `Send it even when another post already sends the same text and media to one of these channels less than ${String(duplicateWindowHours)} hours from its time, which is otherwise refused as a post sent twice by mistake.`
      ),
      Flag.withDefault(false)
    ),
    alt: Flag.String("alt").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription(
        "What a --media shows, for people who cannot see it: the first --alt describes the first --media, the second the second."
      ),
      Flag.atLeast(0)
    ),
    at: Flag.String("at").pipe(
      Flag.withMetavar("<instant>"),
      Flag.withDescription(
        "Schedule it for then: an instant with its offset, such as 2026-11-20T09:00:00Z, or a local time without one, such as 2026-11-20T10:00, read in --time-zone. One of --at and --now is required."
      ),
      Flag.optional
    ),
    channels: channelsFlag(
      "A channel the post goes to, as peal channels list shows its id; repeat it, or separate ids with commas. At least one."
    ),
    idempotencyKey: Flag.String("idempotency-key").pipe(
      Flag.withMetavar("<key>"),
      Flag.withDescription(
        `Any text of your choosing, ${String(maxIdempotencyKeyLength)} characters at most, such as a UUID, that makes the command safe to run again: within ${String(idempotencyKeyLifetimeHours)} hours, the same key with the same post answers the post the first run made, and makes no other; with another post it is refused. Without it the command sends no key and makes none up, as a key only helps when the same one is sent again: it never sends a post twice by itself, so when a run ends without an answer, look for the post before running it again. Give --media as media ids to run a post with media again: files and addresses are stored anew on each run, which makes it another post.`
      ),
      Flag.optional
    ),
    json: jsonFlag,
    media: Flag.String("media").pipe(
      Flag.withMetavar("<file|url|media-id>"),
      Flag.withDescription(
        `An image or a video to show, in order, ${String(maxMediaPerPost)} at most: a file, uploaded first (JPEG, PNG, GIF, WebP, MP4 or QuickTime, told by its extension); an https address the server imports; or the id of a media the workspace has, as peal media list shows it. Repeat it for several.`
      ),
      Flag.atLeast(0)
    ),
    now: Flag.Boolean("now").pipe(
      Flag.withDescription(
        "Publish it now. Publishing is never the default: one of --at and --now is required."
      ),
      Flag.withDefault(false)
    ),
    options: optionsFlag(
      'What the post sets on a channel whose platform asks for more, as peal drafts save takes it: JSON tagged by its platform, such as 0190…=\'{"platform":"youtube","title":"Launch","madeForKids":false}\'; repeat it for several channels.'
    ),
    text: Argument.String("text").pipe(
      Argument.withDescription("What the post says.")
    ),
    timeZone: timeZoneFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("post")(function* sendPost(input) {
    const { channelIds, options, when } = yield* planned(input);

    const withMedia = (media: readonly MediaAttachment[]) => {
      const written: NewPost = {
        channelIds,
        content: { media, overrides: [], text: input.text },
        options,
        when,
      };

      return checkPost(
        input.allowDuplicate ? { ...written, allowDuplicate: true } : written
      );
    };

    yield* withMedia([]);

    const { client, url, workspace } = yield* inWorkspace(input.workspace);
    const destination = { client, url, workspaceId: workspace.id };
    const media: MediaAttachment[] = [];

    for (const [index, source] of input.media.entries()) {
      media.push(
        yield* attached(
          destination,
          source,
          Option.fromUndefinedOr(input.alt[index])
        )
      );
    }

    const sent = yield* client.posts
      .send({
        headers: Option.match(input.idempotencyKey, {
          onNone: () => ({}),
          onSome: (key) => ({ "idempotency-key": key }),
        }),
        params: { workspaceId: workspace.id },
        payload: yield* withMedia(media),
        query: {},
      })
      .pipe(explainingPublishing(url));

    const names = yield* namesFor(input.json, client, workspace.id);
    const where = channelsOf(sent, names);

    yield* printPost(sent, input.json, () =>
      when._tag === "now"
        ? `Publishing now on ${where}: post ${sent.id}. It reaches these accounts' public, and cannot be taken back from here once it is out; peal posts show ${sent.id} tells how it went.`
        : `Scheduled for ${timeOf(sent)} on ${where}: post ${sent.id}. It reaches these accounts' public then; until then, peal posts cancel ${sent.id} stops it.`
    );
  })
).pipe(
  Command.withDescription(
    "Write a post and send it in one command, to the public of the accounts its channels connect: scheduled with --at, or published at once with --now. One of the two is required. Its media are uploaded or imported first, and its text, media and options must fit each platform's rules, or nothing is posted."
  )
);
