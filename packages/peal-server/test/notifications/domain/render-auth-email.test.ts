import { describe, expect, it } from "@effect/vitest";
import { Predicate, Schema } from "effect";

import type { AuthEmail } from "#notifications/domain/auth-email.ts";
import type { EmailCatalog } from "#notifications/domain/email-catalog.ts";
import { escapeHtml } from "#notifications/domain/email-layout.ts";
import { english } from "#notifications/domain/english.ts";
import { french } from "#notifications/domain/french.ts";
import { renderAuthEmail } from "#notifications/domain/render-auth-email.ts";

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

// The text of a deletion's confirmation, in `locale`.
const deleted = (locale: "en" | "fr") =>
  renderAuthEmail({
    _tag: "AccountDeleted",
    locale,
    subscriptionsCancelled: 0,
    to: "ada@example.test",
    url: "https://app.example.test",
  }).text;

describe(renderAuthEmail, () => {
  it("writes a verification email in English", () => {
    const email = renderAuthEmail({
      _tag: "VerifyEmail",
      locale: "en",
      to: "ada@example.test",
      url,
    });

    expect(email.subject).toBe("Confirm your email for Peal");
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

    expect(email.subject).toBe("Réinitialisez votre mot de passe Peal");
    expect(email.text).toContain(`Choisir un nouveau mot de passe : ${url}`);
    expect(email.html).toContain('<html lang="fr">');
  });

  it("confirms an account's deletion in its language, linking to Peal", () => {
    const inEnglish = renderAuthEmail({
      _tag: "AccountDeleted",
      locale: "en",
      subscriptionsCancelled: 0,
      to: "ada@example.test",
      url: "https://app.example.test",
    });

    const inFrench = renderAuthEmail({
      _tag: "AccountDeleted",
      locale: "fr",
      subscriptionsCancelled: 0,
      to: "ada@example.test",
      url: "https://app.example.test/fr",
    });

    expect(inEnglish.subject).toBe("Your Peal account is deleted");
    expect(inEnglish.text).toContain("Open Peal: https://app.example.test");
    expect(inFrench.subject).toBe("Votre compte Peal est supprimé");
    expect(inFrench.text).toContain(
      "Ouvrir Peal\u00A0: https://app.example.test/fr"
    );
  });

  it("says what French law has a host keep after an account's deletion, and for whom", () => {
    expect(deleted("en")).toContain("for judicial authorities only");
    expect(deleted("fr")).toContain("pour les seules autorités judiciaires");
  });

  it("says when deleting cancelled subscriptions, and that nothing more is charged", () => {
    const account = renderAuthEmail({
      _tag: "AccountDeleted",
      locale: "en",
      subscriptionsCancelled: 1,
      to: "ada@example.test",
      url: "https://app.example.test",
    });

    expect(account.text).toContain("nothing more is charged");
    expect(
      renderAuthEmail({
        _tag: "AccountDeleted",
        locale: "en",
        subscriptionsCancelled: 0,
        to: "ada@example.test",
        url: "https://app.example.test",
      }).text
    ).not.toContain("nothing more is charged");

    const workspace = renderAuthEmail({
      _tag: "WorkspaceDeleted",
      locale: "fr",
      subscriptionsCancelled: 1,
      to: "ada@example.test",
      url: "https://app.example.test/fr/app",
      workspaceName: 'Studio "Nord"',
    });

    expect(workspace.subject).toBe(
      'L’espace de travail Studio "Nord" est supprimé'
    );
    expect(workspace.text).toContain("plus rien n’est facturé");
    expect(workspace.html).toContain(escapeHtml('Studio "Nord"'));
  });

  it("tells the account a copy of its data was taken, and from where", () => {
    const web = renderAuthEmail({
      _tag: "DataExported",
      locale: "en",
      to: "ada@example.test",
      url: "https://app.example.test/app/account",
      via: "web",
    });

    const terminal = renderAuthEmail({
      _tag: "DataExported",
      locale: "fr",
      to: "ada@example.test",
      url: "https://app.example.test/fr/app/account",
      via: "commandLine",
    });

    expect(web.subject).toBe("A copy of your Peal data was downloaded");
    expect(web.text).toContain("from the web app");
    expect(terminal.text).toContain("depuis la ligne de commande");
  });

  it("names the role an invitation offers, with French elision", () => {
    expect(renderAuthEmail(invitation("en", "editor")).text).toContain(
      "on Peal as an editor."
    );
    expect(renderAuthEmail(invitation("fr", "editor")).text).toContain(
      "sur Peal en tant qu’éditeur."
    );
  });

  it("escapes names in HTML and keeps them in the text and subject", () => {
    const email = renderAuthEmail(invitation("en", "viewer"));

    expect(email.subject).toBe(
      'Ada <Admin> & Co invited you to Studio "Nord" on Peal'
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
