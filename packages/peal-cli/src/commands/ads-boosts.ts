import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  BoostDetailSchema,
  BoostQuoteSchema,
  BoostSchema,
  dailyOverspendPercent,
  maxBoostAge,
  maxBoostCountries,
  maxBoostRunDays,
  minBoostAge,
  NewBoostSchema,
} from "peal-contract";
import type { AdAccount, Boost, NewBoost } from "peal-contract";

import { minorUnits, money } from "#ads-money.ts";
import {
  amountsIn,
  audienceOf,
  boostLines,
  budgetOf,
  standingOf,
} from "#ads-print.ts";
import { ApiRequestFailed } from "#api-request-failed.ts";
import { confirmed, neverAsksInJson, yesFlagName } from "#confirm.ts";
import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { instantOf, zoneFlag } from "#when.ts";
import { channelNames, inWorkspace, named, workspaceFlag } from "#workspace.ts";

type InWorkspace = Effect.Success<ReturnType<typeof inWorkspace>>;

type BoostQuote = typeof BoostQuoteSchema.Type;

const refuse = (reason: string) => Effect.fail(new Refused({ reason }));

const maxKeyLength = 255;

const notSpecialCategoryFlag = "not-special-category";

const specialCategories =
  "Peal does not boost ads about housing, employment, financial products or services, or social issues, elections or politics";

const boostArgument = Argument.String("boost-id").pipe(
  Argument.withDescription("The boost, as peal ads boosts shows its id.")
);

const yesFlag = (description: string) =>
  Flag.Boolean(yesFlagName).pipe(
    Flag.withDescription(description),
    Flag.withDefault(false)
  );

const amountFlag = (name: string, description: string) =>
  Flag.String(name).pipe(
    Flag.withMetavar("<amount>"),
    Flag.withDescription(description),
    Flag.optional
  );

// What a boost is asked to be: the same flags check it and make it.
const boostFlags = {
  account: Flag.String("account").pipe(
    Flag.withMetavar("<account-id>"),
    Flag.withDescription(
      "The ad account that pays, as peal ads accounts shows its id: an owner must have allowed it to spend."
    )
  ),
  ageMax: Flag.Int("age-max").pipe(
    Flag.withDescription(
      `The oldest age it is shown to, ${String(maxBoostAge)} at most, which means ${String(maxBoostAge)} and over.`
    ),
    Flag.withDefault(maxBoostAge)
  ),
  ageMin: Flag.Int("age-min").pipe(
    Flag.withDescription(
      `The youngest age it is shown to, ${String(minBoostAge)} at least.`
    ),
    Flag.withDefault(minBoostAge)
  ),
  beneficiary: Flag.String("beneficiary").pipe(
    Flag.withMetavar("<name>"),
    Flag.withDescription(
      "Who benefits from the ad: required, with --payer, when a country of the audience is in the European Union."
    ),
    Flag.optional
  ),
  channel: Flag.String("channel").pipe(
    Flag.withMetavar("<channel-id>"),
    Flag.withDescription(
      "The channel the post is boosted on, among those it was published on: a Facebook Page, or an Instagram account connected through its Page."
    )
  ),
  countries: Flag.String("countries").pipe(
    Flag.withMetavar("<FR,BE>"),
    Flag.withDescription(
      `The countries it is shown in, as ISO 3166-1 alpha-2 codes separated by commas, ${String(maxBoostCountries)} at most.`
    )
  ),
  currency: Flag.String("currency").pipe(
    Flag.withMetavar("<EUR>"),
    Flag.withDescription(
      "The currency the budget is written in, as an ISO 4217 code. Required, and never guessed: it must be the ad account's, as peal ads accounts shows it."
    )
  ),
  daily: amountFlag(
    "daily",
    `The budget for each day of the run, in the currency's units, such as 10 or 10.50. The ad network may spend up to ${String(dailyOverspendPercent)}% more on any one day. One of --total and --daily is required.`
  ),
  ends: Flag.String("ends").pipe(
    Flag.withMetavar("<instant>"),
    Flag.withDescription(
      `When the run ends: required, as a boost never runs without an end. An instant with its offset, such as 2026-11-20T09:00:00Z, or a local time read in --time-zone; at least a day after the start, ${String(maxBoostRunDays)} days at most.`
    )
  ),
  json: jsonFlag,
  notSpecialCategory: Flag.Boolean(notSpecialCategoryFlag).pipe(
    Flag.withDescription(
      `Declare that the ad is of no special category. Required: ${specialCategories}, and refuses without this declaration.`
    ),
    Flag.withDefault(false)
  ),
  payer: Flag.String("payer").pipe(
    Flag.withMetavar("<name>"),
    Flag.withDescription(
      "Who pays for the ad: required, with --beneficiary, when a country of the audience is in the European Union."
    ),
    Flag.optional
  ),
  post: Flag.String("post").pipe(
    Flag.withMetavar("<post-id>"),
    Flag.withDescription(
      "The post to boost, which the workspace published through Peal."
    )
  ),
  starts: Flag.String("starts").pipe(
    Flag.withMetavar("<instant>"),
    Flag.withDescription(
      "When the run starts, written as --ends is. Defaults to now."
    ),
    Flag.optional
  ),
  timeZone: zoneFlag(
    "The IANA time zone --starts and --ends are read in when written without an offset, such as Europe/Paris."
  ),
  total: amountFlag(
    "total",
    "The budget for the whole run, in the currency's units, such as 50 or 50.00: the most the boost spends. One of --total and --daily is required."
  ),
  workspace: workspaceFlag,
};

