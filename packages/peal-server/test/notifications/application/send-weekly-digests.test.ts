import { assert, describe, it } from "@effect/vitest";
import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Ref,
} from "effect";

import { AppLinks } from "#notifications/application/app-links.ts";
import { DigestLinks } from "#notifications/application/digest-links.ts";
import { DigestSources } from "#notifications/application/digest-sources.ts";
import type { DigestReader } from "#notifications/application/digest-sources.ts";
import { PreferenceStore } from "#notifications/application/preference-store.ts";
import { RecipientsUnavailable } from "#notifications/application/recipients-unavailable.ts";
import {
  DigestPaceRef,
  SendWeeklyDigests,
} from "#notifications/application/send-weekly-digests.ts";
import {
  changePreferences,
  defaultPreferences,
} from "#notifications/domain/notification-preferences.ts";
import type { NotificationPreferences } from "#notifications/domain/notification-preferences.ts";
import type { DigestWorkspace } from "#notifications/domain/weekly-digest.ts";
import { HmacDigestLinks } from "#notifications/infrastructure/hmac-digest-links.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { TestMailer } from "#test/notifications/test-mailer.ts";
import type { MailerMode } from "#test/notifications/test-mailer.ts";

// The weekly digest's run on an in-memory world: preferences, readers and
// their workspaces' weeks held in maps, a mailer that records.

const userOf = (n: number): UserId =>
  UserIdSchema.make(
    `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`
  );

const workspaceId = WorkspaceIdSchema.make(
  "2f9a3c1e-7d4b-4e8f-9a1c-3b5d7e9f1a2c"
);

const busy: DigestWorkspace = {
  counts: {
    awaitingApproval: 0,
    failed: 0,
    scheduled: 2,
    unconfirmed: 0,
    wentOut: 3,
  },
  engagement: Option.none(),
  name: "Studio Nord",
  planned: [],
  wentOut: [
    { at: DateTime.makeUnsafe("2026-11-10T09:00:00Z"), excerpt: "Hello" },
  ],
  workspaceId,
};

const quiet: DigestWorkspace = {
  ...busy,
  counts: {
    awaitingApproval: 0,
    failed: 0,
    scheduled: 0,
    unconfirmed: 0,
    wentOut: 0,
  },
  name: "Quiet corner",
  wentOut: [],
};

// Monday 16 November 2026, 06:19 UTC: the week of 9 November.
const runAt = DateTime.makeUnsafe("2026-11-16T06:19:00Z");

type Failing = "database" | "defect" | "directory";

interface World {
  /** Readers that cannot be read: by the directory, the database, or a bug. */
  readonly failing: ReadonlyMap<UserId, Failing>;
  /** How many reads of a page fail before one answers. */
  readonly pageFailures?: number;
  readonly preferences: ReadonlyMap<UserId, NotificationPreferences>;
  readonly readers: ReadonlyMap<UserId, DigestReader>;
}

const wanting = changePreferences(defaultPreferences, {
  email: { weeklyDigest: true },
});

interface Held {
  readonly leased: boolean;
  readonly sent?: string;
}

/** Whose workspaces the world was asked to read, in order. */
class WorldLog extends Context.Service<
  WorldLog,
  { readonly sources: Effect.Effect<readonly UserId[]> }
>()("peal-server/test/notifications/WorldLog") {}

const failureOf = (failing: Failing) => {
  if (failing === "defect") {
    return Effect.die(new Error("synthetic defect"));
  }

  return failing === "directory"
    ? Effect.fail(new RecipientsUnavailable({ cause: new Error("synthetic") }))
    : Effect.fail(new DatabaseError({ cause: new Error("synthetic") }));
};

