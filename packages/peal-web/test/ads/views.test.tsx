import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";
import { constVoid } from "effect/Function";
import { NextIntlClientProvider } from "next-intl";
import type { Boost, ReachableAdAccount } from "peal-contract";
import type { ComponentProps, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { checkBoost, emptyBoostDraft } from "#ads/boost-draft.ts";
import type { BoostDraft } from "#ads/boost-draft.ts";
import {
  AdSignInView,
  toggledAccounts,
} from "#components/ads/ad-sign-in-view.tsx";
import type { AdSignInStep } from "#components/ads/ad-sign-in-view.tsx";
import { AdAccountView, SpendingFormView } from "#components/ads/ads-views.tsx";
import {
  BoostFormView,
  BoostSummaryView,
} from "#components/ads/boost-views.tsx";
import { controlsOf, PaidSectionView } from "#components/ads/paid-views.tsx";
import { loadMessages } from "#i18n/messages.ts";

import { at, euroAccount, yenAccount } from "./fixtures.ts";

const render = async (locale: "en" | "fr", view: ReactNode) => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      {view}
    </NextIntlClientProvider>
  );

  // Formats put narrow and non-breaking spaces in amounts and dates.
  return html.replaceAll(/[  ]/gu, " ").replaceAll("&#x27;", "'");
};

const postId = "00000000-0000-7000-8000-000000000001";

const channelId = "00000000-0000-7000-8000-0000000000d1";

const ready: BoostDraft = {
  ...emptyBoostDraft,
  accountId: euroAccount.id,
  amount: "50",
  countries: "US, CA",
  declared: true,
  endDate: "2026-11-17",
};

const form = async (
  locale: "en" | "fr",
  props: Partial<ComponentProps<typeof BoostFormView>> = {}
) =>
  await render(
    locale,
    <BoostFormView
      accounts={[euroAccount]}
      adsLink={<button type="button">Open the ads page</button>}
      draft={ready}
      error={null}
      idPrefix="t"
      pending={false}
      problems={[]}
      onChange={constVoid}
      onReview={constVoid}
      {...props}
    />
  );

describe(BoostFormView, () => {
  it("sends the member to the ads page when no account may spend", async () => {
    const html = await form("en", { accounts: [] });

    expect(html).toContain(
      "No ad account may spend through Peal yet. An owner of the workspace must allow an ad account to spend, with a monthly ceiling."
    );
    expect(html).toContain('<button type="button">Open the ads page</button>');
    expect(html).not.toContain("<form");
  });

  it("keeps the review closed until the declaration is ticked, and says why", async () => {
    const undeclared = await form("en", {
      draft: { ...ready, declared: false },
    });

    const declared = await form("en");

    expect(undeclared).toMatch(/<button[^>]*aria-disabled="true"[^>]*>Review/u);
    expect(undeclared).toContain(
      "I declare that this ad is not about housing, employment, financial products or services, or social issues, elections or politics."
    );
    expect(undeclared).toContain(
      "Peal does not boost ads about any of those: without this declaration, nothing is sent."
    );
    expect(declared).not.toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>Review/u
    );
  });

  it("asks who benefits and who pays only for an audience in the European Union", async () => {
    const outside = await form("en");
    const inside = await form("en", { draft: { ...ready, countries: "FR" } });

    expect(outside).not.toContain("Who benefits from the ad");
    expect(inside).toContain("Who benefits from the ad");
    expect(inside).toContain("Who pays for the ad");
    expect(inside).toContain(
      "Required for an audience in the European Union, where the ad says both."
    );
  });

  it("says what is wrong under each field at fault", async () => {
    const html = await form("en", {
      draft: { ...ready, amount: "", countries: "FR", endDate: "" },
      problems: ["amount", "end", "beneficiary", "payer"],
    });

    expect(html).toContain("Enter a budget above zero, such as 50 or 50.00.");
    expect(html).toContain("Choose the last day.");
    expect(html).toContain("Say who benefits from the ad.");
    expect(html).toContain("Say who pays for the ad.");
    expect(html.match(/aria-invalid="true"/gu)).toHaveLength(4);
  });

  it("explains a refusal of the server, with its amounts as money", async () => {
    const html = await form("en", {
      error: {
        ceiling: 50_000,
        committed: 48_000,
        currency: "EUR",
        key: "ceilingExceeded",
        requested: 5000,
      },
    });

    expect(html).toContain(
      "This boost would commit €50.00, and this ad account’s other boosts already commit €480.00 of its monthly ceiling of €500.00. Nothing was reserved or sent."
    );
    expect(html).toContain("Peal never raises it on its own.");
  });

  it("lists every rule a boost breaks", async () => {
    const html = await form("en", {
      error: {
        key: "boostInvalid",
        violations: ["runTooLong", "startsTooFarAhead"],
      },
    });

    expect(html).toContain("The run is longer than 90 days.");
    expect(html).toContain("The run starts more than 30 days ahead.");
  });

  it("is written in French", async () => {
    const html = await form("fr", { draft: { ...ready, declared: false } });

    expect(html).toContain(
      "Je déclare que cette publicité ne porte ni sur le logement, ni sur l’emploi, ni sur des produits ou services financiers, ni sur des enjeux sociaux, des élections ou la politique."
    );
    expect(html).toContain("Dernier jour");
  });
});

