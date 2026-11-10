import { describe, expect, it } from "@effect/vitest";

import {
  abilitiesOf,
  engagedPlatforms,
  isEngaged,
} from "#engagement/domain/engagement-abilities.ts";
import { platforms } from "#shared/domain/platform.ts";

describe("what a channel can do about comments", () => {
  it("reads and answers on Mastodon, and likes when the account allowed it", () => {
    expect(
      abilitiesOf("mastodon", ["profile", "read:statuses", "write:statuses"])
    ).toStrictEqual({
      delete: "unsupported",
      hide: "unsupported",
      like: "reconnect",
      read: "available",
      reply: "available",
      withdraw: "available",
    });
    expect(
      abilitiesOf("mastodon", ["write:statuses", "write:favourites"]).like
    ).toBe("available");
  });

  it("reads and answers on Bluesky, and likes and hides with their permissions", () => {
    expect(
      abilitiesOf("bluesky", [
        "atproto",
        "repo:app.bsky.feed.post?action=create&action=delete",
      ])
    ).toStrictEqual({
      delete: "unsupported",
      hide: "reconnect",
      like: "reconnect",
      read: "available",
      reply: "available",
      withdraw: "available",
    });

    const widened = abilitiesOf("bluesky", [
      "atproto",
      "repo:app.bsky.feed.post?action=create&action=delete",
      "repo:app.bsky.feed.like?action=create&action=delete",
      "repo:app.bsky.feed.threadgate",
    ]);

    expect(widened.like).toBe("available");
    expect(widened.hide).toBe("available");
  });

  it("never takes a permission for another collection's", () => {
    expect(
      abilitiesOf("bluesky", ["atproto", "repo:app.bsky.feed.postgate"]).reply
    ).toBe("reconnect");
  });

  it("does nothing on the platforms Peal reads no comments on", () => {
    for (const platform of platforms.filter((name) => !isEngaged(name))) {
      expect(
        Object.values(abilitiesOf(platform, ["anything"])).every(
          (standing) => standing === "unsupported"
        )
      ).toBeTruthy();
    }
  });

  it("deletes nobody else's comment where the platform lets no account do it", () => {
    for (const platform of engagedPlatforms) {
      expect(
        abilitiesOf(platform, ["write", "transition:generic"]).delete
      ).toBe("unsupported");
    }
  });
});
