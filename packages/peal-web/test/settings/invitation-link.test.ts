import { describe, expect, it } from "@effect/vitest";

import { invitationLink } from "#settings/invitation-link.ts";

const id = "00000000-0000-7000-8000-00000000e001";

describe(invitationLink, () => {
  it("opens the invitation's page in English without a prefix", () => {
    expect(invitationLink("https://app.example.test", "en", id)).toBe(
      `https://app.example.test/invitations/${id}`
    );
  });

  it("opens it under /fr in French", () => {
    expect(invitationLink("http://localhost:3001", "fr", id)).toBe(
      `http://localhost:3001/fr/invitations/${id}`
    );
  });
});
