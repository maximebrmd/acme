import { describe, expect, it } from "@effect/vitest";

import { blueskyScope } from "#channels/infrastructure/platforms/bluesky/bluesky-client.ts";
import {
  legacyScopes,
  profileScopes,
} from "#channels/infrastructure/platforms/mastodon/mastodon-authorizer.ts";
import {
  abilitiesOf,
  askedAtSignIn,
  engagedPlatforms,
} from "#engagement/domain/engagement-abilities.ts";

// What an account connected today can do about comments, from the scopes
// its platform's sign-in asks for: the same sign-in whether a member
// connects it in the app or a customer through a connect link. An ability
// said to be asked at sign-in must be one a fresh connection holds, or the
// inbox would tell everyone to reconnect for ever.

const grants = {
  bluesky: [blueskyScope.split(" ")],
  mastodon: [profileScopes.split(" "), legacyScopes.split(" ")],
} as const;

describe("the inbox abilities of an account connected today", () => {
  it("covers every platform Peal reads comments on", () => {
    expect(Object.keys(grants).toSorted()).toStrictEqual(
      [...engagedPlatforms].toSorted()
    );
  });

  it.each(engagedPlatforms)(
    "are available on %s for whatever its sign-in asks for",
    (platform) => {
      for (const scopes of grants[platform]) {
        const abilities = abilitiesOf(platform, scopes);

        for (const ability of askedAtSignIn) {
          expect([ability, abilities[ability]]).toStrictEqual([
            ability,
            "available",
          ]);
        }

        // What no sign-in asks for is never promised by reconnecting.
        expect(Object.values(abilities)).not.toContain("reconnect");
      }
    }
  );

  it("asks an account connected before to reconnect, and promises nothing its platform lacks", () => {
    expect(abilitiesOf("mastodon", ["read:accounts"])).toStrictEqual({
      delete: "unsupported",
      hide: "unsupported",
      like: "unsupported",
      read: "available",
      reply: "reconnect",
      withdraw: "reconnect",
    });
  });
});
