"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { ImageProvider } from "peal-contract";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  imageProviderChanged,
  removeImageProvider,
  setImageProvider,
  workspaceImageProvider,
} from "#assistant/atoms.ts";
import {
  changeOf,
  draftOf,
  providerErrorKey,
} from "#assistant/image-provider.ts";
import type {
  ImageProviderErrorKey,
  ImageProviderFailure,
} from "#assistant/image-provider.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import {
  SettingsLoadFailed,
  SettingsLoading,
} from "#components/settings/settings-status.tsx";
import { failureOf } from "#posts/outcome.ts";

import { ImageProviderFormView } from "./image-provider-views.tsx";

const unexpected = (): ImageProviderFailure => ({ _tag: "Unexpected" });

// The form, for the provider the workspace has now; saving or removing
// reads it again, with the assistant's status.
const ProviderForm = ({
  saved,
  workspaceId,
}: {
  readonly saved: ImageProvider | null;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Assistant.provider");
  const save = useAtomSet(setImageProvider, { mode: "promiseExit" });
  const remove = useAtomSet(removeImageProvider, { mode: "promiseExit" });
  const [draft, setDraft] = useState(() => draftOf(saved));
  const [error, setError] = useState<ImageProviderErrorKey | null>(null);
  const [saving, startSaving] = useTransition();
  const [removing, startRemoving] = useTransition();
  const params = { workspaceId };
  const reactivityKeys = imageProviderChanged(workspaceId);

  const failed = (exit: Exit.Exit<unknown, ImageProviderFailure>) => {
    setError(providerErrorKey(Option.getOrElse(failureOf(exit), unexpected)));
  };

  return (
    <ImageProviderFormView
      draft={draft}
      error={error}
      removing={removing}
      saved={saved}
      saving={saving}
      onChange={(next) => {
        setDraft(next);
        setError(null);
      }}
      onRemove={() => {
        setError(null);
        startRemoving(async () => {
          const exit = await remove({ params, reactivityKeys });

          if (Exit.isSuccess(exit)) {
            setDraft(draftOf(null));
            toast.success(t("removed"));

            return;
          }

          failed(exit);
        });
      }}
      onSave={() => {
        setError(null);
        startSaving(async () => {
          const exit = await save({
            params,
            payload: changeOf(draft),
            reactivityKeys,
          });

          if (Exit.isSuccess(exit)) {
            // The key is never kept in the page once saved.
            setDraft(draftOf(exit.value));
            toast.success(t("saved"));

            return;
          }

          failed(exit);
        });
      }}
    />
  );
};

/**
 * The workspace's own image provider, read with the visitor's cookies
 * once the page has hydrated; for members with assistant:configure.
 */
export const ImageProviderSettings = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const hydrated = useHydrated();
  const result = useAtomValue(workspaceImageProvider(workspaceId));
  const refresh = useAtomRefresh(workspaceImageProvider(workspaceId));

  if (!hydrated) {
    return <SettingsLoading />;
  }

  if (AsyncResult.isFailure(result)) {
    return <SettingsLoadFailed onRetry={refresh} />;
  }

  if (!AsyncResult.isSuccess(result)) {
    return <SettingsLoading />;
  }

  const saved = result.value.provider;

  // A new form for each saved state, so it starts from what was saved.
  return (
    <ProviderForm
      key={
        saved === null
          ? "none"
          : `${saved.baseUrl}@${saved.updatedAt.toString()}`
      }
      saved={saved}
      workspaceId={workspaceId}
    />
  );
};
