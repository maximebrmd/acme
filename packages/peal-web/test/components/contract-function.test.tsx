import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { ContractConfirmationView } from "#components/contract/contract-confirmation-view.tsx";
import type { ConfirmationState } from "#components/contract/contract-confirmation-view.tsx";
import { ContractFunctionView } from "#components/contract/contract-function-view.tsx";
import type { ContractFunctionViewProps } from "#components/contract/contract-function-view.tsx";
import { invalidFields } from "#contract/form.ts";
import type { FunctionValues } from "#contract/form.ts";
import { loadMessages } from "#i18n/messages.ts";

const ignore = () => {
  // The views are rendered once: nothing is clicked.
};

const values: FunctionValues = {
  contract: "7K3M-9QXD-42TN",
  desiredOn: "",
  email: "camille@example.test",
  name: "Camille Synthetic",
  workspaceId: null,
};

const render = async (
  locale: Locale,
  props: Partial<ContractFunctionViewProps>
) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      <ContractFunctionView
        captcha={null}
        error={null}
        invalid={[]}
        kind="cancellation"
        own={[]}
        pending={false}
        ready
        signedInAs={null}
        step={{ _tag: "form" }}
        latest="2027-12-15"
        today="2026-11-10"
        values={values}
        onBack={ignore}
        onChange={ignore}
        onContinue={ignore}
        onNotify={ignore}
        {...props}
      />
    </NextIntlClientProvider>
  );

const renderConfirmation = async (locale: Locale, state: ConfirmationState) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      <ContractConfirmationView
        pending={null}
        state={state}
        unavailable={false}
        onApply={ignore}
      />
    </NextIntlClientProvider>
  );

describe("the function to cancel a contract", () => {
  it("asks only what the decree lists: name, address, contract, day wanted", async () => {
    const html = await render("fr", {});

    expect(html).toContain("Nom et prénom, ou dénomination sociale");
    expect(html).toContain("Adresse e-mail");
    expect(html).toContain("Numéro de contrat, ou nom de l’espace de travail");
    expect(html).toContain("Date de résiliation souhaitée");
    expect(html.match(/<input/gu)).toHaveLength(4);
  });

  it("shows a summary to check and modify, then notifies under the decree's words", async () => {
    const html = await render("fr", {
      step: { _tag: "summary", refund: null },
    });

    expect(html).toContain("Récapitulatif de votre résiliation");
    expect(html).toContain("Camille Synthetic</dd>");
    expect(html).toContain("Dès que le contrat le permet");
    expect(html).toContain(">Notification de la résiliation</button>");
    expect(html).toContain(">Modifier</button>");
  });

  it("says when the notification was received, to the minute", async () => {
    const html = await render("en", {
      step: {
        _tag: "received",
        receivedAt: new Date("2026-11-10T08:05:00Z"),
      },
    });

    expect(html).toContain("Cancellation notified");
    expect(html).toContain("November 10, 2026 at 8:05 AM");
    expect(html).toContain("camille@example.test");
  });

  it("lists a signed-in member's contracts, and asks for no number", async () => {
    const html = await render("en", {
      own: [{ id: "workspace-1", name: "Studio Nord" }],
      signedInAs: "camille@example.test",
      values: { ...values, contract: "", workspaceId: "workspace-1" },
    });

    expect(html).toContain("You are signed in as camille@example.test");
    expect(html).toContain("Studio Nord");
    expect(html).not.toContain("Contract number, or the workspace’s name");
  });
});

describe("the function to withdraw from a contract", () => {
  it("asks for no day, and confirms with the directive's words alone", async () => {
    const form = await render("fr", { kind: "withdrawal" });

    expect(form).not.toContain("Date de résiliation souhaitée");

    const summary = await render("fr", {
      kind: "withdrawal",
      step: { _tag: "summary", refund: { amount: 810, currency: "eur" } },
    });

    expect(summary).toContain(">Confirmer la rétractation</button>");
    expect(summary).toContain("8,10 €");
  });
});

describe(invalidFields, () => {
  it("refuses what a link or an address is written with", () => {
    expect(invalidFields(values)).toStrictEqual([]);
    expect(
      invalidFields({
        ...values,
        contract: "see https://example.test",
        email: "not an address",
        name: "",
      })
    ).toStrictEqual(["name", "email", "contract"]);
  });

  it("asks no contract of a member who picked one of theirs", () => {
    expect(
      invalidFields({ ...values, contract: "a.b", workspaceId: "workspace-1" })
    ).toStrictEqual([]);
  });
});

describe("the page a request's link opens", () => {
  const preview = {
    contracts: [
      {
        periodEnd: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
        plan: "starter",
        trial: false,
        workspaceId: "workspace-1",
        workspaceName: "Studio Nord",
      },
    ],
    desiredOn: null,
    kind: "cancellation",
    receivedAt: DateTime.makeUnsafe("2026-11-10T08:05:00Z"),
  } as const;

  it("lists the contracts the address manages, each with the one action", async () => {
    const html = await renderConfirmation("fr", {
      _tag: "choosing",
      preview,
    });

    expect(html).toContain("Résiliation reçue le 10 novembre 2026 à 08:05");
    expect(html).toContain("Studio Nord");
    expect(html).toContain(">Notification de la résiliation</button>");
  });

  it("says what became of the request, or that the link opens nothing", async () => {
    const applied = await renderConfirmation("en", {
      _tag: "done",
      outcome: {
        effectiveAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
        kind: "cancellation",
        receivedAt: preview.receivedAt,
        refunded: null,
        refusal: null,
        status: "applied",
      },
    });

    expect(applied).toContain("The contract ends on December 1, 2026");

    const refused = await renderConfirmation("en", {
      _tag: "done",
      outcome: {
        effectiveAt: null,
        kind: "withdrawal",
        receivedAt: preview.receivedAt,
        refunded: null,
        refusal: "expired",
        status: "refused",
      },
    });

    expect(refused).toContain("14 days to withdraw were over");
    await expect(
      renderConfirmation("en", { _tag: "notFound" })
    ).resolves.toContain("This link opens nothing");
  });
});