const boostOf = (draft: BoostDraft, account = euroAccount) =>
  Option.getOrThrow(
    checkBoost(draft, {
      account,
      channelId,
      postId,
      today: { day: 10, month: 11, year: 2026 },
    }).boost
  );

const totalQuote: ComponentProps<typeof BoostSummaryView>["quote"] = {
  capRoom: 88_000,
  ceiling: 50_000,
  commitment: 5000,
  committed: 12_000,
  currency: "EUR",
  days: 8,
  endsAt: at("2026-11-17T22:59:00Z"),
  minorUnitDigits: 2,
  startsAt: at("2026-11-10T09:30:00Z"),
};

const summary = async (
  locale: "en" | "fr",
  props: Partial<ComponentProps<typeof BoostSummaryView>> = {}
) =>
  await render(
    locale,
    <BoostSummaryView
      account={euroAccount}
      boost={boostOf(ready)}
      channel="Facebook (Synthetic Bakery)"
      error={null}
      pending={false}
      postText="Fresh bread every morning."
      quote={totalQuote}
      onBack={constVoid}
      onConfirm={constVoid}
      {...props}
    />
  );

describe(BoostSummaryView, () => {
  it("says what a total budget is, and names the amount and the end on the button", async () => {
    const html = await summary("en");

    expect(html).toContain("Fresh bread every morning.");
    expect(html).toContain("Facebook (Synthetic Bakery)");
    expect(html).toContain(
      "People aged 18 and over, in United States and Canada"
    );
    expect(html).toContain("€50.00 for the whole run");
    expect(html).toMatch(/<button[^>]*>Spend up to €50.00 until Nov 17</u);
  });

  it("writes the run in the account’s time zone, and the room it has", async () => {
    const html = await summary("en");

    expect(html).toContain(
      "From Nov 10, 2026, 10:30 AM to Nov 17, 2026, 11:59 PM: 8 calendar days of the ad account’s time zone (Europe/Paris)"
    );
    expect(html).toContain("A budget for the whole run is never passed.");
    expect(html).toMatch(/Monthly ceiling an owner set<\/dt><dd[^>]*>€500.00/u);
    expect(html).toMatch(
      /Already committed by this ad account’s other boosts<\/dt><dd[^>]*>€120.00/u
    );
    expect(html).toContain(
      "The ad network charges this ad account’s payment method directly. Peal never handles the money."
    );
  });

  it("explains the most a daily budget can cost, which the button names", async () => {
    const html = await summary("en", {
      boost: boostOf({ ...ready, amount: "10", kind: "daily" }),
      quote: { ...totalQuote, capRoom: null, commitment: 10_000 },
    });

    expect(html).toContain("€10.00 a day");
    expect(html).toContain(
      "A daily budget counts for each of the 8 calendar days the run touches, and 25% more, which the ad network may spend above a daily budget on any day."
    );
    expect(html).toMatch(/<button[^>]*>Spend up to €100.00 until Nov 17</u);
    expect(html).not.toContain(
      "Room left under the ad account’s own spend cap"
    );
  });

  it("shows who benefits and who pays for an audience in the European Union", async () => {
    const html = await summary("en", {
      boost: boostOf({
        ...ready,
        ageMax: "44",
        beneficiary: "Synthetic Bakery",
        countries: "FR",
        payer: "Synthetic SARL",
      }),
    });

    expect(html).toContain("People aged 18 to 44, in France");
    expect(html).toMatch(
      /Who benefits from the ad<\/dt><dd[^>]*>Synthetic Bakery/u
    );
    expect(html).toMatch(/Who pays for the ad<\/dt><dd[^>]*>Synthetic SARL/u);
  });

  it("shows a refusal above the summary, and waits while it is sent", async () => {
    const refused = await summary("en", {
      error: { key: "spendingNotEnabled" },
    });

    const sending = await summary("en", { pending: true });

    expect(refused).toContain(
      "No owner has allowed this ad account to spend through Peal."
    );
    expect(sending).toMatch(/<button[^>]*aria-disabled="true"[^>]*>Sending…/u);
    expect(sending).not.toContain("Spend up to");
  });

  it("is written in French, with a currency without a minor unit", async () => {
    const html = await summary("fr", {
      account: yenAccount,
      boost: boostOf(
        { ...ready, accountId: yenAccount.id, amount: "5000" },
        yenAccount
      ),
      quote: {
        ...totalQuote,
        commitment: 5000,
        currency: "JPY",
        minorUnitDigits: 0,
      },
    });

    expect(html).toMatch(
      /<button[^>]*>Dépenser jusqu’à 5 000 JPY jusqu’au 18 nov\./u
    );
    expect(html).toContain("Vérifiez avant de dépenser");
  });
});