// The world's ports. Claims are kept by user, as the store keeps them.
const worldLayer = (world: World) =>
  Layer.effectContext(
    Effect.gen(function* worldLive() {
      const held = yield* Ref.make(new Map<UserId, Held>());
      const preferences = yield* Ref.make(world.preferences);
      const pageFailures = yield* Ref.make(world.pageFailures ?? 0);
      const read = yield* Ref.make<readonly UserId[]>([]);

      const isSent = (
        all: ReadonlyMap<UserId, Held>,
        userId: UserId,
        day: string
      ) => (all.get(userId)?.sent ?? "") >= day;

      const setHeld = (userId: UserId, change: (was: Held) => Held) =>
        Ref.update(
          held,
          (all) =>
            new Map([
              ...all,
              [userId, change(all.get(userId) ?? { leased: false })],
            ])
        );

      const store = PreferenceStore.of({
        change: (userId, change) =>
          Ref.modify(preferences, (all) => {
            const next = changePreferences(
              all.get(userId) ?? defaultPreferences,
              change
            );

            return [next, new Map([...all, [userId, next]])];
          }),
        claimDigest: (userId, week) =>
          Effect.gen(function* claim() {
            const day = DateTime.formatIsoDate(week);
            const all = yield* Ref.get(held);

            const wants =
              (yield* Ref.get(preferences)).get(userId)?.email.weeklyDigest ??
              false;

            if (
              !wants ||
              isSent(all, userId, day) ||
              all.get(userId)?.leased === true
            ) {
              return Option.none();
            }

            yield* setHeld(userId, (before) => ({ ...before, leased: true }));

            return Option.some(1);
          }),
        digestReaders: ({ after, limit, week }) =>
          Effect.gen(function* page() {
            const failures = yield* Ref.getAndUpdate(pageFailures, (left) =>
              Math.max(0, left - 1)
            );

            if (failures > 0) {
              return yield* new DatabaseError({
                cause: new Error("synthetic"),
              });
            }

            const day = DateTime.formatIsoDate(week);
            const all = yield* Ref.get(preferences);
            const sent = yield* Ref.get(held);

            return [...all.entries()]
              .flatMap(([userId, chosen]) =>
                chosen.email.weeklyDigest &&
                !isSent(sent, userId, day) &&
                Option.match(after, {
                  onNone: () => true,
                  onSome: (last) => userId > last,
                })
                  ? [userId]
                  : []
              )
              .toSorted()
              .slice(0, limit);
          }),
        digestSent: (userId, week) =>
          setHeld(userId, () => ({
            leased: false,
            sent: DateTime.formatIsoDate(week),
          })),
        forUsers: (userIds) =>
          Ref.get(preferences).pipe(
            Effect.map(
              (all) =>
                new Map(
                  userIds.flatMap((userId) => {
                    const chosen = all.get(userId);

                    return chosen === undefined ? [] : [[userId, chosen]];
                  })
                )
            )
          ),
        releaseDigest: (userId) =>
          setHeld(userId, (before) => ({ ...before, leased: false })),
        unsubscribeDigest: () => Effect.die("not used by the run"),
      });

      const sources = DigestSources.of({
        readerOf: (userId) =>
          Effect.gen(function* readerOf() {
            yield* Ref.update(read, (all) => [...all, userId]);

            const failing = world.failing.get(userId);

            if (failing !== undefined) {
              return yield* failureOf(failing);
            }

            return Option.fromUndefinedOr(world.readers.get(userId));
          }),
      });

      const links = AppLinks.of({
        api: (path) => `https://app.example.test${path}`,
        url: (path, locale) =>
          `https://app.example.test${locale === "en" ? "" : `/${locale}`}${path}`,
      });

      return Context.make(PreferenceStore, store).pipe(
        Context.add(DigestSources, sources),
        Context.add(AppLinks, links),
        Context.add(WorldLog, WorldLog.of({ sources: Ref.get(read) }))
      );
    })
  );

const pace = Layer.succeed(DigestPaceRef, {
  deferralsBeforeStop: 3,
  lease: Duration.minutes(10),
  pageSize: 2,
  retries: 2,
  retryBase: Duration.millis(1),
  sendTimeout: Duration.seconds(5),
});

