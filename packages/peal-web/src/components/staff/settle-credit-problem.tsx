"use client";

import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import { useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";
import { Input } from "peal-ui/components/input";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { useRouter } from "#i18n/navigation.ts";
import { settleCreditProblem } from "#staff/atoms.ts";
import { staffErrorKey } from "#staff/errors.ts";

/**
 * Marks a credit or a refund Stripe did not give as settled by hand, with
 * the reason the audit log keeps.
 */
export const SettleCreditProblem = ({
  problemKey,
}: {
  readonly problemKey: string;
}) => {
  const t = useTranslations("Staff.billingAccounts.creditProblems");
  const errors = useTranslations("Staff.errors");
  const router = useRouter();
  const reasonId = useId();
  const settle = useAtomSet(settleCreditProblem, { mode: "promiseExit" });
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const exit = await settle({
        payload: { key: problemKey, reason: reason.trim() },
      });

      Option.match(staffErrorKey(exit), {
        onNone: () => {
          setReason("");
          toast.success(t("settledToast"));
          router.refresh();
        },
        onSome: (error) => {
          toast.error(errors(error));
        },
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <label htmlFor={reasonId} className="sr-only">
        {t("reason")}
      </label>
      <Input
        id={reasonId}
        value={reason}
        maxLength={500}
        required
        placeholder={t("reason")}
        onChange={(event) => {
          setReason(event.target.value);
        }}
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={reason.trim() === "" || isPending}
        focusableWhenDisabled
      >
        {t("settle")}
      </Button>
    </form>
  );
};
