import { describe, expect, it } from "@effect/vitest";

import {
  keyOf,
  recoveryFileOf,
  TwoStepCodesView,
  TwoStepOffView,
  TwoStepOnView,
  TwoStepSetupView,
} from "#components/account/two-step-views.tsx";

import { ignore, render } from "./render.tsx";

// A URI as the library writes it, with a key made up for the test.
const totpURI =
  "otpauth://totp/Peal:ada%40example.test?secret=SYNTHETICKEYSYNTHETICKEY&issuer=Peal&digits=6&period=30";

const codes = ["synth-00001", "synth-00002"];

describe("two-step verification on the account page", () => {
  it("offers to turn it on, once the address is confirmed", async () => {
    const offered = await render(
      "en",
      <TwoStepOffView emailVerified onTurnOn={ignore} />
    );

    const held = await render(
      "en",
      <TwoStepOffView emailVerified={false} onTurnOn={ignore} />
    );

    expect(offered).toContain("Turn on");
    expect(held).toContain(
      "Confirm your email address before turning this on."
    );
    expect(held).not.toContain("Turn on");
  });

  it("draws the key as a QR code, and writes it out", async () => {
    const html = await render(
      "en",
      <TwoStepSetupView
        code=""
        error={null}
        pending={false}
        totpURI={totpURI}
        onCancel={ignore}
        onCode={ignore}
        onSubmit={ignore}
      />
    );

    expect(html).toContain("<svg");
    expect(html).toContain("SYNTHETICKEYSYNTHETICKEY");
    expect(html).toContain('autoComplete="one-time-code"');
  });

  it("says a wrong first code, in French too", async () => {
    const html = await render(
      "fr",
      <TwoStepSetupView
        code="000000"
        error="INVALID_CODE"
        pending={false}
        totpURI={totpURI}
        onCancel={ignore}
        onCode={ignore}
        onSubmit={ignore}
      />
    );

    expect(html).toContain("Ce code n’est pas celui");
  });

  it("shows the recovery codes once, and waits for them to be saved", async () => {
    const unsaved = await render(
      "en",
      <TwoStepCodesView
        codes={codes}
        saved={false}
        onCopy={ignore}
        onDone={ignore}
        onDownload={ignore}
        onSaved={ignore}
      />
    );

    expect(unsaved).toContain("synth-00001");
    expect(unsaved).toContain("I saved these codes");
    expect(unsaved).toMatch(/<button[^>]*disabled[^>]*>Done/u);
  });

  it("says how many codes are left, and holds turning it off for a workspace that requires it", async () => {
    const free = await render(
      "en",
      <TwoStepOnView
        recoveryCodesLeft={9}
        requiredBy={[]}
        onNewCodes={ignore}
        onTurnOff={ignore}
      />
    );

    const held = await render(
      "en",
      <TwoStepOnView
        recoveryCodesLeft={1}
        requiredBy={["Studio"]}
        onNewCodes={ignore}
        onTurnOff={ignore}
      />
    );

    expect(free).toContain("9 recovery codes left");
    expect(free).toContain("Turn off");
    expect(held).toContain("Required by: Studio.");
    expect(held).not.toContain("Turn off");
  });
});

describe(keyOf, () => {
  it("reads the key from the URI, and the file holds a code a line", () => {
    expect(keyOf(totpURI)).toBe("SYNTHETICKEYSYNTHETICKEY");
    expect(recoveryFileOf(codes)).toBe("synth-00001\nsynth-00002\n");
  });
});