// Runs the digest twice for the same week, an hour apart, the mailer
// answering `modes` in turn, one a run.
const runs = (
  world: World,
  modes: readonly [MailerMode, MailerMode] = ["accept", "accept"],
  // Addresses refused for now in the first run only.
  refusedFirst: readonly string[] = []
) =>
  Effect.gen(function* running() {
    const digests = yield* SendWeeklyDigests;
    const mailer = yield* TestMailer;

    yield* mailer.setMode(modes[0]);
    yield* mailer.refuseForNowTo(refusedFirst);
    const first = yield* digests.run(runAt);
    yield* mailer.refuseForNowTo([]);
    const readFirst = yield* WorldLog.use((log) => log.sources);

    yield* mailer.setMode(modes[1]);
    const again = yield* digests.run(DateTime.add(runAt, { hours: 1 }));

    const readAgain = (yield* WorldLog.use((log) => log.sources)).slice(
      readFirst.length
    );

    const sent = yield* mailer.sent;

    return { again, first, readAgain, sent };
  }).pipe(
    Effect.provide(
      SendWeeklyDigests.layer.pipe(
        Layer.provideMerge(
          Layer.mergeAll(
            worldLayer(world),
            TestMailer.layer,
            HmacDigestLinks,
            pace
          )
        )
      )
    )
  );

const reader = (
  n: number,
  workspaces: readonly DigestWorkspace[],
  locale: "en" | "fr" = "en"
): readonly [UserId, DigestReader] => [
  userOf(n),
  { email: `reader${n}@example.test`, locale, workspaces },
];

const wantingAll = (...ns: readonly number[]) =>
  new Map(ns.map((n) => [userOf(n), wanting] as const));

