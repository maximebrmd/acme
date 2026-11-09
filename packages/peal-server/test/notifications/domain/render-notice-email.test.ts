import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import type {
  NoticeChannel,
  NoticeEvent,
} from "#notifications/domain/notice-event.ts";
import { PostFailureReasonSchema } from "#notifications/domain/notice-event.ts";
import { renderNoticeEmail } from "#notifications/domain/render-notice-email.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

const url = "https://app.example.test/app/0b1c/posts/0190";

const postId = PostIdSchema.make("00000000-0000-7000-8000-000000000001");

const mastodon: Option.Option<NoticeChannel> = Option.some({
  handle: "@alice@social.example",
  platform: "mastodon",
});

const render = (event: NoticeEvent, locale: Locale) =>
  renderNoticeEmail({ event, locale, url, workspaceName: "Studio Nord" });

const locales: readonly Locale[] = ["en", "fr"];

describe(renderNoticeEmail, () => {
  it("asks to reconnect a channel, in English", () => {
    const email = render(
      {
        _tag: "ChannelReconnectRequired",
        channel: { handle: "@alice@social.example", platform: "mastodon" },
      },
      "en"
    );

    expect(email.subject).toBe("Reconnect @alice@social.example on Mastodon");
    expect(email.text).toContain(
      "Peal can no longer post as @alice@social.example on Mastodon in Studio Nord"
    );
    expect(email.text).toContain(`Reconnect the account: ${url}`);
    expect(email.html).toContain(`href="${url}"`);
  });

  it("gives the expiry in the reader's language, in UTC", () => {
    const email = render(
      {
        _tag: "ChannelReconnectSoon",
        channel: { handle: "@bob.test", platform: "bluesky" },
        expiresAt: DateTime.makeUnsafe("2026-12-01T09:30:00Z"),
      },
      "fr"
    );

    expect(email.subject).toBe(
      "Reconnectez @bob.test sur Bluesky avant le 1 décembre 2026 à 09:30 UTC"
    );
    expect(email.html).toContain('<html lang="fr">');
  });

  const published: NoticeEvent = {
    _tag: "PostPublished",
    channel: mastodon,
    permalink: Option.some("https://social.example/@alice/1"),
    postId,
  };

  it("tells a published post, in English", () => {
    const english = render(published, "en");

    expect(english.subject).toBe(
      "Published on Mastodon (@alice@social.example)"
    );
    expect(english.text).toContain(
      "A post of Studio Nord is live on Mastodon (@alice@social.example)."
    );
    expect(english.text).toContain(`See the post: ${url}`);
  });

  it("tells a published post, in French", () => {
    const french = render(published, "fr");

    expect(french.subject).toBe("Publié sur Mastodon (@alice@social.example)");
    expect(french.text).toContain(`Voir la publication\u00A0: ${url}`);
    expect(french.html).toContain('<html lang="fr">');
  });

  it("says why a post failed, in each language", () => {
    const event: NoticeEvent = {
      _tag: "PostFailed",
      channel: mastodon,
      postId,
      reason: "tokenExpired",
    };

    expect(render(event, "en").text).toContain(
      "A post of Studio Nord did not go out on Mastodon (@alice@social.example): the account’s authorization stopped working. Reconnect it, then post again."
    );
    expect(render(event, "fr").text).toContain(
      "Une publication de Studio Nord n’est pas partie sur Mastodon (@alice@social.example)\u00A0: l’autorisation du compte ne fonctionne plus."
    );
  });

  // Nothing in Peal turns a channel back on, and reconnecting leaves it off:
  // a new channel for the account is what members can make.
  it("says what members can do with a channel turned off", () => {
    const event: NoticeEvent = {
      _tag: "PostFailed",
      channel: mastodon,
      postId,
      reason: "channelDisabled",
    };

    expect(render(event, "en").text).toContain(
      "its channel was turned off before it went out. Disconnect the channel and connect the account again, then schedule it in a new post."
    );
    expect(render(event, "fr").text).toContain(
      "son canal a été désactivé avant son départ. Déconnectez le canal et connectez à nouveau le compte, puis programmez-la dans une nouvelle publication."
    );
  });

  it("words every failure in every language", () => {
    for (const reason of PostFailureReasonSchema.literals) {
      for (const locale of locales) {
        const email = render(
          { _tag: "PostFailed", channel: mastodon, postId, reason },
          locale
        );

        // Every placeholder is filled.
        expect(email.subject).not.toMatch(/\{\w+\}/u);
        expect(email.text).not.toMatch(/\{\w+\}/u);
      }
    }
  });

  it("asks to check the platform before reposting an unconfirmed post", () => {
    const event: NoticeEvent = {
      _tag: "PostUnconfirmed",
      channel: mastodon,
      postId,
    };

    const english = render(event, "en");
    const french = render(event, "fr");

    expect(english.subject).toBe(
      "Check Mastodon (@alice@social.example): a post may have gone out"
    );
    expect(english.text).toContain(
      "Check the platform before you post it again"
    );
    expect(french.subject).toBe(
      "Vérifiez Mastodon (@alice@social.example)\u00A0: une publication est peut-être partie"
    );
    expect(french.text).toContain(
      "Vérifiez sur la plateforme avant de la republier"
    );
  });

  it("names a channel disconnected since as such", () => {
    const event: NoticeEvent = {
      _tag: "PostUnconfirmed",
      channel: Option.none(),
      postId,
    };

    expect(render(event, "en").subject).toBe(
      "Check a disconnected channel: a post may have gone out"
    );
    expect(render(event, "fr").subject).toBe(
      "Vérifiez un canal déconnecté\u00A0: une publication est peut-être partie"
    );
  });

  it("escapes names in HTML and keeps them in the text", () => {
    const email = renderNoticeEmail({
      event: {
        _tag: "PostPublished",
        channel: Option.some({ handle: "@a<b>", platform: "x" }),
        permalink: Option.none(),
        postId,
      },
      locale: "en",
      url,
      workspaceName: 'Studio "Nord" & Co',
    });

    expect(email.html).toContain("X (@a&lt;b&gt;)");
    expect(email.html).toContain("Studio &quot;Nord&quot; &amp; Co");
    expect(email.html).not.toContain("<b>");
    expect(email.text).toContain('Studio "Nord" & Co');
  });
});
