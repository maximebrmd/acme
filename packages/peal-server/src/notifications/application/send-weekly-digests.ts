import type { DateTime } from "effect";
import { Context, Duration, Effect, Layer, Option, Schedule } from "effect";

import {
  digestKeyOf,
  digestWeekOf,
  hasNews,
  renderWeeklyDigest,
} from "#notifications/domain/weekly-digest.ts";
import type { DigestWeek } from "#notifications/domain/weekly-digest.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";

import { AppLinks } from "./app-links.ts";
import { DigestSources } from "./digest-sources.ts";
import type { DigestReader } from "./digest-sources.ts";
import { Mailer } from "./mailer.ts";
import { PreferenceStore } from "./preference-store.ts";

/**
 * How the run goes: `pageSize` readers read at a time, and an email the
 * transport refuses for now tried `retries` more times, waiting
 * `retryBase`, then twice that, and so on. Emails go one at a time, so a
 * transport's rate limit is met rather than fought.
 */
export interface DigestPace {
  readonly pageSize: number;
  readonly retries: number;
  readonly retryBase: Duration.Duration;
}

export const DigestPaceRef = Context.Reference<DigestPace>(
  "peal-server/notifications/application/DigestPace",
  {
    defaultValue: () => ({
      pageSize: 100,
      retries: 4,
      retryBase: Duration.seconds(2),
    }),
  }
);

/**
 * What a run did: of the `readers` who want the digest, those `sent` one,
 * those whose workspaces had nothing to tell (or who are gone), those
 * `skipped` as their week's digest was claimed already (by a run before,
 * or since they turned it off), and those it `failed` for (read or sent).
 */
export interface DigestReport {
  readonly failed: number;
  readonly nothingToTell: number;
  readonly readers: number;
  readonly sent: number;
  readonly skipped: number;
}

type Outcome = "failed" | "nothingToTell" | "sent" | "skipped";

const nothing: DigestReport = {
  failed: 0,
  nothingToTell: 0,
  readers: 0,
  sent: 0,
  skipped: 0,
};

/**
 * Each Monday, the weekly digest to every person who turned it on: what
 * went out last week and what is planned this week in the workspaces whose
 * posts they may read, in their language, once a week whatever runs it
 * again. Only those who asked are read, a page at a time by id, so a
 * server where nobody did reads one page of nobody.
 */
export class SendWeeklyDigests extends Context.Service<
  SendWeeklyDigests,
  {
    /** The digests of the week before the one `at` is in. */
    readonly run: (
      at: DateTime.Utc
    ) => Effect.Effect<DigestReport, DatabaseError>;
  }
>()("peal-server/notifications/application/SendWeeklyDigests") {
  static readonly layer = Layer.effect(
    SendWeeklyDigests,
    Effect.gen(function* SendWeeklyDigestsLive() {
      const links = yield* AppLinks;
      const mailer = yield* Mailer;
      const preferences = yield* PreferenceStore;
      const sources = yield* DigestSources;

      const send = Effect.fn("SendWeeklyDigests.send")(function* send(
        userId: UserId,
        reader: DigestReader,
        week: DigestWeek
      ) {
        const pace = yield* DigestPaceRef;
        const key = digestKeyOf(userId, week);
        const { locale } = reader;

        const email = renderWeeklyDigest({
          agendaUrl: links.url("/app/agenda", locale),
          locale,
          preferencesUrl: links.url("/app/notices/preferences", locale),
          week,
          workspaces: reader.workspaces.filter(hasNews).map((workspace) => ({
            ...workspace,
            calendarUrl: links.url(
              `/app/${workspace.workspaceId}/calendar`,
              locale
            ),
          })),
        });

        return yield* mailer
          .send({ ...email, idempotencyKey: key, to: reader.email })
          .pipe(
            Effect.retry({
              schedule: Schedule.exponential(pace.retryBase),
              times: pace.retries,
              while: (failure) => failure.retryable,
            }),
            Effect.as<Outcome>("sent"),
            Effect.catch((error) =>
              Effect.logError("A weekly digest was refused", error.cause).pipe(
                Effect.as<Outcome>("failed")
              )
            )
          );
      });

      const digestOf = Effect.fn("SendWeeklyDigests.digestOf")(
        function* digestOf(userId: UserId, week: DigestWeek) {
          const found = yield* sources.readerOf(userId, week);

          if (Option.isNone(found) || !found.value.workspaces.some(hasNews)) {
            return "nothingToTell" satisfies Outcome;
          }

          // Claimed before it goes: a run again, or one at the same time,
          // sends no second. One that fails is not sent again that week.
          if (!(yield* preferences.claimDigest(userId, week.from))) {
            return "skipped" satisfies Outcome;
          }

          return yield* send(userId, found.value, week);
        },
        (effect, userId) =>
          effect.pipe(
            Effect.catchTag("RecipientsUnavailable", (failure) =>
              Effect.logWarning(
                "A weekly digest's reader could not be read",
                failure.cause
              ).pipe(Effect.as<Outcome>("failed"))
            ),
            Effect.annotateLogs({ userId })
          )
      );

      const run = Effect.fn("SendWeeklyDigests.run")(function* run(
        at: DateTime.Utc
      ) {
        const { pageSize } = yield* DigestPaceRef;
        const week = digestWeekOf(at);
        let after = Option.none<UserId>();
        let report: DigestReport = nothing;

        for (;;) {
          const page = yield* preferences.digestReaders({
            after,
            limit: pageSize,
          });

          // One reader at a time: emails go out one after the other.
          const outcomes = yield* Effect.all(
            page.map((userId) => digestOf(userId, week))
          );

          const counted = { ...report, readers: report.readers + page.length };

          for (const outcome of outcomes) {
            counted[outcome] += 1;
          }

          report = counted;

          const last = page.at(-1);

          if (last === undefined || page.length < pageSize) {
            return report;
          }

          after = Option.some(last);
        }
      });

      return SendWeeklyDigests.of({ run });
    })
  );
}
