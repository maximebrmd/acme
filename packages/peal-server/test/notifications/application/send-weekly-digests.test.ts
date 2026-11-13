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

// Monday 16 November 2026, 06:23 UTC: the week of 9 November.
const runAt = DateTime.makeUnsafe("2026-11-16T06:23:00Z");

interface World {
  /** Readers the directory cannot read, or the database. */
  readonly failing: ReadonlyMap<UserId, "database" | "directory">;
  readonly preferences: ReadonlyMap<UserId, NotificationPreferences>;
  readonly readers: ReadonlyMap<UserId, DigestReader>;
}

const wanting = changePreferences(defaultPreferences, {
  email: { weeklyDigest: true },
});

// The world's ports. Claims are kept by user, as the store keeps them.
const worldLayer = (world: World) =>
  Layer.effectContext(
    Effect.gen(function* worldLive() {
      const claimed = yield* Ref.make(new Map<UserId, string>());
      const preferences = yield* Ref.make(world.preferences);

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
            const wants =
              (yield* Ref.get(preferences)).get(userId)?.email.weeklyDigest ??
              false;

            const day = DateTime.formatIsoDate(week);

            return yield* Ref.modify(claimed, (all) => {
              const last = all.get(userId);
              const may = wants && (last === undefined || last < day);

              return [may, may ? new Map([...all, [userId, day]]) : all];
            });
          }),
        digestReaders: ({ after, limit }) =>
          Ref.get(preferences).pipe(
            Effect.map((all) =>
              [...all.entries()]
                .flatMap(([userId, chosen]) =>
                  chosen.email.weeklyDigest &&
                  Option.match(after, {
                    onNone: () => true,
                    onSome: (last) => userId > last,
                  })
                    ? [userId]
                    : []
                )
                .toSorted()
                .slice(0, limit)
            )
          ),
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
      });

      const sources = DigestSources.of({
        readerOf: (userId) => {
          const failing = world.failing.get(userId);

          if (failing === undefined) {
            return Effect.succeed(
              Option.fromUndefinedOr(world.readers.get(userId))
            );
          }

          return failing === "directory"
            ? Effect.fail(
                new RecipientsUnavailable({ cause: new Error("synthetic") })
              )
            : Effect.fail(new DatabaseError({ cause: new Error("synthetic") }));
        },
      });

      const links = AppLinks.of({
        url: (path, locale) =>
          `https://app.example.test${locale === "en" ? "" : `/${locale}`}${path}`,
      });

      return Context.make(PreferenceStore, store).pipe(
        Context.add(DigestSources, sources),
        Context.add(AppLinks, links)
      );
    })
  );

const pace = Layer.succeed(DigestPaceRef, {
  pageSize: 2,
  retries: 2,
  retryBase: Duration.millis(1),
});

const run = (world: World, mode: MailerMode = "accept") =>
  Effect.gen(function* running() {
    yield* TestMailer.use((mailer) => mailer.setMode(mode));

    const digests = yield* SendWeeklyDigests;
    const first = yield* digests.run(runAt);
    const again = yield* digests.run(runAt);
    const sent = yield* TestMailer.use((mailer) => mailer.sent);

    return { again, first, sent };
  }).pipe(
    Effect.provide(
      SendWeeklyDigests.layer.pipe(
        Layer.provideMerge(
          Layer.mergeAll(worldLayer(world), TestMailer.layer, pace)
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

describe(SendWeeklyDigests, () => {
  it.effect(
    "emails each reader who asked for it once a week, page after page, in their language",
    () =>
      Effect.gen(function* weekly() {
        const readers = new Map([
          reader(1, [busy]),
          reader(2, [busy, quiet], "fr"),
          reader(3, [busy]),
          reader(4, [busy]),
          reader(5, [busy]),
        ]);

        const { again, first, sent } = yield* run({
          failing: new Map(),
          // The fifth never asked.
          preferences: new Map(
            [1, 2, 3, 4].map((n) => [userOf(n), wanting] as const)
          ),
          readers,
        });

        assert.deepStrictEqual(
          sent.map(({ to }) => to),
          [1, 2, 3, 4].map((n) => `reader${n}@example.test`)
        );
        assert.deepStrictEqual(first, {
          failed: 0,
          nothingToTell: 0,
          readers: 4,
          sent: 4,
          skipped: 0,
        });
        // The same week again: nothing more.
        assert.deepStrictEqual(again, {
          failed: 0,
          nothingToTell: 0,
          readers: 4,
          sent: 0,
          skipped: 4,
        });

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
    "sends nothing to a reader with nothing to tell, or who is gone, and goes on past one it cannot read",
    () =>
      Effect.gen(function* quietWeek() {
        const { first, sent } = yield* run({
          failing: new Map([
            [userOf(3), "directory"],
            [userOf(5), "database"],
          ]),
          preferences: new Map(
            [1, 2, 3, 4, 5].map((n) => [userOf(n), wanting] as const)
          ),
          // The second is gone.
          readers: new Map([
            reader(1, [quiet]),
            reader(3, [busy]),
            reader(4, [busy]),
          ]),
        });

        assert.deepStrictEqual(
          sent.map(({ to }) => to),
          ["reader4@example.test"]
        );
        assert.deepStrictEqual(first, {
          failed: 2,
          nothingToTell: 2,
          readers: 5,
          sent: 1,
          skipped: 0,
        });
      })
  );

  // On the real clock: the retries wait a millisecond each.
  it.live(
    "tries again an email refused for now, then counts it as failed, as one refused for good",
    () =>
      Effect.gen(function* refused() {
        for (const mode of ["refuseForNow", "refuse"] as const) {
          const { again, first, sent } = yield* run(
            {
              failing: new Map(),
              preferences: new Map([[userOf(1), wanting]]),
              readers: new Map([reader(1, [busy])]),
            },
            mode
          );

          assert.deepStrictEqual(sent, []);
          assert.strictEqual(first.failed, 1);
          // The week was claimed before the email went: never two.
          assert.strictEqual(again.skipped, 1);
        }
      })
  );
});
