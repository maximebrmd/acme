import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { LivePostChangeIdSchema } from "#publishing/domain/live-post-change-id.ts";
import {
  editable,
  failChange,
  finishChange,
  LivePostChange,
  partEdited,
  partRemoved,
  removable,
  requestEdit,
  requestUnpublish,
} from "#publishing/domain/live-post-change.ts";
import type { PartToRemove } from "#publishing/domain/live-post-change.ts";
import {
  editBlocker,
  livePostSupport,
  unpublishBlocker,
} from "#publishing/domain/live-post-support.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import type { PostTargetStatus } from "#publishing/domain/post-target-status.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { platforms } from "#shared/domain/platform.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";

const targetId = PostTargetIdSchema.make(
  "00000000-0000-7000-8000-000000000001"
);

const postId = PostIdSchema.make("00000000-0000-7000-8000-000000000002");

const channelId = ChannelIdSchema.make("00000000-0000-7000-8000-000000000003");

const workspaceId = WorkspaceIdSchema.make(
  "8b0f4a52-3f5e-4c1e-9a7d-2f6f0e1d5c4b"
);

const changeId = LivePostChangeIdSchema.make(
  "00000000-0000-7000-8000-000000000004"
);

const utc = (iso: string): DateTime.Utc => DateTime.makeUnsafe(iso);

const publishedAt = utc("2026-06-15T08:00:00Z");

const now = utc("2026-06-16T09:00:00Z");

const id = (value: string) => PlatformPostIdSchema.make(value);

const livePart = (index: number, platformPostId: Option.Option<string>) => ({
  index,
  permalink: Option.none(),
  platformPostId: platformPostId.pipe(Option.map(id)),
  publishedAt,
  round: 1,
});

const published: PostTargetStatus = {
  _tag: "published",
  permalink: Option.some("https://social.example/@peal/1"),
  platformPostId: Option.some(id("1")),
  publishedAt,
};

const targetWith = (
  status: PostTargetStatus,
  liveParts: PostTarget["liveParts"] = []
) =>
  new PostTarget({
    channelId,
    id: targetId,
    liveParts,
    options: Option.none(),
    postId,
    round: 1,
    status,
  });

const request = (parts: readonly PartToRemove[]) =>
  requestUnpublish({
    channelId,
    id: changeId,
    now,
    parts,
    postId,
    requestedBy: Option.none(),
    requestedVia: Option.none(),
    targetId,
    workspaceId,
  });