interface BoostInput {
  readonly account: string;
  readonly ageMax: number;
  readonly ageMin: number;
  readonly beneficiary: Option.Option<string>;
  readonly channel: string;
  readonly countries: string;
  readonly currency: string;
  readonly daily: Option.Option<string>;
  readonly ends: string;
  readonly notSpecialCategory: boolean;
  readonly payer: Option.Option<string>;
  readonly post: string;
  readonly starts: Option.Option<string>;
  readonly timeZone: string;
  readonly total: Option.Option<string>;
}

const isCountry = (code: string): boolean => /^[A-Z]{2}$/u.test(code);

// `--countries FR,BE`: each code once, in capitals, in the order given.
const countriesOf = (given: string) => {
  const codes = [
    ...new Set(
      given.split(",").flatMap((part) => {
        const code = part.trim().toUpperCase();

        return code === "" ? [] : [code];
      })
    ),
  ];

  return codes.length === 0 ||
    codes.length > maxBoostCountries ||
    !codes.every(isCountry)
    ? refuse(
        `--countries takes 1 to ${String(maxBoostCountries)} ISO 3166-1 alpha-2 codes separated by commas, such as FR,BE: not ${given}.`
      )
    : Effect.succeed(codes);
};

// What the command line can tell by itself, before any request: a boost
// refused here sent, reserved and spent nothing.
const checked = (input: BoostInput) =>
  Effect.gen(function* checking() {
    if (!input.notSpecialCategory) {
      return yield* refuse(
        `${specialCategories}. Nothing was sent. When this ad is about none of them, declare it with --${notSpecialCategoryFlag}.`
      );
    }

    if (Option.isSome(input.total) === Option.isSome(input.daily)) {
      return yield* refuse(
        Option.isSome(input.total)
          ? "Give --total or --daily, not both."
          : "Say what it may spend: --total <amount> for the whole run, or --daily <amount> for each day of it. No budget is ever assumed."
      );
    }

    if (
      input.ageMin < minBoostAge ||
      input.ageMax > maxBoostAge ||
      input.ageMin > input.ageMax
    ) {
      return yield* refuse(
        `--age-min and --age-max take ${String(minBoostAge)} to ${String(maxBoostAge)}, the youngest first: ${String(maxBoostAge)} means ${String(maxBoostAge)} and over.`
      );
    }

    const countries = yield* countriesOf(input.countries);
    const endsAt = yield* instantOf(input.ends, input.timeZone, "--ends");

    const startsAt = yield* Effect.transposeOption(
      input.starts.pipe(
        Option.map((given) => instantOf(given, input.timeZone, "--starts"))
      )
    );

    return { countries, endsAt, startsAt };
  });

const fits = (asked: NewBoost) =>
  Schema.decodeUnknownEffect(NewBoostSchema)(asked).pipe(
    Effect.mapError(
      (failure) =>
        new Refused({
          reason: `The boost does not fit, and nothing was sent: ${failure.message}`,
        })
    )
  );

