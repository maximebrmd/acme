"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { AdAccount, AdConnection, AdNetwork } from "peal-contract";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "peal-ui/components/alert-dialog";
import { Button } from "peal-ui/components/button";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  adAccounts,
  adCampaigns,
  adConnections,
  adInsights,
  adsChanged,
  adSpending,
  adsStatus,
  removeAdAccount,
  removeAdSignIn,
  setAdSpending,
  startAdSignIn,
} from "#ads/api.ts";
import { adsErrorOf } from "#ads/errors.ts";
import type { AdsError } from "#ads/errors.ts";
import { parseAmount } from "#ads/money.ts";
import { rememberAdSignIn } from "#ads/pending-sign-in.ts";
import { useMoney } from "#ads/use-money.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import {
  SettingsLoadFailed,
  SettingsLoading,
} from "#components/settings/settings-status.tsx";
import { browserTimeZone } from "#posts/zoned-time.ts";

import { AdsErrorAlert, useAdsErrorText } from "./ads-error.tsx";
import {
  AdAccountView,
  AdConnectionView,
  CampaignsTableView,
  ceilingOf,
  DailySpendView,
  SpendingFormView,
} from "./ads-views.tsx";

/** What the member may do on the page, from their role. */
export interface AdsRights {
  /** Turn spending on, change the ceiling, turn it off: owners. */
  readonly authorize: boolean;
  /** Sign in to a network, connect and disconnect ad accounts. */
  readonly manage: boolean;
}

