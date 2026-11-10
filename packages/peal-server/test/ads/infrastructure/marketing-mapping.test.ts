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

describe("the names Meta gives", () => {
  it("are kept storable, on one line, for an account", () => {
    const facts = factsOf({
      account_id: "1001",
      currency: "EUR",
      name: unruly,
    });

    assert.strictEqual(
      Option.map(facts, ({ name }) => name).pipe(Option.getOrNull),
      "Autumn sale now evil�"
    );
  });

  it("are kept storable, on one line, for campaigns, ad sets and ads", () => {
    const names = [
      campaignOf({ id: "2001", name: unruly, status: "ACTIVE" }, eur),
      adSetOf(
        { campaign_id: "2001", id: "3001", name: unruly, status: "ACTIVE" },
        eur
      ),
      adOf({
        adset_id: "3001",
        campaign_id: "2001",
        id: "4001",
        name: unruly,
        status: "ACTIVE\u0000",
      }),
    ].map((object) =>
      Option.map(object, ({ name, rawStatus }) => [name, rawStatus]).pipe(
        Option.getOrNull
      )
    );

    assert.deepStrictEqual(names, [
      ["Autumn sale now evil�", "ACTIVE"],
      ["Autumn sale now evil�", "ACTIVE"],
      ["Autumn sale now evil�", "ACTIVE"],
    ]);
  });
});
