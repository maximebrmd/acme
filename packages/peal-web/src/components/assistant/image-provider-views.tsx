"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import {
  maxImageProviderAddressLength,
  maxImageProviderKeyLength,
  maxImageProviderModelLength,
} from "peal-contract";
import type { ImageProvider } from "peal-contract";
import { Alert, AlertTitle } from "peal-ui/components/alert";
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
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { useId } from "react";

import { isSavable, keyNeeded } from "#assistant/image-provider.ts";
import type {
  ImageProviderDraft,
  ImageProviderErrorKey,
} from "#assistant/image-provider.ts";

export interface ImageProviderFormViewProps {
  readonly draft: ImageProviderDraft;
  /** Why the last save or removal failed, if it did. */
  readonly error: ImageProviderErrorKey | null;
  readonly onChange: (draft: ImageProviderDraft) => void;
  readonly onRemove: () => void;
  readonly onSave: () => void;
  readonly removing: boolean;
  /** The provider the workspace has now, or null. */
  readonly saved: ImageProvider | null;
  readonly saving: boolean;
}

/**
 * The workspace's own image provider: its address, its model and its key,
 * in a password field. A saved key shows as set, never its value, and is
 * kept unless typed again; one that can no longer be read, or an address
 * moved to another origin, asks for it again. The text before the button
 * says where the prompts go, what the images cost and that the key is
 * kept encrypted. Removing asks first.
 */
export const ImageProviderFormView = ({
  draft,
  error,
  onChange,
  onRemove,
  onSave,
  removing,
  saved,
  saving,
}: ImageProviderFormViewProps) => {
  const t = useTranslations("Assistant.provider");
  const format = useFormatter();
  const ids = useId();
  const busy = saving || removing;
  const needed = keyNeeded(draft, saved);

  // What the key's field says beneath it.
  const keyHint = needed === null || needed === "noKey" ? null : t(needed);

  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (isSavable(draft, saved) && !busy) {
          onSave();
        }
      }}
    >
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      <p className="text-muted-foreground">{t("description")}</p>
      {saved === null ? (
        <p className="text-sm">{t("none")}</p>
      ) : (
        <p className="text-muted-foreground text-sm">
          {t("updatedAt", {
            updatedAt: format.dateTime(
              DateTime.toEpochMillis(saved.updatedAt),
              {
                dateStyle: "medium",
                timeStyle: "short",
              }
            ),
          })}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${ids}-base-url`}>{t("baseUrl")}</Label>
        <Input
          id={`${ids}-base-url`}
          name="baseUrl"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          required
          maxLength={maxImageProviderAddressLength}
          value={draft.baseUrl}
          disabled={busy}
          aria-describedby={`${ids}-base-url-hint`}
          onChange={(event) => {
            onChange({ ...draft, baseUrl: event.target.value });
          }}
        />
        <p
          id={`${ids}-base-url-hint`}
          className="text-muted-foreground text-sm"
        >
          {t("baseUrlHint")}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${ids}-model`}>{t("model")}</Label>
        <Input
          id={`${ids}-model`}
          name="model"
          type="text"
          autoComplete="off"
          spellCheck={false}
          required
          maxLength={maxImageProviderModelLength}
          value={draft.model}
          disabled={busy}
          aria-describedby={`${ids}-model-hint`}
          onChange={(event) => {
            onChange({ ...draft, model: event.target.value });
          }}
        />
        <p id={`${ids}-model-hint`} className="text-muted-foreground text-sm">
          {t("modelHint")}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${ids}-key`}>{t("apiKey")}</Label>
        <Input
          id={`${ids}-key`}
          name="apiKey"
          type="password"
          autoComplete="off"
          spellCheck={false}
          required={needed !== null}
          maxLength={maxImageProviderKeyLength}
          value={draft.apiKey}
          placeholder={
            saved !== null && needed === null ? t("apiKeySaved") : undefined
          }
          disabled={busy}
          aria-describedby={`${ids}-key-hint`}
          onChange={(event) => {
            onChange({ ...draft, apiKey: event.target.value });
          }}
        />
        <p id={`${ids}-key-hint`} className="text-muted-foreground text-sm">
          {saved !== null && needed === null ? t("apiKeySet") : t("apiKeyHint")}
        </p>
        {keyHint === null ? null : (
          <p className="text-destructive text-sm">{keyHint}</p>
        )}
      </div>
      <p className="text-sm">{t("notice")}</p>
      <div aria-live="polite">
        {error === null ? null : (
          <Alert variant="destructive">
            <AlertTitle>{t(`errors.${error}`)}</AlertTitle>
          </Alert>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || !isSavable(draft, saved)}>
          {saving ? t("saving") : t("save")}
        </Button>
        {saved === null ? null : (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button type="button" variant="outline" disabled={busy} />
              }
            >
              {removing ? t("removing") : t("remove")}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("removeTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("removeDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={onRemove}>
                  {t("removeConfirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  );
};
