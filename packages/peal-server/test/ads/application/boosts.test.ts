import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Option } from "effect";
import { SqlClient } from "effect/sql";

import { AdConnections } from "#ads/application/ad-connections.ts";
import { AdReports } from "#ads/application/ad-reports.ts";
import { BoostFollowUp } from "#ads/application/boost-follow-up.ts";
import { BoostOperations } from "#ads/application/boost-operations.ts";
import { Boosts } from "#ads/application/boosts.ts";
import type { BoostAsk } from "#ads/application/boosts.ts";
import { BoostStore } from "#ads/application/ports/boost-store.ts";
import type { PublishedOn } from "#ads/application/ports/promotable-posts.ts";
import { SpendAuthorizations } from "#ads/application/spend-authorizations.ts";
import type { AdAccount } from "#ads/domain/ad-account.ts";
import { Audience } from "#ads/domain/audience.ts";
import { SpendCallIdSchema } from "#ads/domain/ids.ts";
import { CurrencySchema } from "#ads/domain/money.ts";
import { newId } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import {
  adsBusinessUsage,
  creating,
  euroAccount,
  marketingError,
  settingStatus,
} from "#test/ads/fakes/fake-marketing-api.ts";
import { TestPosts } from "#test/ads/fakes/test-posts.ts";
import {
  AdsTest,
  connectedAccount,
  eur,
  freshOwner,
  member,
  onMeta,
  spendingOwner,
  tagOf,
  TestNetworks,
  through,
} from "#test/ads/support.ts";
import { dropped } from "#test/publishing/fakes/platform-server.ts";

const abroad = new Audience({ ageMax: 65, ageMin: 18, countries: ["US"] });

// A boost of 50.00 over a week, as a test asks for one unless it says
// otherwise.
const ask = (
  account: AdAccount,
  post: PublishedOn,
  changes: Partial<BoostAsk> = {}
): Effect.Effect<BoostAsk> =>
  DateTime.now.pipe(
    Effect.map((now) => ({
      accountId: account.id,
      audience: abroad,
      beneficiary: Option.none(),
      budget: { _tag: "total" as const, amount: 5000 },
      channelId: post.channelId,
      currency: CurrencySchema.make("EUR"),
      endsAt: DateTime.add(now, { days: 7 }),
      payer: Option.none(),
      postId: post.postId,
      specialAdCategory: "none" as const,
      startsAt: Option.none(),
      ...changes,
    }))
  );

// A boost asked for by the owner, on a post of theirs; not yet placed.
const requested = Effect.fn("test.requested")(function* requested(
  owner: Actor,
  account: AdAccount,
  changes: Partial<BoostAsk> = {},
  key: string = crypto.randomUUID()
) {
  const boosts = yield* Boosts;

  const post = yield* TestPosts.use((posts) =>
    posts.publish(owner.workspaceId)
  );

  const boost = yield* boosts.request(
    owner,
    yield* ask(account, post, changes),
    key
  );

  return { boost, post };
});

// The same, placed: its job's one attempt made.
const placed = Effect.fn("test.placed")(function* placed(
  owner: Actor,
  account: AdAccount,
  changes: Partial<BoostAsk> = {}
) {
  const operations = yield* BoostOperations;
  const boosts = yield* Boosts;
  const { boost, post } = yield* requested(owner, account, changes);
  const result = yield* operations.place(boost.id);

  return { boost: (yield* boosts.get(owner, boost.id)).boost, post, result };
});

const stateOf = (owner: Actor, boostId: string) =>
  Boosts.use((boosts) => boosts.get(owner, boostId)).pipe(
    Effect.map(({ boost }) => boost.state._tag)
  );

const toldTo = (owner: Actor) =>
  TestNetworks.use((networks) => networks.told(owner.workspaceId)).pipe(
    Effect.map((told) => told.map(({ news }) => news))
  );

