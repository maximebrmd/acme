import { describe, expect, it } from "@effect/vitest";

import {
  r2Policy,
  uploadRule,
  uploadRuleId,
  withUploadRule,
} from "#media/infrastructure/bucket-cors.ts";

const rule = uploadRule(["http://localhost:3001", "https://app.example.test"]);

const other = {
  AllowedMethods: ["GET"],
  AllowedOrigins: ["*"],
  ID: "public-reads",
};

describe(uploadRule, () => {
  it("allows the signed headers of a PUT from each origin once", () => {
    expect(
      uploadRule([
        "https://app.example.test",
        "http://localhost:3001",
        "https://app.example.test",
      ])
    ).toStrictEqual({
      AllowedHeaders: ["content-type", "if-none-match"],
      AllowedMethods: ["PUT"],
      AllowedOrigins: ["http://localhost:3001", "https://app.example.test"],
      ID: uploadRuleId,
      MaxAgeSeconds: 3600,
    });
  });
});

describe(withUploadRule, () => {
  it("adds the rule to a bucket without one, keeping the others", () => {
    expect(withUploadRule([other], rule)).toStrictEqual({
      changed: true,
      rules: [other, rule],
    });
  });

  it("changes nothing when the bucket has the rule", () => {
    const stored = {
      ...rule,
      AllowedHeaders: ["If-None-Match", "Content-Type"],
      AllowedOrigins: [...(rule.AllowedOrigins ?? [])].toReversed(),
    };

    expect(withUploadRule([other, stored], rule).changed).toBeFalsy();
  });

  it("replaces an earlier version of the rule", () => {
    const earlier = { ...rule, AllowedOrigins: ["http://localhost:3000"] };

    expect(withUploadRule([earlier, other], rule)).toStrictEqual({
      changed: true,
      rules: [other, rule],
    });
  });
});

describe(r2Policy, () => {
  it("states the rule without its id, as R2's dashboard takes it", () => {
    expect(r2Policy(rule)).toStrictEqual([
      {
        AllowedHeaders: ["content-type", "if-none-match"],
        AllowedMethods: ["PUT"],
        AllowedOrigins: ["http://localhost:3001", "https://app.example.test"],
        MaxAgeSeconds: 3600,
      },
    ]);
  });
});
