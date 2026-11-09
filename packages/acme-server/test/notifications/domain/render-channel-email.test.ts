import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";

import { renderChannelEmail } from "#notifications/domain/render-channel-email.ts";

const url = "https://app.example.test/app/0b1c/channels";

describe(renderChannelEmail, () => {
  it("asks to reconnect a channel, in English", () => {
    const email = renderChannelEmail({
      locale: "en",
      notice: {
        _tag: "ChannelReconnectRequired",
        handle: "@alice@social.example",
        platform: "mastodon",
      },
      url,
      workspaceName: "Studio Nord",
    });

    expect(email.subject).toBe("Reconnect @alice@social.example on Mastodon");
    expect(email.text).toContain(
      "Acme can no longer post as @alice@social.example on Mastodon in Studio Nord"
    );
    expect(email.text).toContain(`Reconnect the account: ${url}`);
    expect(email.html).toContain(`href="${url}"`);
  });

  it("gives the expiry in the reader's language, in UTC", () => {
    const email = renderChannelEmail({
      locale: "fr",
      notice: {
        _tag: "ChannelReconnectSoon",
        expiresAt: DateTime.makeUnsafe("2026-12-01T09:30:00Z"),
        handle: "@bob.test",
        platform: "bluesky",
      },
      url,
      workspaceName: "Studio Nord",
    });

    expect(email.subject).toBe(
      "Reconnectez @bob.test sur Bluesky avant le 1 décembre 2026 à 09:30 UTC"
    );
    expect(email.html).toContain('<html lang="fr">');
  });

  it("escapes names in HTML and keeps them in the text", () => {
    const email = renderChannelEmail({
      locale: "en",
      notice: {
        _tag: "ChannelReconnectRequired",
        handle: "@a<b>",
        platform: "x",
      },
      url,
      workspaceName: 'Studio "Nord" & Co',
    });

    expect(email.html).toContain("@a&lt;b&gt;");
    expect(email.html).toContain("Studio &quot;Nord&quot; &amp; Co");
    expect(email.html).not.toContain("<b>");
    expect(email.text).toContain('Studio "Nord" & Co');
  });
});