// Starts a sign-in, then leaves for the ad network's page.
const Connect = ({
  networks,
  workspaceId,
}: {
  readonly networks: readonly AdNetwork[];
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Ads");
  const start = useAtomSet(startAdSignIn, { mode: "promiseExit" });
  const [error, setError] = useState<AdsError | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConnect = (network: AdNetwork) => () => {
    startTransition(async () => {
      const exit = await start({ params: { network, workspaceId } });

      if (Exit.isSuccess(exit)) {
        setError(null);
        rememberAdSignIn({ network, workspaceId });
        globalThis.location.assign(exit.value.authorizationUrl);

        return;
      }

      setError(
        Option.getOrElse(adsErrorOf(exit), (): AdsError => ({ key: "unknown" }))
      );
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <AdsErrorAlert error={error} />
      <div className="flex flex-wrap gap-2">
        {networks.map((network) => (
          <Button
            key={network}
            disabled={isPending}
            focusableWhenDisabled
            onClick={handleConnect(network)}
          >
            {isPending
              ? t("connections.connecting")
              : t("connections.connect", {
                  network: t("network", { network }),
                  several: networks.length > 1 ? "true" : "false",
                })}
          </Button>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">
        {t("connections.connectHint")}
      </p>
    </div>
  );
};

// Removes a sign-in, with its ad accounts, once confirmed.
const RemoveSignIn = ({
  connection,
  workspaceId,
}: {
  readonly connection: AdConnection;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Ads");
  const settings = useTranslations("Settings");
  const explain = useAdsErrorText();
  const remove = useAtomSet(removeAdSignIn, { mode: "promiseExit" });
  const [isRemoving, startRemoving] = useTransition();

  const handleRemove = () => {
    startRemoving(async () => {
      const exit = await remove({
        params: { connectionId: connection.id, workspaceId },
        reactivityKeys: adsChanged(workspaceId),
      });

      Option.match(adsErrorOf(exit), {
        onNone: () => {
          toast.success(t("connections.removed"));
        },
        onSome: (error) => {
          toast.error(explain(error));
        },
      });
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            disabled={isRemoving}
            focusableWhenDisabled
          />
        }
      >
        {isRemoving ? t("connections.removing") : t("connections.remove")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("connections.removeTitle", {
              network: t("network", { network: connection.network }),
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("connections.removeDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{settings("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleRemove}>
            {t("connections.remove")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Disconnects an ad account, once confirmed.
const Disconnect = ({
  account,
  workspaceId,
}: {
  readonly account: AdAccount;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Ads");
  const settings = useTranslations("Settings");
  const explain = useAdsErrorText();
  const remove = useAtomSet(removeAdAccount, { mode: "promiseExit" });
  const [isRemoving, startRemoving] = useTransition();

  const handleRemove = () => {
    startRemoving(async () => {
      const exit = await remove({
        params: { accountId: account.id, workspaceId },
        reactivityKeys: adsChanged(workspaceId),
      });

      Option.match(adsErrorOf(exit), {
        onNone: () => {
          toast.success(t("accounts.disconnected", { name: account.name }));
        },
        onSome: (error) => {
          toast.error(explain(error, account.minorUnitDigits));
        },
      });
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={isRemoving}
            focusableWhenDisabled
          />
        }
      >
        {isRemoving ? t("accounts.disconnecting") : t("accounts.disconnect")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("accounts.disconnectTitle", { name: account.name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("accounts.disconnectDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{settings("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleRemove}>
            {t("accounts.disconnect")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// An owner's decision on an ad account's spending. Nothing is sent before
// the owner presses the button under what it means.
const Spending = ({
  account,
  workspaceId,
}: {
  readonly account: AdAccount;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Ads.spending");
  const money = useMoney();
  const decide = useAtomSet(setAdSpending, { mode: "promiseExit" });
  const [ceiling, setCeiling] = useState(() => ceilingOf(account));
  const [error, setError] = useState<AdsError | null>(null);
  const [isPending, startTransition] = useTransition();
  const { currency, minorUnitDigits: digits, name } = account;
  const params = { accountId: account.id, workspaceId };

  const handleSubmit = () => {
    const amount = parseAmount(ceiling, digits).pipe(
      Option.filter((minor) => minor > 0)
    );

    if (Option.isNone(amount)) {
      return;
    }

    startTransition(async () => {
      const exit = await decide({
        params,
        payload: {
          enabled: true,
          monthlyCeiling: { amount: amount.value, currency },
        },
        reactivityKeys: adsChanged(workspaceId),
      });

      setError(Option.getOrNull(adsErrorOf(exit)));

      if (Exit.isSuccess(exit)) {
        toast.success(
          t(account.spendingEnabled ? "changed" : "turnedOn", {
            ceiling: money(amount.value, currency, digits),
            name,
          })
        );
      }
    });
  };

  const handleTurnOff = () => {
    startTransition(async () => {
      const exit = await decide({
        params,
        payload: { enabled: false },
        reactivityKeys: adsChanged(workspaceId),
      });

      setError(Option.getOrNull(adsErrorOf(exit)));

      if (Exit.isSuccess(exit)) {
        setCeiling("");
        toast.success(t("turnedOff", { name }));
      }
    });
  };

  return (
    <SpendingFormView
      account={account}
      ceiling={ceiling}
      error={error}
      pending={isPending}
      onCeilingChange={setCeiling}
      onSubmit={handleSubmit}
      onTurnOff={handleTurnOff}
    />
  );
};

// An ad account's campaigns over the last 30 days.
const Campaigns = ({
  accountId,
  workspaceId,
}: {
  readonly accountId: string;
  readonly workspaceId: string;
}) => {
  const query = adCampaigns(workspaceId, accountId);
  const result = useAtomValue(query);
  const reload = useAtomRefresh(query);

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) => <CampaignsTableView report={value} />,
  });
};

// What an ad account's ads spent each of the last 30 days.
const DailySpend = ({
  accountId,
  workspaceId,
}: {
  readonly accountId: string;
  readonly workspaceId: string;
}) => {
  const query = adInsights(workspaceId, accountId);
  const result = useAtomValue(query);
  const reload = useAtomRefresh(query);

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) => <DailySpendView report={value} />,
  });
};

// One ad account, with what its boosts commit this month, its spending
// form for owners on a server that spends, its campaigns and daily spend.
const AccountSection = ({
  account,
  rights,
  spends,
  workspaceId,
}: {
  readonly account: AdAccount;
  readonly rights: AdsRights;
  /** Whether the server offers spending. */
  readonly spends: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Ads");
  const spending = useAtomValue(adSpending(workspaceId, account.id));

  return (
    <AdAccountView
      account={account}
      committedThisMonth={
        AsyncResult.isSuccess(spending)
          ? spending.value.committedThisMonth
          : null
      }
      actions={
        rights.manage ? (
          <Disconnect account={account} workspaceId={workspaceId} />
        ) : undefined
      }
    >
      {spends && rights.authorize ? (
        <Spending
          key={`${account.id}-${String(account.monthlyCeiling)}`}
          account={account}
          workspaceId={workspaceId}
        />
      ) : null}
      {spends && !rights.authorize ? (
        <p className="text-muted-foreground text-sm">
          {t("spending.ownersOnly")}
        </p>
      ) : null}
      <section className="flex flex-col gap-2">
        <h4 className="font-medium">{t("campaigns.title")}</h4>
        <p className="text-muted-foreground text-sm">
          {t("campaigns.description")}
        </p>
        <Campaigns accountId={account.id} workspaceId={workspaceId} />
      </section>
      <section className="flex flex-col gap-2">
        <h4 className="font-medium">{t("insights.title")}</h4>
        <p className="text-muted-foreground text-sm">
          {t("insights.description")}
        </p>
        <DailySpend accountId={account.id} workspaceId={workspaceId} />
      </section>
    </AdAccountView>
  );
};

const Connections = ({
  mayManage,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Ads");
  const atom = adConnections(workspaceId);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) =>
      value.length === 0 ? (
        <p className="text-muted-foreground">{t("connections.empty")}</p>
      ) : (
        <ul className="divide-y">
          {value.map((connection) => (
            <AdConnectionView
              key={connection.id}
              connection={connection}
              actions={
                mayManage ? (
                  <RemoveSignIn
                    connection={connection}
                    workspaceId={workspaceId}
                  />
                ) : undefined
              }
            />
          ))}
        </ul>
      ),
  });
};

const Accounts = ({
  rights,
  spends,
  workspaceId,
}: {
  readonly rights: AdsRights;
  readonly spends: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Ads");
  const atom = adAccounts(workspaceId);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) =>
      value.length === 0 ? (
        <p className="text-muted-foreground">{t("accounts.empty")}</p>
      ) : (
        <ul className="divide-y">
          {value.map((account) => (
            <AccountSection
              key={account.id}
              account={account}
              rights={rights}
              spends={spends}
              workspaceId={workspaceId}
            />
          ))}
        </ul>
      ),
  });
};

// The page once the browser can ask with the visitor's cookies: what the
// server offers first, and nothing more when it offers no ads.
const LoadedAds = ({
  rights,
  workspaceId,
}: {
  readonly rights: AdsRights;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Ads");
  const atom = adsStatus(workspaceId);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) =>
      value.mode === "off" ? (
        <p>{t("page.off")}</p>
      ) : (
        <div className="flex flex-col gap-8">
          {value.mode === "read" ? (
            <p className="text-muted-foreground text-sm">
              {t("page.readOnlyServer")}
            </p>
          ) : null}
          <section
            aria-labelledby="ad-sign-ins-title"
            className="flex flex-col gap-3"
          >
            <h2 id="ad-sign-ins-title" className="text-xl font-semibold">
              {t("connections.title")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("connections.description")}
            </p>
            <Connections mayManage={rights.manage} workspaceId={workspaceId} />
            {rights.manage ? (
              <Connect networks={value.networks} workspaceId={workspaceId} />
            ) : null}
          </section>
          <section
            aria-labelledby="ad-accounts-title"
            className="flex flex-col gap-3"
          >
            <h2 id="ad-accounts-title" className="text-xl font-semibold">
              {t("accounts.title")}
            </h2>
            <Accounts
              rights={rights}
              spends={value.mode === "spend"}
              workspaceId={workspaceId}
            />
          </section>
        </div>
      ),
  });
};

/**
 * A workspace's ads: whether the server offers them, the sign-ins to ad
 * networks, and each connected ad account with its spending, campaigns and
 * daily spend. Instants are written in the reader's time zone.
 */
export const AdsScreen = ({
  rights,
  workspaceId,
}: {
  readonly rights: AdsRights;
  readonly workspaceId: string;
}) => {
  const hydrated = useHydrated();

  return hydrated ? (
    <InTimeZone timeZone={browserTimeZone()}>
      <LoadedAds rights={rights} workspaceId={workspaceId} />
    </InTimeZone>
  ) : (
    <SettingsLoading />
  );
};
