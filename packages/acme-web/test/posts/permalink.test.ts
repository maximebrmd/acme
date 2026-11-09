import { describe, expect, it } from "@effect/vitest";

import { isWebAddress } from "#posts/permalink.ts";

describe(isWebAddress, () => {
  it.each([
    "https://social.example/@acme/1",
    "http://bsky.example/profile/acme/post/1",
  ])("takes %s", (address) => {
    expect(isWebAddress(address)).toBeTruthy();
  });

  it.each([
    "social.example/@acme/1",
    "mailto:acme@example.test",
    "ftp://files.example/post",
  ])("refuses %s", (address) => {
    expect(isWebAddress(address)).toBeFalsy();
  });
});
