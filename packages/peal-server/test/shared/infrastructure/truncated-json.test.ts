import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { closedJson } from "#shared/infrastructure/platforms/truncated-json.ts";

// The document made whole, as text; "nothing" when there is none.
const closed = (text: string): string =>
  closedJson(text).pipe(Option.getOrElse(() => "nothing"));

describe(closedJson, () => {
  const whole = JSON.stringify({
    ancestors: [],
    descendants: [
      { content: "one", id: "1" },
      { content: 'two "quoted" ] } [ {', id: "2" },
      { content: "three \\", id: "3" },
    ],
  });

  it("keeps the elements read whole, and drops the one that was cut", () => {
    const cutAt = whole.indexOf('"three');

    expect(closed(whole.slice(0, cutAt))).toBe(
      JSON.stringify({
        ancestors: [],
        descendants: [
          { content: "one", id: "1" },
          { content: 'two "quoted" ] } [ {', id: "2" },
        ],
      })
    );
  });

  it("reads brackets and quotes inside a text as text", () => {
    // Cut inside the second element's text, after its brackets.
    const cutAt = whole.indexOf("] } [") + 3;

    expect(closed(whole.slice(0, cutAt))).toBe(
      JSON.stringify({
        ancestors: [],
        descendants: [{ content: "one", id: "1" }],
      })
    );
  });

  it("closes every level of a tree cut deep inside it", () => {
    const tree = JSON.stringify({
      thread: {
        post: { uri: "a" },
        replies: [
          { post: { uri: "b" }, replies: [{ post: { uri: "c" } }] },
          {
            post: { uri: "d" },
            replies: [{ post: { uri: "e" } }, { post: { uri: "f" } }],
          },
        ],
      },
    });

    expect(closed(tree.slice(0, tree.indexOf('{"post":{"uri":"f"')))).toBe(
      JSON.stringify({
        thread: {
          post: { uri: "a" },
          replies: [
            { post: { uri: "b" }, replies: [{ post: { uri: "c" } }] },
            { post: { uri: "d" }, replies: [{ post: { uri: "e" } }] },
          ],
        },
      })
    );
  });

  it("keeps numbers and words an array held whole", () => {
    expect(closed('{"counts":[1,22,3')).toBe(
      JSON.stringify({ counts: [1, 22] })
    );
    expect(closed('{"flags":[true,null,fal')).toBe(
      JSON.stringify({
        flags: [true, null],
      })
    );
  });

  it.each([
    '{"descendants":[{"id":"1"',
    '{"error":"too large',
    "",
    "<html>",
    '{"a":[1}',
  ])("makes nothing of %s", (text) => {
    expect(closed(text)).toBe("nothing");
  });

  it("leaves a whole document as it reads", () => {
    expect(closed(whole)).toBe(whole);
  });
});
