import { describe, expect, it } from "@effect/vitest";
import { Predicate, Schema } from "effect";

import type { AuthEmail } from "#notifications/domain/auth-email.ts";
import type { EmailCatalog } from "#notifications/domain/email-catalog.ts";
import { english } from "#notifications/domain/english.ts";
import { french } from "#notifications/domain/french.ts";
import {
  escapeHtml,
  renderAuthEmail,
} from "#notifications/domain/render-auth-email.ts";

const url =
  "https://app.example.test/api/auth/verify-email?token=abc&callbackURL=%2F";

const invitation = (locale: "en" | "fr", role: string): AuthEmail => ({
  _tag: "Invitation",
  inviterName: "Ada <Admin> & Co",
  locale,
  role,
  to: "grace@example.test",
  url: "https://app.example.test/invitations/42",
  workspaceName: 'Studio "Nord"',
});

describe(renderAuthEmail, () => {
  it("writes a verification email in English", () => {
    const email = renderAuthEmail({
      _tag: "VerifyEmail",
      locale: "en",
      to: "ada@example.test",
      url,
    });

    expect(email.subject).toBe("Confirm your email for Acme");
    expect(email.text).toContain(`Confirm my email: ${url}`);
    expect(email.html).toContain('<html lang="en">');
    expect(email.html).toContain(`href="${escapeHtml(url)}"`);
  });

  it("writes a password reset email in French", () => {
    const email = renderAuthEmail({
      _tag: "ResetPassword",
      locale: "fr",
      to: "ada@example.test",
      url,
    });

    expect(email.subject).toBe("Réinitialisez votre mot de passe Acme");
    expect(email.text).toContain(`Choisir un nouveau mot de passe : ${url}`);
    expect(email.html).toContain('<html lang="fr">');
  });

  it("names the role an invitation offers, with French elision", () => {
    expect(renderAuthEmail(invitation("en", "editor")).text).toContain(
      "on Acme as an editor."
    );
    expect(renderAuthEmail(invitation("fr", "editor")).text).toContain(
      "sur Acme en tant qu’éditeur."
    );
  });

  it("escapes names in HTML and keeps them in the text and subject", () => {
    const email = renderAuthEmail(invitation("en", "viewer"));

    expect(email.subject).toBe(
      'Ada <Admin> & Co invited you to Studio "Nord" on Acme'
    );
    expect(email.html).toContain(
      "Ada &lt;Admin&gt; &amp; Co invited you to join Studio &quot;Nord&quot;"
    );
    expect(email.html).not.toContain("<Admin>");
    expect(email.text).toContain("Ada <Admin> & Co invited you");
  });
});

interface Catalogue {
  readonly [key: string]: string | Catalogue;
}

const CatalogueSchema: Schema.Codec<Catalogue> = Schema.Record(
  Schema.String,
  Schema.Union([
    Schema.String,
    Schema.suspend((): Schema.Codec<Catalogue> => CatalogueSchema),
  ])
);

const decodeCatalogue = Schema.decodeUnknownSync(CatalogueSchema);

const walk = (catalogue: Catalogue, prefix: string): [string, string][] =>
  Object.entries(catalogue).flatMap(([key, value]): [string, string][] =>
    Predicate.isString(value)
      ? [[`${prefix}${key}`, value]]
      : walk(value, `${prefix}${key}.`)
  );

// Every message of a catalogue, with its dotted key.
const entries = (catalog: EmailCatalog): [string, string][] =>
  walk(decodeCatalogue(catalog), "");

describe("the email catalogues", () => {
  it("have the same keys in English and French", () => {
    expect(entries(french).map(([key]) => key)).toStrictEqual(
      entries(english).map(([key]) => key)
    );
  });

  it.each([
    { catalog: english, locale: "en" },
    { catalog: french, locale: "fr" },
  ])("have no empty message in $locale", ({ catalog }) => {
    expect(
      entries(catalog).filter(([, text]) => text.trim() === "")
    ).toStrictEqual([]);
  });
});
