"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import type { Exit } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { RecyclingRule } from "peal-contract";
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

import { useHydrated } from "#components/media/use-hydrated.ts";
import {
  SettingsLoadFailed,
  SettingsLoading,
} from "#components/settings/settings-status.tsx";
import { Link } from "#i18n/navigation.ts";
import {
  resumeRule,
  rulesChanged,
  stopRule,
  updateRule,
  workspaceRules,
} from "#recycling/atoms.ts";
import { ruleErrorOf } from "#recycling/rule-error.ts";
import { isResumable } from "#recycling/rules.ts";

import { RuleItemView } from "./recycling-views.tsx";
import { useRuleErrorText } from "./rule-error-text.ts";

// What a change answered: said in a toast, the refusal explained.
const useAnswered = () => {
  const explain = useRuleErrorText();

  return (
    exit: Exit.Exit<unknown, { readonly _tag: string }>,
    done: string
  ) => {
    Option.match(ruleErrorOf(exit), {
      onNone: () => {
        toast.success(done);
      },
      onSome: (error) => {
        toast.error(explain(error));
      },
    });
  };
};

// A rule's pause, resume and stop, for those who may change it.
const RuleActions = ({
  rule,
  workspaceId,
}: {
  readonly rule: RecyclingRule;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Recycling");
  const update = useAtomSet(updateRule, { mode: "promiseExit" });
  const resume = useAtomSet(resumeRule, { mode: "promiseExit" });
  const stop = useAtomSet(stopRule, { mode: "promiseExit" });
  const answered = useAnswered();
  const [busy, start] = useTransition();
  const params = { ruleId: rule.id, workspaceId };
  const reactivityKeys = rulesChanged(workspaceId);

  return (
    <>
      {rule.status === "active" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => {
            start(async () => {
              answered(
                await update({
                  params,
                  payload: { paused: true },
                  reactivityKeys,
                }),
                t("paused")
              );
            });
          }}
        >
          {t("pause")}
        </Button>
      ) : null}
      {isResumable(rule) ? (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => {
            start(async () => {
              answered(
                await resume({ params, payload: {}, reactivityKeys }),
                t("resumed")
              );
            });
          }}
        >
          {t("resume")}
        </Button>
      ) : null}
      {rule.status === "ended" ? null : (
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="outline" size="sm" disabled={busy} />}
          >
            {t("stop")}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("stop")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("stopConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("form.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  start(async () => {
                    answered(
                      await stop({ params, reactivityKeys }),
                      t("stopped")
                    );
                  });
                }}
              >
                {t("stop")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

const RuleList = ({
  highlighted,
  mayChange,
  workspaceId,
}: {
  readonly highlighted: string | null;
  readonly mayChange: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Recycling");
  const query = workspaceRules(workspaceId);
  const result = useAtomValue(query);
  const retry = useAtomRefresh(query);

  if (AsyncResult.isFailure(result)) {
    return <SettingsLoadFailed onRetry={retry} />;
  }

  if (!AsyncResult.isSuccess(result)) {
    return <SettingsLoading />;
  }

  const rules = result.value.items;

  return rules.length === 0 ? (
    <p className="text-muted-foreground">{t("empty")}</p>
  ) : (
    <ul className="divide-y">
      {rules.map((rule) => (
        <RuleItemView
          key={rule.id}
          highlighted={rule.id === highlighted}
          rule={rule}
          source={
            <Link
              href={`/app/${workspaceId}/posts/${rule.sourcePostId}`}
              className="underline underline-offset-4"
            >
              {t("source")}
            </Link>
          }
          actions={
            mayChange ? (
              <RuleActions rule={rule} workspaceId={workspaceId} />
            ) : null
          }
        />
      ))}
    </ul>
  );
};

/** The workspace's recycling rules, read once the page has hydrated. */
export const RecyclingSettings = (props: {
  readonly highlighted: string | null;
  readonly mayChange: boolean;
  readonly workspaceId: string;
}) => (useHydrated() ? <RuleList {...props} /> : <SettingsLoading />);
