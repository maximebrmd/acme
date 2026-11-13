"use client";

import { DateTime, Schema } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import {
  maxImageProviderAddressLength,
  maxImageProviderKeyLength,
  maxImageProviderModelLength,
  ownTextRequestsPerDay,
  TextProviderKindSchema,
} from "peal-contract";
import type { TextProvider } from "peal-contract";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { useId } from "react";

import { isSavable, keyNeeded, kindChanged } from "#assistant/text-provider.ts";
import type {
  TextProviderDraft,
  TextProviderErrorKey,
  TextProviderTestKey,
} from "#assistant/text-provider.ts";

const isKind = Schema.is(TextProviderKindSchema);

// Each API's name, as the menu lists it.
const kindKeys = {
  anthropic: "kindAnthropic",
  "openai-compatible": "kindOpenAiCompatible",
} as const;

/** Where the last test of the provider stands. */
export type TestState =
  | { readonly _tag: "failed"; readonly key: TextProviderTestKey }
  | { readonly _tag: "idle" }
  | { readonly _tag: "passed" };

export interface TextProviderFormViewProps {
  readonly draft: TextProviderDraft;
  /** Why the last save or removal failed, if it did. */
  readonly error: TextProviderErrorKey | null;
  readonly onChange: (draft: TextProviderDraft) => void;
  readonly onRemove: () => void;
  readonly onSave: () => void;
  readonly onTest: () => void;
  readonly removing: boolean;
  /** The provider the workspace has now, or null. */
  readonly saved: TextProvider | null;
  readonly saving: boolean;
  readonly test: TestState;
  readonly testing: boolean;
}

// What the last save, removal or test ended with, read out as it changes.
const Outcome = ({
  error,
  test,
}: {
  readonly error: TextProviderErrorKey | null;
  readonly test: TestState;
}) => {
  const t = useTranslations("Assistant.textProvider");

  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      {error === null ? null : (
        <Alert variant="destructive">
          <AlertTitle>{t(`errors.${error}`)}</AlertTitle>
        </Alert>
      )}
      {test._tag === "failed" ? (
        <Alert variant="destructive">
          <AlertTitle>{t(`testErrors.${test.key}`)}</AlertTitle>
        </Alert>
      ) : null}
      {test._tag === "passed" ? (
        <Alert>
          <AlertTitle>{t("tested")}</AlertTitle>
        </Alert>
      ) : null}
    </div>
  );
};

// Save, and for a saved provider, test it or remove it (which asks first).
const Actions = ({
  busy,
  onRemove,
  onTest,
  removing,
  savable,
  saved,
  saving,
  testHintId,
  testing,
}: {
  readonly busy: boolean;
  readonly onRemove: () => void;
  readonly onTest: () => void;
  readonly removing: boolean;
  readonly savable: boolean;
  readonly saved: boolean;
  readonly saving: boolean;
  readonly testHintId: string;
  readonly testing: boolean;
}) => {
  const t = useTranslations("Assistant.textProvider");

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={busy || !savable}>
        {saving ? t("saving") : t("save")}
      </Button>
      {saved ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          aria-describedby={testHintId}
          onClick={onTest}
        >
          {testing ? t("testing") : t("test")}
        </Button>
      ) : null}
      {saved ? (
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button type="button" variant="outline" disabled={busy} />}
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
      ) : null}
    </div>
  );
};

/**
 * The workspace's own text provider: the API it speaks, its address
 * (Anthropic's, filled in, for Anthropic), its model and its key, in a
 * password field. A saved key shows as set, never its value, and is kept
 * unless typed again; one that can no longer be read, or an address moved,
 * asks for it again. The text before the button says where the drafts go,
 * what they cost and that the key is kept encrypted. **Test** sends the
 * saved provider one request and says how it ended; removing asks first.
 */
export const TextProviderFormView = ({
  draft,
  error,
  onChange,
  onRemove,
  onSave,
  onTest,
  removing,
  saved,
  saving,
  test,
  testing,
}: TextProviderFormViewProps) => {
  const t = useTranslations("Assistant.textProvider");
  const format = useFormatter();
  const ids = useId();
  const busy = saving || removing || testing;
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
              { dateStyle: "medium", timeStyle: "short" }
            ),
          })}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <Label id={`${ids}-kind`}>{t("kind")}</Label>
        <Select
          value={draft.kind}
          disabled={busy}
          onValueChange={(kind) => {
            if (isKind(kind)) {
              onChange(kindChanged(draft, kind));
            }
          }}
        >
          <SelectTrigger
            aria-labelledby={`${ids}-kind`}
            aria-describedby={`${ids}-kind-hint`}
          >
            <SelectValue>{t(kindKeys[draft.kind])}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TextProviderKindSchema.literals.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {t(kindKeys[kind])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p id={`${ids}-kind-hint`} className="text-muted-foreground text-sm">
          {t("kindHint")}
        </p>
      </div>
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
          {t("baseUrlHint", { kind: draft.kind })}
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
      <p className="text-sm">
        {t("notice", { dailyLimit: ownTextRequestsPerDay })}
      </p>
      <Outcome error={error} test={test} />
      <Actions
        busy={busy}
        removing={removing}
        savable={isSavable(draft, saved)}
        saved={saved !== null}
        saving={saving}
        testHintId={`${ids}-test-hint`}
        testing={testing}
        onRemove={onRemove}
        onTest={onTest}
      />
      {saved === null ? null : (
        <p id={`${ids}-test-hint`} className="text-muted-foreground text-sm">
          {t("testHint")}
        </p>
      )}
    </form>
  );
};