describe("the parts a removal takes", () => {
  it("answers the parts of a thread last first, each with its id", () => {
    const target = targetWith(published, [
      livePart(0, Option.some("1")),
      livePart(1, Option.some("2")),
      livePart(2, Option.some("3")),
    ]);

    expect(
      removable(target, Option.some("mastodon"), Option.none())
    ).toStrictEqual(
      Result.succeed([
        { index: 2, platformPostId: id("3") },
        { index: 1, platformPostId: id("2") },
        { index: 0, platformPostId: id("1") },
      ])
    );
  });

  it("reads a target published before parts were kept as one part", () => {
    expect(
      removable(targetWith(published), Option.some("bluesky"), Option.none())
    ).toStrictEqual(Result.succeed([{ index: 0, platformPostId: id("1") }]));
  });

  it("refuses a target that is not published", () => {
    for (const status of [
      { _tag: "pending" },
      { _tag: "publishing", cancelRequested: false, startedAt: publishedAt },
      { _tag: "cancelled", cancelledAt: publishedAt },
    ] satisfies PostTargetStatus[]) {
      expect(
        removable(targetWith(status), Option.some("mastodon"), Option.none())
      ).toStrictEqual(Result.fail("notPublished"));
    }
  });

  it("refuses a target already removed", () => {
    expect(
      removable(
        targetWith({ ...published, removedAt: now }),
        Option.some("mastodon"),
        Option.none()
      )
    ).toStrictEqual(Result.fail("alreadyRemoved"));
  });

  it("refuses a platform where Peal cannot delete posts", () => {
    for (const platform of platforms) {
      const expected = Option.isSome(unpublishBlocker(platform))
        ? Result.fail("notSupported")
        : Result.succeed([{ index: 0, platformPostId: id("1") }]);

      expect(
        removable(targetWith(published), Option.some(platform), Option.none())
      ).toStrictEqual(expected);
    }
  });

  it("refuses a part Peal has no id for", () => {
    expect(
      removable(
        targetWith({ ...published, platformPostId: Option.none() }),
        Option.some("mastodon"),
        Option.none()
      )
    ).toStrictEqual(Result.fail("noPlatformId"));

    expect(
      removable(
        targetWith(published, [
          livePart(0, Option.some("1")),
          livePart(1, Option.none()),
        ]),
        Option.some("mastodon"),
        Option.none()
      )
    ).toStrictEqual(Result.fail("noPlatformId"));
  });

  it("refuses a channel that cannot be used now", () => {
    expect(
      removable(targetWith(published), Option.none(), Option.none())
    ).toStrictEqual(Result.fail("channelUnavailable"));

    // Unless the target itself says otherwise.
    expect(
      removable(
        targetWith({ ...published, removedAt: now }),
        Option.none(),
        Option.none()
      )
    ).toStrictEqual(Result.fail("alreadyRemoved"));
  });

  it("refuses while a change of the target is pending", () => {
    const pending = request([{ index: 0, platformPostId: id("1") }]);

    expect(
      removable(
        targetWith(published),
        Option.some("mastodon"),
        Option.some(pending)
      )
    ).toStrictEqual(Result.fail("changeInProgress"));
  });

  it("takes up the parts a failed removal left", () => {
    const target = targetWith(published, [
      livePart(0, Option.some("1")),
      livePart(1, Option.some("2")),
    ]);

    const failed = Result.getOrThrow(
      failChange(
        Result.getOrThrow(
          partRemoved(
            request([
              { index: 1, platformPostId: id("2") },
              { index: 0, platformPostId: id("1") },
            ]),
            1,
            false
          )
        ),
        "unavailable",
        now
      )
    );

    expect(
      removable(target, Option.some("mastodon"), Option.some(failed))
    ).toStrictEqual(Result.succeed([{ index: 0, platformPostId: id("1") }]));
  });
});

describe("the parts a removal takes after an edit", () => {
  it("takes up the parts the last failed removal left, past an edit made since", () => {
    const target = targetWith(published, [
      livePart(0, Option.some("1")),
      livePart(1, Option.some("2")),
    ]);

    const failed = Result.getOrThrow(
      failChange(
        Result.getOrThrow(
          partRemoved(
            request([
              { index: 1, platformPostId: id("2") },
              { index: 0, platformPostId: id("1") },
            ]),
            1,
            false
          )
        ),
        "unavailable",
        now
      )
    );

    const edited = Result.getOrThrow(
      finishChange(
        Result.getOrThrow(
          partEdited(
            requestEdit({
              channelId,
              id: LivePostChangeIdSchema.make(
                "00000000-0000-7000-8000-000000000005"
              ),
              now,
              part: { index: 0, platformPostId: id("1") },
              postId,
              requestedBy: Option.none(),
              requestedVia: Option.none(),
              targetId,
              text: "Corrected",
              workspaceId,
            }),
            0
          )
        ),
        now
      )
    );

    expect(
      removable(
        target,
        Option.some("mastodon"),
        Option.some(edited),
        Option.some(failed)
      )
    ).toStrictEqual(Result.succeed([{ index: 0, platformPostId: id("1") }]));
  });
});

