"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { Permission, Platform, Post } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { reconnectChannel } from "#channels/channels-api.ts";
import { rememberConnection } from "#channels/pending-connection.ts";
import {
  followUpsChanged,
  startFollowUp,
  workspaceFollowUps,
} from "#follow-ups/atoms.ts";
import { followUpErrorOf } from "#follow-ups/follow-up-error.ts";
import {
  followUpRequestOf,
  freshFollowUp,
  ruleOfPost,
} from "#follow-ups/rules.ts";
import type { FollowUpDraft } from "#follow-ups/rules.ts";
import { Link } from "#i18n/navigation.ts";

import { useFollowUpErrorText } from "./follow-up-error-text.ts";
import { FollowUpFormView, FollowsUpLineView } from "./follow-up-views.tsx";

// Whether a post can be followed up: on its way, or out.
const followable = (post: Post) =>
  post.status === "scheduled" ||
  post.status === "awaitingApproval" ||
  post.status === "publishing" ||
  post.status === "finished";

const FollowUpForm = ({
  onClose,
  post,
  workspaceId,
}: {
  readonly onClose: () => void;
  readonly post: Post;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("FollowUps");
  const start = useAtomSet(startFollowUp, { mode: "promiseExit" });
  const explain = useFollowUpErrorText();
  const [draft, setDraft] = useState<FollowUpDraft>(freshFollowUp);
  const [error, setError] = useState<string | null>(null);
  // The channels that would repost once connected again, as the refusal
  // said: Bluesky asks for reposts when a rule first needs them.
  const [reconnectable, setReconnectable] = useState<
    readonly { readonly channelId: string; readonly platform: Platform }[]
  >([]);
  const reconnect = useAtomSet(reconnectChannel, { mode: "promiseExit" });
  const [busy, startTransition] = useTransition();

  const allowReposts = (channel: {
    readonly channelId: string;
    readonly platform: Platform;
  }) => {
    startTransition(async () => {
      const exit = await reconnect({
        params: { channelId: channel.channelId, workspaceId },
        query: { reposts: "true" },
      });

      if (Exit.isSuccess(exit)) {
        rememberConnection({ platform: channel.platform, workspaceId });
        globalThis.location.assign(exit.value.authorizationUrl);

        return;
      }

      toast.error(t("allowRepostsFailed"));
    });
  };

  const submit = () => {
    const request = followUpRequestOf(post.id, draft);

    if (request === "likes" || request === "nothing") {
      setError(t(request === "likes" ? "form.likesInvalid" : "form.nothing"));

      return;
    }

    if (Option.isNone(request)) {
      return;
    }

    startTransition(async () => {
      const exit = await start({
        params: { workspaceId },
        payload: request.value,
        reactivityKeys: followUpsChanged(workspaceId),
      });

      Option.match(followUpErrorOf(exit), {
        onNone: () => {
          toast.success(t("started"));
          onClose();
        },
        onSome: (refused) => {
          setError(explain(refused));
          setReconnectable(
            refused.key === "notPossible" ? refused.reconnect : []
          );
        },
      });
    });
  };

  return (
    <>
      <FollowUpFormView
        busy={busy}
        draft={draft}
        error={error}
        onCancel={onClose}
        onChange={setDraft}
        onSubmit={submit}
      />
      {reconnectable.length === 0 ? null : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {t("repostsNeedReconnect")}
          </span>
          {reconnectable.map((channel) => (
            <Button
              key={channel.channelId}
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                allowReposts(channel);
              }}
            >
              {t("allowReposts")}
            </Button>
          ))}
        </div>
      )}
    </>
  );
};

/**
 * A post's follow-up: the rule that follows it up, with a link to the
 * rules; or, for a member who may schedule, the form that starts one.
 * Nothing while the rules load.
 */
export const PostFollowUp = ({
  permissions,
  post,
  workspaceId,
}: {
  readonly permissions: readonly Permission[];
  readonly post: Post;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("FollowUps");
  const rules = useAtomValue(workspaceFollowUps(workspaceId));
  const [open, setOpen] = useState(false);

  if (!AsyncResult.isSuccess(rules)) {
    return null;
  }

  const rule = ruleOfPost(rules.value.items, post.id);

  if (rule !== undefined) {
    return (
      <FollowsUpLineView
        rule={rule}
        link={
          <Link
            href={`/app/${workspaceId}/settings/follow-ups?rule=${rule.id}`}
            className="underline underline-offset-4"
          >
            {t("openRule")}
          </Link>
        }
      />
    );
  }

  if (!followable(post) || !permissions.includes("post:schedule")) {
    return null;
  }

  return open ? (
    <FollowUpForm
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
        {t("followUp")}
      </Button>
    </div>
  );
};
