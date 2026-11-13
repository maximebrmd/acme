import { getTranslations } from "next-intl/server";
import type { StaffBillingAccount } from "peal-contract";

import { BillingAccountActions } from "#components/staff/billing-account-actions.tsx";
import { Link } from "#i18n/navigation.ts";

// A billing account, ids and counts only, with what staff do to it.
export const BillingAccountDetails = async ({
  account,
}: {
  readonly account: StaffBillingAccount;
}) => {
  const t = await getTranslations("Staff.billingAccounts");

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">
        {t("accountTitle", { id: account.id })}
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("payer")}</dt>
        <dd>
          {account.payerUserId === null ? (
            t("none")
          ) : (
            <Link href={`/admin/users/${account.payerUserId}`}>
              {account.payerUserId}
            </Link>
          )}
        </dd>
        <dt className="text-muted-foreground">{t("partnerId")}</dt>
        <dd>{account.partnerId ?? t("none")}</dd>
        <dt className="text-muted-foreground">{t("billingWorkspace")}</dt>
        <dd>
          <Link href={`/admin/workspaces/${account.billingWorkspaceId}`}>
            {account.billingWorkspaceId}
          </Link>
        </dd>
        <dt className="text-muted-foreground">{t("freeTier")}</dt>
        <dd>{t("freeTierValue", { freeTier: String(account.freeTier) })}</dd>
        <dt className="text-muted-foreground">{t("subscribed")}</dt>
        <dd>
          {t("subscribedValue", { subscribed: String(account.subscribed) })}
        </dd>
        <dt className="text-muted-foreground">{t("standalone")}</dt>
        <dd>
          {t("standaloneValue", { standalone: String(account.standalone) })}
        </dd>
        <dt className="text-muted-foreground">{t("workspaceList")}</dt>
        <dd>
          <ul className="flex flex-col gap-1">
            {account.workspaceIds.map((id) => (
              <li key={id}>
                <Link href={`/admin/workspaces/${id}`}>{id}</Link>
                {account.mergedWorkspaceIds.includes(id) ? (
                  <span className="text-muted-foreground">
                    {" "}
                    {t("mergedMark")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </dd>
      </dl>
      <BillingAccountActions
        accountId={account.id}
        freeTier={account.freeTier}
        workspaceIds={account.workspaceIds}
      />
    </section>
  );
};