const reachable = (
  fields: Partial<ReachableAdAccount>
): ReachableAdAccount => ({
  connected: false,
  currency: "EUR",
  externalId: "act_1001",
  name: "Synthetic Bakery Ads",
  spendCap: null,
  status: "active",
  timeZone: "Europe/Paris",
  unsupported: null,
  ...fields,
});

const reached = [
  reachable({}),
  reachable({
    connected: true,
    externalId: "act_1002",
    name: "Synthetic Studio Ads",
  }),
  reachable({
    currency: "USD",
    externalId: "act_1003",
    name: "Synthetic Atelier Ads",
    status: "unsettled",
    timeZone: null,
    unsupported: "timeZoneUnknown",
  }),
];

const signIn = async (locale: "en" | "fr", step: AdSignInStep) =>
  await render(
    locale,
    <AdSignInView
      back={<button type="button">Back to the ads</button>}
      step={step}
      onSubmit={constVoid}
      onToggle={constVoid}
    />
  );

describe(AdSignInView, () => {
  it("waits while the sign-in is completed", async () => {
    const html = await signIn("en", { _tag: "completing" });

    expect(html).toContain("Finishing the sign-in…");
    expect(html).not.toContain("Back to the ads");
  });

  it("says when the tab lost the workspace, or the address cannot be read", async () => {
    const lost = await signIn("en", { _tag: "lost" });
    const unreadable = await signIn("en", { _tag: "unreadable" });

    expect(lost).toContain(
      "This tab does not know which workspace the sign-in was for."
    );
    expect(unreadable).toContain(
      "The ad network sent back something Peal cannot read."
    );
    expect(lost).toContain("Back to the ads");
  });

  it("explains a refused sign-in, in English and in French", async () => {
    const step: AdSignInStep = {
      _tag: "failed",
      error: { key: "signInFailed", reason: "denied" },
    };

    await expect(signIn("en", step)).resolves.toContain(
      "You refused the sign-in, or left out a permission that reading ad accounts needs."
    );
    await expect(signIn("fr", step)).resolves.toContain(
      "Vous avez refusé la connexion, ou écarté une autorisation nécessaire pour lire les comptes publicitaires."
    );
  });

  it("lists the accounts reached: those connected marked, those unsupported closed with why", async () => {
    const html = await signIn("en", {
      _tag: "choose",
      accounts: reached,
      error: null,
      pending: false,
      selected: ["act_1001"],
    });

    expect(html).toContain("EUR · Europe/Paris · Active");
    expect(html).toContain("USD · time zone unknown · Payment failed");
    expect(html).toContain("Already connected");
    expect(html).toContain(
      "Peal cannot connect it: the ad network gives it a time zone Peal does not know."
    );
    expect(html).toMatch(/<button[^>]*>Connect 1 ad account</u);
  });

  it("ticks only what the member chose, and closes what cannot be chosen", async () => {
    const html = await signIn("en", {
      _tag: "choose",
      accounts: reached,
      error: { key: "accountNotFound" },
      pending: false,
      selected: [],
    });

    expect(html.match(/role="checkbox"/gu)).toHaveLength(3);
    expect(html.match(/aria-checked="true"/gu)).toBeNull();
    expect(html.match(/data-disabled=""/gu)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toMatch(/<button[^>]*aria-disabled="true"[^>]*>Connect</u);
    expect(html).toContain(
      "This ad account is not connected to the workspace, or the sign-in no longer reaches it."
    );
  });

  it("says when the sign-in reaches no ad account", async () => {
    const html = await signIn("en", {
      _tag: "choose",
      accounts: [],
      error: null,
      pending: false,
      selected: [],
    });

    expect(html).toContain("Your sign-in reaches no ad account.");
    expect(html).not.toContain("<form");
  });
});

describe(toggledAccounts, () => {
  it("keeps the listed order, and never takes an account that cannot be chosen", () => {
    expect(toggledAccounts(reached, [], "act_1001", true)).toStrictEqual([
      "act_1001",
    ]);
    expect(
      toggledAccounts(reached, ["act_1001"], "act_1002", true)
    ).toStrictEqual(["act_1001"]);
    expect(
      toggledAccounts(reached, ["act_1001"], "act_1003", true)
    ).toStrictEqual(["act_1001"]);
    expect(
      toggledAccounts(reached, ["act_1001"], "act_1001", false)
    ).toStrictEqual([]);
  });
});

describe(AdAccountView, () => {
  it("shows an account that may spend: its ceiling, its cap and what is committed", async () => {
    const html = await render(
      "en",
      <ul>
        <AdAccountView account={euroAccount} committedThisMonth={12_000} />
      </ul>
    );

    expect(html).toContain("Synthetic Bakery Ads");
    expect(html).toContain("On, up to €500.00 each calendar month");
    expect(html).toMatch(/own spend cap<\/dt><dd[^>]*>€1,000.00/u);
    expect(html).toMatch(/Committed this month<\/dt><dd[^>]*>€120.00/u);
    expect(html).toContain("Nov 10, 2026 at 8:00 AM");
  });

  it("says when an account is to reconnect, has no cap and does not spend", async () => {
    const html = await render(
      "en",
      <ul>
        <AdAccountView account={yenAccount} committedThisMonth={null} />
      </ul>
    );

    expect(html).toContain(
      "Reconnect needed: the ad network refused the sign-in this ad account is read through."
    );
    expect(html).toContain("None set at the ad network");
    expect(html).toMatch(/Spending through Peal<\/dt><dd[^>]*>Off/u);
    expect(html).toContain("Payment failed");
    expect(html).toContain("Not synced yet");
  });
});

const spendingForm = async (
  locale: "en" | "fr",
  props: Partial<ComponentProps<typeof SpendingFormView>>
) =>
  await render(
    locale,
    <SpendingFormView
      account={{ ...euroAccount, monthlyCeiling: null, spendingEnabled: false }}
      ceiling="500"
      error={null}
      pending={false}
      onCeilingChange={constVoid}
      onSubmit={constVoid}
      onTurnOff={constVoid}
      {...props}
    />
  );

describe(SpendingFormView, () => {
  it("says what allowing means, with the amount, before the button", async () => {
    const html = await spendingForm("en", {});

    const notice = html.indexOf(
      "Boosts made through Peal may then spend up to €500.00 each calendar month from this ad account’s payment method. The ad network bills the ad account directly, and Peal never raises the ceiling on its own."
    );

    expect(notice).toBeGreaterThan(-1);
    expect(html.indexOf("Allow spending up to this ceiling")).toBeGreaterThan(
      notice
    );
    expect(html).not.toContain("Turn spending off");
  });

  it("keeps the button closed on anything but an amount above zero", async () => {
    const html = await spendingForm("en", { ceiling: "5o0" });

    expect(html).toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>Allow spending up to this ceiling/u
    );
    expect(html).toContain("Enter an amount above zero, such as 50 or 50.00.");
    expect(html).toContain("up to the ceiling you enter each calendar month");
  });

  it("lets an owner change the ceiling or turn spending off once it is on", async () => {
    const html = await spendingForm("fr", { account: euroAccount });

    expect(html).toContain("Modifier le plafond");
    expect(html).toContain("Désactiver les dépenses");
    expect(html).toContain(
      "Les mises en avant créées via Peal pourront alors dépenser jusqu’à 500,00 € par mois civil sur le moyen de paiement de ce compte publicitaire."
    );
  });
});

