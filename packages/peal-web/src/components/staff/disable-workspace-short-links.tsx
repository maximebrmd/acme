"use client";

import { useAtomSet } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Label } from "peal-ui/components/label";
import { Textarea } from "peal-ui/components/textarea";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { useRouter } from "#i18n/navigation.ts";
import { disableWorkspaceShortLinks } from "#staff/atoms.ts";
import { staffErrorKey } from "#staff/errors.ts";
import type { StaffErrorKey } from "#staff/errors.ts";

/**
 * Turns off every short link of a workspace still on, with the reason the
 * audit log keeps, then shows the page as it now stands.
 */
export const DisableWorkspaceShortLinks = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Staff.shortLinks");
  const actions = useTranslations("Staff.actions");
  const errors = useTranslations("Staff.errors");
  const router = useRouter();
  const reasonId = useId();

  const disable = useAtomSet(disableWorkspaceShortLinks, {
    mode: "promiseExit",
  });

  const [reason, setReason] = useState("");
  const [error, setError] = useState<StaffErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const exit = await disable({
        params: { workspaceId },
        payload: { reason: reason.trim() },
      });

      Option.match(staffErrorKey(exit), {
        onNone: () => {
          setError(null);
          setReason("");
          toast.success(
            t("allDisabled", {
              count: Exit.isSuccess(exit) ? exit.value.disabled : 0,
            })
          );
          router.refresh();
        },
        onSome: setError,
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-3">
      <p className="text-muted-foreground text-sm">{t("allHint")}</p>
      {error === null ? null : (
        <Alert variant="destructive">
          <AlertDescription>{errors(error)}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor={reasonId}>{actions("reason")}</Label>
        <Textarea
          id={reasonId}
          value={reason}
          maxLength={500}
          required
          onChange={(event) => {
            setReason(event.target.value);
          }}
        />
      </div>
      <div>
        <Button
          type="submit"
          variant="destructive"
          disabled={reason.trim() === "" || isPending}
          focusableWhenDisabled
        >
          {isPending ? t("disabling") : t("disableAll")}
        </Button>
      </div>
    </form>
  );
};