// The boost the flags ask for, in the ad account's own units: the account
// is read first, as its currency says how an amount is counted.
const planned = (
  { client, url, workspace }: InWorkspace,
  input: BoostInput,
  { countries, endsAt, startsAt }: Effect.Success<ReturnType<typeof checked>>
) =>
  Effect.gen(function* planning() {
    const spending = yield* client.ads
      .getAccount({
        params: { accountId: input.account, workspaceId: workspace.id },
      })
      .pipe(Effect.mapError(explain(url)));

    const { account } = spending;
    const currency = input.currency.trim().toUpperCase();

    if (currency !== account.currency) {
      return yield* refuse(
        `The ad account ${account.name} is in ${account.currency}, and --currency says ${currency}: a budget is written in the account's currency, and none is ever converted. Nothing was sent.`
      );
    }

    const budget = yield* Option.match(input.total, {
      onNone: () =>
        minorUnits(
          Option.getOrElse(input.daily, () => ""),
          currency,
          account.minorUnitDigits,
          "--daily"
        ).pipe(Effect.map((amount) => ({ amount, kind: "daily" as const }))),
      onSome: (given) =>
        minorUnits(given, currency, account.minorUnitDigits, "--total").pipe(
          Effect.map((amount) => ({ amount, kind: "total" as const }))
        ),
    });

    const asked = yield* fits({
      accountId: account.id,
      audience: { ageMax: input.ageMax, ageMin: input.ageMin, countries },
      budget,
      channelId: input.channel,
      currency,
      endsAt,
      postId: input.post,
      specialAdCategory: "none",
      ...Option.match(input.beneficiary, {
        onNone: () => ({}),
        onSome: (beneficiary) => ({ beneficiary }),
      }),
      ...Option.match(input.payer, {
        onNone: () => ({}),
        onSome: (payer) => ({ payer }),
      }),
      ...Option.match(startsAt, {
        onNone: () => ({}),
        onSome: (at) => ({ startsAt: at }),
      }),
    });

    return { account, asked };
  });

const quoted = (
  { client, url, workspace }: InWorkspace,
  account: AdAccount,
  asked: NewBoost
) =>
  client.ads
    .quoteBoost({ params: { workspaceId: workspace.id }, payload: asked })
    .pipe(Effect.mapError(explain(url, account.minorUnitDigits)));

// What a boost will spend and for how long, as the person who pays reads
// it before agreeing.
const summaryLines = (
  asked: NewBoost,
  quote: BoostQuote,
  account: AdAccount,
  channel: string
): string[] => {
  const written = (amount: number) =>
    money(amount, quote.currency, quote.minorUnitDigits);

  const left = quote.ceiling - quote.committed;

  return columns([
    ["  Post", `${asked.postId}, on ${channel}`],
    [
      "  Most it can cost",
      `${written(quote.commitment)}, counted against the monthly ceiling`,
    ],
    ["  Budget", budgetOf(asked.budget, written(asked.budget.amount))],
    ["  Starts", instant(quote.startsAt)],
    [
      "  Ends",
      `${instant(quote.endsAt)}: ${String(quote.days)} calendar ${quote.days === 1 ? "day" : "days"} of the ad account's time zone (${account.timeZone})`,
    ],
    ["  Audience", audienceOf(asked.audience)],
    ...(asked.beneficiary === undefined
      ? []
      : [["  Benefits", asked.beneficiary]]),
    ...(asked.payer === undefined ? [] : [["  Paid by", asked.payer]]),
    [
      "  Ad account",
      `${account.name} (${account.network}, ${account.externalId}): the ad network charges its payment method, and Peal never handles the money`,
    ],
    [
      "  Monthly ceiling",
      `${written(quote.ceiling)}, of which its other boosts already commit ${written(quote.committed)}: ${written(left)} left before this one`,
    ],
    ...(quote.capRoom === null
      ? []
      : [
          [
            "  Its own cap",
            `the ad network's cap on the account leaves ${written(quote.capRoom)}`,
          ],
        ]),
  ]);
};

const quote = Command.make(
  "quote",
  boostFlags,
  Effect.fn("ads.boost.quote")(function* quote(input) {
    const parts = yield* checked(input);
    const session = yield* inWorkspace(input.workspace);
    const { account, asked } = yield* planned(session, input, parts);
    const found = yield* quoted(session, account, asked);

    if (input.json) {
      yield* printJson(BoostQuoteSchema, found);

      return;
    }

    const names = yield* channelNames(session.client, session.workspace.id);

    yield* Console.log(
      "Checked, and made nothing: this boost would go through. Nothing is reserved."
    );

    for (const line of summaryLines(
      asked,
      found,
      account,
      named(names, asked.channelId)
    )) {
      yield* Console.log(line);
    }

    yield* Console.log(
      "To make it, run peal ads boost create with the same flags: it spends money, so only once the person who pays agreed to exactly this."
    );
  })
).pipe(
  Command.withDescription(
    "Check a boost and make nothing: what it would spend at most, for how long, on which audience, and the room the ad account's monthly ceiling has. Nothing is reserved or sent."
  )
);

