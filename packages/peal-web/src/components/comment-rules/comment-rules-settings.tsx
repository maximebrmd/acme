"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Cause, Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { CommentRule } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  commentRulesChanged,
  startCommentRule,
  stopCommentRule,
  updateCommentRule,
  workspaceCommentRules,
} from "#comment-rules/atoms.ts";
import {
  commentRuleRequestOf,
  freshCommentRule,
} from "#comment-rules/rules.ts";
import type { CommentRuleDraft } from "#comment-rules/rules.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import {
  SettingsLoadFailed,
  SettingsLoading,
} from "#components/settings/settings-status.tsx";
import { workspaceChannels } from "#posts/api.ts";

import { CommentRuleFormView, CommentRuleView } from "./comment-rule-views.tsx";

// The error tag a call ended with, or none if it worked.
const failureOf = (exit: Exit.Exit<unknown, { readonly _tag: string }>) =>
  Exit.isSuccess(exit)
    ? Option.none<string>()
    : Option.some(
        Cause.findErrorOption(exit.cause).pipe(
          Option.map(({ _tag }) => _tag),
          Option.getOrElse(() => "unknown")
        )
      );

const RuleActions = ({
  rule,
  workspaceId,
}: {
  readonly rule: CommentRule;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("CommentRules");
  const update = useAtomSet(updateCommentRule, { mode: "promiseExit" });
  const stop = useAtomSet(stopCommentRule, { mode: "promiseExit" });
  const [busy, start] = useTransition();
  const params = { ruleId: rule.id, workspaceId };
  const reactivityKeys = commentRulesChanged(workspaceId);

  const answered = (
    exit: Exit.Exit<unknown, { readonly _tag: string }>,
    done: string
  ) => {
    Option.match(failureOf(exit), {
      onNone: () => toast.success(done),
      onSome: (tag) => toast.error(t("errors.failed", { tag })),
    });
  };

  if (rule.status === "ended") {
    return null;
  }

  return (
    <>
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
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => {
          start(async () => {
            answered(await stop({ params, reactivityKeys }), t("stopped"));
          });
        }}
      >
        {t("stop")}
      </Button>
    </>
  );
};

const NewRule = ({ workspaceId }: { readonly workspaceId: string }) => {
  const t = useTranslations("CommentRules");
  const channels = useAtomValue(workspaceChannels(workspaceId));
  const create = useAtomSet(startCommentRule, { mode: "promiseExit" });
  const [draft, setDraft] = useState<CommentRuleDraft>(freshCommentRule);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const submit = () => {
    const request = commentRuleRequestOf(draft);

    if (request === "channel") {
      setError(t("form.missing.channel"));

      return;
    }

    if (request === "keywords") {
      setError(t("form.missing.keywords"));

      return;
    }

    if (request === "reply") {
      setError(t("form.missing.reply"));

      return;
    }

    start(async () => {
      const exit = await create({
        params: { workspaceId },
        payload: request,
        reactivityKeys: commentRulesChanged(workspaceId),
      });

      Option.match(failureOf(exit), {
        onNone: () => {
          toast.success(t("started"));
          setDraft(freshCommentRule);
          setError(null);
        },
        onSome: (tag) => {
          setError(t("errors.failed", { tag }));
        },
      });
    });
  };

  return (
    <CommentRuleFormView
      busy={busy}
      channels={AsyncResult.isSuccess(channels) ? channels.value : []}
      draft={draft}
      error={error}
      onChange={setDraft}
      onSubmit={submit}
    />
  );
};

const RuleList = ({
  mayChange,
  workspaceId,
}: {
  readonly mayChange: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("CommentRules");
  const query = workspaceCommentRules(workspaceId);
  const result = useAtomValue(query);
  const retry = useAtomRefresh(query);

  if (AsyncResult.isFailure(result)) {
    return <SettingsLoadFailed onRetry={retry} />;
  }

  if (!AsyncResult.isSuccess(result)) {
    return <SettingsLoading />;
  }

  return (
    <div className="flex flex-col gap-4">
      {mayChange ? <NewRule workspaceId={workspaceId} /> : null}
      {result.value.items.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y">
          {result.value.items.map((rule) => (
            <CommentRuleView
              key={rule.id}
              rule={rule}
              actions={
                mayChange ? (
                  <RuleActions rule={rule} workspaceId={workspaceId} />
                ) : null
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
};

/** The workspace's comment rules, read once the page has hydrated. */
export const CommentRulesSettings = (props: {
  readonly mayChange: boolean;
  readonly workspaceId: string;
}) => (useHydrated() ? <RuleList {...props} /> : <SettingsLoading />);
