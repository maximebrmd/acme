import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  duplicateWindowHours,
  idempotencyKeyLifetimeHours,
  maxIdempotencyKeyLength,
  maxOutcomeWaitSeconds,
  NewPostSchema,
  PostValidationSchema,
} from "peal-contract";
import type {
  MediaAttachment,
  NewPost,
  PostTiming,
  Queue,
} from "peal-contract";
import { maxMediaPerPost } from "peal-contract/post-text";

import { outcomeLines } from "#commands/posts.ts";
import { explain, explainingPublishing } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import {
  importAddress,
  isAddress,
  statusOf,
  uploadFile,
} from "#media-files.ts";
import type { MediaDestination } from "#media-files.ts";
import { previewLines, problemsOf } from "#post-check.ts";
import {
  channelIdsOf,
  channelsFlag,
  followUpsOf,
  optionsFlag,
  optionsOf,
  thenDelayFlag,
  thenFlag,
} from "#post-flags.ts";
import { channelsOf, namesFor, printPost, timeOf } from "#post-result.ts";
import { instant } from "#print.ts";
import { Refused } from "#refused.ts";
import {
  defaultSignaturesFlag,
  presetsOf,
  queueOf,
  setsFlag,
  signatureFlag,
  warningLines,
} from "#saved-items.ts";
import type { Presets } from "#saved-items.ts";
import { tagIdsOf, tagsFlag } from "#tags.ts";
import { instantOf, timeZoneFlag } from "#when.ts";
import { channelNames, inWorkspace, workspaceFlag } from "#workspace.ts";

type InWorkspace = Effect.Success<ReturnType<typeof inWorkspace>>;

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

// Whether the post goes on a queue, named or the default one.
const queued = (input: {
  readonly defaultQueue: boolean;
  readonly queue: Option.Option<string>;
}) => input.defaultQueue || Option.isSome(input.queue);

// What --dry-run and --wait ask for holds together with the other flags:
// checked before any request, as a file or an address given as --media
// would be stored by the time the server refused the rest.
const checkModes = (input: {
  readonly at: Option.Option<string>;
  readonly defaultQueue: boolean;
  readonly dryRun: boolean;
  readonly media: readonly string[];
  readonly queue: Option.Option<string>;
  readonly wait: Option.Option<number>;
}) =>
  Effect.gen(function* checkingModes() {
    if (
      Option.exists(
        input.wait,
        (seconds) => seconds < 0 || seconds > maxOutcomeWaitSeconds
      )
    ) {
      return yield* refuse(
        `--wait takes 0 to ${String(maxOutcomeWaitSeconds)} seconds.`
      );
    }

    if (Option.isSome(input.wait) && input.dryRun) {
      return yield* refuse(
        "--dry-run makes nothing, so there is no outcome to wait for: leave --wait out."
      );
    }

    if (
      Option.isSome(input.wait) &&
      (Option.isSome(input.at) || queued(input))
    ) {
      return yield* refuse(
        "--wait goes with --now: a post scheduled with --at, --queue or --default-queue goes out later, and peal posts wait <post-id> waits for it then."
      );
    }

    if (input.dryRun && !input.media.every(isMediaId)) {
      return yield* refuse(
        "With --dry-run, --media takes media ids only, as peal media list shows them: uploading a file or importing an address would store it. Store it first with peal media upload or peal media import, or leave it out."
      );
    }

    return input;
  });

// Checks the post without making it: what each channel would receive on
// stdout, and, when it would be refused, every reason as the refusal.
const check = (
  { client, url, workspace }: InWorkspace,
  payload: NewPost,
  json: boolean
) =>
  Effect.gen(function* checking() {
    const validation = yield* client.posts
      .validate({ params: { workspaceId: workspace.id }, payload })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(PostValidationSchema, validation);
    } else {
      const names = yield* channelNames(client, workspace.id);

      if (validation.valid) {
        yield* Console.log(
          validation.awaitsApproval
            ? "Checked, and made nothing: the post would be made, and wait for an approval before it goes out."
            : "Checked, and made nothing: the post would go through."
        );
      }

      if (validation.queueSlot !== undefined) {
        yield* Console.log(
          `Added now, it would take the queue's slot at ${instant(validation.queueSlot)}.`
        );
      }

      for (const line of previewLines(validation, names)) {
        yield* Console.log(line);
      }

      for (const line of warningLines(validation.warnings, false)) {
        yield* Console.log(line);
      }
    }

    if (!validation.valid) {
      yield* refuse(
        [
          "Checked, and made nothing: Peal would refuse the post.",
          ...problemsOf(
            validation,
            payload.when._tag === "queue"
              ? "UTC"
              : (payload.when.timeZone ?? "UTC")
          ),
        ].join("\n")
      );
    }
  });

