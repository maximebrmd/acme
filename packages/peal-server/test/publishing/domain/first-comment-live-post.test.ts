import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { livePostSupport } from "#publishing/domain/live-post-support.ts";
import { followUpsOn } from "#publishing/domain/platform-rules.ts";
import { platforms } from "#shared/domain/platform.ts";

// A live post's later parts are deleted and edited as posts of its
// platform (`ChangeLivePostV1`): a first comment is no post there, and the
// platform's post call would be handed a comment's id. Every platform
// whose parts are comments neither deletes nor edits today; the day one
// does, its adapter must delete or edit the comment through the
// platform's comment call, and this test changes with it.
describe("the platforms whose parts are comments", () => {
  it("neither delete nor edit a live post from Peal yet", () => {
    expect(
      platforms
        .filter((platform) => followUpsOn(platform)?.kind === "comment")
        .filter(
          (platform) =>
            Option.isNone(livePostSupport[platform].unpublish) ||
            Option.isNone(livePostSupport[platform].edit)
        )
    ).toStrictEqual([]);
  });
});
