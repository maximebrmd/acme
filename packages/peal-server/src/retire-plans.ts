import { BunRuntime } from "@effect/platform-bun";
import { Console, DateTime, Effect, Layer, Option } from "effect";

import { RetireLegacyPlans } from "#billing/application/retire-legacy-plans.ts";
import type { Retirement } from "#billing/application/retire-legacy-plans.ts";
import { RetirePlansLive } from "#billing/container.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";

// Retires the plans priced by tiers of channels. It lists every
// subscription to one that may still give its plan, with the day it would
// end, and changes nothing. With --apply it keeps each one's day, sets it
// to end then at Stripe (its first period's end 30 days or more after its
// billing managers are told, or a yearly plan's 30th day), and the
// server's hourly reminders tell them once, by notice and email. A trial
// runs to its end, and a plan its subscriber cancelled ends anyway. Safe
// to run again: what was set stays, and a call that did not go through is
// made again. It applies pending migrations first, as the server would,
// and prints ids, plans and days, never a name or a key. A server that
// does not bill lists them, and refuses --apply.
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
      return `ending    ${held}  ends ${Option.match(retirement.endsAt, {
        onNone: () => "with its period",
        onSome: day,
      })} (cancelled already)`;
    }

    case "trial": {
      return `trial     ${held}  runs to its end`;
    }

    case "unknownPeriod": {
      return `unknown   ${held}  no period end recorded: left to staff`;
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