describe("a live post change", () => {
  const parts = [
    { index: 1, platformPostId: id("2") },
    { index: 0, platformPostId: id("1") },
  ];

  it("starts pending, with every part to remove", () => {
    const change = request(parts);

    expect(change.status).toBe("pending");
    expect(change.partsLeft).toStrictEqual(parts);
    expect(change.kind).toBe("unpublish");
    expect(change.requestedAt).toStrictEqual(now);
    expect(change.finishedAt).toStrictEqual(Option.none());
  });

  it("drops each part removed, and remembers one already gone", () => {
    const first = Result.getOrThrow(partRemoved(request(parts), 1, false));

    expect(first.partsLeft).toStrictEqual([parts[1]]);
    expect(first.alreadyGone).toBeFalsy();

    const second = Result.getOrThrow(partRemoved(first, 0, true));

    expect(second.partsLeft).toStrictEqual([]);
    expect(second.alreadyGone).toBeTruthy();
  });

  it("removes a part again without change", () => {
    const first = Result.getOrThrow(partRemoved(request(parts), 1, false));

    expect(Result.getOrThrow(partRemoved(first, 1, false))).toStrictEqual(
      first
    );
  });

  it("is done once no part is left", () => {
    const change = Result.getOrThrow(
      partRemoved(
        Result.getOrThrow(partRemoved(request(parts), 1, false)),
        0,
        false
      )
    );

    const done = Result.getOrThrow(finishChange(change, now));

    expect(done.status).toBe("done");
    expect(done.finishedAt).toStrictEqual(Option.some(now));
    expect(Result.isFailure(finishChange(request(parts), now))).toBeTruthy();
  });

  it("fails with its code, keeping the parts left", () => {
    const failed = Result.getOrThrow(
      failChange(request(parts), "rateLimited", now)
    );

    expect(failed.status).toBe("failed");
    expect(failed.failureCode).toStrictEqual(Option.some("rateLimited"));
    expect(failed.partsLeft).toStrictEqual(parts);
    expect(failed.finishedAt).toStrictEqual(Option.some(now));
  });

  it("changes no more once it ended", () => {
    const failed = Result.getOrThrow(
      failChange(request(parts), "unavailable", now)
    );

    expect(Result.isFailure(partRemoved(failed, 1, false))).toBeTruthy();
    expect(
      Result.isFailure(failChange(failed, "unavailable", now))
    ).toBeTruthy();
    expect(Result.isFailure(finishChange(failed, now))).toBeTruthy();
  });

  it("is a Schema class", () => {
    expect(request(parts)).toBeInstanceOf(LivePostChange);
  });
});

describe("live post support", () => {
  it("describes every platform", () => {
    expect(Object.keys(livePostSupport).toSorted()).toStrictEqual(
      [...platforms].toSorted()
    );
  });

  it("deletes only where the platform and Peal's permissions allow", () => {
    expect(
      platforms.filter((platform) => Option.isNone(unpublishBlocker(platform)))
    ).toStrictEqual([
      "x",
      "bluesky",
      "mastodon",
      "pinterest",
      "googleBusiness",
    ]);
  });
});

const editRequest = (part: PartToRemove, text = "Corrected") =>
  requestEdit({
    channelId,
    id: changeId,
    now,
    part,
    postId,
    requestedBy: Option.none(),
    requestedVia: Option.none(),
    targetId,
    text,
    workspaceId,
  });

