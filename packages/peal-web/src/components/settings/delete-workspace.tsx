"use client";

import { useAtomSet } from "@effect/atom-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "peal-ui/components/alert-dialog";
import { Button } from "peal-ui/components/button";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { Option } from "effect";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";

import { useRouter } from "#i18n/navigation.ts";
import { deleteWorkspace } from "#settings/atoms.ts";
import { apiErrorKey } from "#settings/errors.ts";
import type { SettingsErrorKey } from "#settings/errors.ts";

import { SettingsError } from "./settings-error.tsx";

// Deletes the workspace, for good, once its name is typed again: the
// confirmation stays open while it runs, and tells why it failed.
export const DeleteWorkspace = ({
  name,
  workspaceId,
}: {
  readonly name: string;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.delete");
  const settings = useTranslations("Settings");
  const router = useRouter();
  const inputId = useId();
  const remove = useAtomSet(deleteWorkspace, { mode: "promiseExit" });
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<SettingsErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const confirmed = typed.trim() === name.trim();

  const handleTyped = (event: ChangeEvent<HTMLInputElement>) => {
    setTyped(event.target.value);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTyped("");
      setError(null);
    }
  };

  const handleDelete = () => {
    startTransition(async () => {
      const exit = await remove({
        params: { workspaceId },
        payload: { name: typed },
      });

      Option.match(apiErrorKey(exit), {
        onNone: () => {
          toast.success(t("deleted", { name }));
          router.push("/app");
          router.refresh();
        },
        onSome: setError,
      });
    });
  };

  return (
    <AlertDialog onOpenChange={handleOpenChange}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        {t("open")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirmTitle", { name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("confirmDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <SettingsError error={error} />
        <div className="flex flex-col gap-2">
          <Label htmlFor={inputId}>{t("typeName", { name })}</Label>
          <Input
            id={inputId}
            autoComplete="off"
            value={typed}
            onChange={handleTyped}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {settings("cancel")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!confirmed || isPending}
            focusableWhenDisabled
            onClick={handleDelete}
          >
            {isPending ? t("deleting") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
