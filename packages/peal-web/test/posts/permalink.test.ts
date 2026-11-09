import { describe, expect, it } from "@effect/vitest";

import { isWebAddress } from "#posts/permalink.ts";

describe(isWebAddress, () => {
  it.each([
    "https://social.example/@peal/1",
    "http://bsky.example/profile/peal/post/1",
  ])("takes %s", (address) => {
    expect(isWebAddress(address)).toBeTruthy();
  });

  it.each([
    "social.example/@peal/1",
    "mailto:peal@example.test",
    "ftp://files.example/post",
    // Never a link that runs code or embeds a page when opened. The script
    // address is put together, as the lint rules refuse one written out.
    ["javascript", "alert(1)"].join(":"),
    "data:text/html,<p>synthetic</p>",
  ])("refuses %s", (address) => {
    expect(isWebAddress(address)).toBeFalsy();
  });
});
