"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type {
  NotificationPreferences,
  NotificationPreferencesChange,
} from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import { Skeleton } from "peal-ui/components/skeleton";
import { useId, useTransition } from "react";
import { toast } from "sonner";

import { useHydrated } from "#components/media/use-hydrated.ts";
import {
  changeNotificationPreferences,
  notificationPreferences,
  preferencesKeys,
} from "#notices/atoms.ts";

type EmailKind = keyof NotificationPreferences["email"];

// Most pressing first: what needs the reader, then what went as planned.
const kinds: readonly EmailKind[] = [
  "postFailed",
  "postUnconfirmed",
  "postReview",
  "recyclingEnded",
  "feedStopped",
  "channelReconnect",
  "comments",
  "webhookFailing",
  "postPublished",
];

const PreferenceRow = ({
  checked,
  disabled,
  hint,
  label,
  onChange,
}: {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly hint?: string;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
}) => {
  const id = useId();
  const hintId = useId();

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        {...(hint === undefined ? {} : { "aria-describedby": hintId })}
        onCheckedChange={onChange}
      />
      <Label htmlFor={id}>{label}</Label>
      {hint === undefined ? null : (
        <p id={hintId} className="text-muted-foreground basis-full text-xs">
          {hint}
        </p>
      )}
    </div>
  );
};

/**
 * The email choices, one box per kind of notice, then whether the user
 * hears about every post or only theirs. Each change is saved at once,
 * alone, so two changed in quick succession both stay.
 */
export const PreferencesFields = ({
  onChange,
  preferences,
  saving,
}: {
  readonly onChange: (change: NotificationPreferencesChange) => void;
  readonly preferences: NotificationPreferences;
  readonly saving: boolean;
}) => {
  const t = useTranslations("Notices.preferences");

  return (
    <div className="flex flex-col gap-8" aria-busy={saving}>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-medium">{t("legend")}</legend>
        {kinds.map((kind) => (
          <PreferenceRow
            key={kind}
            label={t(kind)}
            checked={preferences.email[kind]}
            disabled={saving}
            onChange={(checked) => {
              onChange({ email: { [kind]: checked } });
            }}
          />
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-medium">{t("postsLegend")}</legend>
        <PreferenceRow
          label={t("everyPost")}
          hint={t("everyPostHint")}
          checked={preferences.everyPost}
          disabled={saving}
          onChange={(checked) => {
            onChange({ everyPost: checked });
          }}
        />
      </fieldset>
    </div>
  );
};

const LoadedPreferences = () => {
  const t = useTranslations("Notices.preferences");
  const result = useAtomValue(notificationPreferences);
  const reload = useAtomRefresh(notificationPreferences);

  const change = useAtomSet(changeNotificationPreferences, {
    mode: "promiseExit",
  });

  const [saving, startSaving] = useTransition();

  const handleChange = (payload: NotificationPreferencesChange) => {
    startSaving(async () => {
      const exit = await change({
        payload,
        reactivityKeys: preferencesKeys,
      });

      if (Exit.isSuccess(exit)) {
        toast.success(t("saved"));
      } else {
        toast.error(t("saveFailed"));
      }
    });
  };

  return AsyncResult.match(result, {
    onFailure: () => (
      <Alert variant="destructive">
        <AlertDescription>
          <span className="flex flex-wrap items-center justify-between gap-2">
            {t("loadFailed")}
            <Button variant="outline" size="sm" onClick={reload}>
              {t("reload")}
            </Button>
          </span>
        </AlertDescription>
      </Alert>
    ),
    onInitial: () => (
      <div aria-busy className="flex flex-col gap-3">
        <span className="sr-only">{t("loading")}</span>
        <Skeleton className="h-28" />
      </div>
    ),
    onSuccess: ({ value }) => (
      <PreferencesFields
        preferences={value}
        saving={saving}
        onChange={handleChange}
      />
    ),
  });
};

/** The user's email preferences, read and saved with their cookies. */
export const NotificationPreferencesForm = () => {
  const t = useTranslations("Notices.preferences");
  const hydrated = useHydrated();

  return hydrated ? (
    <LoadedPreferences />
  ) : (
    <div aria-busy>
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-28" />
    </div>
  );
};
