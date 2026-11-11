# Ads and boosts

Read [SKILL.md](../SKILL.md) first: its rules apply here, and the rules
about money in its "Ads and boosts" section come before anything below.

A boost promotes a post the workspace already published through Peal, on a
Facebook Page or on an Instagram account connected through its Page, as an
ad on Meta. The ad network charges the ad account's payment method. Peal
never handles the money.

## What is in place before a boost

```sh
peal ads status --json
peal ads accounts --json
peal ads account <account-id> --json
```

- `status` answers `mode`: `off` (nothing), `read` (ad accounts are read,
  nothing spends) or `spend`. The server's operator sets it.
- An ad account has a `currency` and `minorUnitDigits` (2, or 0 for a
  currency without a smaller unit, such as JPY). Every amount of the API is
  an integer in minor units: 5000 is 50.00 EUR, and 5000 JPY.
- `spendingEnabled` and `monthlyCeiling` say whether an owner allowed the
  account to spend through Peal, and the most its boosts may commit in a
  calendar month of its time zone. `account` adds `committedThisMonth`.

Three things are a person's, in the web app, signed in themselves. No
command, API key or application does them, and the API answers `forbidden`
with the `reason` `personRequired`:

- signing in to the ad network and choosing the ad accounts to connect;
- turning spending on for an ad account;
- setting or raising its monthly ceiling.

When one is missing, stop and tell the user. Never look for another way.

## What a sign-in or a key needs

- Reading takes `ads:read` (owners, admins, editors).
- Boosting and resuming take `ads:spend`; pausing and stopping take
  `ads:spend` or `ads:manage` (owners, admins).
- A person's sign-in also needs the scope `workspace:ads`, which is asked
  only on purpose:

```sh
peal login --ads
peal doctor --json
```

The person runs `peal login --ads` and approves it. The `ads-scope` check of
`peal doctor` says whether the sign-in has it. Without it, boost commands
answer `forbidden` with the `reason` `missingScope`: tell the user, who
decides whether this command line may spend.

## Read what ads did

```sh
peal ads campaigns <account-id> --from 2026-11-01 --to 2026-11-30 --json
peal ads list <account-id> --campaign <campaign-id> --json
peal ads insights <account-id> --from 2026-11-01 --to 2026-11-30 --json
peal ads post <post-id> --json
```

Campaigns and ads are read from the network every hour, those made outside
Peal included. `--from` and `--to` are days of the ad account's calendar,
366 at most; without them, the last 30.

`ads post` answers the post's `organic` counts by channel beside its `paid`
totals by ad account. Paid numbers are part of what a platform counts on
the post: report them side by side, and never add them. Amounts of two ad
accounts may be in two currencies: never add those either.

## Quote, then create

Run the quote first, always, and show the user what it answers.

```sh
peal ads boost quote --account <account-id> --post <post-id> --channel <channel-id> \
  --total 50 --currency EUR --ends 2026-11-20T09:00:00Z --countries FR,BE \
  --beneficiary "Studio" --payer "Studio" --not-special-category --json
```

| Flag                       | Meaning                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| `--account`                | The ad account that pays.                                        |
| `--post`, `--channel`      | The published post, and the channel it is boosted on.            |
| `--total` or `--daily`     | The budget, in the currency's units: `50`, `50.00`. Exactly one. |
| `--currency`               | Required. It must be the ad account's. Never guess it.           |
| `--ends`                   | Required. At least a day after the start, 90 days at most.       |
| `--starts`                 | Optional: now when left out, 30 days ahead at most.              |
| `--countries`              | Required: ISO alpha-2 codes, 25 at most.                         |
| `--age-min`, `--age-max`   | 18 to 65; 65 means 65 and over. Default: 18 and 65.              |
| `--beneficiary`, `--payer` | Who benefits and who pays: required for a country of the EU.     |
| `--not-special-category`   | Required declaration. See below.                                 |

The amount is written in the currency's units, not in minor units: `--total
50 --currency EUR` is 50.00 EUR. More decimals than the currency has are
refused (`50.5` in JPY), and nothing is ever rounded or converted.

Peal does not boost ads about housing, employment, financial products or
services, or social issues, elections or politics. Pass
`--not-special-category` only when the user's post is about none of these.
When unsure, ask the user. Never pass it to get past the refusal.

The quote answers, in minor units:

- `commitment`: the most the boost can cost. A total budget commits its
  amount. A daily budget commits 175% of its amount for each calendar day
  the run touches (`days`), which the network may spend on any day, and
  never more than 7 times its amount in a week, Sunday to Saturday.
- `ceiling`, and `committed`: the monthly ceiling, and what the account's
  other boosts already commit.
- `startsAt`, `endsAt`, `currency`, `minorUnitDigits`, and `capRoom`, what
  the ad account's own cap at the network leaves, or null.

Tell the user, in the currency's units: the most it can cost, the budget,
the start, the end and the days, the audience, and the ad account that is
charged. Then wait for their answer.

Create only once the user agreed to exactly that:

```sh
peal ads boost create --account <account-id> --post <post-id> --channel <channel-id> \
  --total 50 --currency EUR --ends 2026-11-20T09:00:00Z --countries FR,BE \
  --beneficiary "Studio" --payer "Studio" --not-special-category \
  --idempotency-key <key> --yes --json
