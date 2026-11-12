"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { Permission, Post } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Link } from "#i18n/navigation.ts";
import { workspaceQueues } from "#queues/atoms.ts";
import { rulesChanged, startRule, workspaceRules } from "#recycling/atoms.ts";
import { ruleErrorOf } from "#recycling/rule-error.ts";
import { freshRepeat, ruleOfSource, ruleRequestOf } from "#recycling/rules.ts";
import type { RepeatDraft } from "#recycling/rules.ts";

import { RepeatFormView, RepeatsLineView } from "./recycling-views.tsx";
import { useRuleErrorText } from "./rule-error-text.ts";

// Whether a post can be a rule's source: on its way, or out.
const repeatable = (post: Post) =>
  post.status === "scheduled" ||
  post.status === "publishing" ||
  post.status === "finished";

const RepeatForm = ({
  onClose,
  post,
  workspaceId,
}: {
  readonly onClose: () => void;
  readonly post: Post;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Recycling");
  const start = useAtomSet(startRule, { mode: "promiseExit" });
  const queues = useAtomValue(workspaceQueues(workspaceId));
  const explain = useRuleErrorText();
  const [draft, setDraft] = useState<RepeatDraft>(freshRepeat);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const exit = await start({
        params: { workspaceId },
        payload: ruleRequestOf(post.id, draft),
        reactivityKeys: rulesChanged(workspaceId),
      });

      Option.match(ruleErrorOf(exit), {
        onNone: () => {
          toast.success(t("started"));
          onClose();
        },
        onSome: (refused) => {
          setError(explain(refused));
        },
      });
    });
  };

  return (
    <RepeatFormView
      busy={busy}
      draft={draft}
      error={error}
      onCancel={onClose}
      onChange={setDraft}
      onSubmit={submit}
      queues={AsyncResult.isSuccess(queues) ? queues.value : []}
    />
  );
};

/**
 * A post's repeating: the rule that repeats it, or that made it, with a
 * link to the rules; or, for a member who may schedule, the form that
 * makes it repeat. Nothing while the rules load.
 */
export const PostRepeat = ({
  permissions,
  post,
  workspaceId,
}: {
  readonly permissions: readonly Permission[];
  readonly post: Post;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Recycling");
  const rules = useAtomValue(workspaceRules(workspaceId));
  const [open, setOpen] = useState(false);

  if (!AsyncResult.isSuccess(rules)) {
    return null;
  }

  const all = rules.value.items;

  const rule =
    post.recyclingId === null
      ? ruleOfSource(all, post.id)
      : all.find(({ id }) => id === post.recyclingId);

  if (rule !== undefined) {
    return (
      <RepeatsLineView
        rule={rule}
        link={
          <Link
            href={`/app/${workspaceId}/settings/recycling?rule=${rule.id}`}
            className="underline underline-offset-4"
          >
            {t("openRule")}
          </Link>
        }
      />
    );
  }

  if (
    !repeatable(post) ||
    post.recyclingId !== null ||
    !permissions.includes("post:schedule")
  ) {
    return null;
  }

  return open ? (
    <RepeatForm
      onClose={() => {
        setOpen(false);
      }}
      post={post}
      workspaceId={workspaceId}
    />
  ) : (
    <div>
      <Button
        variant="outline"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t("repeat")}
      </Button>
    </div>
  );
};
