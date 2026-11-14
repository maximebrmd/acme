"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import { maxFollowUpCommentLength, maxLikesThreshold } from "peal-contract";
import type { FollowUp, FollowUpRule } from "peal-contract";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { Textarea } from "peal-ui/components/textarea";
import { useId } from "react";
import type { ReactNode } from "react";

import type { FollowUpDraft } from "#follow-ups/rules.ts";

// The views of follow-up rules: a rule with what it did, the line a post
// shows, and the form that starts one, whatever fetched them. Their state
// is in follow-ups-settings.tsx and post-follow-up.tsx.

/** What a rule does, in the reader's words. */
export const useActionText = () => {
  const t = useTranslations("FollowUps");

  return (rule: FollowUpRule): string =>
    t("does", {
      comment: rule.comment === null ? "no" : "yes",
      likes: rule.likes,
      repost: rule.repost ? "yes" : "no",
    });
};

// One follow-up: on which channel, what, and what became of it.
const FollowUpLineView = ({
  followUp,
  platform,
}: {
  readonly followUp: FollowUp;
  readonly platform: string;
}) => {
  const t = useTranslations("FollowUps");
  const format = useFormatter();

  const when =
    followUp.sentAt === null
      ? null
      : format.dateTime(DateTime.toDate(followUp.sentAt), {
          dateStyle: "medium",
          timeStyle: "short",
        });

  const nextTry =
    followUp.notBefore === null
      ? null
      : format.dateTime(DateTime.toDate(followUp.notBefore), {
          dateStyle: "medium",
          timeStyle: "short",
        });

  return (
    <li className="flex flex-wrap items-center gap-2 text-sm">
      <span>{t("kind", { kind: followUp.kind })}</span>
      <span className="text-muted-foreground">
        {t("platform", { platform })}
      </span>
      <Badge variant="outline">
        {t("followUpStatus", { status: followUp.status })}
      </Badge>
      {followUp.reason === null ? null : (
        <span className="text-muted-foreground">
          {t("reason", { reason: followUp.reason })}
        </span>
      )}
      {nextTry === null ? null : (
        <span className="text-muted-foreground">
          {t("nextTry", { at: nextTry })}
        </span>
      )}
      {when === null ? null : (
        <span className="text-muted-foreground">{when}</span>
      )}
      {followUp.permalink === null ? null : (
        <a
          href={followUp.permalink}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >
          {t("open")}
        </a>
      )}
    </li>
  );
};

/** A rule as a list shows it, with what each channel carries and did. */
export const FollowUpRuleView = ({
  actions,
  highlighted = false,
  onAllowReposts,
  rule,
  scope,
}: {
  readonly actions: ReactNode;
  /** Whether the page was opened for this rule. */
  readonly highlighted?: boolean;
  /**
   * Connects a channel again to let it repost, for a channel whose
   * reposts wait for that; none where the reader may not.
   */
  readonly onAllowReposts?: (channelId: string) => void;
  readonly rule: FollowUpRule;
  /** A link to the post, or the channel's name. */
  readonly scope: ReactNode;
}) => {
  const t = useTranslations("FollowUps");
  const actionText = useActionText();
  const titleId = useId();

  const platformOf = (channelId: string) =>
    rule.channels.find((channel) => channel.channelId === channelId)
      ?.platform ?? "";

  return (
    <li
      aria-labelledby={titleId}
      aria-current={highlighted ? "true" : undefined}
      className="aria-[current=true]:bg-muted/50 flex flex-col gap-3 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span id={titleId} className="font-medium">
              {actionText(rule)}
            </span>
            <Badge variant={rule.status === "active" ? "secondary" : "outline"}>
              {t("status", { status: rule.status })}
            </Badge>
            {rule.approval === "pending" ? (
              <Badge variant="outline">{t("awaitingApproval")}</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">{scope}</p>
          {rule.comment === null ? null : (
            <p className="text-sm whitespace-pre-wrap">{rule.comment}</p>
          )}
          {rule.status === "ended" ? (
            <p className="text-sm">
              {t("ended", { reason: rule.endedReason ?? "stopped" })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      <ul className="flex flex-col gap-1">
        {rule.channels.map(({ channelId, comment, platform, repost }) => (
          <li
            key={channelId}
            className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm"
          >
            {t("carries", { comment, platform, repost })}
            {repost === "reconnect" &&
            rule.status !== "ended" &&
            onAllowReposts !== undefined ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAllowReposts(channelId);
                }}
              >
                {t("allowReposts")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {rule.followUps.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("nothingYet")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rule.followUps.map((followUp) => (
            <FollowUpLineView
              key={followUp.id}
              followUp={followUp}
              platform={platformOf(followUp.channelId)}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

/** The line a post shows of its rule, with a link to the rules. */
export const FollowsUpLineView = ({
  link,
  rule,
}: {
  readonly link: ReactNode;
  readonly rule: FollowUpRule;
}) => {
  const t = useTranslations("FollowUps");
  const actionText = useActionText();

  return (
    <p className="text-sm">
      {t("followsUp", { what: actionText(rule) })} {link}
    </p>
  );
};

/** The form that starts a rule on a post. */
export const FollowUpFormView = ({
  busy,
  draft,
  error,
  onCancel,
  onChange,
  onSubmit,
}: {
  readonly busy: boolean;
  readonly draft: FollowUpDraft;
  readonly error: string | null;
  readonly onCancel: () => void;
  readonly onChange: (draft: FollowUpDraft) => void;
  readonly onSubmit: () => void;
}) => {
  const t = useTranslations("FollowUps");
  const likesId = useId();
  const commentId = useId();
  const repostId = useId();

  return (
    <form
      className="flex flex-col gap-3 rounded-md border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <p className="text-muted-foreground text-sm">{t("form.description")}</p>
      <div className="flex flex-col gap-1">
        <Label htmlFor={likesId}>{t("form.likes")}</Label>
        <Input
          id={likesId}
          inputMode="numeric"
          value={draft.likes}
          max={maxLikesThreshold}
          onChange={(event) => {
            onChange({ ...draft, likes: event.target.value });
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={commentId}>{t("form.comment")}</Label>
        <Textarea
          id={commentId}
          value={draft.comment}
          maxLength={maxFollowUpCommentLength}
          onChange={(event) => {
            onChange({ ...draft, comment: event.target.value });
          }}
        />
        <p className="text-muted-foreground text-xs">{t("form.commentHelp")}</p>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={repostId}
          checked={draft.repost}
          onCheckedChange={(checked) => {
            onChange({ ...draft, repost: checked === true });
          }}
        />
        <Label htmlFor={repostId}>{t("form.repost")}</Label>
      </div>
      <p className="text-muted-foreground text-xs">{t("form.public")}</p>
      {error === null ? null : (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {t("form.start")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("form.cancel")}
        </Button>
      </div>
    </form>
  );
};
