import { describe, expect, it } from "@effect/vitest";

import config from "../next.config.ts";

const rules = async () => (await config.headers?.()) ?? [];

describe("next.config.ts", () => {
  it("does not advertise Next.js", () => {
    expect(config.poweredByHeader).toBeFalsy();
  });

  it("applies its headers to every path, /api/* included", async () => {
    const applied = await rules();

    expect(applied.map((rule) => rule.source)).toStrictEqual(["/:path*"]);
  });

  it.each([
    [
      "Content-Security-Policy",
      "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
    ],
    ["X-Frame-Options", "DENY"],
    ["X-Content-Type-Options", "nosniff"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
  ])("sends %s", async (key, value) => {
    const applied = await rules();
    const headers = applied.flatMap((rule) => rule.headers);

    expect(headers.find((header) => header.key === key)?.value).toBe(value);
  });
});
