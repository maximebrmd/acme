"use client";

import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Label } from "peal-ui/components/label";
import { Textarea } from "peal-ui/components/textarea";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { useRouter } from "#i18n/navigation.ts";
import { grantPartner } from "#staff/atoms.ts";
import { staffErrorKey } from "#staff/errors.ts";
import type { StaffErrorKey } from "#staff/errors.ts";

/**
 * Opens a partner account for a workspace, with the reason the audit log
 * keeps, then shows the page as it now stands.
 */
export const GrantPartner = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Staff.partner");
  const actions = useTranslations("Staff.actions");
  const errors = useTranslations("Staff.errors");
  const router = useRouter();
  const reasonId = useId();
  const grant = useAtomSet(grantPartner, { mode: "promiseExit" });
  const [reason, setReason] = useState("");
  const [error, setError] = useState<StaffErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const exit = await grant({
        params: { workspaceId },
        payload: { reason: reason.trim() },
      });

      Option.match(staffErrorKey(exit), {
        onNone: () => {
          setError(null);
          setReason("");
          toast.success(t("granted"));
          router.refresh();
        },
        onSome: setError,
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-3">
      <p className="text-muted-foreground text-sm">{t("grantHint")}</p>
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
      <div>
        <Button
          type="submit"
          disabled={reason.trim() === "" || isPending}
          focusableWhenDisabled
        >
          {isPending ? t("granting") : t("grant")}
        </Button>
      </div>
    </form>
  );
};
