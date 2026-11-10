"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { AdAccount, Boost } from "peal-contract";
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
import { Skeleton } from "peal-ui/components/skeleton";
import { useCallback, useTransition } from "react";
import { toast } from "sonner";

import {
  adAccounts,
  adsChanged,
  adsStatus,
  pauseBoost,
  postPerformance,
  resumeBoost,
  stopBoost,
} from "#ads/api.ts";
import { adsErrorOf } from "#ads/errors.ts";
import { digitsOfCurrency } from "#ads/money.ts";
import { useRefreshWhileVisible } from "#notices/use-refresh-while-visible.ts";

import { useAdsErrorText } from "./ads-error.tsx";
import { controlsOf, PaidSectionView } from "./paid-views.tsx";
import type { BoostControl } from "./paid-views.tsx";

/** What the member may do to boosts, from their role. */
export interface BoostRights {
  /** ads:manage: pause and stop. */
  readonly manage: boolean;
  /** ads:spend: pause, resume and stop. */
  readonly spend: boolean;
}

const allowed = (control: BoostControl, rights: BoostRights): boolean =>
  control === "resume" ? rights.spend : rights.spend || rights.manage;

// Pause, resume and stop for one boost, as its state and the member's role
// allow. Stopping is final, and asks first.
const BoostControls = ({
  account,
  boost,
  rights,
  workspaceId,
}: {
  readonly account: AdAccount | undefined;
  readonly boost: Boost;
  readonly rights: BoostRights;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Ads.paid");
  const explain = useAdsErrorText();
  const pause = useAtomSet(pauseBoost, { mode: "promiseExit" });
  const resume = useAtomSet(resumeBoost, { mode: "promiseExit" });
  const stop = useAtomSet(stopBoost, { mode: "promiseExit" });
  const [isPending, startTransition] = useTransition();
  const digits = account?.minorUnitDigits ?? digitsOfCurrency(boost.currency);

  const offered = controlsOf(boost.state).filter((control) =>
    allowed(control, rights)
  );

  const ask = (control: BoostControl) => () => {
    const send = { pause, resume, stop }[control];

    startTransition(async () => {
      const exit = await send({
        params: { boostId: boost.id, workspaceId },
        reactivityKeys: adsChanged(workspaceId),
      });

      Option.match(adsErrorOf(exit), {
        onNone: () => {
          toast.success(t("done", { control }));
        },
        onSome: (error) => {
          toast.error(explain(error, digits));
        },
      });
    });
  };

  if (offered.length === 0) {
    return null;
  }

  return (
    <>
      {offered.includes("pause") ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          focusableWhenDisabled
          onClick={ask("pause")}
        >
          {t("pause")}
        </Button>
      ) : null}
      {offered.includes("resume") ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          focusableWhenDisabled
          onClick={ask("resume")}
        >
          {t("resume")}
        </Button>
      ) : null}
      {offered.includes("stop") ? (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                focusableWhenDisabled
              />
            }
          >
            {t("stop")}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("stopTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("stopDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={ask("stop")}>
                {t("stop")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
};

// While a boost is being made, how often the page asks how it went.
const refreshEvery = 10_000;

const LoadedPaid = ({
  channelName,
  postId,
  rights,
  workspaceId,
}: PostPaidProps) => {
  const t = useTranslations("Ads.paid");
  const query = postPerformance(workspaceId, postId);
  const performance = useAtomValue(query);
  const reload = useAtomRefresh(query);
  const accounts = useAtomValue(adAccounts(workspaceId));
  const known = AsyncResult.isSuccess(accounts) ? accounts.value : [];

  const making =
    AsyncResult.isSuccess(performance) &&
    performance.value.boosts.some(({ state }) => state === "requested");

  const refresh = useCallback(() => {
    if (making) {
      reload();
    }
  }, [making, reload]);

  useRefreshWhileVisible(refresh, refreshEvery);

  return (
    <section aria-labelledby="post-paid" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="post-paid" className="text-sm font-medium">
          {t("title")}
        </h2>
        <Button variant="outline" size="sm" onClick={reload}>
          {t("refresh")}
        </Button>
      </div>
      {AsyncResult.isFailure(performance) ? (
        <p className="text-sm" role="alert">
          {t("loadFailed")}
        </p>
      ) : null}
      {AsyncResult.isInitial(performance) ? (
        <div aria-busy="true">
          <span className="sr-only">{t("loading")}</span>
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}
      {AsyncResult.isSuccess(performance) ? (
        <PaidSectionView
          accounts={known}
          channelName={channelName}
          performance={performance.value}
          renderActions={(boost) => (
            <BoostControls
              account={known.find(({ id }) => id === boost.accountId)}
              boost={boost}
              rights={rights}
              workspaceId={workspaceId}
            />
          )}
        />
      ) : null}
    </section>
  );
};

interface PostPaidProps {
  /** A channel of the post, by name. */
  readonly channelName: (channelId: string) => string;
  readonly postId: string;
  readonly rights: BoostRights;
  readonly workspaceId: string;
}

/**
 * The paid section of a published post's page, for members who may read
 * ads, on a server that offers them: the post's boosts with what the
 * member may do to each, and its organic counts beside its paid ones.
 */
export const PostPaid = (props: PostPaidProps) => {
  const status = useAtomValue(adsStatus(props.workspaceId));

  return AsyncResult.isSuccess(status) && status.value.mode !== "off" ? (
    <LoadedPaid {...props} />
  ) : null;
};
