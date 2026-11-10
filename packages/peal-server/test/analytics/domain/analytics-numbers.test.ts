import { Option } from "effect";
import { accountNumberNames, postCountNames } from "peal-contract";
import { describe, expect, it } from "vitest";

import {
  accountNumbers,
  numbersOf,
  postCounts,
} from "#analytics/domain/analytics-numbers.ts";
import { isCounted } from "#analytics/domain/counted-platforms.ts";
import { platforms } from "#shared/domain/platform.ts";

const page = Option.some("linkedinPage" as const);
const profile = Option.some("linkedinProfile" as const);

describe("the numbers analytics reads on a channel", () => {
  it("are those of its platform: the counts every reader gives, and the ones only some tell", () => {
    expect(numbersOf("mastodon", Option.none())).toStrictEqual({
      account: ["followers", "following", "posts"],
      post: ["likes", "reposts", "replies", "quotes"],
    });
    expect(numbersOf("linkedin", page)).toStrictEqual({
      account: ["followers", "views", "reach"],
      post: ["likes", "reposts", "replies", "impressions", "clicks", "reach"],
    });
    expect(numbersOf("x", Option.none(), { x: true }).post).toStrictEqual([
      "likes",
      "reposts",
      "replies",
      "quotes",
      "impressions",
      "saves",
    ]);
  });

  it("are none where Peal reads nothing: a LinkedIn profile, X unless turned on, Google Business Profile", () => {
    const none = { account: [], post: [] };

    expect(numbersOf("linkedin", profile)).toStrictEqual(none);
    expect(numbersOf("x", Option.none())).toStrictEqual(none);
    expect(numbersOf("googleBusiness", Option.none())).toStrictEqual(none);
  });

  it("name a platform's post counts exactly where it has a reader", () => {
    for (const platform of platforms) {
      expect([platform, postCounts[platform].length > 0]).toStrictEqual([
        platform,
        isCounted(platform, { x: true }),
      ]);
    }
  });

  it("use the words the contract lists", () => {
    const post = new Set(Object.values(postCounts).flat());
    const account = new Set(Object.values(accountNumbers).flat());

    expect([...post].toSorted()).toStrictEqual([...postCountNames].toSorted());
    expect([...account].toSorted()).toStrictEqual(
      [...accountNumberNames].toSorted()
    );
  });
});
