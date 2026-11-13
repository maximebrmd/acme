// The exit codes of stripe-catalogue, which a release reads to stop or go
// on, never its words.
import { describe, expect, it } from "@effect/vitest";

import { catalogueExitCode } from "#billing/infrastructure/stripe-catalogue-command.ts";
import { StripeCatalogueDiffers } from "#billing/infrastructure/stripe-catalogue-differs.ts";
import { StripeCatalogueUnread } from "#billing/infrastructure/stripe-catalogue-unread.ts";

describe("the command's exit codes", () => {
  it("tells a difference, a refusal or an unreadable answer, and no answer apart", () => {
    expect(
      catalogueExitCode(new StripeCatalogueDiffers({ problems: ["synthetic"] }))
    ).toBe(3);

    for (const reason of ["refused", "unreadable"] as const) {
      expect(
        catalogueExitCode(
          new StripeCatalogueUnread({ during: "listing the meters", reason })
        )
      ).toBe(4);
    }

    expect(
      catalogueExitCode(
        new StripeCatalogueUnread({
          during: "listing the meters",
          reason: "unanswered",
        })
      )
    ).toBe(5);
  });
});
