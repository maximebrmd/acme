"use client";

import { useTranslations } from "next-intl";
import {
  accountsMonthly,
  displayVatRate,
  freeAccountsOf,
  withDisplayVat,
} from "peal-contract";
import type { RateCard } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import type { ReactElement } from "react";

import { nextAccountOf } from "#billing/ladder.ts";
import { useMoney, useSize } from "#billing/size.ts";
import type { UpgradeReason } from "#billing/upgrade.ts";
import {
  Consent,
  CurrencyNote,
  OrderButton,
  VatNote,
} from "#components/billing/billing-view.tsx";
import type { BillingError } from "#components/billing/billing-view.tsx";

/** The workspace that bills the account, when it is another. */
export interface BilledElsewhere {
  /** A link to its billing page, for a member of it; null otherwise. */
  readonly link: ReactElement | null;
}

export interface UpgradeViewProps {
  /** Whether the member may add a payment method (billing:manage). */
  readonly canManage: boolean;
  /** The rate card the server answered; the app's own when none was read. */
  readonly card: RateCard;
  /** Whether the box asking to start at once is ticked. */
  readonly consented: boolean;
  /** Where to write for more than any plan holds, if the operator says. */
  readonly contactUrl: string | null;
  /** The workspace that bills the account, when it is another. */
  readonly elsewhere: BilledElsewhere | null;
  readonly error: BillingError | null;
  /** The names of those who can order, for a member who cannot. */
  readonly managers: readonly string[];
  readonly onConsent: (consented: boolean) => void;
  readonly onOrder: () => void;
  /** Whether the order is on its way to checkout. */
  readonly ordering: boolean;
  readonly reason: UpgradeReason;
  /** The terms of service, where the operator publishes them. */
  readonly termsUrl: string | null;
  /** Whether the workspace is in a trial of a legacy plan. */
  readonly trialing: boolean;
  /** The workspace the payment method is added for. */
  readonly workspaceName: string;
}

// What was refused, with what the billing account holds against what its
// plan allows.
const Reached = ({
  reason,
  workspaceName,
}: Pick<UpgradeViewProps, "reason" | "workspaceName">) => {
  const t = useTranslations("Upgrade");
  const billing = useTranslations("Billing");
  const size = useSize();
  const { allowed, limit, plan, used } = reason;
  const storage = limit === "mediaStorage";
  const workspace = workspaceName;

  if (plan === "free" && limit === "channels" && allowed === 0) {
    return <p>{t("reachedFreeRevoked", { workspace })}</p>;
  }

  if (plan === "free" && (limit === "channels" || storage)) {
    return (
      <p>
        {storage
          ? t("reachedFreeStorage", {
              allowed: size(allowed),
              used: size(used),
              workspace,
            })
          : t("reachedFree", { allowed, used, workspace })}
      </p>
    );
  }

  if (plan === "payAsYouGo" && limit === "channels") {
    return <p>{t("reachedCeiling", { allowed, used, workspace })}</p>;
  }

  const planName = billing("plan", { plan });

  return (
    <p>
      {storage
        ? t("reachedStorage", {
            allowed: size(allowed),
            plan: planName,
            used: size(used),
            workspace,
          })
        : t("reached", { allowed, limit, plan: planName, used, workspace })}
    </p>
  );
};

// What a payment method changes for the limit reached, from the rate card:
// for accounts, what the order bills for those held, then the next one,
// each excluding VAT and with France's VAT beside it.
const Gives = ({ card, reason }: Pick<UpgradeViewProps, "card" | "reason">) => {
  const t = useTranslations("Upgrade");
  const dollars = useMoney("usd");
  const size = useSize();

  if (reason.limit === "mediaStorage") {
    return (
      <p>
        {t("givesStorage", {
          minimum: size(card.storage.minimum),
          perAccount: size(card.storage.perAccount),
        })}
      </p>
    );
  }

  if (reason.limit !== "channels") {
    return <p>{t("gives")}</p>;
  }

  const { position, price } = nextAccountOf(reason.used, card);
  const held = accountsMonthly(position - 1, "usd", card);
  const free = freeAccountsOf(card);

  const priced = (cents: number) => ({
    included: dollars(withDisplayVat(cents)),
    price: dollars(cents),
    rate: displayVatRate,
  });

  const next = () => {
    if (price.excluded === 0) {
      return t("nextAccountFree", { free, position });
    }

    return held > 0
      ? t("nextAccountAdds", { ...priced(price.excluded), position })
      : t("nextAccount", { ...priced(price.excluded), free, position });
  };

  return (
    <div className="flex flex-col gap-1">
      <p>{t("givesAccounts")}</p>
      {held > 0 ? (
        <p className="font-medium tabular-nums">
          {t("held", { ...priced(held), used: position - 1 })}
        </p>
      ) : null}
      <p className="font-medium tabular-nums">{next()}</p>
    </div>
  );
};

