import { describe, expect, it } from "@effect/vitest";

import { suspiciousLinks } from "#posts/link-check.ts";

describe(suspiciousLinks, () => {
  it.each([
    "https://example.com",
    "http://example.com/path?query=1#part",
    "HTTPS://Example.COM/",
    "https://sub.example.co.uk:8443/a/b",
    "https://user@example.com/",
    "http://localhost:3000/preview",
    "http://192.0.2.10/status",
    "http://[2001:db8::1]:8080/",
    "https://exämple.example/straße",
    "Read https://example.com/a_(b), then https://example.org.",
    "(see https://example.com)",
    "A link with an unclosed bracket: (https://example.com/page",
    "https://example.com/path(with)brackets]",
    "https://example.com/a,b;c",
    "https://my_site.example.com",
    "www.example.com",
    "example.com/pricing",
  ])("leaves a working link alone: %s", (text) => {
    expect(suspiciousLinks(text)).toStrictEqual([]);
  });

  it.each([
    "@peal",
    "@peal@mastodon.example",
    "Thanks @peal.social!",
    "member@example.com",
    "mailto:member@example.com",
    "#http",
    "#https://",
    "ftp://files.example.com/report.pdf",
    "The http: scheme is older than https.",
    "note: //not a link",
    "10:30 // tomorrow",
    "either/or, and/or",
    "tel:+33123456789",
    "at://did:plc:example/app.bsky.feed.post/1",
    "Ratio 16:9, score 3:/2",
    "",
  ])("leaves what is no link alone: %s", (text) => {
    expect(suspiciousLinks(text)).toStrictEqual([]);
  });

  it.each([
    ["htp://example.com", "htp://example.com"],
    ["htps://example.com/a", "htps://example.com/a"],
    ["hhtp://example.com", "hhtp://example.com"],
    ["thtp://example.com", "thtp://example.com"],
    ["httpss://example.com", "httpss://example.com"],
    ["ttps://example.com", "ttps://example.com"],
    ["https//example.com", "https//example.com"],
    ["http:/example.com", "http:/example.com"],
    ["http:/x", "http:/x"],
    ["http;//example.com", "http;//example.com"],
    ["https:///example.com", "https:///example.com"],
    ["https:example.com", "https:example.com"],
    ["Read http:// today", "http://"],
    ["https://.", "https://"],
    ["http://example", "http://example"],
    ["http://exa mple.com", "http://exa"],
    ["http://example..com", "http://example..com"],
    ["http://.example.com", "http://.example.com"],
    ["http://-example.com", "http://-example.com"],
    ["(htp://example.com).", "htp://example.com"],
  ])("names what would not work: %s", (text, piece) => {
    expect(suspiciousLinks(text)).toStrictEqual([piece]);
  });

  it("names each piece once, in the order written", () => {
    expect(
      suspiciousLinks(
        "First htp://example.com\nthen https//example.org, and htp://example.com again; https://example.net works."
      )
    ).toStrictEqual(["htp://example.com", "https//example.org"]);
  });
});