describe(SendWeeklyDigests, () => {
  it.effect(
    "emails each reader who asked for it once a week, page after page, in their language",
    () =>
      Effect.gen(function* weekly() {
        const { again, first, readAgain, sent } = yield* runs({
          failing: new Map(),
          // The fifth never asked.
          preferences: wantingAll(1, 2, 3, 4),
          readers: new Map([
            reader(1, [busy]),
            reader(2, [busy, quiet], "fr"),
            reader(3, [busy]),
            reader(4, [busy]),
            reader(5, [busy]),
          ]),
        });

        assert.deepStrictEqual(
          sent.map(({ to }) => to),
          [1, 2, 3, 4].map((n) => `reader${n}@example.test`)
        );
        assert.deepStrictEqual(first, {
          deferred: 0,
          failed: 0,
          nothingToTell: 0,
          readers: 4,
          sent: 4,
          skipped: 0,
          stopped: false,
        });
        // The same week again: nobody read, nothing more.
        assert.strictEqual(again.readers, 0);
        assert.deepStrictEqual(readAgain, []);

        const french = sent.find(({ to }) => to === "reader2@example.test");

        assert.isDefined(french);
        assert.include(french.subject, "Votre semaine sur Peal");
        assert.include(
          french.text,
          "https://app.example.test/fr/app/notices/preferences"
        );
        assert.include(
          french.text,
          `https://app.example.test/fr/app/${workspaceId}/calendar`
        );
        // A workspace with nothing in its fortnight is left out.
        assert.notInclude(french.text, "Quiet corner");
        assert.strictEqual(
          french.idempotencyKey,
          `weekly-digest:${userOf(2)}:2026-11-09`
        );
      })
  );

  it.effect(
    "gives every digest a one-click unsubscribe link that names its reader",
    () =>
      Effect.gen(function* unsubscribe() {
        const { sent } = yield* runs({
          failing: new Map(),
          preferences: wantingAll(1),
          readers: new Map([reader(1, [busy])]),
        });

        const [email] = sent;

        const prefix =
          "<https://app.example.test/api/notifications/weekly-digest/unsubscribe/";

        assert.isDefined(email);
        assert.strictEqual(
          email.headers?.["List-Unsubscribe-Post"],
          "List-Unsubscribe=One-Click"
        );

        const header = email.headers?.["List-Unsubscribe"] ?? "";

        assert.isTrue(header.startsWith(prefix) && header.endsWith(">"));

        const holder = yield* DigestLinks.use((links) =>
          links.read(header.slice(prefix.length, -1))
        ).pipe(Effect.provide(HmacDigestLinks));

        assert.deepStrictEqual(
          holder,
          Option.some({ links: 1, userId: userOf(1) })
        );
      })
  );

  it.effect(
    "sends nothing to a reader with nothing to tell, or who is gone, and goes on past one that cannot be read, a bug included",
    () =>
      Effect.gen(function* quietWeek() {
        const { first, sent } = yield* runs({
          failing: new Map<UserId, Failing>([
            [userOf(3), "directory"],
            [userOf(5), "database"],
            [userOf(6), "defect"],
          ]),
          preferences: wantingAll(1, 2, 3, 4, 5, 6, 7),
          // The second is gone.
          readers: new Map([
            reader(1, [quiet]),
            reader(3, [busy]),
            reader(4, [busy]),
            reader(7, [busy]),
          ]),
        });

        assert.deepStrictEqual(
          sent.map(({ to }) => to),
          ["reader4@example.test", "reader7@example.test"]
        );
        assert.deepStrictEqual(first, {
          deferred: 0,
          failed: 3,
          nothingToTell: 2,
          readers: 7,
          sent: 2,
          skipped: 0,
          stopped: false,
        });
      })
  );

  // On the real clock: a page read is tried again a second, then two
  // seconds, later.
  it.live("reads a page again when its read fails, and goes on", () =>
    Effect.gen(function* pageRetried() {
      const { first } = yield* runs({
        failing: new Map(),
        pageFailures: 2,
        preferences: wantingAll(1),
        readers: new Map([reader(1, [busy])]),
      });

      assert.strictEqual(first.sent, 1);
    })
  );

  // On the real clock: the retries wait a millisecond each.
  it.live(
    "leaves a digest refused for now to a later run, goes on with the others, then sends it once",
    () =>
      Effect.gen(function* deferred() {
        const { again, first, sent } = yield* runs(
          {
            failing: new Map(),
            preferences: wantingAll(1, 2, 3, 4, 5),
            readers: new Map([1, 2, 3, 4, 5].map((n) => reader(n, [busy]))),
          },
          ["accept", "accept"],
          ["reader2@example.test"]
        );

        assert.deepStrictEqual(first, {
          deferred: 1,
          failed: 0,
          nothingToTell: 0,
          readers: 5,
          sent: 4,
          skipped: 0,
          stopped: false,
        });
        assert.strictEqual(again.sent, 1);
        assert.deepStrictEqual(
          sent.map(({ to }) => to),
          [1, 3, 4, 5, 2].map((n) => `reader${n}@example.test`)
        );
      })
  );

  it.live(
    "stops a run after three refusals for now in a row, as the transport is down, and the next sends them all",
    () =>
      Effect.gen(function* down() {
        const { again, first, sent } = yield* runs(
          {
            failing: new Map(),
            preferences: wantingAll(1, 2, 3, 4, 5),
            readers: new Map([1, 2, 3, 4, 5].map((n) => reader(n, [busy]))),
          },
          ["refuseForNow", "accept"]
        );

        assert.deepStrictEqual(first, {
          deferred: 3,
          failed: 0,
          nothingToTell: 0,
          readers: 3,
          sent: 0,
          skipped: 0,
          stopped: true,
        });
        assert.strictEqual(again.sent, 5);
        assert.lengthOf(sent, 5);
      })
  );

  it.live("never sends again that week a digest refused for good", () =>
    Effect.gen(function* refused() {
      const { again, first, sent } = yield* runs(
        {
          failing: new Map(),
          preferences: wantingAll(1),
          readers: new Map([reader(1, [busy])]),
        },
        ["refuse", "accept"]
      );

      assert.strictEqual(first.failed, 1);
      assert.strictEqual(again.readers, 0);
      assert.deepStrictEqual(sent, []);
    })
  );
});
