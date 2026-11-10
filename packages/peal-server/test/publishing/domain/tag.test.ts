import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result, Schema } from "effect";

import { emptyContent } from "#publishing/domain/post-content.ts";
import { createDraft, schedulePost, tagPost } from "#publishing/domain/post.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import { TagIdSchema } from "#publishing/domain/tag-id.ts";
import {
  createTag,
  editTag,
  maxTagNameLength,
  maxTagsPerPost,
  PostTagIdsSchema,
  TagColourSchema,
  tagKeyOf,
  tagNameOf,
} from "#publishing/domain/tag.ts";
import { PostIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

const workspaceId = WorkspaceIdSchema.make(
  "00000000-0000-4000-8000-000000000002"
);

const tagId = (last: number) =>
  TagIdSchema.make(`00000000-0000-7000-8000-0000000000${last + 10}`);

const now = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

describe("a tag", () => {
  it("keeps the name as written, trimmed and composed", () => {
    expect(tagNameOf("  Launch  ")).toStrictEqual(Option.some("Launch"));
    expect(tagNameOf("Café")).toStrictEqual(Option.some("Café"));
  });

  it("has a name of one line, neither empty nor too long", () => {
    expect(Option.isNone(tagNameOf("   "))).toBeTruthy();
    expect(Option.isNone(tagNameOf("Two\nlines"))).toBeTruthy();
    expect(
      Option.isNone(tagNameOf("x".repeat(maxTagNameLength + 1)))
    ).toBeTruthy();
    expect(Option.isSome(tagNameOf("x".repeat(maxTagNameLength)))).toBeTruthy();
  });

  it("is the same tag whatever the case of its name", () => {
    expect(tagKeyOf("Launch")).toBe(tagKeyOf("LAUNCH"));
    expect(tagKeyOf("Launch")).not.toBe(tagKeyOf("Launches"));
  });

  it("takes a colour of the palette only", () => {
    const isColour = Schema.is(TagColourSchema);

    expect(isColour("teal")).toBeTruthy();
    expect(isColour("#ff0000")).toBeFalsy();
    expect(isColour("red; background: url(x)")).toBeFalsy();
  });

  it("keeps its id and its date when it is renamed", () => {
    const tag = createTag(
      tagId(1),
      workspaceId,
      { colour: "blue", name: "Launch" },
      now
    );

    const renamed = editTag(tag, { colour: "pink", name: "Relaunch" });

    expect(renamed.id).toBe(tag.id);
    expect(renamed.createdAt).toStrictEqual(tag.createdAt);
    expect(renamed.name).toBe("Relaunch");
    expect(renamed.colour).toBe("pink");
  });
});

describe("a post's tags", () => {
  const draft = createDraft(
    PostIdSchema.make("00000000-0000-7000-8000-000000000001"),
    workspaceId,
    emptyContent,
    Option.none()
  );

  it("are none on a new post", () => {
    expect(draft.tagIds).toStrictEqual([]);
  });

  it("are each there once, ten at most", () => {
    const isTagList = Schema.is(PostTagIdsSchema);

    expect(isTagList([tagId(1), tagId(2)])).toBeTruthy();
    expect(isTagList([tagId(1), tagId(1)])).toBeFalsy();
    expect(
      isTagList(
        Array.from({ length: maxTagsPerPost + 1 }, (_, at) => tagId(at))
      )
    ).toBeFalsy();
  });

  it("stay on the post through its life", () => {
    const tagged = tagPost(draft, [tagId(1), tagId(2)]);

    const scheduled = schedulePost(
      tagged,
      new Schedule({
        at: DateTime.makeUnsafe("2026-06-15T08:00:00Z"),
        timeZone: TimeZoneIdSchema.make("Europe/Paris"),
      }),
      now
    );

    expect(Result.getOrThrow(scheduled).tagIds).toStrictEqual([
      tagId(1),
      tagId(2),
    ]);
  });

  it("change whatever the post's status, and nothing else does", () => {
    const tagged = tagPost(draft, [tagId(1)]);

    expect(tagged.status).toStrictEqual(draft.status);
    expect(tagged.content).toBe(draft.content);
    expect(tagPost(tagged, []).tagIds).toStrictEqual([]);
  });
});
