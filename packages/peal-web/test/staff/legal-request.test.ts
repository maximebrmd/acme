import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import { legalRequestOf } from "#staff/legal-request.ts";
import type { LegalRequestFields } from "#staff/legal-request.ts";

const fields: LegalRequestFields = {
  authority: "  Synthetic public prosecutor ",
  covers: ["identity", "connections"],
  identifier: " Ana@Example.test ",
  kind: "email",
  legalBasis: "Synthetic code of criminal procedure, article 60-1",
  reference: "Synthetic requisition 2026-0001",
  since: "",
  until: "",
};

describe(legalRequestOf, () => {
  it("writes the request the authority made, trimmed, about the identifier given", () => {
    expect(legalRequestOf(fields)).toStrictEqual(
      Option.some({
        authority: "Synthetic public prosecutor",
        covers: ["identity", "connections"],
        legalBasis: "Synthetic code of criminal procedure, article 60-1",
        reference: "Synthetic requisition 2026-0001",
        subject: { email: "Ana@Example.test" },
      })
    );
  });

  it("names an account or a workspace by its id", () => {
    const id = "5b1f0d6e-2f6b-4c57-9c06-3b7e7d0f2a11";

    expect(
      legalRequestOf({ ...fields, identifier: id, kind: "userId" }).pipe(
        Option.map(({ subject }) => subject)
      )
    ).toStrictEqual(Option.some({ userId: id }));
    expect(
      legalRequestOf({ ...fields, identifier: id, kind: "workspaceId" }).pipe(
        Option.map(({ subject }) => subject)
      )
    ).toStrictEqual(Option.some({ workspaceId: id }));
  });

  it("takes the period of the connections as whole UTC days, both included", () => {
    const request = legalRequestOf({
      ...fields,
      since: "2026-03-01",
      until: "2026-03-31",
    });

    expect(request.pipe(Option.map(({ since }) => since))).toStrictEqual(
      Option.some(DateTime.makeUnsafe("2026-03-01T00:00:00.000Z"))
    );
    expect(request.pipe(Option.map(({ until }) => until))).toStrictEqual(
      Option.some(DateTime.makeUnsafe("2026-03-31T23:59:59.999Z"))
    );
  });

  it("is not a request without its authority, reference, legal basis, subject or what it covers", () => {
    for (const missing of [
      { authority: " " },
      { reference: "" },
      { legalBasis: "  " },
      { identifier: "" },
      { covers: [] },
      { since: "not a day" },
    ] satisfies Partial<LegalRequestFields>[]) {
      expect(legalRequestOf({ ...fields, ...missing })).toStrictEqual(
        Option.none()
      );
    }
  });
});