```

- Without `--yes`, the command prints the summary and asks at the terminal.
  With `--json`, or without a terminal, it never asks: it refuses with
  `confirmation_required` and makes nothing. `--yes` is the user's
  agreement, not yours.
- Always pass `--idempotency-key`: any text, 255 characters at most, derived
  from the task. Left out, the command makes one up and prints it.
- It answers the boost in the state `requested`: accepted, and made in the
  background, paused first. Read it to see how that went.

### When no answer comes

After a timeout, a dropped connection or a 5xx, the boost may have been
made. Never run `boost create` again under a new key: that can spend twice.

1. Run the same command again with the SAME `--idempotency-key`: it answers
   the boost the first run made, and makes no other. The failure names the
   key in `idempotencyKey`.
2. Or read the boosts first, and look for it:

```sh
peal ads boosts --post <post-id> --json
```

The same key with another request is refused (`boost_key_reused`), and makes
nothing.

## Read, pause, resume, stop

```sh
peal ads boosts --json
peal ads boost show <boost-id> --json
peal ads boost pause <boost-id> --json
peal ads boost stop <boost-id> --yes --json
peal ads boost resume <boost-id> --yes --json
```

| `state`       | Meaning                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| `requested`   | Accepted, being made. Spends nothing yet. Read again shortly.                                              |
| `active`      | Running, and spending, until `endsAt`.                                                                     |
| `paused`      | Spends nothing. Its budget stays counted against the ceiling.                                              |
| `ended`       | Its end date passed.                                                                                       |
| `stopped`     | Stopped for good.                                                                                          |
| `failed`      | Could not be made. Nothing ran: `failureReason` says why.                                                  |
| `unconfirmed` | Peal could not read back whether it runs. It MAY BE SPENDING. Tell the user at once, and offer to stop it. |

`boost show` adds `steps`: each request Peal sent the network, with its
`outcome`.

- Pausing spends nothing, and is safe to run twice. Offer it whenever the
  user hesitates.
- Stopping is final: a stopped boost never runs again. It spends nothing,
  and is safe to run twice. It takes `--yes`, as it cannot be undone.
- Resuming SPENDS MONEY, like creating: only when the user asked to resume
  this boost, in this conversation. It is checked against the ceiling again.

A `failed` boost is not retried by itself. Report `failureReason` to the
user, and make a new boost only when they ask, after a new quote.

Owners read every decision about spending and every change to a boost in
the web app. `peal ads audit --json` answers the same trail to a credential
that holds `ads:authorize`, which no application is ever given.

## Over HTTP

The same rules, with curl. `Idempotency-Key` is required to create.

```sh
curl -sS -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/ads/accounts"
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  -H "Content-Type: application/json" -d @boost.json \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/ads/boosts/quote"
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  -H "Content-Type: application/json" -H "Idempotency-Key: <key>" -d @boost.json \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/ads/boosts"
curl -sS -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/ads/boosts/<boost-id>"
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/ads/boosts/<boost-id>/pause"
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/ads/boosts/<boost-id>/stop"
```

Over HTTP the body's `budget.amount` is in minor units (5000 for 50.00 EUR),
`specialAdCategory` must be `"none"`, and nothing asks for a confirmation:
the user's agreement to the quote comes before the request to create.

## Error codes of ads

| Code                            | Status | What to do                                                                  |
| ------------------------------- | ------ | --------------------------------------------------------------------------- |
| `ads_unavailable`               | 404    | Ads are off on this server. Tell the user.                                  |
| `ad_spending_unavailable`       | 409    | The server reads ads only. Nothing was spent.                               |
| `ad_account_not_found`          | 404    | List the ad accounts again.                                                 |
| `boost_not_found`               | 404    | List the boosts again.                                                      |
| `ad_spending_not_enabled`       | 409    | An owner turns spending on, in the web app. Tell the user.                  |
| `spend_ceiling_exceeded`        | 409    | `ceiling`, `committed`, `requested`: an owner raises it, or ask for less.   |
| `ad_account_spend_cap_exceeded` | 409    | The account's own cap at the network leaves `room`. Ask for less.           |
| `ad_account_unusable`           | 409    | `reason`: settled at the network, or its person signs in again.             |
| `boost_invalid`                 | 422    | Fix every entry of `violations`. Nothing was reserved or sent.              |
| `post_not_promotable`           | 422    | `reason`: the post is not live there, or the channel cannot run ads.        |
| `boost_state_conflict`          | 409    | The boost's `state` does not allow this. Read it again.                     |
| `boost_key_reused`              | 409    | The key names another boost. Nothing was made.                              |
| `ad_account_busy`               | 409    | Stop the account's `boosts` first.                                          |
| `ad_network_unavailable`        | 503    | Nothing is known to have changed. Wait `retryAfterSeconds`, read the boost. |

Amounts in these errors are in minor units of `currency`. Never retry
`spend_ceiling_exceeded` with a larger ceiling in mind: only an owner
changes it, and Peal never raises a ceiling or a budget on its own.