const boost = (fields: Partial<Boost>): Boost => ({
  accountId: euroAccount.id,
  audience: { ageMax: 65, ageMin: 18, countries: ["US"] },
  beneficiary: null,
  budget: { amount: 5000, kind: "total" },
  channelId,
  committed: 5000,
  createdAt: at("2026-11-10T09:30:00Z"),
  currency: "EUR",
  endsAt: at("2026-11-17T22:59:00Z"),
  failureReason: null,
  id: "00000000-0000-7000-8000-0000000000b1",
  networkCode: null,
  objective: "engagement",
  payer: null,
  platform: "facebook",
  postId,
  startsAt: at("2026-11-10T09:30:00Z"),
  state: "active",
  stateAt: at("2026-11-10T09:31:00Z"),
  updatedAt: at("2026-11-10T09:31:00Z"),
  ...fields,
});

const paid = async (
  locale: "en" | "fr",
  props: Partial<ComponentProps<typeof PaidSectionView>["performance"]>
) =>
  await render(
    locale,
    <PaidSectionView
      accounts={[euroAccount]}
      renderActions={({ state }) => (
        <span>actions:{controlsOf(state).join(",")}</span>
      )}
      channelName={() => "Facebook (Synthetic Bakery)"}
      performance={{ boosts: [], organic: [], paid: [], ...props }}
    />
  );

