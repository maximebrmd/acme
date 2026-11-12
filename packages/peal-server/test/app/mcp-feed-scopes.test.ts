import { describe, expect, it } from "@effect/vitest";

import { toolCatalogue } from "#app/mcp/catalogue.ts";

// The feeds' tools as the catalogue lists them: a feed of drafts takes the
// scope that writes, as its use cases check; one on a queue takes
// post:schedule as well, which each tool's description says.

describe("the feeds' tools", () => {
  it("take workspace:write, the preview included, which spends a read", () => {
    const scopes = Object.fromEntries(
      toolCatalogue()
        .filter(({ area }) => area === "feeds")
        .map(({ changes, name, scope }) => [name, [scope, changes]])
    );

    expect(scopes).toStrictEqual({
      create_feed: ["workspace:write", true],
      delete_feed: ["workspace:write", true],
      get_feed: ["workspace:read", false],
      list_feeds: ["workspace:read", false],
      preview_feed: ["workspace:write", true],
      update_feed: ["workspace:write", true],
    });
  });
});
