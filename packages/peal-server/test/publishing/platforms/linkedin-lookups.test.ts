import { assert, describe, it } from "@effect/vitest";
import { Context, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";

import { PlatformLookups } from "#publishing/application/platform-lookups.ts";
import { TikTokCreators } from "#publishing/application/tiktok-creators.ts";
import type { LookupQuery } from "#publishing/domain/lookup.ts";
import { platformLookupsWith } from "#publishing/infrastructure/platforms/platform-lookups-live.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";
import {
  fakeLinkedInApi,
  linkedinMemberId,
  linkedinOtherPage,
  linkedinPageUrn,
} from "#test/publishing/fakes/fake-linkedin-api.ts";
import { headerOf, json } from "#test/publishing/fakes/platform-server.ts";

import { channelId, CredentialLog, credentialsOf } from "./support.ts";

const pageOf = (vanityName: string): LookupQuery => ({
  _tag: "linkedinOrganizations",
  vanityName,
});

// LinkedIn, and the lookups reading it as a page's channel, or a member's.
const onLinkedIn = Effect.fn("test.lookupsOnLinkedIn")(function* onLinkedIn(
  page: boolean
) {
  const linkedin = yield* fakeLinkedInApi({ page });

  const credentials = yield* Layer.build(
    credentialsOf(
      {
        accountId: page ? linkedinPageUrn : linkedinMemberId,
        connection: Option.some(page ? "linkedinPage" : "linkedinProfile"),
        platform: "linkedin",
      },
      ["linkedin-token-1"]
    )
  );

  const lookups = yield* Layer.build(
    platformLookupsWith({
      linkedinApi: new URL(linkedin.url),
      pinterestApi: new URL(linkedin.url),
      youtubeApi: new URL(linkedin.url),
    }).pipe(
      Layer.provide(
        Layer.mergeAll(
          Layer.succeedContext(credentials),
          Layer.succeed(
            TikTokCreators,
            TikTokCreators.of({
              read: () => Effect.fail(new PlatformUnavailable()),
              takesPhotos: false,
            })
          ),
          FetchHttpClient.layer,
          OpenOutboundGuard
        )
      )
    )
  );

  const { run } = Context.get(lookups, PlatformLookups);

  return {
    linkedin,
    log: Context.get(credentials, CredentialLog),
    run: (query: LookupQuery) => run(channelId, query),
  };
});

describe("LinkedIn's lookups", () => {
  it.effect("find the page of a vanity name, for a mention", () =>
    Effect.gen(function* found() {
      const { linkedin, run } = yield* onLinkedIn(true);
      const result = yield* run(pageOf(linkedinOtherPage.vanityName));

      assert.deepStrictEqual(result, {
        _tag: "linkedinOrganizations",
        items: [
          {
            name: "Example Bikes (UK)",
            urn: `urn:li:organization:${linkedinOtherPage.id}`,
            vanityName: Option.some("example-bikes"),
          },
        ],
        nextCursor: Option.none(),
      });

      const [request] = linkedin.requests();

      assert(request !== undefined);
      assert.strictEqual(request.path, "/rest/organizations");
      assert.strictEqual(
        request.query.toString(),
        "q=vanityName&vanityName=example-bikes"
      );
      assert.strictEqual(headerOf(request, "linkedin-version"), "202610");
      assert.strictEqual(
        headerOf(request, "x-restli-protocol-version"),
        "2.0.0"
      );
    }).pipe(Effect.scoped)
  );

  it.effect("answer nothing for a name no page has", () =>
    Effect.gen(function* none() {
      const { run } = yield* onLinkedIn(true);
      const result = yield* run(pageOf("no-such-page"));

      assert.deepStrictEqual(result.items, []);
    }).pipe(Effect.scoped)
  );

  it.effect("refuse a profile's channel, without asking LinkedIn", () =>
    Effect.gen(function* profile() {
      const { linkedin, run } = yield* onLinkedIn(false);
      const refused = yield* run(pageOf("example-bikes")).pipe(Effect.flip);

      assert.strictEqual(refused._tag, "LookupInputRejected");
      assert.strictEqual(linkedin.requests().length, 0);
    }).pipe(Effect.scoped)
  );

  it.effect("never take a refusal of the read for a token to reconnect", () =>
    Effect.gen(function* refusals() {
      const { linkedin, log, run } = yield* onLinkedIn(true);

      linkedin.script("GET /rest/organizations", [
        // A proxy's page, not LinkedIn's word on the token.
        json({ error: "Unauthorized" }, 401),
        json({ code: "ACCESS_DENIED", status: 403 }, 403),
        json({ message: "Too many requests", status: 429 }, 429),
        json({ code: "NONEXISTENT_VERSION", status: 426 }, 426),
      ]);

      const tags = [];

      for (let call = 0; call < 4; call += 1) {
        tags.push((yield* run(pageOf("example-bikes")).pipe(Effect.flip))._tag);
      }

      assert.deepStrictEqual(tags, [
        "PlatformUnavailable",
        "PlatformUnavailable",
        "RateLimited",
        "PlatformUnavailable",
      ]);
      assert.strictEqual(yield* log.renewals, 0);
    }).pipe(Effect.scoped)
  );
});
