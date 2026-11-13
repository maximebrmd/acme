import {
  Cause,
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Metric,
  Option,
  Schedule,
} from "effect";

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
import { DigestLinks } from "./digest-links.ts";
import { DigestSources } from "./digest-sources.ts";
import type { DigestReader } from "./digest-sources.ts";
import { MailDeliveryFailed } from "./mail-delivery-failed.ts";
import { Mailer } from "./mailer.ts";
import { PreferenceStore } from "./preference-store.ts";

/**
 * How a run goes: `pageSize` readers read at a time; each email given
 * `sendTimeout`, and one the transport refuses for now tried `retries`
 * more times, waiting `retryBase`, then twice that (a few seconds in all,
 * never more), then left to the next run while this one goes on, unless
 * `deferralsBeforeStop` in a row were: the transport is down, and the run
 * stops; a reader whose send started more than `lease` ago, and never
 * ended, may be taken again. Emails go one at a time, so a transport's rate limit is met
 * rather than fought.
 */
export interface DigestPace {
  readonly deferralsBeforeStop: number;
  readonly lease: Duration.Duration;
  readonly pageSize: number;
  readonly retries: number;
  readonly retryBase: Duration.Duration;
  readonly sendTimeout: Duration.Duration;
}

export const DigestPaceRef = Context.Reference<DigestPace>(
  "peal-server/notifications/application/DigestPace",
  {
    defaultValue: () => ({
      deferralsBeforeStop: 3,
      lease: Duration.minutes(10),
      pageSize: 100,
      retries: 2,
      retryBase: Duration.seconds(2),
      sendTimeout: Duration.seconds(30),
    }),
  }
);

/** The weekly digests that did not go, by why. */
export const weeklyDigestFailures = Metric.counter(
  "peal.notifications.weekly_digest.failures",
  {
    description:
      "Weekly digests that did not go: refused for good, refused for now after its retries, or a reader that could not be read",
    incremental: true,
  }
);

type Failure = "broken" | "deferred" | "refused";

const counted = (reason: Failure) =>
  Metric.update(Metric.withAttributes(weeklyDigestFailures, { reason }), 1);

/**
 * What a run did: of the `readers` it took, those `sent` one, those whose
 * workspaces had nothing to tell (or who are gone), those `skipped` as
 * another send holds theirs, those it `failed` for (refused for good, or
 * that could not be read), those `deferred` to the next run (refused for
 * now), and whether it `stopped` early, as the transport refused several
 * in a row.
 */
export interface DigestReport {
  readonly deferred: number;
  readonly failed: number;
  readonly nothingToTell: number;
  readonly readers: number;
  readonly sent: number;
  readonly skipped: number;
  readonly stopped: boolean;
}

type Outcome = "deferred" | "failed" | "nothingToTell" | "sent" | "skipped";

// A page read is tried again a few times before the run gives up on it.
const pageRetry = { schedule: Schedule.exponential("1 second"), times: 3 };

