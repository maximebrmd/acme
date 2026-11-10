import { describe, expect, it } from "@effect/vitest";

import config from "../next.config.ts";

const rules = async () => (await config.headers?.()) ?? [];

describe("next.config.ts", () => {
  it("does not advertise Next.js", () => {
    expect(config.poweredByHeader).toBeFalsy();
  });

  it("applies its headers to every path, /api/* included", async () => {
    const [everywhere] = await rules();

    expect(everywhere?.source).toBe("/:path*");
  });

  it("keeps a connect link's page, whose address holds its token, out of referers, caches and search engines", async () => {
    const [, ...hosted] = await rules();

    expect(hosted.map((rule) => rule.source)).toStrictEqual([
      "/connect/link",
      "/:locale/connect/link",
    ]);

    for (const rule of hosted) {
      expect(rule.headers).toStrictEqual([
        { key: "Cache-Control", value: "no-store" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ]);
    }
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
    const [everywhere] = await rules();
    const headers = everywhere?.headers ?? [];

    expect(headers.find((header) => header.key === key)?.value).toBe(value);
  });
});
