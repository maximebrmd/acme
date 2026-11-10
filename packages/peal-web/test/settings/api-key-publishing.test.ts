import { describe, expect, it } from "@effect/vitest";

import { mayPublish } from "#settings/api-key-publishing.ts";

describe(mayPublish, () => {
  it("is refused to a key that only reads and writes drafts", () => {
    expect(mayPublish(["post:read", "post:create", "post:update"])).toBeFalsy();
    expect(mayPublish([])).toBeFalsy();
  });

  it("is given by scheduling, publishing or approving", () => {
    expect(mayPublish(["post:read", "post:schedule"])).toBeTruthy();
    expect(mayPublish(["post:publish"])).toBeTruthy();
    expect(mayPublish(["post:approve"])).toBeTruthy();
  });
});
