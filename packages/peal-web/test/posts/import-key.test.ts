import { describe, expect, it } from "@effect/vitest";

import { newImportKey } from "#posts/import-key.ts";

const uuid =
  /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/u;

describe(newImportKey, () => {
  it("takes the browser's random UUID where it has one", () => {
    expect(
      newImportKey({
        getRandomValues: (array) => array,
        randomUUID: () => "00000000-0000-4000-8000-000000000001",
      })
    ).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("makes a version 4 UUID from random bytes outside a secure context", () => {
    const key = newImportKey({
      getRandomValues: (array) => {
        array.fill(0xff);

        return array;
      },
    });

    expect(key).toMatch(uuid);
    expect(key).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
  });
});
