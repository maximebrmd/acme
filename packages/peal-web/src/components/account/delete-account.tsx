"use client";

import { useAtomSet } from "@effect/atom-react";
import { Cause, Exit, Option } from "effect";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
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
import { useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { authClient } from "#auth/client.ts";
import { FormField } from "#components/auth/form-field.tsx";
import { SettingsError } from "#components/settings/settings-error.tsx";
import { Link, useRouter } from "#i18n/navigation.ts";
import { deleteAccount } from "#settings/atoms.ts";
import { apiErrorKey } from "#settings/errors.ts";
import type { SettingsErrorKey } from "#settings/errors.ts";

interface Workspace {
  readonly id: string;
  readonly name: string;
}

// The workspaces that keep the account from closing: each needs another
// owner first, which their members page gives.
export const LastOwnerOf = ({
  workspaces,
}: {
  readonly workspaces: readonly Workspace[];
}) => {
  const t = useTranslations("AccountSettings.delete");

  return (
    <Alert variant="destructive">
      <AlertTitle>{t("lastOwnerTitle")}</AlertTitle>
      <AlertDescription>
        <span className="flex flex-col gap-2">
          {t("lastOwnerDescription")}
          <ul className="list-disc pl-5">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                <Link
                  href={`/app/${workspace.id}/settings/members`}
                  className="underline underline-offset-4"
                >
                  {workspace.name}
                </Link>
              </li>
            ))}
          </ul>
        </span>
      </AlertDescription>
    </Alert>
  );
};

/**
 * The right to erasure: deletes the account once its password confirms it,
 * then signs out. The server refuses while the user alone owns a workspace
 * others use, which the dialog lists.
 */
export const DeleteAccount = () => {
  const t = useTranslations("AccountSettings.delete");
  const fields = useTranslations("Auth");
  const settings = useTranslations("Settings");
  const router = useRouter();
  const remove = useAtomSet(deleteAccount, { mode: "promiseExit" });
  const [password, setPassword] = useState("");
  const [error, setError] = useState<SettingsErrorKey | null>(null);
  const [owned, setOwned] = useState<readonly Workspace[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPassword("");
      setError(null);
      setOwned([]);
    }
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const exit = await remove({ payload: { password } });

      if (Exit.isSuccess(exit)) {
        // The session went with the account: this clears its cookies.
        await authClient.signOut();
        toast.success(t("deleted"));
        router.push("/");
        router.refresh();

        return;
      }

      const failure = Cause.findErrorOption(exit.cause);

      setOwned(
        Option.match(failure, {
          onNone: () => [],
          onSome: (found) =>
            found._tag === "LastOwner" ? found.workspaces : [],
        })
      );
      setError(Option.getOrElse(apiErrorKey(exit), () => "unknown"));
    });
  };

  return (
    <AlertDialog onOpenChange={handleOpenChange}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        {t("open")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {owned.length > 0 ? (
            <LastOwnerOf workspaces={owned} />
          ) : (
            <SettingsError error={error} />
          )}
          <FormField
            id="delete-account-password"
            type="password"
            autoComplete="current-password"
            label={fields("password")}
            value={password}
            onChange={setPassword}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {settings("cancel")}
            </AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending || password === ""}
              focusableWhenDisabled
            >
              {isPending ? t("deleting") : t("confirm")}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
