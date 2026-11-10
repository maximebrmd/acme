"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { AdAccount, BoostQuoteSchema, NewBoost } from "peal-contract";
import { Button } from "peal-ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "peal-ui/components/dialog";
import { useId, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import {
  adAccounts,
  adsChanged,
  adsStatus,
  createBoost,
  quoteBoost,
} from "#ads/api.ts";
import { checkBoost, emptyBoostDraft } from "#ads/boost-draft.ts";
import type { BoostDraft, BoostProblem } from "#ads/boost-draft.ts";
import { adsErrorOf } from "#ads/errors.ts";
import type { AdsError } from "#ads/errors.ts";
import { todayIn } from "#analytics/report.ts";

import { BoostFormView, BoostSummaryView } from "./boost-views.tsx";

/** A boost checked by the server, ready for the last button. */
interface Review {
  readonly account: AdAccount;
  readonly boost: NewBoost;
  /**
   * Made once, when the review opens: every press of the last button sends
   * it, so a double click or a retry never makes a second boost.
   */
  readonly idempotencyKey: string;
  readonly quote: typeof BoostQuoteSchema.Type;
}

const unknown = (): AdsError => ({ key: "unknown" });

interface BoostDialogProps {
  /** The ad accounts an owner allowed to spend. */
  readonly accounts: readonly AdAccount[];
  /** A link to the ads page, where an owner allows an account to spend. */
  readonly adsLink: ReactNode;
  /** The channel the post is boosted on, by name. */
  readonly channel: string;
  readonly channelId: string;
  readonly postId: string;
  readonly postText: string;
  readonly workspaceId: string;
}

// The form, then the review of what the server says the boost would cost,
// then the one request that spends.
const BoostSteps = ({
  accounts,
  adsLink,
  channel,
  channelId,
  onDone,
  postId,
  postText,
  workspaceId,
}: BoostDialogProps & { readonly onDone: () => void }) => {
  const t = useTranslations("Ads.boost");
  const idPrefix = useId();
  const quote = useAtomSet(quoteBoost, { mode: "promiseExit" });
  const create = useAtomSet(createBoost, { mode: "promiseExit" });

  const [draft, setDraft] = useState<BoostDraft>(() => ({
    ...emptyBoostDraft,
    // A single account needs no choosing.
    accountId: accounts.length === 1 ? (accounts[0]?.id ?? "") : "",
  }));

  const [asked, setAsked] = useState(false);
  const [error, setError] = useState<AdsError | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [isPending, startTransition] = useTransition();
  const account = accounts.find(({ id }) => id === draft.accountId);

  const check = () =>
    checkBoost(draft, {
      account,
      channelId,
      postId,
      today: todayIn(account?.timeZone ?? "UTC"),
    });

  const problems: readonly BoostProblem[] = asked ? check().problems : [];

  const handleReview = () => {
    const { boost } = check();

    setAsked(true);

    if (Option.isNone(boost) || account === undefined) {
      return;
    }

    startTransition(async () => {
      const exit = await quote({
        params: { workspaceId },
        payload: boost.value,
      });

      if (Exit.isSuccess(exit)) {
        setError(null);
        setReview({
          account,
          boost: boost.value,
          idempotencyKey: crypto.randomUUID(),
          quote: exit.value,
        });

        return;
      }

      setError(Option.getOrElse(adsErrorOf(exit), unknown));
    });
  };

  const handleConfirm = (checked: Review) => () => {
    startTransition(async () => {
      const exit = await create({
        headers: { "idempotency-key": checked.idempotencyKey },
        params: { workspaceId },
        payload: checked.boost,
        reactivityKeys: adsChanged(workspaceId),
      });

      if (Exit.isSuccess(exit)) {
        toast.success(t("summary.accepted"));
        onDone();

        return;
      }

      setError(Option.getOrElse(adsErrorOf(exit), unknown));
    });
  };

  return review === null ? (
    <BoostFormView
      accounts={accounts}
      draft={draft}
      error={error}
      idPrefix={idPrefix}
      pending={isPending}
      problems={problems}
      adsLink={adsLink}
      onChange={setDraft}
      onReview={handleReview}
    />
  ) : (
    <BoostSummaryView
      account={review.account}
      boost={review.boost}
      channel={channel}
      error={error}
      pending={isPending}
      postText={postText}
      quote={review.quote}
      onConfirm={handleConfirm(review)}
      onBack={() => {
        setError(null);
        setReview(null);
      }}
    />
  );
};

/**
 * Boosts a published post on one of its channels: a button that opens the
 * form, then the review, in a dialog. Shown only on a server that offers
 * spending; the form says so when no ad account may spend yet.
 */
export const BoostDialog = ({
  adsLink,
  channel,
  channelId,
  postId,
  postText,
  workspaceId,
}: Omit<BoostDialogProps, "accounts">) => {
  const t = useTranslations("Ads.boost");
  const status = useAtomValue(adsStatus(workspaceId));
  const accounts = useAtomValue(adAccounts(workspaceId));
  const [open, setOpen] = useState(false);

  if (
    !AsyncResult.isSuccess(status) ||
    status.value.mode !== "spend" ||
    !AsyncResult.isSuccess(accounts)
  ) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {t("open")}
      </DialogTrigger>
      <DialogContent
        closeLabel={t("closeDialog")}
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>{t("title", { channel })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open ? (
          <BoostSteps
            accounts={accounts.value.filter(
              ({ spendingEnabled }) => spendingEnabled
            )}
            adsLink={adsLink}
            channel={channel}
            channelId={channelId}
            postId={postId}
            postText={postText}
            workspaceId={workspaceId}
            onDone={() => {
              setOpen(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
