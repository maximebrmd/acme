import { assert, describe, it } from "@effect/vitest";
import {
  DateTime,
  Effect,
  FileSystem,
  Option,
  Path,
  Ref,
  Schema,
} from "effect";
import { ChannelCapabilitiesSchema } from "peal-contract";

import { printable } from "#print.ts";

import { filesLayer, signedIn } from "./signed-in.ts";
import {
  draftId,
  failedTargetId,
  finishedId,
  mastodonId,
  pinterestId,
  quotaTargetId,
  scheduledId,
  studioMe,
  tiktokId,
  unconfirmedTargetId,
  youtubeId,
} from "./studio.ts";
import type { Studio } from "./studio.ts";

// The commands that act in a workspace, against the in-memory studio: what
// they ask the server, what they print, and how they explain a refusal.

const changes = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ changes: made }) => made));

const inStudio = ["--workspace", "studio"];

// peal posts confirm, for the unconfirmed target of the post that finished.
const confirm = (...rest: readonly string[]) => [
  "posts",
  "confirm",
  finishedId,
  unconfirmedTargetId,
  ...rest,
  ...inStudio,
];

describe("choosing the workspace", () => {
  it.effect(
    "asks which one when the user belongs to several, and takes a slug, an id or PEAL_WORKSPACE",
    () =>
      Effect.gen(function* chooses() {
        const session = yield* signedIn();

        assert.include(
          yield* session.refused(["drafts", "list"]),
          "You belong to several workspaces: name one with --workspace or PEAL_WORKSPACE (studio, shop)."
        );
        assert.include(
          yield* session.printed(["drafts", "list", "--workspace", "studio"]),
          "Drafts of Studio, newest first:"
        );
        assert.include(
          yield* session.printed([
            "drafts",
            "list",
            "-w",
            "6c1d7f75-6e1a-4b8f-8b63-4a2d3e5f6071",
          ]),
          "Shop has no drafts."
        );
        assert.include(
          yield* session.refused(["drafts", "list", "--workspace", "attic"]),
          "You belong to no workspace attic. peal whoami lists yours."
        );

        const fromEnvironment = yield* signedIn({
          env: { PEAL_WORKSPACE: "studio" },
        });

        assert.include(
          yield* fromEnvironment.printed(["drafts", "list"]),
          "Drafts of Studio"
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("takes the user's only workspace without asking", () =>
    Effect.gen(function* only() {
      const session = yield* signedIn({
        me: { ...studioMe, workspaces: studioMe.workspaces.slice(0, 1) },
      });

      assert.include(
        yield* session.printed(["drafts", "list"]),
        "Drafts of Studio"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("explains what the user's role does not allow", () =>
    Effect.gen(function* viewer() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused([
          "drafts",
          "save",
          "--workspace",
          "shop",
          "--text",
          "Not mine to write",
        ]),
        "Peal refused: your role in this workspace does not allow it"
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal drafts", () => {
  it.effect("lists drafts, newest first", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();
      const listed = yield* session.printed(["drafts", "list", ...inStudio]);

      assert.include(listed, draftId);
      assert.include(listed, "1 channel");
      assert.include(listed, "A synthetic draft about the spring catalogue.");
      assert.notInclude(listed, scheduledId);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "saves a new draft, then changes its text and keeps its channels",
    () =>
      Effect.gen(function* saves() {
        const session = yield* signedIn();

        const created = yield* session.printed([
          "drafts",
          "save",
          ...inStudio,
          "--text",
          "A synthetic launch note",
          "--channel",
          mastodonId,
        ]);

        const id = /Saved draft (?<id>\S+) in Studio, for 1 channel\./u.exec(
          created
        )?.groups?.["id"];

        assert.isDefined(id);

        yield* session.printed([
          "drafts",
          "save",
          ...inStudio,
          "--post",
          id ?? "",
          "--text",
          "A synthetic launch note, edited",
        ]);

        const { posts } = yield* Ref.get(session.studio.state);
        const saved = posts.find((post) => post.id === id);

        assert.strictEqual(
          saved?.content.text,
          "A synthetic launch note, edited"
        );
        assert.deepStrictEqual(
          saved?.targets.map(({ channelId }) => channelId),
          [mastodonId]
        );
        assert.deepStrictEqual(yield* changes(session.studio), [
          `create:${id ?? ""}`,
          `update:${id ?? ""}`,
        ]);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "carries a channel's platform options, keeps them when changing other things, and replaces them when given",
    () =>
      Effect.gen(function* options() {
        const session = yield* signedIn();

        const first = JSON.stringify({
          madeForKids: false,
          platform: "youtube",
          title: "A synthetic launch video",
        });

        const created = yield* session.printed([
          "drafts",
          "save",
          ...inStudio,
          "--text",
          "A synthetic video note",
          "--channel",
          youtubeId,
          "--channel",
          mastodonId,
          "--options",
          `${youtubeId}=${first}`,
        ]);

        const id =
          /Saved draft (?<id>\S+) in Studio/u.exec(created)?.groups?.["id"] ??
          "";

        const optionsOf = Effect.gen(function* read() {
          const { posts } = yield* Ref.get(session.studio.state);

          return (
            posts
              .find((post) => post.id === id)
              ?.targets.map((target) => target.options) ?? []
          );
        });

        assert.deepStrictEqual(yield* optionsOf, [
          {
            madeForKids: false,
            platform: "youtube",
            title: "A synthetic launch video",
          },
          null,
        ]);

        // Changing the text keeps them.
        yield* session.printed([
          "drafts",
          "save",
          ...inStudio,
          "--post",
          id,
          "--text",
          "A synthetic video note, edited",
        ]);

        assert.deepStrictEqual((yield* optionsOf)[0], {
          madeForKids: false,
          platform: "youtube",
          title: "A synthetic launch video",
        });

        yield* session.printed([
          "drafts",
          "save",
          ...inStudio,
          "--post",
          id,
          "--options",
          `${youtubeId}={"platform":"youtube","title":"A synthetic title, renamed"}`,
        ]);

        assert.deepStrictEqual((yield* optionsOf)[0], {
          platform: "youtube",
          title: "A synthetic title, renamed",
        });

        assert.include(
          yield* session.refused([
            "drafts",
            "save",
            ...inStudio,
            "--post",
            id,
            "--options",
            `${youtubeId}={"platform":"myspace"}`,
          ]),
          `The options for channel ${youtubeId} are not a platform's options`
        );
        assert.include(
          yield* session.refused([
            "drafts",
            "save",
            ...inStudio,
            "--post",
            id,
            "--options",
            "no-channel",
          ]),
          "--options takes <channel-id>=<json>"
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses a draft that breaks the contract before sending it", () =>
    Effect.gen(function* refuses() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused([
          "drafts",
          "save",
          ...inStudio,
          "--text",
          `A synthetic ${String.fromCodePoint(0)} character`,
        ]),
        "The draft does not fit"
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("discards a draft, and nothing that is not one", () =>
    Effect.gen(function* discards() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed(["drafts", "discard", draftId, ...inStudio]),
        `Discarded draft ${draftId} of Studio.`
      );
      assert.include(
        yield* session.refused(["drafts", "discard", scheduledId, ...inStudio]),
        "The post is scheduled, which does not allow this."
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `discard:${draftId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal channels", () => {
  it.effect("shows what a TikTok channel takes, and refuses another", () =>
    Effect.gen(function* tiktok() {
      const session = yield* signedIn();

      const shown = yield* session.printed([
        "channels",
        "tiktok",
        tiktokId,
        ...inStudio,
      ]);

      assert.include(shown, "Posting as Studio (@studio_example).");
      assert.include(
        shown,
        "Who can view a post (its privacyLevel, no default): PUBLIC_TO_EVERYONE, SELF_ONLY."
      );
      assert.include(
        shown,
        "Turned off in the account's settings, so off on every post: Duet, Stitch."
      );
      assert.include(shown, "Videos up to 600 seconds.");
      assert.include(shown, "Music Usage Confirmation");
      assert.include(
        yield* session.refused(["channels", "tiktok", youtubeId, ...inStudio]),
        "The workspace has no such channel, or it is not of this platform"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal channels capabilities", () => {
  it.effect("shows what a channel takes: text, media, options, account", () =>
    Effect.gen(function* capabilities() {
      const session = yield* signedIn();

      const shown = yield* session.printed([
        "channels",
        "capabilities",
        tiktokId,
        ...inStudio,
      ]);

      assert.include(shown, "What a post on tiktok may hold");
      assert.include(shown, "at most 500 codePoints, 65536 utf16Units");
      assert.include(shown, "up to 4 images and videos, 1 video at most");
      assert.include(shown, "image/jpeg  up to 16 MiB, 33177600 pixels");
      assert.include(
        shown,
        "privacyLevel    choice   required  one of PUBLIC_TO_EVERYONE, SELF_ONLY; values from the lookup tiktokCreator"
      );
      assert.include(
        shown,
        "When commercialContent is true, one of brandOrganic, brandContent must be true."
      );
      assert.include(
        shown,
        "privacyLevel takes only PUBLIC_TO_EVERYONE, SELF_ONLY."
      );
      assert.include(shown, "disableDuet must be true.");
      assert.include(shown, "Videos last 600 seconds at most.");
      assert.include(shown, "Refused on this channel: image/jpeg.");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("sums up every platform when no channel is named", () =>
    Effect.gen(function* platforms() {
      const session = yield* signedIn();

      const shown = yield* session.printed([
        "channels",
        "capabilities",
        ...inStudio,
      ]);

      assert.include(shown, "mastodon");
      assert.include(
        shown,
        "options: madeForKids*, title*, categoryId, privacy"
      );
      assert.include(
        shown,
        "lookups: youtubeVideoCategories, youtubePlaylists"
      );
      assert.include(shown, "* required to schedule");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("prints the server's answer as JSON for scripts", () =>
    Effect.gen(function* json() {
      const session = yield* signedIn();

      const shown = yield* session.printed([
        "channels",
        "capabilities",
        youtubeId,
        "--json",
        ...inStudio,
      ]);

      const decoded = Schema.decodeUnknownSync(
        Schema.fromJsonString(ChannelCapabilitiesSchema)
      )(shown);

      assert.strictEqual(decoded.channelId, youtubeId);
      assert.deepStrictEqual(decoded.account, { _tag: "unrestricted" });
      assert.include(
        yield* session.refused([
          "channels",
          "capabilities",
          draftId,
          ...inStudio,
        ]),
        "The workspace has no such channel"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

// peal channels lookup, in the studio.
const lookup = (more: readonly string[]) => [
  "channels",
  "lookup",
  ...more,
  ...inStudio,
];

describe("peal channels lookup", () => {
  it.effect("lists a channel's lookups, and runs one", () =>
    Effect.gen(function* lookups() {
      const session = yield* signedIn();

      const listed = yield* session.printed([
        "channels",
        "lookup",
        youtubeId,
        ...inStudio,
      ]);

      assert.include(
        listed,
        "youtubeVideoCategories  fills categoryId  takes --language, --region"
      );
      assert.include(listed, "youtubePlaylists        takes --cursor, --limit");

      const categories = yield* session.printed([
        "channels",
        "lookup",
        youtubeId,
        "youtubeVideoCategories",
        "--region",
        "FR",
        ...inStudio,
      ]);

      assert.include(categories, "22  People & Blogs");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("reads a paged lookup page by page", () =>
    Effect.gen(function* paged() {
      const session = yield* signedIn();

      const run = (more: readonly string[]) =>
        session.printed([
          "channels",
          "lookup",
          youtubeId,
          "youtubePlaylists",
          ...more,
          ...inStudio,
        ]);

      const first = yield* run([]);

      assert.include(first, "PLsynthetic01  Launches  public");
      assert.include(first, "More: add --cursor page-1");

      const last = yield* run(["--cursor", "page-1"]);

      assert.include(last, "PLsynthetic02  Field notes");
      assert.notInclude(last, "More:");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists a Pinterest account's boards, and a board's sections", () =>
    Effect.gen(function* pinterest() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed(lookup([pinterestId])),
        "pinterestBoardSections  fills boardSectionId  takes --board, --cursor, --limit"
      );
      assert.include(
        yield* session.printed(lookup([pinterestId, "pinterestBoards"])),
        "549755885001  Studio notes  PUBLIC"
      );
      assert.include(
        yield* session.printed(
          lookup([
            pinterestId,
            "pinterestBoardSections",
            "--board",
            "549755885001",
          ])
        ),
        "5000000000001  Sketches"
      );
      assert.include(
        yield* session.refused(lookup([pinterestId, "pinterestBoardSections"])),
        "The lookup refused its input"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("shows a TikTok creator, and explains refusals", () =>
    Effect.gen(function* refusals() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed(lookup([tiktokId, "tiktokCreator"])),
        "Posting as Studio (@studio_example)."
      );
      assert.include(
        yield* session.refused(lookup([tiktokId, "youtubePlaylists"])),
        "This channel's platform has no such lookup"
      );
      assert.include(
        yield* session.refused(
          lookup([youtubeId, "youtubeVideoCategories", "--region", "ZZ"])
        ),
        "The lookup refused its input"
      );
      assert.include(
        yield* session.printed(lookup([mastodonId])),
        "has no lookups"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal posts", () => {
  it.effect("shows how a post went on each channel, with its targets", () =>
    Effect.gen(function* shows() {
      const session = yield* signedIn();

      const shown = yield* session.printed([
        "posts",
        "show",
        finishedId,
        ...inStudio,
      ]);

      assert.include(
        shown,
        `Post ${finishedId} in Studio: finished (failed), for 2026-11-08T09:00:00Z (Europe/Paris).`
      );
      assert.include(shown, failedTargetId);
      assert.include(shown, "(mastodon @studio@social.example.test)");
      assert.include(
        shown,
        "failed: rateLimited (the platform kept limiting Peal, which stopped trying)"
      );
      assert.include(shown, "unconfirmed: noResponse");
      assert.include(shown, quotaTargetId);
      assert.include(
        shown,
        "failed: quotaExceeded (the platform's daily upload allowance stayed spent: post it again after it resets)"
      );
      assert.include(
        shown,
        `Options on ${youtubeId} (youtube Studio videos): {"madeForKids":false,"platform":"youtube","title":"A synthetic launch video"}`
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("takes a scheduled post back to draft, and only one", () =>
    Effect.gen(function* unschedules() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed([
          "posts",
          "unschedule",
          scheduledId,
          ...inStudio,
        ]),
        `Took post ${scheduledId} back to draft`
      );
      assert.include(
        yield* session.refused(["posts", "unschedule", draftId, ...inStudio]),
        "The post is draft, which does not allow this."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("posts a failed target again, once", () =>
    Effect.gen(function* reposts() {
      const session = yield* signedIn();
      const args = ["posts", "repost", finishedId, failedTargetId, ...inStudio];

      assert.include(
        yield* session.printed(args),
        `Posting ${finishedId} again on ${mastodonId} (mastodon @studio@social.example.test), now: round 2.`
      );
      assert.include(
        yield* session.refused(args),
        "The post is pending on that channel"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `repost:${failedTargetId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "confirms what the user found for an unconfirmed target, with its address",
    () =>
      Effect.gen(function* confirms() {
        const session = yield* signedIn();

        assert.include(
          yield* session.refused(
            confirm("not-published", "--permalink", "https://example.test/1")
          ),
          "--permalink is for a post you found live"
        );
        assert.include(
          yield* session.refused(
            confirm("published", "--permalink", "ftp://example.test/1")
          ),
          "--permalink must be the post's http or https address"
        );
        assert.include(
          yield* session.printed(
            confirm(
              "published",
              "--permalink",
              "https://studio.example.test/post/1"
            )
          ),
          `Recorded that post ${finishedId} went out on 0190f3a0-0000-7000-8000-00000000c002 (bluesky studio.example.test).`
        );

        const { posts } = yield* Ref.get(session.studio.state);

        assert.deepStrictEqual(
          posts
            .find(({ id }) => id === finishedId)
            ?.targets.find(({ id }) => id === unconfirmedTargetId),
          {
            channelId: "0190f3a0-0000-7000-8000-00000000c002",
            failureReason: null,
            id: unconfirmedTargetId,
            options: null,
            parts: { count: 1, live: [] },
            permalink: "https://studio.example.test/post/1",
            publishedAt: null,
            round: 1,
            status: "published",
            unconfirmedReason: null,
          }
        );
        assert.deepStrictEqual(yield* changes(session.studio), [
          `confirm:${unconfirmedTargetId}:published`,
        ]);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal analytics", () => {
  it.effect("sums up a range of days, in a time zone", () =>
    Effect.gen(function* sums() {
      const session = yield* signedIn();

      const summary = yield* session.printed([
        "analytics",
        "summary",
        ...inStudio,
        "--from",
        "2026-11-01",
        "--to",
        "2026-11-07",
        "--time-zone",
        "America/New_York",
      ]);

      assert.include(
        summary,
        "Studio, posts published from 2026-11-01 to 2026-11-07 (America/New_York):"
      );
      assert.match(summary, /Likes\s+12/u);
      assert.match(summary, /Impressions\s+–/u);
      assert.include(
        summary,
        `${mastodonId} (mastodon @studio@social.example.test)`
      );
      assert.include(summary, "20 interactions");
      assert.deepStrictEqual(yield* changes(session.studio), [
        "summary:2026-11-01:2026-11-07:America/New_York",
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("defaults to the last 30 days, today as TZ has it", () =>
    Effect.gen(function* defaults() {
      // Late on the 9th in UTC: already the 10th in Paris.
      const session = yield* signedIn({
        now: DateTime.makeUnsafe("2026-11-09T23:30:00Z"),
      });

      yield* session.printed(["analytics", "summary", ...inStudio]);

      assert.deepStrictEqual(yield* changes(session.studio), [
        "summary:2026-10-12:2026-11-10:Europe/Paris",
      ]);
      assert.include(
        yield* session.refused([
          "analytics",
          "summary",
          ...inStudio,
          "--time-zone",
          "+01:00",
        ]),
        "+01:00 is not a time zone Peal knows"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("shows a post's counts on each channel", () =>
    Effect.gen(function* counts() {
      const session = yield* signedIn();

      const shown = yield* session.printed([
        "analytics",
        "post",
        finishedId,
        ...inStudio,
      ]);

      assert.include(shown, "https://social.example.test/@studio/1");
      assert.match(shown, /Reposts\s+4/u);
      assert.include(
        yield* session.printed(["analytics", "post", draftId, ...inStudio]),
        `Peal has read no counts of post ${draftId} yet`
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal analytics dashboard, channel and export", () => {
  it.effect(
    "shows the totals beside the range before, and followers with what they gained",
    () =>
      Effect.gen(function* dashboard() {
        const session = yield* signedIn();

        const shown = yield* session.printed([
          "analytics",
          "dashboard",
          ...inStudio,
          "--days",
          "7",
          "--time-zone",
          "Europe/Paris",
        ]);

        assert.include(
          shown,
          "Studio, from 2026-11-03 to 2026-11-09 (Europe/Paris), against 2026-10-27 to 2026-11-02:"
        );
        assert.match(shown, /Likes\s+12\s+\+6/u);
        assert.match(shown, /Impressions\s+–\s+–/u);
        assert.match(shown, /Followers\s+320\s+\+12/u);
        assert.include(
          shown,
          `${mastodonId} (mastodon @studio@social.example.test)`
        );
        assert.deepStrictEqual(yield* changes(session.studio), [
          "dashboard:7:undefined:undefined:Europe/Paris",
        ]);

        const longer = yield* session.printed([
          "analytics",
          "dashboard",
          ...inStudio,
          "--days",
          "90",
          "--time-zone",
          "Europe/Paris",
        ]);

        // The range before is gone in part: no change is made up.
        assert.match(longer, /Likes\s+12\s+–/u);
        assert.include(longer, "No change is shown");

        yield* session.printed([
          "analytics",
          "dashboard",
          ...inStudio,
          "--from",
          "2026-11-01",
          "--to",
          "2026-11-07",
          "--time-zone",
          "UTC",
        ]);

        assert.strictEqual(
          (yield* changes(session.studio)).at(-1),
          "dashboard:undefined:2026-11-01:2026-11-07:UTC"
        );
        assert.include(
          yield* session.refused([
            "analytics",
            "dashboard",
            ...inStudio,
            "--days",
            "7",
            "--from",
            "2026-11-01",
          ]),
          "Give --days, or --from and --to"
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("shows a channel day by day", () =>
    Effect.gen(function* channel() {
      const session = yield* signedIn();

      const shown = yield* session.printed([
        "analytics",
        "channel",
        mastodonId,
        ...inStudio,
        "--time-zone",
        "UTC",
      ]);

      assert.include(shown, "Followers: 320 (+12)");
      assert.match(shown, /2026-11-08\s+320\s+41\s+–\s+–\s+20/u);
      assert.match(shown, /2026-11-09\s+–\s+–\s+–\s+–\s+0/u);
      assert.deepStrictEqual(yield* changes(session.studio), [
        `channel:${mastodonId}:30:UTC`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("saves an export to a new file, and replaces none unasked", () =>
    Effect.gen(function* exporting() {
      const session = yield* signedIn();
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const file = path.join(session.directory, "accounts.csv");

      const shown = yield* session.printed([
        "analytics",
        "export",
        "accounts",
        ...inStudio,
        "--output",
        file,
        "--time-zone",
        "UTC",
      ]);

      assert.include(shown, `Saved to ${file}.`);
      assert.strictEqual(
        yield* fs.readFileString(file),
        `date,channelId,platform,followers\r\n2026-11-08,${mastodonId},mastodon,320\r\n`
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        "export:accounts:csv:30",
      ]);
      assert.include(
        yield* session.refused([
          "analytics",
          "export",
          "posts",
          ...inStudio,
          "--output",
          file,
          "--format",
          "json",
        ]),
        `${file} exists already`
      );

      // Cut off on the way: no file that looks complete, nothing left
      // behind, and the same command can be run again.
      const cut = `${file}.cut.csv`;

      const refused = yield* session.refused([
        "analytics",
        "export",
        "accounts",
        ...inStudio,
        "--output",
        cut,
        "--days",
        "90",
      ]);

      assert.include(refused, "cut off before its end");
      assert.isFalse(yield* fs.exists(cut));
      assert.isFalse(yield* fs.exists(`${cut}.partial`));
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal billing, members and invitations", () => {
  it.effect("shows the plan, its limits and what the workspace uses", () =>
    Effect.gen(function* plan() {
      const session = yield* signedIn();
      const shown = yield* session.printed(["billing", ...inStudio]);

      assert.include(shown, "Plan: free, with no subscription.");
      assert.match(shown, /Members\s+2 of 2/u);
      assert.match(
        shown,
        /Posts this month\s+7 of 30, until 2026-12-01T00:00:00Z/u
      );
      assert.match(shown, /Media stored\s+125\.0 MB of 500\.0 MB/u);
      assert.include(shown, "may try the pro plan free for 14 days");
      assert.include(
        yield* session.refused(["billing", "--workspace", "shop"]),
        "your role in this workspace does not allow it"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "says what a workspace holds beyond its plan, and the way out",
    () =>
      Effect.gen(function* over() {
        const session = yield* signedIn();

        assert.notInclude(
          yield* session.printed(["billing", ...inStudio]),
          "more than its plan allows"
        );

        yield* Ref.update(session.studio.state, (state) => ({
          ...state,
          overPlan: true,
        }));

        const shown = yield* session.printed(["billing", ...inStudio]);

        assert.include(
          shown,
          "The workspace holds more than its plan allows: 8 channels of 3, 5 members of 2, 1.2 GB of media of 500.0 MB."
        );
        assert.include(
          shown,
          "Until it is back within its plan, nothing is scheduled or published: the 7 posts going out this month each fail when due, and can be posted again afterwards."
        );
        assert.include(
          shown,
          "The pro plan holds everything: an owner or an admin orders it, or chooses which channels and members stay, in the web app."
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists the channels, with Instagram's way in", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();
      const listed = yield* session.printed(["channels", "list", ...inStudio]);

      assert.match(listed, /mastodon\s+@studio@social\.example\.test\s+posts/u);
      assert.match(
        listed,
        /bluesky\s+studio\.example\.test\s+must be reconnected/u
      );
      assert.match(
        listed,
        /instagram \(Instagram Login\)\s+@studio_example\s+posts/u
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists the members and the pending invitations", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();

      assert.match(
        yield* session.printed(["members", "list", ...inStudio]),
        /Sam Example <sam@example.test>\s+viewer/u
      );
      assert.match(
        yield* session.printed(["invitations", "list", ...inStudio]),
        /guest@example\.test\s+editor\s+expired 2026-11-08T10:00:00Z/u
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("invites someone with a role, and revokes the invitation", () =>
    Effect.gen(function* invites() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed([
          "invitations",
          "send",
          "newcomer@example.test",
          "--role",
          "editor",
          ...inStudio,
        ]),
        "Invited newcomer@example.test to Studio as editor"
      );
      assert.include(
        yield* session.refused([
          "invitations",
          "send",
          "sam@example.test",
          ...inStudio,
        ]),
        "That address belongs to a member already."
      );
      assert.include(
        yield* session.printed([
          "invitations",
          "revoke",
          "0190f3a0-0000-7000-8000-00000000a002",
          ...inStudio,
        ]),
        "its link no longer works"
      );
      assert.include(
        yield* session.refused([
          "invitations",
          "revoke",
          "0190f3a0-0000-7000-8000-00000000a002",
          ...inStudio,
        ]),
        "The workspace has no pending invitation with that id"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        "invite:newcomer@example.test:editor",
        "revoke:0190f3a0-0000-7000-8000-00000000a002",
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

const ExportedSchema = Schema.fromJsonString(
  Schema.Struct({
    exportedAt: Schema.String,
    user: Schema.Struct({ email: Schema.String }),
  })
);

describe("peal account", () => {
  it.effect(
    "saves a copy of the user's data in a file only they may read, and never over another",
    () =>
      Effect.gen(function* exports() {
        const session = yield* signedIn();
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const file = path.join(session.directory, "my-data.json");

        const saved = yield* session.printed([
          "account",
          "export",
          "--output",
          file,
        ]);

        assert.include(saved, `to ${file}, which only you may read`);

        const written = yield* Schema.decodeUnknownEffect(ExportedSchema)(
          yield* fs.readFileString(file)
        );

        assert.strictEqual(written.user.email, "synthetic@example.test");
        assert.isTrue(
          DateTime.isDateTime(
            DateTime.make(written.exportedAt).pipe(Option.getOrUndefined)
          )
        );
        assert.strictEqual((yield* fs.stat(file)).mode % 0o1000, 0o600);

        assert.include(
          yield* session.refused(["account", "export", "-o", file]),
          `${file} exists already`
        );

        yield* session.printed(["account", "export", "-o", file, "--force"]);

        // The file named was checked before anything was asked.
        assert.deepStrictEqual(yield* changes(session.studio), [
          "export",
          "export",
        ]);
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "never replaces a file made while the server answers, unless forced",
    () =>
      Effect.gen(function* raced() {
        const session = yield* signedIn();
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const file = path.join(session.directory, "my-data.json");

        yield* Ref.set(
          session.studio.whileExporting,
          fs.writeFileString(file, "the user's own notes\n").pipe(Effect.orDie)
        );

        assert.include(
          yield* session.refused(["account", "export", "-o", file]),
          `${file} exists already`
        );
        assert.strictEqual(
          yield* fs.readFileString(file),
          "the user's own notes\n"
        );
        // Nothing is left beside it.
        assert.deepStrictEqual(
          (yield* fs.readDirectory(session.directory)).filter((name) =>
            name.includes("my-data")
          ),
          ["my-data.json"]
        );
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect(
    "writes the copy through no link someone left beside the file",
    () =>
      Effect.gen(function* planted() {
        const session = yield* signedIn();
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const file = path.join(session.directory, "my-data.json");
        const elsewhere = path.join(session.directory, "elsewhere.txt");

        yield* fs.writeFileString(elsewhere, "untouched\n", { mode: 0o666 });
        yield* fs.symlink(elsewhere, `${file}.tmp`);

        for (const args of [
          ["account", "export", "-o", file],
          ["account", "export", "-o", file, "--force"],
        ]) {
          yield* session.printed(args);

          assert.strictEqual(
            yield* fs.readFileString(elsewhere),
            "untouched\n"
          );
          assert.strictEqual((yield* fs.stat(file)).mode % 0o1000, 0o600);
        }
      }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists the applications that act for the user", () =>
    Effect.gen(function* apps() {
      const session = yield* signedIn();

      assert.match(
        yield* session.printed(["account", "apps"]),
        /Peal CLI\s+peal-cli\s+workspace:read workspace:write\s+any workspace\s+last used 2026-11-09T07:00:00Z/u
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("printing what the server holds", () => {
  it.effect("never hands the terminal the control sequences a text holds", () =>
    Effect.gen(function* controls() {
      const session = yield* signedIn();
      const escape = String.fromCodePoint(0x1b);

      // Sets the clipboard, clears the screen, then shows the rest
      // backwards.
      const hostile = [
        "Launch",
        `${escape}]52;c;c3ludGhldGlj${String.fromCodePoint(0x07)}`,
        `${escape}[2J`,
        `${String.fromCodePoint(0x9b)}31m`,
        `${String.fromCodePoint(0x20_2e)}day`,
      ].join("");

      yield* session.printed([
        "drafts",
        "save",
        "--text",
        hostile,
        ...inStudio,
      ]);

      const listed = yield* session.printed(["drafts", "list", ...inStudio]);

      const refused = yield* session.refused([
        "drafts",
        "save",
        "--options",
        `${escape}[2Jgone`,
        ...inStudio,
      ]);

      assert.include(listed, "Launch");
      assert.include(refused, "gone");

      for (const printed of [listed, refused]) {
        assert.strictEqual(printed, printable(printed));
        assert.notInclude(printed, escape);
      }
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