// A request for a boost that got no usable answer may have made it: the
// key that names it is what makes asking again safe.
const withKeyToRetry =
  (key: string) =>
  <E extends { readonly _tag: string }>(failure: ApiRequestFailed | E) =>
    failure instanceof ApiRequestFailed
      ? new Refused({
          code: failure.code,
          error: { ...failure.jsonFailure, idempotencyKey: key },
          reason: [
            `The Peal API at ${failure.url} did not answer as expected (${failure.detail}).`,
            `  The boost may have been made. Read peal ads boosts first, or run the same command again with --idempotency-key ${key}: the same key never makes a second boost. Never run it again under another key.`,
          ].join("\n"),
          requestId: failure.requestId,
        })
      : failure;

const checkedKey = (given: Option.Option<string>) =>
  Option.exists(given, (key) => key === "" || key.length > maxKeyLength)
    ? refuse(`--idempotency-key takes 1 to ${String(maxKeyLength)} characters.`)
    : Effect.void;

const create = Command.make(
  "create",
  {
    ...boostFlags,
    idempotencyKey: Flag.String("idempotency-key").pipe(
      Flag.withMetavar("<key>"),
      Flag.withDescription(
        `Any text of your choosing, ${String(maxKeyLength)} characters at most, that makes the command safe to run again: the same key with the same boost answers the boost the first run made, and never makes another; with another boost it is refused. Left out, one is made up and printed before the request, to pass again when no answer comes.`
      ),
      Flag.optional
    ),
    yes: yesFlag(
      "Make the boost without asking: only once the person who pays agreed to this post, budget, currency and end. Required with --json, and where the input is not a terminal."
    ),
  },
  Effect.fn("ads.boost.create")(function* create(input) {
    yield* neverAsksInJson({
      json: input.json,
      why: "boosting a post spends money",
      yes: input.yes,
    });
    const parts = yield* checked(input);

    yield* checkedKey(input.idempotencyKey);

    const session = yield* inWorkspace(input.workspace);
    const { client, url, workspace } = session;
    const { account, asked } = yield* planned(session, input, parts);
    const found = yield* quoted(session, account, asked);

    if (!input.json) {
      const names = yield* channelNames(client, workspace.id);

      yield* Console.log(
        `This boost SPENDS MONEY: up to ${money(found.commitment, found.currency, found.minorUnitDigits)}, until ${instant(found.endsAt)}.`
      );

      for (const line of summaryLines(
        asked,
        found,
        account,
        named(names, asked.channelId)
      )) {
        yield* Console.log(line);
      }
    }

    yield* confirmed({ question: "Boost this post?", yes: input.yes });

    const key = yield* Option.match(input.idempotencyKey, {
      onNone: () => Effect.sync(() => crypto.randomUUID()),
      onSome: (given) => Effect.succeed(given),
    });

    if (!input.json) {
      yield* Console.log(
        `Idempotency key: ${key}. If no answer comes, run the same command again with --idempotency-key ${key}: it never makes a second boost.`
      );
    }

    const made = yield* client.ads
      .createBoost({
        headers: { "idempotency-key": key },
        params: { workspaceId: workspace.id },
        payload: asked,
      })
      .pipe(
        Effect.mapError(explain(url, account.minorUnitDigits)),
        Effect.mapError(withKeyToRetry(key))
      );

    if (input.json) {
      yield* printJson(BoostSchema, made);

      return;
    }

    yield* Console.log(standingOf(made));
    yield* Console.log(
      `See how it went: peal ads boost show ${made.id} --workspace ${workspace.slug}`
    );
    yield* Console.log(
      `Pause it with peal ads boost pause ${made.id}, or end it for good with peal ads boost stop ${made.id}.`
    );
  })
).pipe(
  Command.withDescription(
    `Boost a published post as an ad, which SPENDS MONEY: up to its budget, from the ad account's payment method, until its end. It first checks the boost and prints what it will spend, for how long and on whom, then asks before making it; --${yesFlagName} answers beforehand, and is required with --json. The boost is made in the background, paused first: peal ads boost show tells how that went.`
  )
);