layer(AdsTest, { excludeTestServices: true })("boosting a post", (it) => {
  it.effect(
    "reserves the budget, then makes everything paused and runs the campaign last",
    () =>
      Effect.gen(function* happy() {
        const api = yield* onMeta();
        const { account, owner } = yield* spendingOwner();
        const operations = yield* BoostOperations;
        const boosts = yield* Boosts;
        const spending = yield* SpendAuthorizations;
        const { boost, post } = yield* requested(owner, account);

        // Accepted: counted against the ceiling, its job started, and
        // nothing sent yet.
        assert.strictEqual(boost.state._tag, "requested");
        assert.strictEqual(boost.committed, 5000);
        assert.deepStrictEqual(yield* TestPosts.use((posts) => posts.started), [
          boost.id,
        ]);
        assert.lengthOf(api.writes(), 0);
        assert.strictEqual(
          (yield* spending.standing(owner, account.id)).committedThisMonth,
          5000
        );

        assert.strictEqual(yield* operations.place(boost.id), "settled");

        const writes = api.writes();

        assert.deepStrictEqual(
          writes.map(({ params, path }) => [
            path.replace(/^\/\d+$/u, "/<id>"),
            params["status"],
          ]),
          [
            ["/act_1001/campaigns", "PAUSED"],
            ["/act_1001/adsets", "PAUSED"],
            ["/act_1001/ads", "PAUSED"],
            ["/<id>", "ACTIVE"],
            ["/<id>", "ACTIVE"],
            ["/<id>", "ACTIVE"],
          ]
        );

        const [campaign, adSet, ad] = api.objects();

        // Innermost first: the campaign, which starts spending, is last.
        assert.deepStrictEqual(
          writes.slice(3).map(({ path }) => path),
          [`/${ad?.id ?? ""}`, `/${adSet?.id ?? ""}`, `/${campaign?.id ?? ""}`]
        );
        assert.strictEqual(adSet?.params["lifetime_budget"], "5000");
        assert.isDefined(adSet?.params["end_time"]);
        assert.strictEqual(campaign?.params["name"], `Peal boost ${boost.id}`);
        assert.deepStrictEqual(JSON.parse(ad?.params["creative"] ?? "{}"), {
          object_story_id: post.platformPostId,
        });

        const { boost: running, calls } = yield* boosts.get(owner, boost.id);

        assert.strictEqual(running.state._tag, "active");
        assert.deepStrictEqual(
          running.objects.campaignId,
          Option.fromUndefinedOr(campaign?.id)
        );
        assert.deepStrictEqual(
          calls.map(({ outcome, step }) => [step, Option.getOrNull(outcome)]),
          [
            ["createCampaign", "done"],
            ["createAdSet", "done"],
            ["createAd", "done"],
            ["activateAd", "done"],
            ["activateAdSet", "done"],
            ["activateCampaign", "done"],
          ]
        );
        assert.deepStrictEqual(yield* toldTo(owner), ["started"]);

        // Placing again changes nothing, and sends nothing.
        assert.strictEqual(yield* operations.place(boost.id), "settled");
        assert.lengthOf(api.writes(), 6);
      }).pipe(Effect.scoped)
  );

  it.effect("keeps who asked, and every change, in the audit trail", () =>
    Effect.gen(function* audited() {
      yield* onMeta();

      const { account, owner } = yield* spendingOwner();
      const boosts = yield* Boosts;
      const reports = yield* AdReports;
      const { boost } = yield* placed(owner, account);

      yield* boosts.control(owner, boost.id, "pause");
      yield* boosts.control(owner, boost.id, "stop");

      const trail = yield* reports.auditTrail(owner, Option.none());

      assert.deepStrictEqual(trail.map(({ action }) => action).toReversed(), [
        "spendingEnabled",
        "boostRequested",
        "boostStarted",
        "boostPaused",
        "boostStopped",
      ]);

      const asked = trail.find(({ action }) => action === "boostRequested");

      assert.deepStrictEqual(asked?.by, Option.some(owner.subject));
      assert.deepStrictEqual(asked?.amounts, { budget: 5000, committed: 5000 });
      // What Peal's job found has no one behind it.
      assert.isTrue(
        Option.isNone(
          trail.find(({ action }) => action === "boostStarted")?.by ??
            Option.some(owner.subject)
        )
      );
      // The trail answers to owners alone.
      assert.strictEqual(
        yield* tagOf(
          reports.auditTrail(member(owner.workspaceId, "admin"), Option.none())
        ),
        "MissingPermission"
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "answers the same boost to the same key, and never makes another",
    () =>
      Effect.gen(function* idempotent() {
        yield* onMeta();

        const { account, owner } = yield* spendingOwner();
        const boosts = yield* Boosts;

        const post = yield* TestPosts.use((posts) =>
          posts.publish(owner.workspaceId)
        );

        const asked = yield* ask(account, post);
        const first = yield* boosts.request(owner, asked, "key-1");
        const second = yield* boosts.request(owner, asked, "key-1");

        assert.strictEqual(first.id, second.id);
        assert.lengthOf(
          yield* boosts.list(owner, {
            before: Option.none(),
            postId: Option.none(),
          }),
          1
        );
        assert.strictEqual(
          yield* tagOf(
            boosts.request(
              owner,
              { ...asked, budget: { _tag: "total", amount: 9000 } },
              "key-1"
            )
          ),
          "BoostKeyReused"
        );
      }).pipe(Effect.scoped)
  );

  it.effect("makes one boost of the same key sent twice at once", () =>
    Effect.gen(function* together() {
      yield* onMeta();

      const { account, owner } = yield* spendingOwner();
      const boosts = yield* Boosts;

      const post = yield* TestPosts.use((posts) =>
        posts.publish(owner.workspaceId)
      );

      const asked = yield* ask(account, post);

      const [first, second] = yield* Effect.all(
        [
          boosts.request(owner, asked, "twice"),
          boosts.request(owner, asked, "twice"),
        ],
        { concurrency: 2 }
      );

      assert.strictEqual(first.id, second.id);
      assert.lengthOf(
        yield* boosts.list(owner, {
          before: Option.none(),
          postId: Option.some(post.postId),
        }),
        1
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "is for owners and admins, never staff acting as one, and applications need the permission",
    () =>
      Effect.gen(function* allowed() {
        yield* onMeta();

        const { account, owner } = yield* spendingOwner();
        const boosts = yield* Boosts;

        const post = yield* TestPosts.use((posts) =>
          posts.publish(owner.workspaceId)
        );

        const asked = yield* ask(account, post);

        assert.strictEqual(
          yield* tagOf(
            boosts.request(member(owner.workspaceId, "admin"), asked, "admin")
          ),
          "succeeded"
        );

        for (const role of ["editor", "contributor", "viewer"] as const) {
          assert.strictEqual(
            yield* tagOf(
              boosts.request(member(owner.workspaceId, role), asked, role)
            ),
            "MissingPermission"
          );
        }

        assert.strictEqual(
          yield* tagOf(
            boosts.request(through(owner, { _tag: "staff" }), asked, "staff")
          ),
          "MissingPermission"
        );
        assert.strictEqual(
          yield* tagOf(
            boosts.request(
              through(owner, {
                _tag: "application",
                permissions: ["ads:read"],
              }),
              asked,
              "reader"
            )
          ),
          "MissingPermission"
        );
        assert.strictEqual(
          yield* tagOf(
            boosts.request(
              through(owner, {
                _tag: "apiKey",
                permissions: ["ads:read", "ads:spend"],
              }),
              asked,
              "key"
            )
          ),
          "succeeded"
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "refuses what Peal can tell is wrong before anything is reserved or sent",
    () =>
      Effect.gen(function* refusals() {
        const api = yield* onMeta();
        const { account, owner } = yield* spendingOwner();
        const boosts = yield* Boosts;
        const posts = yield* TestPosts;
        const post = yield* posts.publish(owner.workspaceId);
        const asked = yield* ask(account, post);

        const refusalOf = (changed: BoostAsk) =>
          tagOf(boosts.request(owner, changed, crypto.randomUUID()));

        // The budget's currency is not the account's.
        assert.strictEqual(
          yield* refusalOf({ ...asked, currency: CurrencySchema.make("USD") }),
          "InvalidBoost"
        );
        // No end date in the future.
        assert.strictEqual(
          yield* refusalOf({ ...asked, endsAt: yield* DateTime.now }),
          "InvalidBoost"
        );
        // A special ad category.
        assert.strictEqual(
          yield* refusalOf({ ...asked, specialAdCategory: "housing" }),
          "InvalidBoost"
        );
        // An audience in the EU without who benefits and who pays.
        assert.strictEqual(
          yield* refusalOf({
            ...asked,
            audience: new Audience({
              ageMax: 65,
              ageMin: 18,
              countries: ["FR"],
            }),
          }),
          "InvalidBoost"
        );
        // An account that is not the workspace's.
        assert.strictEqual(
          yield* refusalOf({ ...asked, accountId: "not-an-account" }),
          "AdAccountNotFound"
        );
        // A post that is not published there.
        assert.strictEqual(
          yield* refusalOf({ ...asked, postId: "not-a-post" }),
          "PostNotPromotable"
        );

        const elsewhere = yield* posts.publish(owner.workspaceId, {
          platform: "mastodon",
        });

        assert.strictEqual(
          yield* refusalOf(yield* ask(account, elsewhere)),
          "PostNotPromotable"
        );

        // An Instagram account connected through Instagram Login cannot
        // run ads; one connected through its Page can.
        const direct = yield* posts.publish(owner.workspaceId, {
          connection: "instagramLogin",
          platform: "instagram",
        });

        const throughPage = yield* posts.publish(owner.workspaceId, {
          connection: "facebookLogin",
          platform: "instagram",
        });

        assert.strictEqual(
          yield* refusalOf(yield* ask(account, direct)),
          "PostNotPromotable"
        );
        assert.strictEqual(
          yield* refusalOf(yield* ask(account, throughPage)),
          "succeeded"
        );

        assert.lengthOf(api.writes(), 0);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "spends nothing until an owner allows it, nor on a server that only reads",
    () =>
      Effect.gen(function* off() {
        yield* onMeta();

        const owner = yield* freshOwner;
        const boosts = yield* Boosts;
        const account = yield* connectedAccount(owner);

        const post = yield* TestPosts.use((posts) =>
          posts.publish(owner.workspaceId)
        );

        const asked = yield* ask(account, post);

        assert.strictEqual(
          yield* tagOf(boosts.request(owner, asked, "off")),
          "SpendingNotEnabled"
        );
        assert.strictEqual(
          yield* tagOf(boosts.quote(owner, asked)),
          "SpendingNotEnabled"
        );

        yield* onMeta({}, "read");

        assert.strictEqual(
          yield* tagOf(boosts.request(owner, asked, "read")),
          "SpendingUnavailable"
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "refuses an account whose sign-in may not run ads, or that cannot run them",
    () =>
      Effect.gen(function* unusable() {
        const api = yield* onMeta({ permissions: ["ads_read"] });
        const { account, owner } = yield* spendingOwner();
        const boosts = yield* Boosts;

        const post = yield* TestPosts.use((posts) =>
          posts.publish(owner.workspaceId)
        );

        const asked = yield* ask(account, post);

        assert.strictEqual(
          yield* tagOf(boosts.request(owner, asked, "no-permission")),
          "AdAccountUnusable"
        );
        assert.lengthOf(api.writes(), 0);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "says before the last step what a boost commits and what room it has",
    () =>
      Effect.gen(function* quoting() {
        yield* onMeta();

        const { account, owner } = yield* spendingOwner(20_000);
        const boosts = yield* Boosts;

        const post = yield* TestPosts.use((posts) =>
          posts.publish(owner.workspaceId)
        );

        yield* requested(owner, account);

        const now = yield* DateTime.now;

        const quote = yield* boosts.quote(
          owner,
          yield* ask(account, post, {
            budget: { _tag: "daily", amount: 1000 },
            endsAt: DateTime.add(now, { days: 2 }),
          })
        );

        // Three calendar days at 10.00, and a quarter more on any of them.
        assert.strictEqual(quote.plan.days, 3);
        assert.strictEqual(quote.plan.committed, 3750);
        assert.strictEqual(quote.room.ceiling, 20_000);
        assert.strictEqual(quote.room.committed, 5000);
        // A quote reserves nothing.
        assert.lengthOf(
          yield* boosts.list(owner, {
            before: Option.none(),
            postId: Option.none(),
          }),
          1
        );
      }).pipe(Effect.scoped)
  );
});

layer(AdsTest, { excludeTestServices: true })("the monthly ceiling", (it) => {
  it.effect("lets one of two boosts asked together have the last of it", () =>
    Effect.gen(function* racing() {
      yield* onMeta();

      // Room for one boost of 50.00, not two.
      const { account, owner } = yield* spendingOwner(8000);
      const boosts = yield* Boosts;
      const posts = yield* TestPosts;

      const first = yield* ask(
        account,
        yield* posts.publish(owner.workspaceId)
      );

      const second = yield* ask(
        account,
        yield* posts.publish(owner.workspaceId)
      );

      const outcomes = yield* Effect.all(
        [
          tagOf(boosts.request(owner, first, "racer-1")),
          tagOf(boosts.request(owner, second, "racer-2")),
        ],
        { concurrency: 2 }
      );

      assert.deepStrictEqual(outcomes.toSorted(), [
        "SpendCeilingExceeded",
        "succeeded",
      ]);
      assert.lengthOf(
        yield* boosts.list(owner, {
          before: Option.none(),
          postId: Option.none(),
        }),
        1
      );
    }).pipe(Effect.scoped)
  );

  it.effect("counts what was committed, and says how much room is left", () =>
    Effect.gen(function* counting() {
      yield* onMeta();

      const { account, owner } = yield* spendingOwner(12_000);
      const boosts = yield* Boosts;

      yield* placed(owner, account);
      yield* placed(owner, account);

      const post = yield* TestPosts.use((posts) =>
        posts.publish(owner.workspaceId)
      );

      const refused = yield* Effect.flip(
        boosts.request(owner, yield* ask(account, post), "third")
      );

      assert.strictEqual(refused._tag, "SpendCeilingExceeded");

      if (refused._tag === "SpendCeilingExceeded") {
        assert.strictEqual(refused.ceiling, 12_000);
        assert.strictEqual(refused.committed, 10_000);
        assert.strictEqual(refused.requested, 5000);
      }

      // A smaller one fits.
      assert.strictEqual(
        yield* tagOf(
          boosts.request(
            owner,
            yield* ask(account, post, {
              budget: { _tag: "total", amount: 2000 },
            }),
            "fits"
          )
        ),
        "succeeded"
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "may be lowered under running boosts: they run on, and nothing new starts or resumes",
    () =>
      Effect.gen(function* lowered() {
        const api = yield* onMeta();
        const { account, owner } = yield* spendingOwner(20_000);
        const boosts = yield* Boosts;
        const spending = yield* SpendAuthorizations;
        const { boost } = yield* placed(owner, account);
        const other = yield* placed(owner, account);

        const standing = yield* spending.decide(owner, account.id, {
          _tag: "on",
          monthlyCeiling: eur(6000),
        });

        // Accepted, and Peal neither stops nor changes what runs.
        assert.strictEqual(standing.committedThisMonth, 10_000);
        assert.strictEqual(yield* stateOf(owner, boost.id), "active");
        assert.strictEqual(yield* stateOf(owner, other.boost.id), "active");
        assert.isTrue(
          api.objects("campaign").every(({ status }) => status === "ACTIVE")
        );

        const post = yield* TestPosts.use((posts) =>
          posts.publish(owner.workspaceId)
        );

        assert.strictEqual(
          yield* tagOf(
            boosts.request(
              owner,
              yield* ask(account, post, {
                budget: { _tag: "total", amount: 100 },
              }),
              "after"
            )
          ),
          "SpendCeilingExceeded"
        );

        // Pausing is always allowed; resuming spends, so the ceiling decides.
        yield* boosts.control(owner, boost.id, "pause");

        const writes = api.writes().length;

        assert.strictEqual(
          yield* tagOf(boosts.control(owner, boost.id, "resume")),
          "SpendCeilingExceeded"
        );
        assert.strictEqual(yield* stateOf(owner, boost.id), "paused");
        assert.lengthOf(api.writes(), writes);

        // Raised by the owner, it resumes.
        yield* spending.decide(owner, account.id, {
          _tag: "on",
          monthlyCeiling: eur(20_000),
        });
        yield* boosts.control(owner, boost.id, "resume");

        assert.strictEqual(yield* stateOf(owner, boost.id), "active");
      }).pipe(Effect.scoped)
  );

  it.effect("is checked again before the campaign runs", () =>
    Effect.gen(function* recheck() {
      const api = yield* onMeta();
      const { account, owner } = yield* spendingOwner(8000);
      const operations = yield* BoostOperations;
      const spending = yield* SpendAuthorizations;
      const { boost } = yield* requested(owner, account);

      // Lowered between the request and the placement.
      yield* spending.decide(owner, account.id, {
        _tag: "on",
        monthlyCeiling: eur(1000),
      });

      assert.strictEqual(yield* operations.place(boost.id), "settled");

      const { boost: failed } = yield* Boosts.use((boosts) =>
        boosts.get(owner, boost.id)
      );

      assert.deepStrictEqual(
        failed.state._tag === "failed" ? failed.state.reason : "",
        "ceilingExceeded"
      );
      assert.strictEqual(failed.committed, 0);
      // Everything that was made stays paused: nothing runs.
      assert.isTrue(
        api.objects("campaign").every(({ status }) => status === "PAUSED")
      );
      assert.deepStrictEqual((yield* toldTo(owner)).at(-1), "failed");
    }).pipe(Effect.scoped)
  );
});

layer(AdsTest, { excludeTestServices: true })(
  "the ad account's own limits",
  (it) => {
    it.effect("refuses a boost the account's spend cap has no room for", () =>
      Effect.gen(function* capped() {
        // A cap of 100.00, of which 70.00 is spent: 30.00 left.
        const api = yield* onMeta({
          accounts: [
            { ...euroAccount(), amount_spent: "7000", spend_cap: "10000" },
          ],
        });

        const { account, owner } = yield* spendingOwner();
        const boosts = yield* Boosts;

        const post = yield* TestPosts.use((posts) =>
          posts.publish(owner.workspaceId)
        );

        const refused = yield* Effect.flip(
          boosts.request(owner, yield* ask(account, post), "over-cap")
        );

        assert.strictEqual(refused._tag, "AccountSpendCapExceeded");

        if (refused._tag === "AccountSpendCapExceeded") {
          assert.strictEqual(refused.room, 3000);
        }

        // One that fits takes the room: the next one of the same size does
        // not.
        const small = { budget: { _tag: "total" as const, amount: 2000 } };

        yield* boosts.request(owner, yield* ask(account, post, small), "fits");

        assert.strictEqual(
          yield* tagOf(
            boosts.request(owner, yield* ask(account, post, small), "no-more")
          ),
          "AccountSpendCapExceeded"
        );
        assert.lengthOf(api.writes(), 0);
      }).pipe(Effect.scoped)
    );

    it.effect(
      "reads the account again before the campaign runs: a cap reached since leaves everything paused",
      () =>
        Effect.gen(function* capReached() {
          const api = yield* onMeta();
          const { account, owner } = yield* spendingOwner();
          const { boost } = yield* requested(owner, account);
          const held = api.account("1001");

          // Since the boost was asked for, the account got a cap and all but
          // reached it.
          held.spend_cap = "10000";
          held.amount_spent = "9900";

          yield* BoostOperations.use((operations) =>
            operations.place(boost.id)
          );

          const { boost: after } = yield* Boosts.use((boosts) =>
            boosts.get(owner, boost.id)
          );

          assert.strictEqual(
            after.state._tag === "failed"
              ? after.state.reason
              : after.state._tag,
            "accountSpendCap"
          );
          // The campaign stays paused, and holds everything under it.
          assert.isTrue(
            api.objects("campaign").every(({ status }) => status === "PAUSED")
          );
        }).pipe(Effect.scoped)
    );

    it.effect(
      "reads the account again before making anything: one disabled since gets nothing",
      () =>
        Effect.gen(function* disabled() {
          const api = yield* onMeta();
          const { account, owner } = yield* spendingOwner();
          const { boost } = yield* requested(owner, account);
          const held = api.account("1001");

          held.account_status = 2;

          yield* BoostOperations.use((operations) =>
            operations.place(boost.id)
          );

          const { boost: after } = yield* Boosts.use((boosts) =>
            boosts.get(owner, boost.id)
          );

          assert.strictEqual(
            after.state._tag === "failed"
              ? after.state.reason
              : after.state._tag,
            "accountUnusable"
          );
          assert.lengthOf(api.writes(), 0);

          // And the account, read as disabled, takes no new boost.
          const post = yield* TestPosts.use((posts) =>
            posts.publish(owner.workspaceId)
          );

          assert.strictEqual(
            yield* tagOf(
              Boosts.use((boosts) =>
                Effect.flatMap(ask(account, post), (asked) =>
                  boosts.request(owner, asked, "after")
                )
              )
            ),
            "AdAccountUnusable"
          );
        }).pipe(Effect.scoped)
    );

    it.effect(
      "fails a boost whose account turned out to count in another currency, sending nothing",
      () =>
        Effect.gen(function* currency() {
          const api = yield* onMeta();
          const { account, owner } = yield* spendingOwner();
          const operations = yield* BoostOperations;
          const { boost } = yield* requested(owner, account);

          api.script({
            answer: {
              _tag: "answer",
              body: { ...euroAccount(), currency: "USD", id: "act_1001" },
              status: 200,
            },
            when: ({ method, path }) =>
              method === "GET" && path === "/v27.0/act_1001",
          });

          yield* operations.place(boost.id);

          const { boost: after } = yield* Boosts.use((boosts) =>
            boosts.get(owner, boost.id)
          );

          assert.strictEqual(
            after.state._tag === "failed" ? after.state.reason : "",
            "currencyMismatch"
          );
          assert.lengthOf(api.writes(), 0);
        }).pipe(Effect.scoped)
    );
  }
);

layer(AdsTest, { excludeTestServices: true })(
  "a boost the network does not take cleanly",
  (it) => {
    it.effect(
      "finds a campaign whose answer was lost, and makes no second one",
      () =>
        Effect.gen(function* lost() {
          const api = yield* onMeta();
          const { account, owner } = yield* spendingOwner();

          api.script({ answer: "lost", when: creating("campaigns") });

          const { boost, result } = yield* placed(owner, account);

          assert.strictEqual(result, "settled");
          assert.strictEqual(boost.state._tag, "active");
          assert.lengthOf(api.objects("campaign"), 1);

          const { calls } = yield* Boosts.use((boosts) =>
            boosts.get(owner, boost.id)
          );

          assert.deepStrictEqual(
            calls
              .slice(0, 2)
              .map(({ outcome, step }) => [step, Option.getOrNull(outcome)]),
            [
              ["createCampaign", "found"],
              ["createAdSet", "done"],
            ]
          );
        }).pipe(Effect.scoped)
    );

    it.effect(
      "waits when it cannot tell whether an object was made, then looks before it makes anything",
      () =>
        Effect.gen(function* unknown() {
          const api = yield* onMeta();
          const { account, owner } = yield* spendingOwner();
          const operations = yield* BoostOperations;

          // The answer is lost, and the lookup that follows gets none either.
          api.script({ answer: "lost", when: creating("adsets") });
          api.script({
            answer: dropped,
            when: ({ method, path }) =>
              method === "GET" && path.endsWith("/adsets"),
          });

          const { boost, result } = yield* placed(owner, account);

          assert.strictEqual(result, "retry");
          assert.strictEqual(boost.state._tag, "requested");
          assert.lengthOf(api.objects("adset"), 1);

          // The next attempt finds it by its name.
          assert.strictEqual(yield* operations.place(boost.id), "settled");
          assert.lengthOf(api.objects("campaign"), 1);
          assert.lengthOf(api.objects("adset"), 1);
          assert.lengthOf(api.objects("ad"), 1);
          assert.strictEqual(yield* stateOf(owner, boost.id), "active");
        }).pipe(Effect.scoped)
    );

    it.effect(
      "cut short before an answer was recorded, looks the object up first",
      () =>
        Effect.gen(function* cutShort() {
          const api = yield* onMeta();
          const { account, owner } = yield* spendingOwner();
          const operations = yield* BoostOperations;
          const store = yield* BoostStore;
          const { boost } = yield* requested(owner, account);

          // As a process that stopped between sending the request and
          // recording its answer: the journal's row has no outcome, and the
          // network holds the campaign.
          api.hold(
            "campaign",
            "1001",
            { name: `Peal boost ${boost.id}`, objective: "OUTCOME_ENGAGEMENT" },
            "PAUSED"
          );
          yield* store.beginCall({
            boostId: boost.id,
            id: yield* newId(SpendCallIdSchema),
            startedAt: yield* DateTime.now,
            step: "createCampaign",
            workspaceId: owner.workspaceId,
          });

          assert.strictEqual(yield* operations.place(boost.id), "settled");
          assert.lengthOf(api.objects("campaign"), 1);
          assert.strictEqual(yield* stateOf(owner, boost.id), "active");
        }).pipe(Effect.scoped)
    );

    it.effect("comes back later on a rate limit, and makes nothing twice", () =>
      Effect.gen(function* limited() {
        const api = yield* onMeta();
        const { account, owner } = yield* spendingOwner();
        const operations = yield* BoostOperations;

        api.script({
          answer: marketingError(
            17,
            2_446_079,
            400,
            adsBusinessUsage("1001", 5)
          ),
          when: creating("adsets"),
        });

        const { boost, result } = yield* placed(owner, account);

        assert.strictEqual(result, "retry");
        assert.strictEqual(boost.state._tag, "requested");
        assert.lengthOf(api.objects("adset"), 0);

        assert.strictEqual(yield* operations.place(boost.id), "settled");
        assert.lengthOf(api.objects("campaign"), 1);
        assert.lengthOf(api.objects("adset"), 1);
        assert.strictEqual(yield* stateOf(owner, boost.id), "active");
      }).pipe(Effect.scoped)
    );

    it.effect(
      "fails on a refused token, marks the sign-in and tells its person",
      () =>
        Effect.gen(function* token() {
          const api = yield* onMeta();
          const { account, owner } = yield* spendingOwner();
          const connections = yield* AdConnections;
          const { boost } = yield* requested(owner, account);

          api.expectToken("another-token");
          yield* BoostOperations.use((operations) =>
            operations.place(boost.id)
          );

          const { boost: after } = yield* Boosts.use((boosts) =>
            boosts.get(owner, boost.id)
          );

          assert.strictEqual(
            after.state._tag === "failed" ? after.state.reason : "",
            "reconnectNeeded"
          );
          assert.strictEqual(
            (yield* connections.list(owner))[0]?.grant.access,
            "reconnectNeeded"
          );
          assert.deepStrictEqual(yield* toldTo(owner), [
            "reconnectNeeded",
            "failed",
          ]);
          assert.lengthOf(api.writes(), 0);
        }).pipe(Effect.scoped)
    );

    it.effect(
      "fails with nothing running when the network refuses the ad set",
      () =>
        Effect.gen(function* refused() {
          const api = yield* onMeta();
          const { account, owner } = yield* spendingOwner();

          const { boost } = yield* placed(owner, account, {
            budget: { _tag: "total", amount: 50 },
          });

          assert.deepStrictEqual(
            boost.state._tag === "failed"
              ? [boost.state.reason, Option.getOrNull(boost.state.networkCode)]
              : [],
            ["budgetTooLow", "graph100.1885272"]
          );
          assert.strictEqual(boost.committed, 0);
          assert.isTrue(
            api.objects().every(({ status }) => status === "PAUSED")
          );
          assert.deepStrictEqual(yield* toldTo(owner), ["failed"]);
        }).pipe(Effect.scoped)
    );

    it.effect(
      "when running the campaign is refused after everything was made, spends nothing",
      () =>
        Effect.gen(function* activation() {
          const api = yield* onMeta();
          const { account, owner } = yield* spendingOwner();
          const spending = yield* SpendAuthorizations;

          // The third status update is the campaign's.
          let updates = 0;

          api.script({
            answer: marketingError(100, 1_487_566),
            when: ({ method, path }) => {
              const update = method === "POST" && /^\/v27\.0\/\d+$/u.test(path);

              updates += update ? 1 : 0;

              return update && updates === 3;
            },
          });

          const { boost } = yield* placed(owner, account);
          const [campaign] = api.objects("campaign");

          assert.strictEqual(
            boost.state._tag === "failed"
              ? boost.state.reason
              : boost.state._tag,
            "refused"
          );
          assert.strictEqual(campaign?.status, "PAUSED");
          assert.lengthOf(api.objects(), 3);
          // Nothing counts against the ceiling any more.
          assert.strictEqual(
            (yield* spending.standing(owner, account.id)).committedThisMonth,
            0
          );
        }).pipe(Effect.scoped)
    );

    it.effect(
      "when the answer to running the campaign is lost, reads its state back",
      () =>
        Effect.gen(function* readBack() {
          const api = yield* onMeta();
          const { account, owner } = yield* spendingOwner();
          const operations = yield* BoostOperations;

          // Lost, but taken: the campaign runs.
          let updates = 0;

          const third = ({
            method,
            path,
          }: {
            method: string;
            path: string;
          }) => {
            const update = method === "POST" && /^\/v27\.0\/\d+$/u.test(path);

            updates += update ? 1 : 0;

            return update && updates === 3;
          };

          api.script({ answer: "lost", when: third });

          const taken = yield* placed(owner, account);

          assert.strictEqual(taken.boost.state._tag, "active");

          // Lost, and not taken: the campaign is still paused, so nothing
          // spends, and the next attempt asks again.
          updates = 0;
          api.script({ answer: "dropped", when: third });

          const notTaken = yield* placed(owner, account);

          assert.strictEqual(notTaken.result, "retry");
          assert.strictEqual(notTaken.boost.state._tag, "requested");
          assert.strictEqual(
            yield* operations.place(notTaken.boost.id),
            "settled"
          );
          assert.strictEqual(
            yield* stateOf(owner, notTaken.boost.id),
            "active"
          );
          assert.lengthOf(api.objects("campaign"), 2);
        }).pipe(Effect.scoped)
    );

    it.effect(
      "when it cannot learn whether the campaign runs, leaves the boost unconfirmed and counted, for a person to stop",
      () =>
        Effect.gen(function* unconfirmed() {
          const api = yield* onMeta();
          const { account, owner } = yield* spendingOwner();
          const boosts = yield* Boosts;
          const spending = yield* SpendAuthorizations;
          const operations = yield* BoostOperations;

          let updates = 0;

          api.script({
            answer: "lost",
            when: ({ method, path }) => {
              const update = method === "POST" && /^\/v27\.0\/\d+$/u.test(path);

              updates += update ? 1 : 0;

              return update && updates === 3;
            },
          });
          // The read-back gets no answer either.
          api.script({
            answer: dropped,
            when: ({ method, path, query }) =>
              method === "GET" &&
              /^\/v27\.0\/\d+$/u.test(path) &&
              query.get("fields") === "status",
          });

          const { boost, result } = yield* placed(owner, account);

          assert.strictEqual(result, "settled");
          assert.strictEqual(boost.state._tag, "unconfirmed");
          assert.strictEqual(
            (yield* spending.standing(owner, account.id)).committedThisMonth,
            5000
          );
          assert.deepStrictEqual(yield* toldTo(owner), ["unconfirmed"]);

          // Never sent again on its own.
          const writes = api.writes().length;

          assert.strictEqual(yield* operations.place(boost.id), "settled");
          assert.lengthOf(api.writes(), writes);

          // A person stops it: the campaign is told to pause, and confirms.
          const stopped = yield* boosts.control(owner, boost.id, "stop");

          assert.strictEqual(stopped.state._tag, "stopped");
          assert.strictEqual(api.objects("campaign")[0]?.status, "PAUSED");
        }).pipe(Effect.scoped)
    );

    it.effect("given up on, fails with its campaign told to stay paused", () =>
      Effect.gen(function* givenUp() {
        const api = yield* onMeta();
        const { account, owner } = yield* spendingOwner();
        const operations = yield* BoostOperations;

        api.script({
          answer: marketingError(17, 2_446_079),
          when: creating("ads"),
        });

        const { boost } = yield* placed(owner, account);

        yield* operations.giveUp(boost.id);

        const { boost: after } = yield* Boosts.use((boosts) =>
          boosts.get(owner, boost.id)
        );

        assert.strictEqual(
          after.state._tag === "failed" ? after.state.reason : after.state._tag,
          "networkUnavailable"
        );
        assert.strictEqual(after.committed, 0);
        assert.isTrue(api.objects().every(({ status }) => status === "PAUSED"));
      }).pipe(Effect.scoped)
    );
  }
);

layer(AdsTest, { excludeTestServices: true })("pausing and stopping", (it) => {
  it.effect("pause and stop, asked twice as once", () =>
    Effect.gen(function* twice() {
      const api = yield* onMeta();
      const { account, owner } = yield* spendingOwner();
      const boosts = yield* Boosts;
      const { boost } = yield* placed(owner, account);
      const before = api.writes().length;

      const paused = yield* boosts.control(owner, boost.id, "pause");

      assert.strictEqual(paused.state._tag, "paused");
      assert.strictEqual(api.objects("campaign")[0]?.status, "PAUSED");

      yield* boosts.control(owner, boost.id, "pause");

      assert.lengthOf(api.writes(), before + 1);

      const stopped = yield* boosts.control(owner, boost.id, "stop");

      assert.strictEqual(stopped.state._tag, "stopped");

      yield* boosts.control(owner, boost.id, "stop");

      // The stop told the campaign to pause once more, to be sure, and
      // the second stop sent nothing.
      assert.lengthOf(api.writes(), before + 2);
      // A stopped boost does not run again.
      assert.strictEqual(
        yield* tagOf(boosts.control(owner, boost.id, "resume")),
        "BoostStateConflict"
      );
      assert.deepStrictEqual((yield* toldTo(owner)).slice(-2), [
        "paused",
        "stopped",
      ]);
    }).pipe(Effect.scoped)
  );

  it.effect("stops a boost before it was made, which then is never made", () =>
    Effect.gen(function* early() {
      const api = yield* onMeta();
      const { account, owner } = yield* spendingOwner();
      const boosts = yield* Boosts;
      const spending = yield* SpendAuthorizations;
      const { boost } = yield* requested(owner, account);
      const stopped = yield* boosts.control(owner, boost.id, "stop");

      assert.strictEqual(stopped.state._tag, "stopped");
      assert.strictEqual(stopped.committed, 0);
      assert.strictEqual(
        yield* BoostOperations.use((operations) => operations.place(boost.id)),
        "settled"
      );
      assert.lengthOf(api.writes(), 0);
      assert.strictEqual(
        (yield* spending.standing(owner, account.id)).committedThisMonth,
        0
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "is open to whoever manages ad accounts, and resuming only to who may spend",
    () =>
      Effect.gen(function* managers() {
        yield* onMeta();

        const { account, owner } = yield* spendingOwner();
        const boosts = yield* Boosts;
        const { boost } = yield* placed(owner, account);

        const manager = through(owner, {
          _tag: "apiKey",
          permissions: ["ads:read", "ads:manage"],
        });

        assert.strictEqual(
          yield* tagOf(
            boosts.control(
              member(owner.workspaceId, "editor"),
              boost.id,
              "pause"
            )
          ),
          "MissingPermission"
        );
        assert.strictEqual(
          yield* tagOf(
            boosts.control(through(owner, { _tag: "staff" }), boost.id, "pause")
          ),
          "MissingPermission"
        );
        assert.strictEqual(
          yield* tagOf(boosts.control(manager, boost.id, "pause")),
          "succeeded"
        );
        assert.strictEqual(
          yield* tagOf(boosts.control(manager, boost.id, "resume")),
          "MissingPermission"
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "leaves the boost where it was when the network does not confirm",
    () =>
      Effect.gen(function* unconfirmedPause() {
        const api = yield* onMeta();
        const { account, owner } = yield* spendingOwner();
        const boosts = yield* Boosts;
        const { boost } = yield* placed(owner, account);
        const campaignId = api.objects("campaign")[0]?.id ?? "";

        api.script({
          answer: "dropped",
          when: settingStatus(campaignId, "PAUSED"),
        });
        api.script({
          answer: dropped,
          when: ({ method, path }) =>
            method === "GET" && path.endsWith(campaignId),
        });

        assert.strictEqual(
          yield* tagOf(boosts.control(owner, boost.id, "pause")),
          "AdNetworkUnavailable"
        );
        assert.strictEqual(yield* stateOf(owner, boost.id), "active");

        // Asked again, it goes through.
        yield* boosts.control(owner, boost.id, "pause");

        assert.strictEqual(yield* stateOf(owner, boost.id), "paused");
      }).pipe(Effect.scoped)
  );

  it.effect(
    "holds back disconnecting an account, and turning its spending off, while a boost runs",
    () =>
      Effect.gen(function* busy() {
        yield* onMeta();

        const { account, owner } = yield* spendingOwner();
        const boosts = yield* Boosts;
        const connections = yield* AdConnections;
        const spending = yield* SpendAuthorizations;
        const { boost } = yield* placed(owner, account);

        assert.strictEqual(
          yield* tagOf(connections.removeAccount(owner, account.id)),
          "AdAccountBusy"
        );
        assert.strictEqual(
          yield* tagOf(spending.decide(owner, account.id, { _tag: "off" })),
          "AdAccountBusy"
        );

        yield* boosts.control(owner, boost.id, "stop");

        assert.strictEqual(
          yield* tagOf(spending.decide(owner, account.id, { _tag: "off" })),
          "succeeded"
        );
        assert.strictEqual(
          yield* tagOf(connections.removeAccount(owner, account.id)),
          "succeeded"
        );
      }).pipe(Effect.scoped)
  );

  it.effect("ends a boost once its end date passed, and tells once", () =>
    Effect.gen(function* ending() {
      yield* onMeta();

      const { account, owner } = yield* spendingOwner();
      const followUp = yield* BoostFollowUp;
      const { boost } = yield* placed(owner, account);

      assert.strictEqual(yield* followUp.endDue, 0);

      // As if its end had come: the row's run is moved to the past.
      const sql = yield* SqlClient.SqlClient;

      yield* sql`UPDATE ads.boosts SET starts_at = starts_at - interval '30 days', ends_at = ends_at - interval '30 days' WHERE id = ${boost.id}`;

      assert.strictEqual(yield* followUp.endDue, 1);
      assert.strictEqual(yield* stateOf(owner, boost.id), "ended");
      assert.deepStrictEqual((yield* toldTo(owner)).at(-1), "ended");
      assert.strictEqual(yield* followUp.endDue, 0);
    }).pipe(Effect.scoped)
  );
});
