import { describe, expect, it } from "@effect/vitest";

import { isUntraced } from "#app/untraced-paths.ts";

// The paths the HTTP tracer leaves out: what their address holds is a
// visitor's (a short link's redirect) or a capability (the digest's
// unsubscribe token), which `url.full` would keep in the traces.
describe(isUntraced, () => {
  it("leaves out short links and the digest's unsubscribe links", () => {
    expect(isUntraced("/api/l/abc123")).toBeTruthy();
    expect(
      isUntraced(
        "/api/notifications/weekly-digest/unsubscribe/6c1d9e0a-2b3f-4a5c-8d7e-9f0a1b2c3d4e.0.tag"
      )
    ).toBeTruthy();
  });

  it("traces everything else", () => {
    expect(isUntraced("/api/me/notification-preferences")).toBeFalsy();
    expect(isUntraced("/api/health")).toBeFalsy();
    expect(isUntraced("/api/lookups")).toBeFalsy();
  });
});
