"use client";

import { useTranslations } from "next-intl";
import type { Channel, CommentRule } from "peal-contract";
import { Badge } from "peal-ui/components/badge";
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
import { Textarea } from "peal-ui/components/textarea";
import { useId } from "react";
import type { ReactNode } from "react";

import type { CommentRuleDraft } from "#comment-rules/rules.ts";

// The views of comment rules: a rule with what it did, and the form that
// starts one, whatever fetched them. Their state is in
// comment-rules-settings.tsx.

/** A rule as the list shows it, with its channels and what it matched. */
export const CommentRuleView = ({
  actions,
  rule,
}: {
  readonly actions: ReactNode;
  readonly rule: CommentRule;
}) => {
  const t = useTranslations("CommentRules");
  const titleId = useId();

  const replied = rule.matches.filter(
    ({ outcome }) => outcome === "replied"
  ).length;

  return (
    <li aria-labelledby={titleId} className="flex flex-col gap-2 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span id={titleId} className="font-medium">
              {t("keywords", { keywords: rule.keywords.join(", ") })}
            </span>
            <Badge variant={rule.status === "active" ? "secondary" : "outline"}>
              {t("status", { status: rule.status })}
            </Badge>
          </div>
          <p className="text-sm whitespace-pre-wrap">{rule.reply}</p>
          <p className="text-muted-foreground text-sm">
            {t("replied", { count: replied })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      <ul className="flex flex-col gap-1">
        {rule.channels.map(({ channelId, platform, reply }) => (
          <li key={channelId} className="text-muted-foreground text-sm">
            {t("carries", { platform, reply })}
          </li>
        ))}
      </ul>
    </li>
  );
};

/** The form that starts a rule on a channel. */
export const CommentRuleFormView = ({
  busy,
  channels,
  draft,
  error,
  onChange,
  onSubmit,
}: {
  readonly busy: boolean;
  readonly channels: readonly Channel[];
  readonly draft: CommentRuleDraft;
  readonly error: string | null;
  readonly onChange: (draft: CommentRuleDraft) => void;
  readonly onSubmit: () => void;
}) => {
  const t = useTranslations("CommentRules");
  const channelId = useId();
  const keywordsId = useId();
  const replyId = useId();

  return (
    <form
      className="flex flex-col gap-3 rounded-md border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor={channelId}>{t("form.channel")}</Label>
        <Select
          value={draft.channelId}
          onValueChange={(value) => {
            onChange({ ...draft, channelId: value ?? "" });
          }}
        >
          <SelectTrigger id={channelId}>
            <SelectValue placeholder={t("form.chooseChannel")} />
          </SelectTrigger>
          <SelectContent>
            {channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                {channel.displayName ?? channel.handle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={keywordsId}>{t("form.keywords")}</Label>
        <Input
          id={keywordsId}
          value={draft.keywords}
          onChange={(event) => {
            onChange({ ...draft, keywords: event.target.value });
          }}
        />
        <p className="text-muted-foreground text-xs">
          {t("form.keywordsHelp")}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={replyId}>{t("form.reply")}</Label>
        <Textarea
          id={replyId}
          value={draft.reply}
          onChange={(event) => {
            onChange({ ...draft, reply: event.target.value });
          }}
        />
      </div>
      <p className="text-muted-foreground text-xs">{t("form.public")}</p>
      {error === null ? null : (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={busy}>
          {t("form.start")}
        </Button>
      </div>
    </form>
  );
};
