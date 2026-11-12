import { describe, expect, it } from "@effect/vitest";

import {
  abilitiesOf,
  askedAtSignIn,
  engagedPlatforms,
  isEngaged,
} from "#engagement/domain/engagement-abilities.ts";
import type { InboxPlatforms } from "#shared/domain/inbox-platform.ts";
import { platforms } from "#shared/domain/platform.ts";

const none: InboxPlatforms = new Set();

const both: InboxPlatforms = new Set(["facebook", "instagram"]);

describe("what a channel can do about comments", () => {
  it("reads and answers on Mastodon, and likes when the account allowed it", () => {
    expect(
      abilitiesOf(
        "mastodon",
        ["profile", "read:statuses", "write:statuses"],
        none
      )
    ).toStrictEqual({
      delete: "unsupported",
      hide: "unsupported",
      like: "unsupported",
      read: "available",
      reply: "available",
      withdraw: "available",
    });
    expect(
      abilitiesOf("mastodon", ["write:statuses", "write:favourites"], none).like
    ).toBe("available");
  });

  it("reads and answers on Bluesky, and likes and hides with their permissions", () => {
    expect(
      abilitiesOf(
        "bluesky",
        ["atproto", "repo:app.bsky.feed.post?action=create&action=delete"],
        none
      )
    ).toStrictEqual({
      delete: "unsupported",
      hide: "unsupported",
      like: "unsupported",
      read: "available",
      reply: "available",
      withdraw: "available",
    });

    const widened = abilitiesOf(
      "bluesky",
      [
        "atproto",
        "repo:app.bsky.feed.post?action=create&action=delete",
        "repo:app.bsky.feed.like?action=create&action=delete",
        "repo:app.bsky.feed.threadgate",
      ],
      none
    );

    expect(widened.like).toBe("available");
    expect(widened.hide).toBe("available");
  });

  it("never takes a permission for another collection's", () => {
    expect(
      abilitiesOf("bluesky", ["atproto", "repo:app.bsky.feed.postgate"], none)
        .reply
    ).toBe("reconnect");
    // A like's scope is not asked at sign-in: reconnecting would not help.
    expect(abilitiesOf("mastodon", ["write:statuses"], none).like).toBe(
      "unsupported"
    );
  });

  it("reads and acts on a Facebook Page with each permission, where the server reads Facebook", () => {
    expect(
      abilitiesOf(
        "facebook",
        [
          "pages_show_list",
          "pages_read_user_content",
          "pages_manage_engagement",
        ],
        both
      )
    ).toStrictEqual({
      delete: "unsupported",
      hide: "available",
      like: "unsupported",
      read: "available",
      reply: "available",
      withdraw: "available",
    });
    // Reading without answering; a Page connected before asks to reconnect.
    expect(
      abilitiesOf("facebook", ["pages_read_user_content"], both)
    ).toStrictEqual({
      delete: "unsupported",
      hide: "reconnect",
      like: "unsupported",
      read: "available",
      reply: "reconnect",
      withdraw: "reconnect",
    });
    expect(
      Object.values(abilitiesOf("facebook", ["pages_manage_posts"], both))
    ).not.toContain("available");
  });

  it("reads and acts on Instagram with the comments permission of either way in", () => {
    const able = {
      delete: "unsupported",
      hide: "available",
      like: "unsupported",
      read: "available",
      reply: "available",
      withdraw: "available",
    };

    expect(
      abilitiesOf(
        "instagram",
        ["instagram_basic", "instagram_manage_comments"],
        both
      )
    ).toStrictEqual(able);
    expect(
      abilitiesOf("instagram", ["instagram_business_manage_comments"], both)
    ).toStrictEqual(able);
    expect(
      abilitiesOf("instagram", ["instagram_business_basic"], both)
    ).toStrictEqual({
      delete: "unsupported",
      hide: "reconnect",
      like: "unsupported",
      read: "reconnect",
      reply: "reconnect",
      withdraw: "reconnect",
    });
  });

  it("does nothing on Facebook and Instagram where the server does not read them", () => {
    const granted = [
      "pages_read_user_content",
      "pages_manage_engagement",
      "instagram_manage_comments",
      "instagram_business_manage_comments",
    ];

    for (const platform of ["facebook", "instagram"] as const) {
      expect(
        Object.values(abilitiesOf(platform, granted, none)).every(
          (standing) => standing === "unsupported"
        )
      ).toBeTruthy();
    }

    expect(abilitiesOf("instagram", granted, new Set(["facebook"])).read).toBe(
      "unsupported"
    );
    expect(askedAtSignIn("facebook", none)).toStrictEqual([]);
    expect(askedAtSignIn("facebook", both)).toStrictEqual([
      "read",
      "reply",
      "withdraw",
      "hide",
    ]);
    expect(askedAtSignIn("mastodon", none)).toStrictEqual([
      "read",
      "reply",
      "withdraw",
    ]);
  });

  it("reads, answers, withdraws and hides on YouTube with the comment scope alone, where the server reads YouTube", () => {
    const youtube: InboxPlatforms = new Set(["youtube"]);

    const posting = [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
    ];

    expect(
      abilitiesOf(
        "youtube",
        [...posting, "https://www.googleapis.com/auth/youtube.force-ssl"],
        youtube
      )
    ).toStrictEqual({
      delete: "unsupported",
      hide: "available",
      like: "unsupported",
      read: "available",
      reply: "available",
      withdraw: "available",
    });
    // A channel connected before the server read YouTube's comments, or
    // whose owner unticked the scope: connecting again asks for it.
    expect(abilitiesOf("youtube", posting, youtube)).toStrictEqual({
      delete: "unsupported",
      hide: "reconnect",
      like: "unsupported",
      read: "reconnect",
      reply: "reconnect",
      withdraw: "reconnect",
    });
    // The discovery document lists `youtube.force-ssl` alone for comments.
    expect(
      abilitiesOf(
        "youtube",
        ["https://www.googleapis.com/auth/youtube"],
        youtube
      ).read
    ).toBe("reconnect");
    expect(askedAtSignIn("youtube", youtube)).toStrictEqual([
      "read",
      "reply",
      "withdraw",
      "hide",
    ]);
  });

  it("does nothing on YouTube where the server does not read it", () => {
    const granted = ["https://www.googleapis.com/auth/youtube.force-ssl"];

    expect(
      Object.values(abilitiesOf("youtube", granted, both)).every(
        (standing) => standing === "unsupported"
      )
    ).toBeTruthy();
    expect(askedAtSignIn("youtube", both)).toStrictEqual([]);
  });

  it("does nothing on the platforms Peal reads no comments on", () => {
    for (const platform of platforms.filter((name) => !isEngaged(name))) {
      expect(
        Object.values(abilitiesOf(platform, ["anything"], both)).every(
          (standing) => standing === "unsupported"
        )
      ).toBeTruthy();
    }
  });

  it("deletes nobody else's comment where the platform lets no account do it", () => {
    for (const platform of engagedPlatforms) {
      expect(
        abilitiesOf(platform, ["write", "transition:generic"], none).delete
      ).toBe("unsupported");
    }
  });
});
