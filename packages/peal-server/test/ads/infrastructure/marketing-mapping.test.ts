import { assert, describe, it } from "@effect/vitest";
import { Option } from "effect";

import { CurrencySchema } from "#ads/domain/money.ts";
import {
  adOf,
  adSetOf,
  campaignOf,
  factsOf,
} from "#ads/infrastructure/meta/marketing-mapping.ts";

// What Meta names an account, a campaign, an ad set or an ad was written
// by whoever runs it: kept only once storable, on one line, as every
// platform's string is.

const eur = CurrencySchema.make("EUR");

// A NUL, a carriage return and a line break, a mark that reverses what
// follows, and half a surrogate pair.
const unruly = "Autumn\u0000 sale\r\nnow ‮evil\uD800";

const cleaned = "Autumn sale now evil�";

// The name and the raw status an object keeps.
const kept = (
  object: Option.Option<{ readonly name: string; readonly rawStatus: string }>
) =>
  object.pipe(
    Option.map(({ name, rawStatus }) => [name, rawStatus]),
    Option.getOrNull
  );

describe("the names Meta gives", () => {
  it("are kept storable, on one line, for an account", () => {
    const facts = factsOf({
      account_id: "1001",
      currency: "EUR",
      name: unruly,
    });

    assert.strictEqual(
      facts.pipe(
        Option.map(({ name }) => name),
        Option.getOrNull
      ),
      cleaned
    );
  });

  it("are kept storable, on one line, for campaigns, ad sets and ads", () => {
    assert.deepStrictEqual(
      [
        kept(campaignOf({ id: "2001", name: unruly, status: "ACTIVE" }, eur)),
        kept(
          adSetOf(
            { campaign_id: "2001", id: "3001", name: unruly, status: "ACTIVE" },
            eur
          )
        ),
        kept(
          adOf({
            adset_id: "3001",
            campaign_id: "2001",
            id: "4001",
            name: unruly,
            status: "ACTIVE\u0000",
          })
        ),
      ],
      [
        [cleaned, "ACTIVE"],
        [cleaned, "ACTIVE"],
        [cleaned, "ACTIVE"],
      ]
    );
  });
});
