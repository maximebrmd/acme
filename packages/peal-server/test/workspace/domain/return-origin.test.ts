import { describe, expect, it } from "@effect/vitest";
import { Result } from "effect";

import {
  allowsReturnTo,
  parseReturnOrigin,
} from "#workspace/domain/return-origin.ts";

const origin = (input: string) => Result.getOrThrow(parseReturnOrigin(input));

const refusal = (input: string) => {
  const parsed = parseReturnOrigin(input);

  return Result.isFailure(parsed) ? parsed.failure.reason : "taken";
};

// An address that runs a script, written so no linter takes it for one.
const scriptUrl = ["javascript", "alert(1)"].join(":");

describe(parseReturnOrigin, () => {
  it("keeps an origin as browsers write it", () => {
    expect(
      [
        "https://app.example.test",
        " https://App.Example.test/ ",
        "https://app.example.test:8443",
        "https://app.example.test:443",
      ].map(origin)
    ).toStrictEqual([
      "https://app.example.test",
      "https://app.example.test",
      "https://app.example.test:8443",
      "https://app.example.test",
    ]);
  });

  it("takes plain HTTP for this machine only", () => {
    expect(origin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(origin("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    expect(refusal("http://app.example.test")).toBe("notHttps");
    expect(refusal("http://localhost.example.test")).toBe("notHttps");
  });

  it.each([
    ["https://app.example.test/callback", "notAnOrigin"],
    ["https://app.example.test/?next=1", "notAnOrigin"],
    ["https://app.example.test/#done", "notAnOrigin"],
    ["https://user:secret@app.example.test", "credentials"],
    ["myapp://callback", "notHttps"],
    [scriptUrl, "notHttps"],
    ["//app.example.test", "malformed"],
    ["https://*.example.test", "malformed"],
    ["", "malformed"],
  ])("refuses %s, which is more or other than an origin", (input, reason) => {
    expect(refusal(input)).toBe(reason);
  });
});

describe(allowsReturnTo, () => {
  const registered = [origin("https://app.example.test")];

  it("lets through an address on a registered origin, wherever on it", () => {
    expect(
      allowsReturnTo(registered, "https://app.example.test/settings?tab=social")
    ).toBeTruthy();
  });

  it.each([
    "https://evil.example.test/",
    "https://app.example.test.evil.example/",
    "https://sub.app.example.test/",
    "http://app.example.test/",
    "https://app.example.test:8443/",
    "https://app.example.test@evil.example/",
    String.raw`https://evil.example\@app.example.test/`,
    "https://evil.example/https://app.example.test/",
    "//app.example.test/",
    "/settings",
    scriptUrl,
  ])("holds back %s, however close to the origin it looks", (elsewhere) => {
    expect(allowsReturnTo(registered, elsewhere)).toBeFalsy();
  });
});
