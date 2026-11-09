"use client";

import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import { useTranslations } from "next-intl";
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
import { useId, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";

import { Link, useRouter } from "#i18n/navigation.ts";
import { deleteWorkspace } from "#settings/atoms.ts";
import { apiErrorKey, subscriptionsToCancel } from "#settings/errors.ts";
import type {
  SettingsErrorKey,
  SubscriptionToCancel,
} from "#settings/errors.ts";

import { SettingsError } from "./settings-error.tsx";
import { SubscriptionCancellation } from "./subscription-cancellation.tsx";

// Deletes the workspace, for good, once its name is typed again: the
// confirmation stays open while it runs, and tells why it failed. A
// workspace Stripe may still bill is refused first with what cancelling
// ends; the owner then agrees, and the deletion cancels it.
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

  const [subscriptions, setSubscriptions] = useState<
    Option.Option<readonly SubscriptionToCancel[]>
  >(Option.none());

  const [agreed, setAgreed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const confirmed =
    typed.trim() === name.trim() && (Option.isNone(subscriptions) || agreed);

  const handleTyped = (event: ChangeEvent<HTMLInputElement>) => {
    setTyped(event.target.value);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTyped("");
      setError(null);
      setSubscriptions(Option.none());
      setAgreed(false);
    }
  };

  const handleDelete = () => {
    startTransition(async () => {
      const exit = await remove({
        params: { workspaceId },
        payload: { cancelSubscriptions: agreed, name: typed },
      });

      const toCancel = subscriptionsToCancel(exit);

      if (Option.isSome(toCancel)) {
        setSubscriptions(toCancel);
        setError(null);

        return;
      }

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
        {Option.isSome(subscriptions) ? (
          <SubscriptionCancellation
            agreed={agreed}
            onAgreedChange={setAgreed}
            subscriptions={subscriptions.value}
            billingLink={(billed) => (
              <Link
                href={`/app/${billed}/billing`}
                className="underline underline-offset-4"
              >
                {t("billingPage")}
              </Link>
            )}
          />
        ) : null}
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
