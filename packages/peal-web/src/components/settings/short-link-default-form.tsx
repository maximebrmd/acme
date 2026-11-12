"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import { useId, useTransition } from "react";
import { toast } from "sonner";

import {
  setShortLinkDefault,
  shortLinkStatus,
  shortLinksChanged,
} from "#short-links/atoms.ts";

/**
 * Whether the workspace's new posts ask for short links by default, which
 * owners and admins set (`mayChange`, organization:update); on a server
 * without short links, it says so.
 */
export const ShortLinkDefaultForm = ({
  mayChange,
  workspaceId,
}: {
  readonly mayChange: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("ShortLinks.settings");
  const status = useAtomValue(shortLinkStatus(workspaceId));
  const update = useAtomSet(setShortLinkDefault, { mode: "promiseExit" });
  const [isPending, startTransition] = useTransition();
  const id = useId();

  if (AsyncResult.isFailure(status)) {
    return <p className="text-sm">{t("loadFailed")}</p>;
  }

  if (!AsyncResult.isSuccess(status)) {
    return null;
  }

  if (!status.value.available) {
    return <p className="text-muted-foreground text-sm">{t("unavailable")}</p>;
  }

  const change = (byDefault: boolean) => {
    startTransition(async () => {
      const exit = await update({
        params: { workspaceId },
        payload: { byDefault },
        reactivityKeys: shortLinksChanged(workspaceId),
      });

      if (Exit.isSuccess(exit)) {
        toast.success(t("saved"));
      } else {
        toast.error(t("saveFailed"));
      }
    });
  };

  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        checked={status.value.byDefault}
        disabled={!mayChange || isPending}
        aria-describedby={`${id}-hint`}
        onCheckedChange={change}
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{t("label")}</Label>
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {mayChange ? t("hint") : t("readOnly")}
        </p>
      </div>
    </div>
  );
};
