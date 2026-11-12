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
import { disableShortLink, enableShortLink } from "#staff/atoms.ts";
import { staffErrorKey } from "#staff/errors.ts";
import type { StaffErrorKey } from "#staff/errors.ts";

/**
 * Turns a short link off, or back on, with the reason the audit log keeps,
 * then shows the page as it now stands.
 */
export const ShortLinkSwitch = ({
  code,
  disabled,
}: {
  readonly code: string;
  readonly disabled: boolean;
}) => {
  const t = useTranslations("Staff.shortLinks");
  const actions = useTranslations("Staff.actions");
  const errors = useTranslations("Staff.errors");
  const router = useRouter();
  const reasonId = useId();
  const disable = useAtomSet(disableShortLink, { mode: "promiseExit" });
  const enable = useAtomSet(enableShortLink, { mode: "promiseExit" });
  const [reason, setReason] = useState("");
  const [error, setError] = useState<StaffErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const request = {
        params: { code },
        payload: { reason: reason.trim() },
      };

      const exit = disabled ? await enable(request) : await disable(request);

      Option.match(staffErrorKey(exit), {
        onNone: () => {
          setError(null);
          setReason("");
          toast.success(disabled ? t("enabled") : t("disabled"));
          router.refresh();
        },
        onSome: setError,
      });
    });
  };

  const working = disabled ? t("enabling") : t("disabling");
  const label = disabled ? t("enable") : t("disable");

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-3">
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
          {t("hint")}
        </p>
      </div>
      <div>
        <Button
          type="submit"
          variant={disabled ? "default" : "destructive"}
          disabled={reason.trim() === "" || isPending}
          focusableWhenDisabled
        >
          {isPending ? working : label}
        </Button>
      </div>
    </form>
  );
};
