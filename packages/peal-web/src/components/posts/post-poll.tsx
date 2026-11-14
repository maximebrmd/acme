"use client";

import { Match } from "effect";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Channel, TargetOptions } from "peal-contract";
import { maxPollChoices } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { useId } from "react";

import {
  addChoice,
  changeChoice,
  durationChoices,
  newPoll,
  pollProblemsOn,
  removeChoice,
} from "#posts/poll.ts";
import type { PollDraft, PollProblem } from "#posts/poll.ts";

interface PostPollProps {
  /** Nothing changes for now, as while the post is being saved. */
  readonly disabled: boolean;
  /** The post can still be written: a draft the member may change. */
  readonly editable: boolean;
  /** How many files the post shows on a channel, its own or the post's. */
  readonly mediaOn: (channelId: string) => number;
  readonly onChange: (poll: PollDraft | undefined) => void;
  /** The options the post has on a channel, some choosing a format. */
  readonly optionsOn: (channelId: string) => TargetOptions | undefined;
  readonly poll: PollDraft | undefined;
  /** The channels the post goes to. */
  readonly selected: readonly Channel[];
}

type Translate = ReturnType<typeof useTranslations<"Posts.Poll">>;

// What a platform refuses in the poll, as the member fixes it.
const problemText = (
  t: Translate,
  channel: string,
  problem: PollProblem
): string =>
  Match.valueTags(problem, {
    choiceCount: ({ maximum, minimum }) =>
      t("choiceCount", { channel, maximum, minimum }),
    choiceLength: ({ choice, length, maximum }) =>
      length === 0
        ? t("choiceEmpty", { channel, choice })
        : t("choiceTooLong", { channel, choice, length, maximum }),
    choiceRepeated: ({ choice }) => t("choiceRepeated", { channel, choice }),
    duration: ({ maximum, minimum }) =>
      t("duration", { channel, maximum, minimum }),
    multipleChoice: () => t("multipleChoice", { channel }),
    notSupported: () => t("notSupported", { channel }),
    withMedia: () => t("withMedia", { channel }),
  });

/**
 * The poll the post asks with its first part, whose text is the question:
 * its choices, how long it stays open, and whether readers pick several.
 * Each channel whose platform would refuse it is named, with why, as the
 * server checks it when the post is scheduled.
 */
export const PostPoll = ({
  disabled,
  editable,
  mediaOn,
  onChange,
  optionsOn,
  poll,
  selected,
}: PostPollProps) => {
  const t = useTranslations("Posts.Poll");
  const tComposer = useTranslations("Posts.Composer");
  const tPosts = useTranslations("Posts");
  const id = useId();
  const locked = disabled || !editable;

  if (poll === undefined) {
    return (
      <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
        <h2 id={`${id}-title`} className="text-sm font-medium">
          {t("legend")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("hint")}</p>
        {locked ? null : (
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onChange(newPoll());
              }}
            >
              <PlusIcon data-icon="inline-start" />
              {t("add")}
            </Button>
          </div>
        )}
      </section>
    );
  }

  const refusing = selected.flatMap((channel) => {
    const named = tComposer("channelDetail", {
      handle: channel.handle,
      platform: tPosts("platform", { platform: channel.platform }),
    });

    return pollProblemsOn(
      channel.platform,
      poll,
      mediaOn(channel.id),
      optionsOn(channel.id)
    ).map((problem, index) => ({
      key: `${channel.id}-${String(index)}`,
      text: problemText(t, named, problem),
    }));
  });

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-title`} className="text-sm font-medium">
          {t("legend")}
        </h2>
        {locked ? null : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(undefined);
            }}
          >
            <Trash2Icon data-icon="inline-start" />
            {t("remove")}
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-sm">{t("question")}</p>
      <ol className="flex flex-col gap-2">
        {poll.choices.map((choice, index) => {
          const named = { position: index + 1 };

          return (
            <li key={index} className="flex items-center gap-2">
              <Label
                htmlFor={`${id}-choice-${String(index)}`}
                className="sr-only"
              >
                {t("choiceLabel", named)}
              </Label>
              <Input
                id={`${id}-choice-${String(index)}`}
                value={choice}
                placeholder={t("choicePlaceholder", named)}
                disabled={locked}
                onChange={(event) => {
                  onChange(changeChoice(poll, index, event.target.value));
                }}
              />
              {locked || poll.choices.length <= 2 ? null : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("removeChoice", named)}
                  onClick={() => {
                    onChange(removeChoice(poll, index));
                  }}
                >
                  <Trash2Icon aria-hidden />
                </Button>
              )}
            </li>
          );
        })}
      </ol>
      {locked || poll.choices.length >= maxPollChoices ? null : (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange(addChoice(poll));
            }}
          >
            <PlusIcon data-icon="inline-start" />
            {t("addChoice")}
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label id={`${id}-duration`}>{t("durationLabel")}</Label>
        <Select
          value={String(poll.durationMinutes)}
          disabled={locked}
          onValueChange={(minutes) => {
            if (minutes !== null) {
              onChange({ ...poll, durationMinutes: Number(minutes) });
            }
          }}
        >
          <SelectTrigger aria-labelledby={`${id}-duration`}>
            <SelectValue>
              {t("durationValue", { minutes: poll.durationMinutes })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {durationChoices(poll.durationMinutes).map((minutes) => (
              <SelectItem key={minutes} value={String(minutes)}>
                {t("durationValue", { minutes })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${id}-multiple`}
          checked={poll.multipleChoice}
          disabled={locked}
          onCheckedChange={(next) => {
            onChange({ ...poll, multipleChoice: next === true });
          }}
        />
        <Label htmlFor={`${id}-multiple`}>{t("multipleLabel")}</Label>
      </div>
      {refusing.length === 0 ? null : (
        <ul className="text-destructive flex flex-col gap-1 text-sm">
          {refusing.map(({ key, text }) => (
            <li key={key}>{text}</li>
          ))}
        </ul>
      )}
    </section>
  );
};
