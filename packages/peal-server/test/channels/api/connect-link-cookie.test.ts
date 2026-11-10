import { describe, expect, it } from "@effect/vitest";
import { Option, Redacted } from "effect";

import { cookieOf, nonceOf } from "#channels/api/connect-link-cookie.ts";

const nonce = Redacted.make("synthetic-nonce-0123456789");

describe(cookieOf, () => {
  it("keeps the nonce from scripts, other paths and other sites", () => {
    expect(cookieOf(nonce, true).split("; ")).toStrictEqual([
      "peal_connect_link=synthetic-nonce-0123456789",
      "Path=/api/connect-links",
      "Max-Age=1800",
      "HttpOnly",
      "SameSite=Lax",
      "Secure",
    ]);
  });

  it("is sent over plain HTTP only where the pages are, as in development", () => {
    expect(cookieOf(nonce, false)).not.toContain("Secure");
  });
});

describe(nonceOf, () => {
  it("reads the nonce a browser sends back, and nothing from an empty one", () => {
    expect(
      Option.map(
        nonceOf({ peal_connect_link: "synthetic-nonce-0123456789" }),
        Redacted.value
      )
    ).toStrictEqual(Option.some("synthetic-nonce-0123456789"));
    expect(nonceOf({ peal_connect_link: "" })).toStrictEqual(Option.none());
    expect(nonceOf({ another: "cookie" })).toStrictEqual(Option.none());
  });
});
