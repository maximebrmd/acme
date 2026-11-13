import { assert, layer } from "@effect/vitest";
import { Effect, Option } from "effect";

import { DigestLinks } from "#notifications/application/digest-links.ts";
import { HmacDigestLinks } from "#notifications/infrastructure/hmac-digest-links.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";

// The weekly digest's one-click unsubscribe tokens: signed with the
// server's secret (the development one here), for one user and one
// generation of their links, never expiring.

const userId = UserIdSchema.make("6c1d9e0a-2b3f-4a5c-8d7e-9f0a1b2c3d4e");
const other = UserIdSchema.make("7d2e0f1b-3c4a-4b6d-9e8f-0a1b2c3d4e5f");

layer(HmacDigestLinks)("the digest's unsubscribe tokens", (it) => {
  it.effect("read back the user and the generation they were signed for", () =>
    Effect.gen(function* roundTrip() {
      const links = yield* DigestLinks;
      const token = yield* links.tokenOf(userId, 3);

      assert.match(token, /^[\w.-]+$/u, "safe in a path segment");
      assert.deepStrictEqual(
        yield* links.read(token),
        Option.some({ links: 3, userId })
      );
    })
  );

  it.effect("read nothing from a token changed in any part, or malformed", () =>
    Effect.gen(function* forged() {
      const links = yield* DigestLinks;
      const token = yield* links.tokenOf(userId, 3);
      const tag = token.split(".").at(2) ?? "";

      const tried = [
        // Another user, or another generation, under the same tag.
        `${other}.3.${tag}`,
        `${userId}.4.${tag}`,
        // The tag changed.
        `${userId}.3.${tag.slice(0, -2)}AA`,
        `${userId}.3.`,
        "",
        "not-a-token",
        `${userId}.-1.${tag}`,
        `${userId}.3.${tag}.more`,
      ];

      for (const candidate of tried) {
        assert.isTrue(
          Option.isNone(yield* links.read(candidate)),
          `refuses ${candidate}`
        );
      }
    })
  );
});
