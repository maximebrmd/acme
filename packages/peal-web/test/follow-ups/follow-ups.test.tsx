import { assert, describe, expect, it } from "@effect/vitest";
import { DateTime, Effect, Option } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { FollowUpRule, FollowUpRulePage } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { FollowUpRuleView } from "#components/follow-ups/follow-up-views.tsx";
import { everyFollowUpRule } from "#follow-ups/atoms.ts";
import {
  followUpRequestOf,
  freshFollowUp,
  ruleOfPost,
} from "#follow-ups/rules.ts";
import { loadMessages } from "#i18n/messages.ts";

// Follow-up rules in the web app: the request the form sends, and how a
// rule and what it did read, in both languages.

const at = (iso: string) => DateTime.makeUnsafe(iso);

// A button's handler that does nothing: the markup is what is checked.
const allowNothing = (channelId: string): void => {
  expect(channelId).toBeTypeOf("string");
};

const postId = "0190f3a0-0000-7000-8000-00000000d002";

const rule: FollowUpRule = {
  approval: "pending",
  approvedAt: null,
  approvedBy: null,
  channelId: null,
  channels: [
    {
      channelId: "0190f3a0-0000-7000-8000-00000000c001",
      comment: "available",
      platform: "mastodon",
      repost: "available",
    },
    {
      channelId: "0190f3a0-0000-7000-8000-00000000c009",
      comment: "notAllowed",
      platform: "linkedin",
      repost: "notAllowed",
    },
  ],
  comment: "Thank you all for reading!",
  createdAt: at("2026-07-06T07:00:00Z"),
  endedReason: null,
  followUps: [
    {
      armedAt: at("2026-07-06T07:00:00Z"),
      channelId: "0190f3a0-0000-7000-8000-00000000c001",
      id: "0190f3a0-0000-7000-8000-0000000f0101",
      kind: "comment",
      likes: 52,
      permalink: "https://social.example.test/@studio/1",
      platformPostId: "1",
      postId,
      reason: null,
      sentAt: at("2026-07-07T09:00:00Z"),
      status: "sent",
      targetId: "0190f3a0-0000-7000-8000-00000000e011",
      triggeredAt: at("2026-07-07T08:59:00Z"),
      until: null,
    },
    {
      armedAt: at("2026-07-06T07:00:00Z"),
      channelId: "0190f3a0-0000-7000-8000-00000000c001",
      id: "0190f3a0-0000-7000-8000-0000000f0102",
      kind: "repost",
      likes: null,
      permalink: null,
      platformPostId: null,
      postId,
      reason: "belowThreshold",
      sentAt: null,
      status: "expired",
      targetId: "0190f3a0-0000-7000-8000-00000000e011",
      triggeredAt: null,
      until: null,
    },
  ],
  id: "0190f3a0-0000-7000-8000-0000000f0001",
  likes: 50,
  postId,
  repost: true,
  startedBy: null,
  startedVia: { id: null, name: null, via: "web" },
  status: "active",
};

const render = async (locale: "en" | "fr", node: React.ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      {node}
    </NextIntlClientProvider>
  );

describe("the follow-up form", () => {
  it("sends the likes, the comment trimmed and the repost for a post", () => {
    expect(
      followUpRequestOf(postId, {
        comment: "  Thank you!  ",
        likes: "120",
        repost: true,
      })
    ).toStrictEqual(
      Option.some({ comment: "Thank you!", likes: 120, postId, repost: true })
    );
    expect(
      followUpRequestOf(postId, { ...freshFollowUp, repost: true })
    ).toStrictEqual(Option.some({ likes: 50, postId, repost: true }));
  });

  it("refuses likes that are not a whole number, and a rule that does nothing", () => {
    expect(followUpRequestOf(postId, { ...freshFollowUp, likes: "ten" })).toBe(
      "likes"
    );
    expect(followUpRequestOf(postId, freshFollowUp)).toBe("nothing");
  });
});

describe("the workspace's follow-up rules", () => {
  it.effect("are read page after page", () =>
    Effect.gen(function* paged() {
      const pages = new Map<string | undefined, FollowUpRulePage>([
        [undefined, { items: [rule], nextCursor: "a" }],
        ["a", { items: [{ ...rule, id: "second" }], nextCursor: null }],
      ]);

      const all = yield* everyFollowUpRule((cursor) =>
        Effect.succeed(pages.get(cursor) ?? { items: [], nextCursor: null })
      );

      assert.deepStrictEqual(
        all.items.map(({ id }) => id),
        [rule.id, "second"]
      );
      assert.strictEqual(ruleOfPost(all.items, postId)?.id, rule.id);
      assert.isUndefined(ruleOfPost([{ ...rule, status: "ended" }], postId));
    })
  );

  it("say what each does, what each channel carries and what each follow-up became", async () => {
    const english = await render(
      "en",
      <FollowUpRuleView actions={null} rule={rule} scope="On a post" />
    );

    expect(english).toContain("At 50 likes: a comment and a repost");
    expect(english).toContain("Awaiting approval");
    expect(english).toContain(
      "LinkedIn: comment forbidden by the platform’s rules, repost forbidden by the platform’s rules"
    );
    expect(english).toContain("the post did not reach the likes");

    const french = await render(
      "fr",
      <FollowUpRuleView
        actions={null}
        rule={rule}
        scope="Sur une publication"
      />
    );

    expect(french).toContain("À 50 J’aime : un commentaire et un repartage");
  });

  it("offer to allow reposts on a channel that must be connected again for them, to who may", async () => {
    const waiting: FollowUpRule = {
      ...rule,
      channels: [
        {
          channelId: "0190f3a0-0000-7000-8000-00000000c002",
          comment: "available",
          platform: "bluesky",
          repost: "reconnect",
        },
      ],
    };

    const allowed = await render(
      "en",
      <FollowUpRuleView
        actions={null}
        onAllowReposts={() => {}}
        rule={waiting}
        scope="On a post"
      />
    );

    expect(allowed).toContain("Allow reposts");
    expect(allowed).toContain(
      "Bluesky: comment yes, repost connect the channel again"
    );

    // Nobody who may not change rules is offered it, nor on a channel
    // that reposts already.
    await expect(
      render(
        "en",
        <FollowUpRuleView actions={null} rule={waiting} scope="On a post" />
      )
    ).resolves.not.toContain("Allow reposts");
    await expect(
      render(
        "fr",
        <FollowUpRuleView
          actions={null}
          onAllowReposts={allowNothing}
          rule={rule}
          scope="Sur une publication"
        />
      )
    ).resolves.not.toContain("Autoriser les repartages");
  });
});
