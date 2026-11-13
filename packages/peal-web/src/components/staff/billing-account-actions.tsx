"use client";

import { useAtomSet } from "@effect/atom-react";
import type { Exit } from "effect";
import { Option } from "effect";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { Textarea } from "peal-ui/components/textarea";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { usePathname, useRouter } from "#i18n/navigation.ts";
import {
  detachBillingWorkspace,
  mergeBillingAccounts,
  requirePaymentMethod,
} from "#staff/atoms.ts";
import { staffErrorKey } from "#staff/errors.ts";
import type { StaffErrorKey } from "#staff/errors.ts";

/**
 * What staff do to a billing account, each with the reason the audit log
 * keeps: merge it into another, detach one of its workspaces back to its
 * oldest owner's account (which undoes a merge), or require a payment
 * method of it, or give its free tier back. The page then shows where
 * things stand.
 */
export const BillingAccountActions = ({
  accountId,
  freeTier,
  workspaceIds,
}: {
  readonly accountId: string;
  readonly freeTier: boolean;
  readonly workspaceIds: readonly string[];
}) => {
  const t = useTranslations("Staff.billingAccounts");
  const actions = useTranslations("Staff.actions");
  const errors = useTranslations("Staff.errors");
  const router = useRouter();
  const pathname = usePathname();
  const reasonId = useId();
  const intoId = useId();
  const merge = useAtomSet(mergeBillingAccounts, { mode: "promiseExit" });
  const require = useAtomSet(requirePaymentMethod, { mode: "promiseExit" });
  const detach = useAtomSet(detachBillingWorkspace, { mode: "promiseExit" });
  const [reason, setReason] = useState("");
  const [into, setInto] = useState("");
  const [error, setError] = useState<StaffErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const ready = reason.trim() !== "" && !isPending;

  const settle = <A, E extends { readonly _tag: string }>(
    exit: Exit.Exit<A, E>,
    done: string,
    then: () => void
  ) => {
    Option.match(staffErrorKey(exit), {
      onNone: () => {
        setError(null);
        setReason("");
        toast.success(done);
        then();
      },
      onSome: setError,
    });
  };

  const handleMerge = () => {
    startTransition(async () => {
      const exit = await merge({
        payload: {
          fromAccountId: accountId,
          intoAccountId: into.trim(),
          reason: reason.trim(),
        },
      });

      settle(exit, t("merged"), () => {
        // This account is gone: open the one it was merged into.
        router.push({ pathname, query: { query: into.trim() } });
      });
    });
  };

  const handleDetach = (workspaceId: string) => {
    startTransition(async () => {
      const exit = await detach({
        payload: { reason: reason.trim(), workspaceId },
      });

      settle(exit, t("detached"), () => {
        router.push({ pathname, query: { query: workspaceId } });
      });
    });
  };

  const handleRequire = () => {
    startTransition(async () => {
      const exit = await require({
        payload: { accountId, reason: reason.trim(), required: freeTier },
      });

      settle(exit, t("required"), () => {
        router.refresh();
      });
    });
  };

  return (
    <div className="flex max-w-lg flex-col gap-4">
      {error === null ? null : (
        <Alert variant="destructive">
          <AlertDescription>{errors(error)}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor={reasonId}>{actions("reason")}</Label>
        <Textarea
          id={reasonId}
          aria-describedby={`${reasonId}-hint`}
          value={reason}
          maxLength={500}
          required
          onChange={(event) => {
            setReason(event.target.value);
          }}
        />
        <p id={`${reasonId}-hint`} className="text-muted-foreground text-sm">
          {actions("reasonHint")}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">{t("requireTitle")}</h3>
        <div>
          <Button
            variant="outline"
            disabled={!ready}
            focusableWhenDisabled
            onClick={handleRequire}
          >
            {isPending ? t("requiring") : t(freeTier ? "require" : "restore")}
          </Button>
        </div>
      </div>
      {workspaceIds.length < 2 ? null : (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">{t("detachTitle")}</h3>
          <p className="text-muted-foreground text-sm">{t("detachHint")}</p>
          <ul className="flex flex-col gap-2">
            {workspaceIds.map((workspaceId) => (
              <li key={workspaceId} className="flex items-center gap-2">
                <code className="text-sm">{workspaceId}</code>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!ready}
                  focusableWhenDisabled
                  onClick={() => {
                    handleDetach(workspaceId);
                  }}
                >
                  {t("detach")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">{t("mergeTitle")}</h3>
        <p className="text-muted-foreground text-sm">{t("mergeHint")}</p>
        <Label htmlFor={intoId}>{t("mergeInto")}</Label>
        <Input
          id={intoId}
          value={into}
          maxLength={64}
          autoComplete="off"
          onChange={(event) => {
            setInto(event.target.value);
          }}
        />
        <div>
          <Button
            variant="destructive"
            disabled={!ready || into.trim() === ""}
            focusableWhenDisabled
            onClick={handleMerge}
          >
            {isPending ? t("merging") : t("merge")}
          </Button>
        </div>
      </div>
    </div>
  );
};