const show = Command.make(
  "show",
  { boostId: boostArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("ads.boost.show")(function* show({
    boostId,
    json,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const detail = yield* client.ads
      .getBoost({ params: { boostId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(BoostDetailSchema, detail);

      return;
    }

    const amounts = yield* amountsIn(client, workspace.id);

    yield* Console.log(standingOf(detail.boost));

    for (const line of boostLines(detail.boost, amounts)) {
      yield* Console.log(line);
    }

    if (detail.steps.length === 0) {
      yield* Console.log("Peal has sent the ad network nothing for it yet.");

      return;
    }

    yield* Console.log("What Peal sent the ad network for it:");

    for (const line of columns(
      detail.steps.map((step) => [
        `  ${instant(step.startedAt)}`,
        step.step,
        step.outcome ?? "in flight",
        step.networkCode === null ? "" : `code ${step.networkCode}`,
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Show one boost: where it stands, what it can cost, and the requests Peal sent the ad network for it, each with how it ended."
  )
);

// How a boost stands after a member's change, and what comes next.
const printChanged = (changed: Boost, json: boolean, next: string) =>
  json
    ? printJson(BoostSchema, changed)
    : Console.log(standingOf(changed)).pipe(Effect.andThen(Console.log(next)));

const pause = Command.make(
  "pause",
  { boostId: boostArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("ads.boost.pause")(function* pause({
    boostId,
    json,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const paused = yield* client.ads
      .pauseBoost({ params: { boostId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* printChanged(
      paused,
      json,
      `peal ads boost resume ${boostId} runs it again, which spends; peal ads boost stop ${boostId} ends it for good.`
    );
  })
).pipe(
  Command.withDescription(
    "Pause a boost that runs or may run: it spends nothing while paused, and its budget stays counted. Asked twice, it is done once."
  )
);

const resume = Command.make(
  "resume",
  {
    boostId: boostArgument,
    json: jsonFlag,
    workspace: workspaceFlag,
    yes: yesFlag(
      "Resume without asking: only once the person who pays agreed to it. Required with --json, and where the input is not a terminal."
    ),
  },
  Effect.fn("ads.boost.resume")(function* resume({
    boostId,
    json,
    workspace: choice,
    yes,
  }) {
    yield* neverAsksInJson({
      json,
      why: "resuming a boost spends money",
      yes,
    });

    const { client, url, workspace } = yield* inWorkspace(choice);

    const { boost: paused } = yield* client.ads
      .getBoost({ params: { boostId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    const amounts = yield* amountsIn(client, workspace.id);

    if (!json) {
      yield* Console.log(
        `Resuming boost ${boostId} SPENDS MONEY: it runs again until ${instant(paused.endsAt)}, on a budget of ${budgetOf(paused.budget, amounts(paused.accountId, paused.budget.amount, paused.currency))}, which the ad network charges to the ad account's payment method.`
      );
    }

    yield* confirmed({ question: "Resume this boost?", yes });

    const digits = yield* client.ads
      .getAccount({
        params: { accountId: paused.accountId, workspaceId: workspace.id },
      })
      .pipe(
        Effect.map(({ account }) => account.minorUnitDigits),
        Effect.option,
        Effect.map(Option.getOrUndefined)
      );

    const resumed = yield* client.ads
      .resumeBoost({ params: { boostId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url, digits)));

    yield* printChanged(
      resumed,
      json,
      `peal ads boost pause ${boostId} pauses it again; peal ads boost stop ${boostId} ends it for good.`
    );
  })
).pipe(
  Command.withDescription(
    `Run a paused boost again until its end, which SPENDS MONEY: it is checked as a new boost is, and asks before resuming; --${yesFlagName} answers beforehand, and is required with --json.`
  )
);

const stop = Command.make(
  "stop",
  {
    boostId: boostArgument,
    json: jsonFlag,
    workspace: workspaceFlag,
    yes: yesFlag(
      "Stop without asking. Required with --json, and where the input is not a terminal."
    ),
  },
  Effect.fn("ads.boost.stop")(function* stop({
    boostId,
    json,
    workspace: choice,
    yes,
  }) {
    yield* neverAsksInJson({
      json,
      why: "stopping a boost is final, though it spends nothing",
      yes,
    });

    const { client, url, workspace } = yield* inWorkspace(choice);

    if (!json) {
      yield* Console.log(
        `Stopping boost ${boostId} is final: it never runs again, and one not yet made is never made. Stopping spends nothing.`
      );
    }

    yield* confirmed({ question: "Stop this boost for good?", yes });

    const stopped = yield* client.ads
      .stopBoost({ params: { boostId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* printChanged(
      stopped,
      json,
      "What it committed is counted down to what it can have cost."
    );
  })
).pipe(
  Command.withDescription(
    `Stop a boost for good: it never runs again, and one not yet made is never made. It asks first, as it is final; --${yesFlagName} answers beforehand, and is required with --json. Asked twice, it is done once.`
  )
);

export const boost = Command.make("boost").pipe(
  Command.withDescription(
    "One boost: check what it would spend, make it, read it, pause it, resume it or stop it. Making and resuming a boost spend money."
  ),
  Command.withSubcommands([show, quote, create, pause, resume, stop])
);