describe("the part an edit takes", () => {
  const thread = targetWith(published, [
    livePart(0, Option.some("1")),
    livePart(1, Option.some("2")),
  ]);

  it("answers the part asked for, with its id", () => {
    expect(
      editable(thread, Option.some("mastodon"), 1, Option.none())
    ).toStrictEqual(Result.succeed({ index: 1, platformPostId: id("2") }));

    expect(
      editable(targetWith(published), Option.some("mastodon"), 0, Option.none())
    ).toStrictEqual(Result.succeed({ index: 0, platformPostId: id("1") }));
  });

  it("refuses a target that is not published, or removed", () => {
    expect(
      editable(
        targetWith({ _tag: "pending" }),
        Option.some("mastodon"),
        0,
        Option.none()
      )
    ).toStrictEqual(Result.fail("notPublished"));

    expect(
      editable(
        targetWith({ ...published, removedAt: now }),
        Option.some("mastodon"),
        0,
        Option.none()
      )
    ).toStrictEqual(Result.fail("alreadyRemoved"));
  });

  it("refuses while a change of the target is pending", () => {
    expect(
      editable(
        thread,
        Option.some("mastodon"),
        0,
        Option.some(editRequest({ index: 0, platformPostId: id("1") }))
      )
    ).toStrictEqual(Result.fail("changeInProgress"));
  });

  it("refuses a channel that cannot be used now", () => {
    expect(editable(thread, Option.none(), 0, Option.none())).toStrictEqual(
      Result.fail("channelUnavailable")
    );
  });

  it("refuses a platform where Peal cannot edit posts", () => {
    for (const platform of platforms) {
      const expected = Option.isSome(editBlocker(platform))
        ? Result.fail("notSupported")
        : Result.succeed({ index: 0, platformPostId: id("1") });

      expect(
        editable(targetWith(published), Option.some(platform), 0, Option.none())
      ).toStrictEqual(expected);
    }
  });

  it("refuses a part Peal has no id for, or that is not live", () => {
    expect(
      editable(
        targetWith({ ...published, platformPostId: Option.none() }),
        Option.some("mastodon"),
        0,
        Option.none()
      )
    ).toStrictEqual(Result.fail("noPlatformId"));

    expect(
      editable(thread, Option.some("mastodon"), 2, Option.none())
    ).toStrictEqual(Result.fail("noPlatformId"));
  });

  it("edits a target whose removal failed: it is still live", () => {
    const failed = Result.getOrThrow(
      failChange(
        request([{ index: 0, platformPostId: id("1") }]),
        "unavailable",
        now
      )
    );

    expect(
      editable(thread, Option.some("mastodon"), 0, Option.some(failed))
    ).toStrictEqual(Result.succeed({ index: 0, platformPostId: id("1") }));
  });

  it("does not take up a failed edit's part for a removal", () => {
    const failedEdit = Result.getOrThrow(
      failChange(editRequest({ index: 1, platformPostId: id("2") }), "x", now)
    );

    expect(
      removable(thread, Option.some("mastodon"), Option.some(failedEdit))
    ).toStrictEqual(
      Result.succeed([
        { index: 1, platformPostId: id("2") },
        { index: 0, platformPostId: id("1") },
      ])
    );
  });
});

describe("an edit of a live post", () => {
  const part = { index: 1, platformPostId: id("2") };

  it("starts pending, with its part and its text", () => {
    const change = editRequest(part);

    expect(change.kind).toBe("edit");
    expect(change.status).toBe("pending");
    expect(change.partsLeft).toStrictEqual([part]);
    expect(change.text).toStrictEqual(Option.some("Corrected"));
  });

  it("is done once its part is edited, and keeps no text", () => {
    const edited = Result.getOrThrow(partEdited(editRequest(part), 1));

    expect(edited.partsLeft).toStrictEqual([]);
    expect(edited.text).toStrictEqual(Option.some("Corrected"));
    expect(Result.getOrThrow(partEdited(edited, 1))).toStrictEqual(edited);

    const done = Result.getOrThrow(finishChange(edited, now));

    expect(done.status).toBe("done");
    expect(done.text).toStrictEqual(Option.none());
  });

  it("keeps no text once it failed", () => {
    const failed = Result.getOrThrow(
      failChange(editRequest(part), "postGone", now)
    );

    expect(failed.text).toStrictEqual(Option.none());
    expect(failed.partsLeft).toStrictEqual([part]);
    expect(Result.isFailure(partEdited(failed, 1))).toBeTruthy();
  });

  it("is never a removal's part", () => {
    expect(
      Result.isFailure(partRemoved(editRequest(part), 1, false))
    ).toBeTruthy();
    expect(
      Result.isFailure(
        partEdited(request([{ index: 0, platformPostId: id("1") }]), 0)
      )
    ).toBeTruthy();
  });
});

describe("live post editing support", () => {
  it("edits only where the platform and Peal's permissions allow", () => {
    expect(
      platforms.filter((platform) => Option.isNone(editBlocker(platform)))
    ).toStrictEqual(["mastodon", "googleBusiness"]);
  });
});
