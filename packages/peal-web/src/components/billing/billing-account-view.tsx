"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { BillingAccount, WorkspaceMember } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import type { ReactElement } from "react";
import { useId, useState } from "react";

/** What the person asked for about the account, while it is under way. */
export type AccountAction = "accept" | "offer" | "withdraw";

/** Why the last request about the account failed. */
export type AccountError =
  | "forbidden"
  | "generic"
  | "notFound"
  | "planLimit"
  | "subscribed";

export interface BillingAccountViewProps {
  readonly account: BillingAccount;
  /** Whether the reader manages billing here (billing:manage). */
  readonly canManage: boolean;
  readonly error: AccountError | null;
  /** A link to another workspace's billing page. */
  readonly linkTo: (workspaceId: string, name: string) => ReactElement;
  /** The workspace's other owners, whom its payer may hand it to. */
  readonly owners: readonly WorkspaceMember[];
  readonly pending: AccountAction | null;
  /** The reader's user id. */
  readonly userId: string;
  readonly workspaceId: string;
  readonly onAccept: () => void;
  readonly onOffer: (toUserId: string) => void;
  readonly onWithdraw: () => void;
}

const OfferForm = ({
  owners,
  pending,
  onOffer,
}: Pick<BillingAccountViewProps, "owners" | "pending" | "onOffer">) => {
  const t = useTranslations("BillingAccount");
  const labelId = useId();
  const [chosen, setChosen] = useState<string | null>(null);
  const named = owners.find(({ userId }) => userId === chosen);

  if (owners.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noOwners")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className="text-sm font-medium">
        {t("offerTo")}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={chosen}
          disabled={pending !== null}
          onValueChange={(value) => {
            setChosen(value);
          }}
        >
          <SelectTrigger aria-labelledby={labelId} className="min-w-48">
            <SelectValue>{named?.name ?? t("chooseOwner")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {owners.map(({ name, userId }) => (
              <SelectItem key={userId} value={userId}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={chosen === null || pending !== null}
          onClick={() => {
            if (chosen !== null) {
              onOffer(chosen);
            }
          }}
        >
          {pending === "offer" ? t("offering") : t("offer")}
        </Button>
      </div>
    </div>
  );
};

// Who pays for the account, as the reader is told.
const whoPays = ({
  partner,
  payer,
}: BillingAccount): "otherPays" | "partner" | "youPay" => {
  if (partner) {
    return "partner";
  }

  return payer ? "youPay" : "otherPays";
};

// Which workspace bills the account: this one, or another, named and
// linked for its members only.
const BilledWhere = ({
  account,
  linkTo,
  workspaceId,
}: Pick<BillingAccountViewProps, "account" | "linkTo" | "workspaceId">) => {
  const t = useTranslations("BillingAccount");
  const { billingWorkspaceId, billingWorkspaceName } = account;

  if (billingWorkspaceId === workspaceId) {
    return (
      <p className="text-sm">
        {t("billedHere", { workspaces: account.workspaces })}
      </p>
    );
  }

  if (billingWorkspaceName === null) {
    return <p className="text-sm">{t("billedElsewhereUnnamed")}</p>;
  }

  return (
    <p className="text-sm">
      {t.rich("billedElsewhere", {
        workspace: () => linkTo(billingWorkspaceId, billingWorkspaceName),
      })}
    </p>
  );
};

/**
 * Whose billing account a workspace is on: who pays, which workspace
 * bills it and which others share its plan and channels, and the offer to
 * hand the workspace to another payer, made by its payer and taken, in
 * person, by the owner it is made to.
 */
export const BillingAccountView = ({
  account,
  canManage,
  error,
  linkTo,
  owners,
  pending,
  userId,
  workspaceId,
  onAccept,
  onOffer,
  onWithdraw,
}: BillingAccountViewProps) => {
  const t = useTranslations("BillingAccount");
  const format = useFormatter();
  const { transfer } = account;
  const offeredToMe = transfer !== null && transfer.toUserId === userId;
  const offeredByMe = transfer !== null && transfer.offeredBy === userId;

  const offeredName =
    owners.find(({ userId: id }) => id === transfer?.toUserId)?.name ??
    t("anotherOwner");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t(whoPays(account))}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <BilledWhere
            account={account}
            linkTo={linkTo}
            workspaceId={workspaceId}
          />
          {account.otherWorkspaces.length === 0 ? null : (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{t("sharedWith")}</p>
              <ul className="flex list-disc flex-col gap-1 ps-5 text-sm">
                {account.otherWorkspaces.map(({ name, workspaceId: id }) => (
                  <li key={id}>{linkTo(id, name)}</li>
                ))}
              </ul>
            </div>
          )}
          {transfer !== null && offeredToMe ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                {t("offeredToYou", {
                  until: format.dateTime(transfer.expiresAt.epochMilliseconds, {
                    dateStyle: "long",
                  }),
                })}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={pending !== null}
                  onClick={onAccept}
                >
                  {pending === "accept" ? t("accepting") : t("accept")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending !== null}
                  onClick={onWithdraw}
                >
                  {t("decline")}
                </Button>
              </div>
            </div>
          ) : null}
          {transfer !== null && offeredByMe ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                {t("offeredBy", {
                  name: offeredName,
                  until: format.dateTime(transfer.expiresAt.epochMilliseconds, {
                    dateStyle: "long",
                  }),
                })}
              </p>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending !== null}
                  onClick={onWithdraw}
                >
                  {pending === "withdraw" ? t("withdrawing") : t("withdraw")}
                </Button>
              </div>
            </div>
          ) : null}
          {transfer === null &&
          account.payer &&
          canManage &&
          !account.partner ? (
            <OfferForm owners={owners} pending={pending} onOffer={onOffer} />
          ) : null}
          {error === null ? null : (
            <Alert variant="destructive">
              <AlertDescription>{t("error", { error })}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
