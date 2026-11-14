"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import type { Exit } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { FollowUpRule } from "peal-contract";
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
import {
  approveFollowUp,
  followUpsChanged,
  stopFollowUp,
  updateFollowUp,
  workspaceFollowUps,
} from "#follow-ups/atoms.ts";
import { followUpErrorOf } from "#follow-ups/follow-up-error.ts";
import { Link } from "#i18n/navigation.ts";

import { useFollowUpErrorText } from "./follow-up-error-text.ts";
import { FollowUpRuleView } from "./follow-up-views.tsx";

// What a change answered: said in a toast, the refusal explained.
const useAnswered = () => {
  const explain = useFollowUpErrorText();

  return (
    exit: Exit.Exit<unknown, { readonly _tag: string }>,
    done: string
  ) => {
    Option.match(followUpErrorOf(exit), {
      onNone: () => {
        toast.success(done);
      },
      onSome: (error) => {
        toast.error(explain(error));
      },
    });
  };
};

// A rule's pause, resume, approval and stop, for those who may.
const RuleActions = ({
  mayApprove,
  rule,
  workspaceId,
}: {
  readonly mayApprove: boolean;
  readonly rule: FollowUpRule;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("FollowUps");
  const update = useAtomSet(updateFollowUp, { mode: "promiseExit" });
  const approve = useAtomSet(approveFollowUp, { mode: "promiseExit" });
  const stop = useAtomSet(stopFollowUp, { mode: "promiseExit" });
  const answered = useAnswered();
  const [busy, start] = useTransition();
  const params = { ruleId: rule.id, workspaceId };
  const reactivityKeys = followUpsChanged(workspaceId);

  if (rule.status === "ended") {
    return null;
  }

  return (
    <>
      {mayApprove && rule.approval === "pending" ? (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => {
            start(async () => {
              answered(
                await approve({ params, reactivityKeys }),
                t("approved")
              );
            });
          }}
        >
          {t("approve")}
        </Button>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => {
          const paused = rule.status === "active";

          start(async () => {
            answered(
              await update({ params, payload: { paused }, reactivityKeys }),
              paused ? t("paused") : t("resumed")
            );
          });
        }}
      >
        {rule.status === "active" ? t("pause") : t("resume")}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="outline" size="sm" disabled={busy} />}
        >
          {t("stop")}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("stop")}</AlertDialogTitle>
            <AlertDialogDescription>{t("stopConfirm")}</AlertDialogDescription>
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
    </>
  );
};

const RuleList = ({
  highlighted,
  mayApprove,
  mayChange,
  workspaceId,
}: {
  readonly highlighted: string | null;
  readonly mayApprove: boolean;
  readonly mayChange: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("FollowUps");
  const query = workspaceFollowUps(workspaceId);
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
        <FollowUpRuleView
          key={rule.id}
          highlighted={rule.id === highlighted}
          rule={rule}
          scope={
            rule.postId === null ? (
              t("onChannel")
            ) : (
              <Link
                href={`/app/${workspaceId}/posts/${rule.postId}`}
                className="underline underline-offset-4"
              >
                {t("post")}
              </Link>
            )
          }
          actions={
            mayChange ? (
              <RuleActions
                mayApprove={mayApprove}
                rule={rule}
                workspaceId={workspaceId}
              />
            ) : null
          }
        />
      ))}
    </ul>
  );
};

/** The workspace's follow-up rules, read once the page has hydrated. */
export const FollowUpsSettings = (props: {
  readonly highlighted: string | null;
  readonly mayApprove: boolean;
  readonly mayChange: boolean;
  readonly workspaceId: string;
}) => (useHydrated() ? <RuleList {...props} /> : <SettingsLoading />);
