import { describe, expect, it } from "@effect/vitest";

import { TwoStepRequiredNotice } from "#components/two-step/required-notice.tsx";
import { noticeAnswer, onTwoStepRefusal } from "#two-step/refusals.ts";

import { render } from "./render.tsx";

describe(TwoStepRequiredNotice, () => {
  it("says what the owners require, and leads to the account", async () => {
    const html = await render(
      "en",
      <TwoStepRequiredNotice
        action={<span data-href="/app/account">Go</span>}
      />
    );

    expect(html).toContain("This workspace requires two-step verification");
    expect(html).toContain("Turn it on to open the workspace.");
    expect(html).toContain('data-href="/app/account"');
  });

  it("speaks French", async () => {
    await expect(
      render("fr", <TwoStepRequiredNotice action={null} />)
    ).resolves.toContain(
      "Cet espace de travail exige la validation en deux étapes"
    );
  });
});

describe(noticeAnswer, () => {
  it("tells the page of a refusal for two-step verification alone", () => {
    const told: string[] = [];

    const stop = onTwoStepRefusal(() => {
      told.push("refused");
    });

    noticeAnswer({ reason: "missingPermission", status: 403 });
    noticeAnswer({ reason: "twoStepRequired", status: 500 });
    noticeAnswer({ status: 403 });
    noticeAnswer({ reason: "twoStepRequired", status: 403 });
    stop();
    noticeAnswer({ reason: "twoStepRequired", status: 403 });

    expect(told).toStrictEqual(["refused"]);
  });
});
