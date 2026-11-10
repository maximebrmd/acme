// The export's `about` block: what GDPR Article 15(1) lists, from the
// registry and what the operator declared.
import { describe, expect, it } from "@effect/vitest";
import { processingRegister, retentionTable } from "peal-contract";

import { aboutOf } from "#workspace/api/about.ts";
import { undeclared } from "#workspace/domain/operator-declaration.ts";
import type { OperatorDeclaration } from "#workspace/domain/operator-declaration.ts";

const declared: OperatorDeclaration = {
  controller: {
    address: "1 Synthetic Street, 75000 Paris",
    contact: "privacy@example.test",
    dataProtectionOfficer: null,
    name: "Synthetic Operator SAS",
  },
  policyUrl: "https://example.test/privacy/",
  recipients: [
    {
      country: "France",
      name: "Synthetic Hosting",
      safeguard: null,
      service: "Hosting",
    },
  ],
  retention: {
    backups: {
      en: "Synthetic backups are kept 2 weeks",
      fr: "Les sauvegardes synthétiques sont gardées 2 semaines",
    },
  },
  supervisoryAuthority: {
    name: "Synthetic Authority",
    url: "https://authority.example.test",
  },
};

const everything = { bills: true, legalRetention: true };

describe(aboutOf, () => {
  it("states each category's purposes, legal basis, retention and source, as the policy's table has them", () => {
    const about = aboutOf({
      ...everything,
      declaration: undeclared,
      locale: "en",
    });

    expect(about.language).toBe("en");
    expect(
      about.categories.map(({ name, retention }) => [name, retention])
    ).toStrictEqual(retentionTable("en"));

    for (const category of about.categories) {
      expect(category.purposes).not.toBe("");
      expect(category.legalBasis).not.toBe("");
      expect(category.source).not.toBe("");
    }
  });

  it("is written in the account's language", () => {
    const about = aboutOf({
      ...everything,
      declaration: undeclared,
      locale: "fr",
    });

    expect(
      about.categories.map(({ name, retention }) => [name, retention])
    ).toStrictEqual(retentionTable("fr"));
    expect(about.complaint.right).toContain("autorité de contrôle");
  });

  it("leaves out what the server does not do: billing, and what French law has some hosts keep", () => {
    const about = aboutOf({
      bills: false,
      declaration: undeclared,
      legalRetention: false,
      locale: "en",
    });

    const ids = about.categories.map(({ id }) => id);

    expect(ids).toStrictEqual(
      processingRegister
        .filter(({ applies }) => applies === "always")
        .map(({ id }) => id)
    );
    expect(ids).not.toContain("legalIdentification");
    expect(ids).not.toContain("contracts");
    expect(about.recipients.join(" ")).not.toContain("Judicial");
  });

  it("names the rights and how to exercise each, and the right to complain", () => {
    const about = aboutOf({
      ...everything,
      declaration: declared,
      locale: "en",
    });

    expect(about.rights.map(({ article }) => article)).toStrictEqual([
      "15",
      "16",
      "17",
      "18",
      "20",
      "21",
    ]);
    expect(about.complaint.authority).toStrictEqual(
      declared.supervisoryAuthority
    );
    expect(about.complaint.right).toContain("supervisory authority");
  });

  it("gives what the operator declared: who it is, its sub-processors, and its own periods for what it runs", () => {
    const about = aboutOf({
      ...everything,
      declaration: declared,
      locale: "en",
    });

    expect(about.controller).toStrictEqual(declared.controller);
    expect(about.policyUrl).toBe("https://example.test/privacy/");
    expect(about.processors).toStrictEqual(declared.recipients);
    expect(about.categories.find(({ id }) => id === "backups")?.retention).toBe(
      "Synthetic backups are kept 2 weeks"
    );
  });

  it("guesses nothing the operator did not declare", () => {
    const about = aboutOf({
      ...everything,
      declaration: undeclared,
      locale: "en",
    });

    expect(about.controller).toBeNull();
    expect(about.policyUrl).toBeNull();
    expect(about.processors).toBeNull();
    expect(about.complaint.authority).toBeNull();
  });
});
