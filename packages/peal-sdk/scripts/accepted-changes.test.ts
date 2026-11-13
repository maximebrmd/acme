import { describe, expect, it } from "bun:test";

import { breakingOf, checkAccepted } from "./accepted-changes.ts";

const documentChange = {
  change: "Post.status lost the value archived",
  reason: "Synthetic: decided on.",
};

// A change the document does not show: what an endpoint refuses now.
const behaviour = {
  change: "PUT /api/x refuses OAuth clients",
  kind: "behaviour" as const,
  reason: "Synthetic: closes a hole.",
};

describe("checkAccepted", () => {
  it("matches the document's breaking changes against those accepted", () => {
    expect(
      checkAccepted(
        ["Post.status lost the value archived", "Other"],
        [documentChange]
      )
    ).toStrictEqual({ stale: [], unaccepted: ["Other"] });
  });

  it("calls stale an accepted document change that no longer happens", () => {
    expect(checkAccepted([], [documentChange])).toStrictEqual({
      stale: [documentChange],
      unaccepted: [],
    });
  });

  it("keeps a behaviour or SDK change, which the document cannot show", () => {
    expect(
      checkAccepted([], [behaviour, { ...behaviour, kind: "sdk" }])
    ).toStrictEqual({ stale: [], unaccepted: [] });
  });
});

describe("breakingOf", () => {
  it("lists every accepted change in the changelog, as it serves them", () => {
    expect(breakingOf([documentChange, behaviour])).toStrictEqual([
      documentChange,
      { change: behaviour.change, reason: behaviour.reason },
    ]);
  });
});
