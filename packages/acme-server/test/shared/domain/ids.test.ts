import { describe, expect, expectTypeOf, it } from "@effect/vitest";
import { Schema } from "effect";

import {
  Uuid7Schema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type {
  ChannelId,
  PostId,
  UserId,
  WorkspaceId,
} from "#shared/domain/ids.ts";

const isUuid7 = Schema.is(Uuid7Schema);

describe("the UUIDv7 id schema", () => {
  it("accepts a lowercase UUIDv7", () => {
    expect(isUuid7("019a6b2e-7c1d-7a3f-9b2e-5d4c3b2a1f0e")).toBeTruthy();
  });

  it.each([
    { id: "9b2c6d1e-4f4a-4c1b-8a8e-1d2f3a4b5c6d", label: "a UUIDv4" },
    {
      id: "019A6B2E-7C1D-7A3F-9B2E-5D4C3B2A1F0E",
      label: "an uppercase UUIDv7",
    },
    { id: "019a6b2e-7c1d-7a3f-1b2e-5d4c3b2a1f0e", label: "a wrong variant" },
    { id: "019a6b2e7c1d7a3f9b2e5d4c3b2a1f0e", label: "a UUID without dashes" },
    { id: "post-1", label: "a made-up id" },
  ])("rejects $label", ({ id }) => {
    expect(isUuid7(id)).toBeFalsy();
  });

  it("keeps each kind of id apart", () => {
    expectTypeOf<PostId>().not.toEqualTypeOf<ChannelId>();
    expectTypeOf<ChannelId>().not.toEqualTypeOf<WorkspaceId>();
    expectTypeOf<UserId>().not.toEqualTypeOf<WorkspaceId>();
  });
});

// Better Auth issues user and workspace ids as random UUIDs.
describe.each([
  { name: "user", schema: UserIdSchema },
  { name: "workspace", schema: WorkspaceIdSchema },
])("the $name id schema", ({ schema }) => {
  const isId = Schema.is(schema);

  it.each([
    "9b2c6d1e-4f4a-4c1b-8a8e-1d2f3a4b5c6d",
    "019a6b2e-7c1d-7a3f-9b2e-5d4c3b2a1f0e",
  ])("accepts %s", (id) => {
    expect(isId(id)).toBeTruthy();
  });

  it.each(["9B2C6D1E-4F4A-4C1B-8A8E-1D2F3A4B5C6D", "workspace-1", ""])(
    "rejects %s",
    (id) => {
      expect(isId(id)).toBeFalsy();
    }
  );
});
