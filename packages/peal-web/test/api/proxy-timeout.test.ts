import { describe, expect, it } from "@effect/vitest";

import config from "../../next.config.ts";

// The longest the server takes over a request: the writing assistant waits
// 90 seconds for its language model.
const longestServerRequest = 90_000;

describe("the /api proxy", () => {
  // Next cuts a forwarded request after 30 seconds unless told otherwise,
  // and answers 500 while the server still works on it.
  it("waits longer than the server takes", () => {
    expect(config.experimental?.proxyTimeout ?? 30_000).toBeGreaterThan(
      longestServerRequest
    );
  });
});