const Offer = ({
  card,
  consented,
  onConsent,
  onOrder,
  ordering,
  reason,
  termsUrl,
}: Pick<
  UpgradeViewProps,
  | "card"
  | "consented"
  | "onConsent"
  | "onOrder"
  | "ordering"
  | "reason"
  | "termsUrl"
>) => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-2">
      <Gives card={card} reason={reason} />
      <VatNote />
      <CurrencyNote />
    </div>
    <Consent consented={consented} onConsent={onConsent} termsUrl={termsUrl} />
    <OrderButton consented={consented} ordering={ordering} onOrder={onOrder} />
  </div>
);

/**
 * What a member reads when the billing account's plan refuses something:
 * which limit was reached, with what the account holds and its plan; then
 * what a payment method changes (the next account's monthly price with the
 * VAT shown beside, from the rate card), to order with the request to start
 * at once and the button worded as an obligation to pay, before Stripe's
 * checkout asks for a card. Where another workspace bills the account, it
 * is named instead; past what any plan holds, how to ask for more; to a
 * member who cannot order, who can. One view for every place a limit
 * refuses something.
 */
export const UpgradeView = (props: UpgradeViewProps) => {
  const {
    canManage,
    contactUrl,
    elsewhere,
    error,
    managers,
    reason,
    trialing,
    workspaceName,
  } = props;

  const t = useTranslations("Upgrade");
  const billing = useTranslations("Billing");
  const { planWithRoom } = reason;
  const legacy = reason.plan !== "free" && reason.plan !== "payAsYouGo";

  const wayOut = () => {
    if (planWithRoom === null) {
      // Only the ceiling before a first paid invoice has a "then".
      const ceiling =
        reason.plan === "payAsYouGo" && reason.limit === "channels";

      return contactUrl === null ? (
        <p>{t(ceiling ? "noRoomCeilingOperator" : "noRoomOperator")}</p>
      ) : (
        <p>
          {t(ceiling ? "noRoomCeiling" : "noRoom")}{" "}
          <a className="underline underline-offset-4" href={contactUrl}>
            {t("contact")}
          </a>
        </p>
      );
    }

    if (elsewhere !== null) {
      return (
        <p>
          {elsewhere.link === null
            ? t("billedElsewhereUnnamed", { workspace: workspaceName })
            : t.rich("billedElsewhere", {
                billing: () => elsewhere.link,
                workspace: workspaceName,
              })}
        </p>
      );
    }

    if (!canManage) {
      return (
        <p>
          {managers.length === 0
            ? t("askSomeone")
            : t("askManagers", {
                names: managers.join(", "),
                workspace: workspaceName,
              })}
        </p>
      );
    }

    return <Offer {...props} />;
  };

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col gap-1">
        <Reached reason={reason} workspaceName={workspaceName} />
        <p className="text-muted-foreground">
          {t("orRemove", { limit: reason.limit })}
        </p>
      </div>
      {trialing && canManage && planWithRoom !== null ? (
        <p>{t("trial", { workspace: workspaceName })}</p>
      ) : null}
      {canManage && planWithRoom !== null && !trialing && legacy ? (
        <p>
          {t("legacyMove", {
            plan: billing("plan", { plan: reason.plan }),
            workspace: workspaceName,
          })}
        </p>
      ) : null}
      {error === null ? null : (
        <Alert variant="destructive" aria-live="assertive">
          <AlertDescription>{billing(`errors.${error}`)}</AlertDescription>
        </Alert>
      )}
      {wayOut()}
    </div>
  );
};
