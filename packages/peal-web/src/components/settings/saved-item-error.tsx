"use client";

import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";

import type { SavedItemError } from "#settings/saved-item-error.ts";

/** What a workspace keeps for its posts: what an error is about. */
export type SavedItemKind = "channelSet" | "queue" | "signature" | "tag";

/** Writes why a change to a tag, a signature or a channel set failed. */
export const useSavedItemErrorText = (kind: SavedItemKind) => {
  const t = useTranslations("SavedItems.errors");

  return (error: SavedItemError): string =>
    error.key === "tooMany"
      ? t("tooMany", { allowed: error.allowed, kind })
      : t(error.key, { kind });
};

/** Why the last action on a form failed, announced when it appears. */
export const SavedItemErrorAlert = ({
  error,
  kind,
}: {
  readonly error: SavedItemError | null;
  readonly kind: SavedItemKind;
}) => {
  const explain = useSavedItemErrorText(kind);

  return error === null ? null : (
    <Alert variant="destructive">
      <AlertDescription>{explain(error)}</AlertDescription>
    </Alert>
  );
};
