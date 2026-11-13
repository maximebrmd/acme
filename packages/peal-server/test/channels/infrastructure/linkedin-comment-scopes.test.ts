import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Option, Redacted } from "effect";

import type {
  AuthorizationCallback,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { ConnectAttempt } from "#channels/domain/connect-attempt.ts";
import { linkedinPagesAuthorizer } from "#channels/infrastructure/platforms/linkedin/linkedin-pages-authorizer.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { InboxPlatforms } from "#shared/domain/inbox-platform.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import {
  AuthorizerServicesTest,
  linkedinAuthorizerOn,
  testPublicUrl,
} from "#test/channels/connect-support.ts";
import {
  fakeLinkedIn,
  linkedinFakeVersion,
  linkedinMember,
  linkedinPage,
  linkedinPagesClient,
} from "#test/channels/fakes/fake-linkedin.ts";

// What LinkedIn's sign-ins ask for, with the inbox's optional platforms
// off and on: the pages' sign-in asks the two comment scopes only where
// the inbox reads LinkedIn, and off asks what it asked before, byte for
// byte; the profile's sign-in never changes, as a member's own posts are
// not read.

const off: InboxPlatforms = new Set();

const on: InboxPlatforms = new Set(["linkedin"]);

const pagesBefore =
  "r_organization_social rw_organization_admin w_organization_social";

const profileBefore = "openid profile w_member_social";

const begun = {
  handle: Option.none(),
  instance: Option.none(),
  reconnecting: Option.none(),
};

const pagesOn = (
  endpoints: Effect.Success<ReturnType<typeof fakeLinkedIn>>["endpoints"],
  inbox: InboxPlatforms
) =>
  publicHttpClient.pipe(
    Effect.flatMap((http) =>
      linkedinPagesAuthorizer({
        client: {
          clientId: linkedinPagesClient.clientId,
          clientSecret: Redacted.make(linkedinPagesClient.clientSecret),
        },
        endpoints,
        http,
        inbox,
        publicUrl: testPublicUrl,
        version: linkedinFakeVersion,
      })
    ),
    Effect.provide(AuthorizerServicesTest)
  );

const scopeOf = (authorizer: PlatformAuthorizer) =>
  authorizer
    .begin(begun)
    .pipe(
      Effect.map(({ authorizationUrl }) =>
        new URL(authorizationUrl).searchParams.get("scope")
      )
    );

// The member signs in and approves: the scopes the page is recorded with.
const signIn = Effect.fnUntraced(function* signIn(
  linkedin: Effect.Success<ReturnType<typeof fakeLinkedIn>>,
  authorizer: PlatformAuthorizer
) {
  const begin = yield* authorizer.begin(begun);
  const back = linkedin.approve(begin.authorizationUrl);
  const now = DateTime.makeUnsafe("2026-11-12T09:00:00.000Z");

  const callback: AuthorizationCallback = {
    code: Option.some(back.code),
    error: Option.none(),
    issuer: Option.none(),
    state: back.state,
  };

  const completed = yield* authorizer.complete({
    attempt: new ConnectAttempt({
      channelId: Option.none(),
      connection: Option.some("linkedinPage"),
      createdAt: now,
      expiresAt: DateTime.addDuration(now, "15 minutes"),
      instance: Option.none(),
      platform: "linkedin",
      startedBy: "user:synthetic",
      state: back.state,
      workspaceId: WorkspaceIdSchema.make(
        "01900000-0000-7000-8000-0000000000f4"
      ),
    }),
    callback,
    reconnecting: Option.none(),
    secret: begin.secret,
  });

  return "accounts" in completed
    ? completed.accounts.map(({ tokens }) => [...tokens.scopes].toSorted())
    : [[...completed.tokens.scopes].toSorted()];
});

describe("LinkedIn's comment scopes at sign-in", () => {
  it.effect(
    "are not asked where the inbox does not read LinkedIn, as before",
    () =>
      Effect.gen(function* notAsked() {
        const linkedin = yield* fakeLinkedIn();

        assert.strictEqual(
          yield* scopeOf(yield* pagesOn(linkedin.endpoints, off)),
          pagesBefore
        );
        assert.strictEqual(
          yield* scopeOf(
            yield* pagesOn(linkedin.endpoints, new Set(["youtube", "facebook"]))
          ),
          pagesBefore
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "are asked last by the pages' sign-in where the inbox reads LinkedIn",
    () =>
      Effect.gen(function* asked() {
        const linkedin = yield* fakeLinkedIn();

        assert.strictEqual(
          yield* scopeOf(yield* pagesOn(linkedin.endpoints, on)),
          `${pagesBefore} r_organization_social_feed w_organization_social_feed`
        );
      }).pipe(Effect.scoped)
  );

  it.effect("never change the profile's sign-in", () =>
    Effect.gen(function* profile() {
      const linkedin = yield* fakeLinkedIn();

      assert.strictEqual(
        yield* scopeOf(yield* linkedinAuthorizerOn(linkedin.endpoints)),
        profileBefore
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "record what was asked when LinkedIn's answer lists no scope, the comment scopes included",
    () =>
      Effect.gen(function* fallback() {
        const linkedin = yield* fakeLinkedIn();

        linkedin.grantRoles(linkedinMember.sub, [
          {
            organization: linkedinPage.id,
            role: "ADMINISTRATOR",
            state: "APPROVED",
          },
        ]);

        const listed = yield* signIn(
          linkedin,
          yield* pagesOn(linkedin.endpoints, on)
        );

        linkedin.omitScopes();

        const unlisted = yield* signIn(
          linkedin,
          yield* pagesOn(linkedin.endpoints, on)
        );

        const all = [
          "r_organization_social",
          "r_organization_social_feed",
          "rw_organization_admin",
          "w_organization_social",
          "w_organization_social_feed",
        ];

        assert.deepStrictEqual(listed, [all]);
        assert.deepStrictEqual(unlisted, [all]);
      }).pipe(Effect.scoped)
  );
});