describe(PaidSectionView, () => {
  it("shows a running boost: its budget, the most it can cost and its end", async () => {
    const html = await paid("en", { boosts: [boost({})] });

    expect(html).toContain("Boost on Facebook (Synthetic Bakery)");
    expect(html).toContain("Running");
    expect(html).toContain(
      "Budget of €50.00 for the whole run, on Synthetic Bakery Ads. It can cost €50.00 at most, and ends on Nov 17, 2026 at 10:59 PM."
    );
    expect(html).toContain("actions:pause,stop");
  });

  it("warns that an unconfirmed boost may be spending, and offers to stop it", async () => {
    const html = await paid("en", {
      boosts: [boost({ state: "unconfirmed" })],
    });

    expect(html).toContain(
      "Peal told the ad network to run this boost and could not read back whether it does. It may be spending."
    );
    expect(html).toContain("actions:pause,stop");
  });

  it("says in words why a boost failed, in English and in French", async () => {
    const failed = {
      boosts: [
        boost({
          failureReason: "budgetTooLow",
          networkCode: "1885272",
          state: "failed",
        }),
      ],
    };

    const english = await paid("en", failed);

    expect(english).toContain(
      "It could not be made, and nothing was spent: the budget is under the ad network’s minimum. The ad network’s code: 1885272."
    );
    expect(english).toContain("actions:<");
    await expect(paid("fr", failed)).resolves.toContain(
      "Elle n’a pas pu être créée, et rien n’a été dépensé : le budget est inférieur au minimum du réseau publicitaire."
    );
  });

  it("puts organic and paid numbers in two labelled columns, never added up", async () => {
    const html = await paid("en", {
      organic: [
        {
          channelId,
          impressions: null,
          likes: 40,
          readAt: at("2026-11-10T10:00:00Z"),
          replies: 3,
          reposts: 5,
        },
      ],
      paid: [
        {
          account: euroAccount,
          ads: 1,
          totals: {
            clicks: 12,
            impressions: 2400,
            reach: 1800,
            results: null,
            spend: 1234,
          },
        },
      ],
    });

    expect(html).toContain(
      "Paid numbers are part of what the platform counts on the post: the two columns overlap, and are never added up."
    );
    expect(html).toMatch(/Organic<\/h3>.*Likes<\/dt><dd[^>]*>40/u);
    expect(html).toMatch(
      /Impressions<\/dt><dd[^>]*>Not given by the platform/u
    );
    expect(html).toMatch(/Paid<\/h3>.*Spend<\/dt><dd[^>]*>€12.34/u);
    expect(html).toMatch(/Results<\/dt><dd[^>]*>Not reported/u);
  });

  it("says when there is nothing yet on either side", async () => {
    const html = await paid("en", {});

    expect(html).toContain("This post has no boost.");
    expect(html).toContain("No organic count to show.");
    expect(html).toContain("No ad has promoted this post yet.");
  });
});

describe(controlsOf, () => {
  it("pauses what runs or may run, resumes what is paused, and stops what is not over", () => {
    expect(controlsOf("requested")).toStrictEqual(["stop"]);
    expect(controlsOf("paused")).toStrictEqual(["resume", "stop"]);
    expect(controlsOf("ended")).toStrictEqual([]);
    expect(controlsOf("stopped")).toStrictEqual([]);
    expect(controlsOf("failed")).toStrictEqual([]);
  });
});
