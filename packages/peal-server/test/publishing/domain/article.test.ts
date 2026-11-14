import { assert, describe, it } from "@effect/vitest";
import { DateTime, Duration, Option, Result } from "effect";

import { emptyBody } from "#publishing/domain/article-body.ts";
import { ArticleContent } from "#publishing/domain/article-content.ts";
import { ArticleIdSchema } from "#publishing/domain/article-id.ts";
import {
  articleMediaOf,
  articleViolations,
  claimed,
  edited,
  livePostOf,
  newArticle,
  removedFromSite,
  retried,
  scheduled,
  sendAt,
  settled,
  unscheduled,
} from "#publishing/domain/article.ts";
import type { Article } from "#publishing/domain/article.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

const now = DateTime.makeUnsafe("2026-06-15T07:00:00Z");
const tomorrow = DateTime.makeUnsafe("2026-06-16T07:00:00Z");
const zone = TimeZoneIdSchema.make("Europe/Paris");
const cover = MediaAssetIdSchema.make("0199a000-0000-7000-8000-000000000c01");
const inBody = MediaAssetIdSchema.make("0199a000-0000-7000-8000-000000000c02");

const content = (fields: Partial<ArticleContent> = {}) =>
  new ArticleContent({
    body: {
      content: [
        {
          content: [{ text: "Sow peas early.", type: "text" }],
          type: "paragraph",
        },
      ],
      type: "doc",
    },
    categories: ["Garden"],
    coverMediaId: Option.none(),
    excerpt: Option.none(),
    siteStatus: "publish",
    tags: ["peas"],
    title: "Spring sowing",
    ...fields,
  });

const draft = (fields: Partial<ArticleContent> = {}): Article =>
  newArticle(
    {
      authorId: Option.none(),
      channelId: ChannelIdSchema.make("0199a000-0000-7000-8000-000000000a01"),
      content: content(fields),
      id: ArticleIdSchema.make("0199a000-0000-7000-8000-000000000b01"),
      workspaceId: WorkspaceIdSchema.make(
        "6f8c6a3e-1a2b-4c3d-8e9f-0a1b2c3d4e5f"
      ),
    },
    now
  );

const at = (instant: DateTime.Utc) =>
  new Schedule({ at: instant, timeZone: zone });

const ok = <A, E>(result: Result.Result<A, E>): A => {
  if (Result.isFailure(result)) {
    throw new Error("The transition was refused");
  }

  return result.success;
};

describe("an article", () => {
  it("is scheduled under a new revision, which a job of the last one cannot claim", () => {
    const first = ok(scheduled(draft(), at(tomorrow), now));
    const moved = ok(scheduled(first, at(tomorrow), now));

    assert.strictEqual(moved.revision, first.revision + 1);
    assert.strictEqual(
      claimed(moved, { revision: first.revision, round: 0 }, tomorrow, tomorrow)
        ._tag,
      "superseded"
    );
    assert.strictEqual(
      claimed(moved, { revision: moved.revision, round: 0 }, tomorrow, tomorrow)
        ._tag,
      "claimed"
    );
  });

  it("is missed past the lateness limit", () => {
    const due = ok(scheduled(draft(), at(now), now));
    const late = DateTime.addDuration(now, Duration.hours(2));
    const claim = claimed(due, { revision: due.revision, round: 0 }, now, late);

    assert.strictEqual(claim._tag, "missed");
    assert.strictEqual(
      claim._tag === "missed" && claim.article.state._tag === "failed"
        ? claim.article.state.reason
        : undefined,
      "missed"
    );
  });

  it("goes out at its time, or at once when the site publishes it itself", () => {
    assert.isTrue(
      DateTime.Equivalence(
        sendAt(ok(scheduled(draft(), at(tomorrow), now)), now),
        tomorrow
      )
    );
    assert.isTrue(
      DateTime.Equivalence(
        sendAt(
          ok(scheduled(draft({ siteStatus: "future" }), at(tomorrow), now)),
          now
        ),
        now
      )
    );
  });

  it("settles as the site answered, then may move to the site's trash once", () => {
    const due = ok(scheduled(draft(), at(now), now));
    const claim = claimed(due, { revision: due.revision, round: 0 }, now, now);
    const sending = claim._tag === "claimed" ? claim.article : due;

    const published = settled(
      sending,
      {
        _tag: "published",
        permalink: "https://garden.example/?p=101",
        platformPostId: PlatformPostIdSchema.make("101"),
      },
      now
    );

    assert.strictEqual(published.state._tag, "published");
    assert.isTrue(Result.isSuccess(livePostOf(published, "unpublish")));

    const removed = removedFromSite(published, now);

    assert.isTrue(Result.isFailure(livePostOf(removed, "unpublish")));
    assert.isTrue(Result.isFailure(edited(removed, content(), now)));
  });

  it("is sent again after failing, in a round of its own", () => {
    const due = ok(scheduled(draft(), at(now), now));
    const claim = claimed(due, { revision: due.revision, round: 0 }, now, now);
    const sending = claim._tag === "claimed" ? claim.article : due;

    const failed = settled(
      sending,
      { _tag: "failed", reason: "unavailable" },
      now
    );

    const again = ok(retried(failed, tomorrow));

    assert.strictEqual(again.state._tag, "scheduled");
    assert.strictEqual(again.round, 1);
    assert.strictEqual(
      claimed(again, { revision: again.revision, round: 1 }, tomorrow, tomorrow)
        ._tag,
      "claimed"
    );
    assert.isTrue(Result.isFailure(retried(again, tomorrow)));
  });

  it("goes back to draft only while it waits", () => {
    const due = ok(scheduled(draft(), at(tomorrow), now));

    assert.strictEqual(ok(unscheduled(due, now)).state._tag, "draft");
    assert.isTrue(Result.isFailure(unscheduled(draft(), now)));
  });

  it("names its cover, then its body's files, once each", () => {
    assert.deepStrictEqual(
      articleMediaOf(
        content({
          body: {
            content: [
              { attrs: { alt: "", mediaId: inBody }, type: "image" },
              { attrs: { alt: "", mediaId: cover }, type: "image" },
            ],
            type: "doc",
          },
          coverMediaId: Option.some(cover),
        })
      ),
      [cover, inBody]
    );
  });

  it("is refused at scheduling what the site would not take", () => {
    assert.deepStrictEqual(
      articleViolations(
        content({
          body: emptyBody,
          siteStatus: "future",
          tags: [
            "",
            ...Array.from({ length: 20 }, (_, index) => `tag ${index}`),
          ],
          title: " ",
        }),
        at(now),
        now
      ).map(({ _tag }) => _tag),
      [
        "titleMissing",
        "bodyMissing",
        "tooManyTerms",
        "termInvalid",
        "siteTimeInPast",
      ]
    );
    assert.deepStrictEqual(articleViolations(content(), at(tomorrow), now), []);
  });
});
