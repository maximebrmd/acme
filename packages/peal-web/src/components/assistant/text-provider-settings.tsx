"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { TextProvider } from "peal-contract";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  removeTextProvider,
  setTextProvider,
  testTextProvider,
  textProviderChanged,
  workspaceTextProvider,
} from "#assistant/atoms.ts";
import {
  changeOf,
  draftOf,
  providerErrorKey,
  testFailureKey,
} from "#assistant/text-provider.ts";
import type {
  TextProviderErrorKey,
  TextProviderFailure,
  TextProviderTestFailure,
} from "#assistant/text-provider.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import {
  SettingsLoadFailed,
  SettingsLoading,
} from "#components/settings/settings-status.tsx";
import { failureOf } from "#posts/outcome.ts";

import { TextProviderFormView } from "./text-provider-views.tsx";
import type { TestState } from "./text-provider-views.tsx";

const unexpected = (): TextProviderFailure => ({ _tag: "Unexpected" });

const unexpectedTest = (): TextProviderTestFailure => ({ _tag: "Unexpected" });

const idle: TestState = { _tag: "idle" };

// The form, for the provider the workspace has now; saving or removing
// reads it again, with the assistant's status.
const ProviderForm = ({
  saved,
  workspaceId,
}: {
  readonly saved: TextProvider | null;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Assistant.textProvider");
  const save = useAtomSet(setTextProvider, { mode: "promiseExit" });
  const remove = useAtomSet(removeTextProvider, { mode: "promiseExit" });
  const check = useAtomSet(testTextProvider, { mode: "promiseExit" });
  const [draft, setDraft] = useState(() => draftOf(saved));
  const [error, setError] = useState<TextProviderErrorKey | null>(null);
  const [test, setTest] = useState<TestState>(idle);
  const [saving, startSaving] = useTransition();
  const [removing, startRemoving] = useTransition();
  const [testing, startTesting] = useTransition();
  const params = { workspaceId };
  const reactivityKeys = textProviderChanged(workspaceId);

  const failed = (exit: Exit.Exit<unknown, TextProviderFailure>) => {
    setError(providerErrorKey(Option.getOrElse(failureOf(exit), unexpected)));
  };

  return (
    <TextProviderFormView
      draft={draft}
      error={error}
      removing={removing}
      saved={saved}
      saving={saving}
      test={test}
      testing={testing}
      onChange={(next) => {
        setDraft(next);
        setError(null);
        setTest(idle);
      }}
      onRemove={() => {
        setError(null);
        setTest(idle);
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
        setTest(idle);
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
      onTest={() => {
        setError(null);
        setTest(idle);
        startTesting(async () => {
          const exit = await check({ params });

          setTest(
            Exit.isSuccess(exit)
              ? { _tag: "passed" }
              : {
                  _tag: "failed",
                  key: testFailureKey(
                    Option.getOrElse(failureOf(exit), unexpectedTest)
                  ),
                }
          );
        });
      }}
    />
  );
};

/**
 * The workspace's own text provider, read with the visitor's cookies once
 * the page has hydrated; for members with assistant:configure.
 */
export const TextProviderSettings = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const hydrated = useHydrated();
  const result = useAtomValue(workspaceTextProvider(workspaceId));
  const refresh = useAtomRefresh(workspaceTextProvider(workspaceId));

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
          : `${saved.kind}@${saved.baseUrl}@${saved.updatedAt.toString()}`
      }
      saved={saved}
      workspaceId={workspaceId}
    />
  );
};