// What the flags ask for, once they hold together: where the post goes,
// with which options, and when.
const planned = (input: {
  readonly alt: readonly string[];
  readonly at: Option.Option<string>;
  readonly channels: readonly string[];
  readonly defaultQueue: boolean;
  readonly idempotencyKey: Option.Option<string>;
  readonly media: readonly string[];
  readonly now: boolean;
  readonly options: readonly string[];
  readonly queue: Option.Option<string>;
  readonly sets: readonly string[];
  readonly timeZone: string;
}) =>
  Effect.gen(function* planning() {
    // Everything the command line can tell by itself is checked before a
    // request leaves, so a refusal here sent and stored nothing.
    const timings = [
      Option.isSome(input.at),
      input.now,
      Option.isSome(input.queue),
      input.defaultQueue,
    ].filter(Boolean).length;

    if (timings !== 1) {
      return yield* refuse(
        timings > 1
          ? "Give one of --at, --now, --queue and --default-queue."
          : "Say when it goes out: --at <instant> to schedule it, --queue <name-or-id> or --default-queue to put it on a queue's next free slot, or --now to publish it now. Publishing is never the default."
      );
    }

    const channelIds = channelIdsOf(input.channels);

    // One channel at least, unless a channel set or a queue brings some.
    if (channelIds.length === 0 && input.sets.length === 0 && !queued(input)) {
      return yield* refuse(
        "Name the channels it goes to with --channel, or a channel set with --set: peal channels list shows the channels' ids, and peal sets list the sets."
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

    // A queue is named once the workspace is known: its id comes then.
    const when: PostTiming = yield* Option.match(input.at, {
      onNone: () =>
        Effect.succeed<PostTiming>(
          queued(input)
            ? { _tag: "queue" }
            : { _tag: "now", timeZone: input.timeZone }
        ),
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
        "Schedule it for then: an instant with its offset, such as 2026-11-20T09:00:00Z, or a local time without one, such as 2026-11-20T10:00, read in --time-zone. One of --at, --now, --queue and --default-queue is required."
      ),
      Flag.optional
    ),
    channels: channelsFlag(
      "A channel the post goes to, as peal channels list shows its id; repeat it, or separate ids with commas. At least one, unless --set names a channel set."
    ),
    defaultQueue: Flag.Boolean("default-queue").pipe(
      Flag.withDescription(
        "Put it on the next free slot of the workspace's default queue instead of a time, as peal queues list marks it; --queue <name-or-id> takes another. Without --channel or --set it goes to the queue's channels. The slot is decided when the post is made."
      ),
      Flag.withDefault(false)
    ),
    defaultSignatures: defaultSignaturesFlag(
      "Put each channel's default signature under its text, as peal signatures list shows them: the workspace's under the post's text, a platform's or a channel's own under the text that channel has instead. They are then text of the post, counted against each platform's limit; a text that already ends with its signature is left as it is."
    ),
    dryRun: Flag.Boolean("dry-run").pipe(
      Flag.withDescription(
        "Check the post and make nothing: it prints what each channel would receive, with its text counted against the platform's limits, and everything that would refuse it, all at once, then ends as a refusal unless the post would go through. A post that would go through now can still be refused later. With it, --media takes media ids only."
      ),
      Flag.withDefault(false)
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
        "Publish it now. Publishing is never the default: one of --at, --now, --queue and --default-queue is required."
      ),
      Flag.withDefault(false)
    ),
    options: optionsFlag(
      'What the post sets on a channel whose platform asks for more, as peal drafts save takes it: JSON tagged by its platform, such as 0190…=\'{"platform":"youtube","title":"Launch","madeForKids":false}\'; repeat it for several channels. A channel on which it gives none takes the options of a set it names, then the channel\'s default options (peal channels defaults).'
    ),
    parts: thenFlag(
      "A part that follows the post, text alone: a reply in a thread where the platform has threads (peal channels capabilities says where). Repeat it for several, in order. A platform that takes a post alone refuses the post."
    ),
    partsDelay: thenDelayFlag,
    queue: Flag.String("queue").pipe(
      Flag.withMetavar("<name-or-id>"),
      Flag.withDescription(
        "Put it on the next free slot of that queue instead of a time, by its id or its name, as peal queues list shows them; --default-queue takes the workspace's default queue. Without --channel or --set it goes to the queue's channels. The slot is decided when the post is made."
      ),
      Flag.optional
    ),
    sets: setsFlag(
      "A channel set the post goes to, by its id or its name, as peal sets list shows them; repeat it for several: its connected channels, beside any --channel, with the options the set keeps for them where --options gives none. A channel of the set that is no longer connected is left out, and said; when none is left and no --channel is given, nothing is posted."
    ),
    shortenLinks: Flag.Boolean("shorten-links").pipe(
      Flag.withDescription(
        "Send the post's links shortened, where the server has short links (peal short-links status): each link written with http:// or https:// and longer than a short address goes out as one, per channel, and counts its clicks (peal short-links list); the text kept stays as written, and Pinterest, Instagram and TikTok keep links as written, as does a link to a channel's own platform."
      ),
      Flag.withDefault(false)
    ),
    signature: signatureFlag(
      "A signature to put under the post's text, on every channel, by its id or its name, as peal signatures list shows them; under the last part of a post with --then parts. It is then text of the post, counted against each platform's limit, and never added twice."
    ),
    tags: tagsFlag(
      "A tag to file the post under, by its id or its name, as peal tags list shows them; repeat it for several. Tags say nothing to the platforms."
    ),
    text: Argument.String("text").pipe(
      Argument.withDescription("What the post says.")
    ),
    timeZone: timeZoneFlag,
    wait: Flag.Int("wait").pipe(
      Flag.withMetavar("<seconds>"),
      Flag.withDescription(
        `With --now, wait up to that many seconds, ${String(maxOutcomeWaitSeconds)} at most, for the post to go out, then say how it went on each channel: published, with its address, failed, with why, or still going. The post is made either way, and goes on publishing when the time runs out: peal posts wait waits for the rest.`
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("post")(function* sendPost(input) {
    yield* checkModes(input);

    const { channelIds, options, when: asked } = yield* planned(input);
    const followUps = yield* followUpsOf(input.parts, input.partsDelay);

    const withMedia = (
      media: readonly MediaAttachment[],
      tagIds: readonly string[] = [],
      presets: Presets = {},
      when: PostTiming = asked
    ) => {
      const written: NewPost = {
        channelIds,
        content: { followUps, media, overrides: [], text: input.text },
        options,
        when,
        ...presets,
      };

      // Tags are sent only when some were given, and short links only
      // when asked for.
      const tagged: NewPost =
        tagIds.length === 0 ? written : { ...written, tagIds };

      const filed: NewPost = input.shortenLinks
        ? { ...tagged, shortenLinks: true }
        : tagged;

      return checkPost(
        input.allowDuplicate ? { ...filed, allowDuplicate: true } : filed
      );
    };

    yield* withMedia([]);

    const session = yield* inWorkspace(input.workspace);
    const { client, url, workspace } = session;
    const destination = { client, url, workspaceId: workspace.id };
    // A tag the workspace lacks is refused before any media is stored.
    const tagIds = yield* tagIdsOf(session, input.tags);
    // So is a channel set or a signature it lacks, or a queue.
    const presets = yield* presetsOf(session, input);

    const queue = yield* Option.match(
      input.defaultQueue ? Option.some("") : input.queue,
      {
        onNone: () => Effect.succeed(Option.none<Queue>()),
        onSome: (given) =>
          queueOf(session, given).pipe(Effect.map(Option.some)),
      }
    );

    const when: PostTiming = Option.match(queue, {
      onNone: () => asked,
      onSome: ({ id }) => ({ _tag: "queue", queueId: id }),
    });

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

    if (input.dryRun) {
      yield* check(
        session,
        yield* withMedia(media, tagIds, presets, when),
        input.json
      );

      return;
    }

    const sent = yield* client.posts
      .send({
        headers: Option.match(input.idempotencyKey, {
          onNone: () => ({}),
          onSome: (key) => ({ "idempotency-key": key }),
        }),
        params: { workspaceId: workspace.id },
        payload: yield* withMedia(media, tagIds, presets, when),
        query: Option.match(input.wait, {
          onNone: () => ({}),
          onSome: (wait) => ({ wait }),
        }),
      })
      .pipe(explainingPublishing(url));

    const names = yield* namesFor(input.json, client, workspace.id);
    const where = channelsOf(sent, names);

    yield* printPost(sent, input.json, () =>
      Option.match(queue, {
        onNone: () =>
          when._tag === "now"
            ? `Publishing now on ${where}: post ${sent.id}. It reaches these accounts' public, and cannot be taken back from here once it is out; peal posts show ${sent.id} tells how it went.`
            : `Scheduled for ${timeOf(sent)} on ${where}: post ${sent.id}. It reaches these accounts' public then; until then, peal posts cancel ${sent.id} stops it.`,
        onSome: ({ name }) =>
          `Added to queue ${name}, on its slot at ${timeOf(sent)}, on ${where}: post ${sent.id}. It reaches these accounts' public then; until then, peal posts cancel ${sent.id} stops it.`,
      })
    );

    if (Option.isSome(input.wait) && !input.json) {
      for (const line of outcomeLines(sent, names)) {
        yield* Console.log(line);
      }
    }

    if (!input.json) {
      for (const line of warningLines(sent.warnings, true)) {
        yield* Console.log(line);
      }
    }
  })
).pipe(
  Command.withDescription(
    "Write a post and send it in one command, to the public of the accounts its channels connect: scheduled with --at, put on a queue's next free slot with --queue <name-or-id> or --default-queue, or published at once with --now. One of these is required. --set names a channel set instead of listing its channels, and --signature or --default-signatures puts a signature under its text. Its media are uploaded or imported first, and its text, media and options must fit each platform's rules, or nothing is posted. --dry-run checks it and makes nothing; --wait, with --now, says how it went on each channel."
  )
);
