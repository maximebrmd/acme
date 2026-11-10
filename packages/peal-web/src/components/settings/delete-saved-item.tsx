"use client";

import type { Exit } from "effect";
import { Option } from "effect";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "peal-ui/components/alert-dialog";
import { Button } from "peal-ui/components/button";
import { useTransition } from "react";
import { toast } from "sonner";

import { useSavedItemErrorText } from "#components/settings/saved-item-error.tsx";
import type { SavedItemKind } from "#components/settings/saved-item-error.tsx";
import { savedItemErrorOf } from "#settings/saved-item-error.ts";

/**
 * Deletes a tag, a signature or a channel set, once the member confirmed
 * in a dialog that says what its posts keep.
 */
export const DeleteSavedItem = ({
  deleted,
  describedBy,
  description,
  kind,
  remove,
  title,
}: {
  /** What to say once it is gone. */
  readonly deleted: string;
  /** The id of the item's name, which names the button. */
  readonly describedBy: string;
  /** What deleting it does, and leaves. */
  readonly description: string;
  readonly kind: SavedItemKind;
  readonly remove: () => Promise<Exit.Exit<unknown, { readonly _tag: string }>>;
  /** The dialog's question, naming the item. */
  readonly title: string;
}) => {
  const t = useTranslations("SavedItems");
  const settings = useTranslations("Settings");
  const explain = useSavedItemErrorText(kind);
  const [isDeleting, startDeleting] = useTransition();

  const handleDelete = () => {
    startDeleting(async () => {
      Option.match(savedItemErrorOf(await remove()), {
        onNone: () => {
          toast.success(deleted);
        },
        onSome: (error) => {
          toast.error(explain(error));
        },
      });
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            focusableWhenDisabled
            aria-describedby={describedBy}
          />
        }
      >
        {isDeleting ? t("deleting") : t("delete")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{settings("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            {t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