/**
 * Each Monday, the weekly digest to every person who turned it on: what
 * went out last week and what is planned this week in the workspaces whose
 * posts they may read, in their language, once a week whatever runs it
 * again. Only those who asked, and are still to have the week's, are read,
 * a page at a time by id, so a server where nobody did reads one page of
 * nobody. A reader's week is marked once the email was accepted, or
 * refused for good; one refused for now is left for the next run, which
 * the cron starts every hour of the Monday from 06:19 UTC.
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
      const appLinks = yield* AppLinks;
      const digestLinks = yield* DigestLinks;
      const mailer = yield* Mailer;
      const preferences = yield* PreferenceStore;
      const sources = yield* DigestSources;

      const send = Effect.fn("SendWeeklyDigests.send")(function* send(
        userId: UserId,
        reader: DigestReader,
        week: DigestWeek,
        links: number
      ) {
        const pace = yield* DigestPaceRef;
        const { locale } = reader;
        const token = yield* digestLinks.tokenOf(userId, links);

        const email = renderWeeklyDigest({
          agendaUrl: appLinks.url("/app/agenda", locale),
          locale,
          preferencesUrl: appLinks.url("/app/notices/preferences", locale),
          week,
          workspaces: reader.workspaces.filter(hasNews).map((workspace) => ({
            ...workspace,
            calendarUrl: appLinks.url(
              `/app/${workspace.workspaceId}/calendar`,
              locale
            ),
          })),
        });

        return yield* mailer
          .send({
            ...email,
            // One-click unsubscribe (RFC 8058): the link turns the digest
            // off, and only the digest.
            headers: {
              "List-Unsubscribe": `<${appLinks.api(
                `/api/notifications/weekly-digest/unsubscribe/${token}`
              )}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
            idempotencyKey: digestKeyOf(userId, week),
            to: reader.email,
          })
          .pipe(
            // A transport that never answers is refused for now.
            Effect.timeoutOrElse({
              duration: pace.sendTimeout,
              orElse: () =>
                Effect.fail(
                  new MailDeliveryFailed({
                    cause: new Error("The mail transport did not answer"),
                    retryable: true,
                  })
                ),
            }),
            Effect.retry({
              schedule: Schedule.exponential(pace.retryBase),
              times: pace.retries,
              while: (failure) => failure.retryable,
            }),
            Effect.matchEffect({
              onFailure: (failure) =>
                failure.retryable
                  ? Effect.logWarning(
                      "A weekly digest was refused for now",
                      failure.cause
                    ).pipe(
                      Effect.andThen(preferences.releaseDigest(userId)),
                      Effect.andThen(counted("deferred")),
                      Effect.as<Outcome>("deferred")
                    )
                  : Effect.logError(
                      "A weekly digest was refused",
                      failure.cause
                    ).pipe(
                      // Never sent again that week.
                      Effect.andThen(preferences.digestSent(userId, week.from)),
                      Effect.andThen(counted("refused")),
                      Effect.as<Outcome>("failed")
                    ),
              onSuccess: () =>
                preferences
                  .digestSent(userId, week.from)
                  .pipe(Effect.as<Outcome>("sent")),
            })
          );
      });

      // A reader taken for the week, read, then emailed. Taken first, so
      // a run again, or one at the same time, reads nobody another holds.
      const digestOf = Effect.fn("SendWeeklyDigests.digestOf")(
        function* digestOf(userId: UserId, week: DigestWeek) {
          const { lease } = yield* DigestPaceRef;
          const now = yield* DateTime.now;

          const links = yield* preferences.claimDigest(userId, week.from, {
            at: now,
            staleBefore: DateTime.subtractDuration(now, lease),
          });

          if (Option.isNone(links)) {
            return "skipped" satisfies Outcome;
          }

          const read = yield* sources
            .readerOf(userId, week)
            .pipe(
              Effect.onError(() =>
                preferences.releaseDigest(userId).pipe(Effect.ignore)
              )
            );

          if (Option.isNone(read) || !read.value.workspaces.some(hasNews)) {
            yield* preferences.digestSent(userId, week.from);

            return "nothingToTell" satisfies Outcome;
          }

          return yield* send(userId, read.value, week, links.value);
        }
      );

      // One reader's failure, whatever it is, stops no other's digest.
      const isolated = (userId: UserId, week: DigestWeek) =>
        digestOf(userId, week).pipe(
          Effect.catchCause((cause) =>
            Cause.hasInterruptsOnly(cause)
              ? Effect.interrupt
              : Effect.logError(
                  "A weekly digest could not be made",
                  cause
                ).pipe(
                  Effect.andThen(counted("broken")),
                  Effect.as<Outcome>("failed")
                )
          ),
          Effect.annotateLogs({ userId })
        );

      const run = Effect.fn("SendWeeklyDigests.run")(function* run(
        at: DateTime.Utc
      ) {
        const { deferralsBeforeStop, pageSize } = yield* DigestPaceRef;
        const week = digestWeekOf(at);
        let after = Option.none<UserId>();
        let inARow = 0;

        const report = {
          deferred: 0,
          failed: 0,
          nothingToTell: 0,
          readers: 0,
          sent: 0,
          skipped: 0,
          stopped: false,
        };

        for (;;) {
          const page = yield* preferences
            .digestReaders({ after, limit: pageSize, week: week.from })
            .pipe(Effect.retry(pageRetry));

          for (const userId of page) {
            const outcome = yield* isolated(userId, week);

            report.readers += 1;
            report[outcome] += 1;
            inARow = outcome === "deferred" ? inARow + 1 : 0;

            // Several refused for now in a row: the transport is down, and
            // the next run goes on.
            if (inARow >= deferralsBeforeStop) {
              return { ...report, stopped: true };
            }
          }

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
