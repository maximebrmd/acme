import { BunRuntime } from "@effect/platform-bun";
import { Console, DateTime, Effect, Layer } from "effect";

import { RetireLegacyPlans } from "#billing/application/retire-legacy-plans.ts";
import type { Retirement } from "#billing/application/retire-legacy-plans.ts";
import { RetirePlansLive } from "#billing/container.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";

// Retires the plans priced by tiers of channels. It lists every
// subscription to one that may still give its plan, with the day it would
// end, and changes nothing. With --apply, each one on its own: Stripe is
// set to end it on that day (the first midnight UTC 30 days or more after
// the latest its notice may go out), and once Stripe took it the day is
// kept, and the server's hourly reminders tell its billing managers once,
// by notice and email; nothing after the day is charged, and what was paid
// for beyond it is credited when it ends. One Stripe refuses or does not
// answer is listed as failed, the others go on, and the command exits 1:
// run it again until it lists nothing to retire or failed (a plan that
// becomes payable again later, as an unpaid one paid, is listed then). A
// trial runs to its end, and a cancellation that ends a plan by the day
// stands. It applies pending migrations first, as the server would, even
// on a dry run: run it from the image the server runs. It prints ids,
// plans and days, never a name or a key. A server that does not bill lists
// them, and refuses --apply.
//
//   bun nx run peal-server:billing:retire-plans [-- --apply]
const apply = process.argv.includes("--apply");

const day = (instant: DateTime.Utc) => DateTime.formatIso(instant);

const lineOf = (retirement: Retirement): string => {
  const { interval, plan, stripeSubscriptionId, workspaceId } =
    retirement.subscription;

  const held = `${stripeSubscriptionId}  workspace ${workspaceId}  ${plan}/${interval}`;

  switch (retirement._tag) {
    case "retire": {
      return `${apply ? "retired " : "retire  "}  ${held}  ends ${day(retirement.endsAt)}`;
    }

    case "retired": {
      return `retired   ${held}  ends ${day(retirement.endsAt)}  ${retirement.told ? "told" : "not told yet"}`;
    }

    case "ending": {
      return `ending    ${held}  ends ${day(retirement.endsAt)} (cancelled already)`;
    }

    case "trial": {
      return `trial     ${held}  runs to its end`;
    }

    case "failed": {
      return `failed    ${held}  Stripe ${retirement.permanent ? "refused" : "did not answer"}: run again`;
    }

    default: {
      return held;
    }
  }
};

const program = Effect.gen(function* retirePlans() {
  const retire = yield* RetireLegacyPlans;
  const report = yield* retire.run({ apply });

  if (report.retirements.length === 0) {
    yield* Console.log("No legacy plan subscription: nothing to do.");

    return;
  }

  yield* Console.log(report.retirements.map(lineOf).join("\n"));

  const failed = report.retirements.filter(({ _tag }) => _tag === "failed");

  if (failed.length > 0) {
    yield* Console.error(
      `${String(failed.length)} retirement(s) failed at Stripe: nothing was kept for them, run the command again.`
    );
    yield* Effect.sync(() => {
      process.exitCode = 1;
    });
  }

  yield* Console.log(
    apply
      ? "Applied: the server's hourly reminders tell each billing manager once."
      : "Dry run: nothing was changed. Run it again with --apply to retire them."
  );
}).pipe(
  Effect.catchTag("BillingOff", () =>
    Console.error(
      "This server does not bill (no STRIPE_SECRET_KEY): nothing can be applied."
    ).pipe(
      Effect.andThen(
        Effect.sync(() => {
          process.exitCode = 1;
        })
      )
    )
  )
);

BunRuntime.runMain(
  program.pipe(
    Effect.provide(
      RetirePlansLive.pipe(
        Layer.provideMerge(MigrationsLive),
        Layer.provideMerge(DatabaseLive)
      )
    )
  )
);
