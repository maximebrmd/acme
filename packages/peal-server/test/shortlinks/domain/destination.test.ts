import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  destinationOf,
  isShortenable,
  maxDestinationLength,
} from "#shortlinks/domain/destination.ts";

const base = new URL("https://go.example.test/");

describe("what a short link may lead to", () => {
  it("is an absolute http or https address", () => {
    expect(isShortenable("https://example.test/a?b=c#d", base)).toBeTruthy();
    expect(isShortenable("http://example.test/", base)).toBeTruthy();
    expect(isShortenable("ftp://example.test/", base)).toBeFalsy();
    expect(isShortenable("example.test/page", base)).toBeFalsy();
  });

  it("names no user or password", () => {
    expect(
      isShortenable("https://someone:secret@example.test/", base)
    ).toBeFalsy();
    expect(isShortenable("https://someone@example.test/", base)).toBeFalsy();
  });

  it("is not on the short links' own host", () => {
    expect(isShortenable("https://go.example.test/AbC1234", base)).toBeFalsy();
  });

  it("is not longer than the longest kept", () => {
    const long = `https://example.test/${"a".repeat(maxDestinationLength)}`;

    expect(isShortenable(long, base)).toBeFalsy();
  });
});

describe("where a short link leads", () => {
  it("is the address as a redirect writes it, in ASCII", () => {
    expect(
      Option.getOrThrow(destinationOf("https://пример.рф/путь", base))
    ).toBe("https://xn--e1afmkfd.xn--p1ai/%D0%BF%D1%83%D1%82%D1%8C");
  });

  it("is none for an address longer than 2,048 characters once written", () => {
    expect(
      Option.isNone(
        destinationOf(`https://example.test/${"ж".repeat(400)}`, base)
      )
    ).toBeTruthy();
  });
});
