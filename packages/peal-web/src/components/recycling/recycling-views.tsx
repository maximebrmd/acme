"use client";

import { DateTime, Schema } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import {
  maxOccurrences,
  maxRecyclingInterval,
  maxRecyclingVariants,
  minOccurrences,
  RecyclingUnitSchema,
} from "peal-contract";
import type { Queue, RecyclingRule } from "peal-contract";
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

import {
  EndingChoiceSchema,
  keyedTexts,
  nextVariantKey,
} from "#recycling/rules.ts";
import type { RepeatDraft } from "#recycling/rules.ts";

// The views of repeating posts: a rule, the form that starts one, and the
// line a post made by a rule shows, whatever fetched them. Their state is
// in recycling-settings.tsx and post-repeat.tsx.

const units = RecyclingUnitSchema.literals;

const endings = EndingChoiceSchema.literals;

const isUnit = Schema.is(RecyclingUnitSchema);

// What a reader counts as characters.
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

const isEnding = Schema.is(EndingChoiceSchema);

/** How often a rule repeats, in the reader's words. */
export const useEveryText = () => {
  const t = useTranslations("Recycling");

  return ({ count, unit }: RecyclingRule["every"]) =>
    t("every", { count, unit });
};

/** Where a rule stands: how many it made, of how many, until when. */
export const useProgressText = () => {
  const t = useTranslations("Recycling");
  const format = useFormatter();

  return (rule: RecyclingRule): string =>
    [
      rule.count === null
        ? t("made", { made: rule.made })
        : t("madeOf", { count: rule.count, made: rule.made }),
      ...(rule.until === null
        ? []
        : [
            t("until", {
              date: format.dateTime(
                DateTime.toDate(DateTime.makeUnsafe(`${rule.until}T12:00:00Z`)),
                { dateStyle: "long", timeZone: "UTC" }
              ),
            }),
          ]),
    ].join(" · ");
};

/** A rule as a list shows it, with its next posts and its actions. */
export const RuleItemView = ({
  actions,
  highlighted = false,
  rule,
  source,
}: {
  readonly actions: ReactNode;
  /** Whether the page was opened for this rule, from a notice. */
  readonly highlighted?: boolean;
  readonly rule: RecyclingRule;
  /** A link to the source post. */
  readonly source: ReactNode;
}) => {
  const t = useTranslations("Recycling");
  const format = useFormatter();
  const everyText = useEveryText();
  const progressText = useProgressText();
  const titleId = useId();

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
              {everyText(rule.every)}
            </span>
            <Badge variant={rule.status === "active" ? "secondary" : "outline"}>
              {t("status", { status: rule.status })}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">{progressText(rule)}</p>
          {rule.status === "ended" ? (
            <p className="text-sm">
              {t("ended", {
                reason: t("reason", { reason: rule.endedReason ?? "stopped" }),
              })}
            </p>
          ) : null}
          <div className="text-sm">{source}</div>
        </div>
        {actions === null ? null : (
          <div className="flex flex-wrap gap-2">{actions}</div>
        )}
      </div>
      {rule.variants.length === 0 ? null : (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{t("variants")}</p>
          <ol className="text-muted-foreground flex list-decimal flex-col gap-1 ps-5 text-sm">
            {keyedTexts(rule.variants.map(({ text }) => text)).map(
              ({ key, text }) => (
                <li key={key} className="line-clamp-2 break-words">
                  {text}
                </li>
              )
            )}
          </ol>
        </div>
      )}
      {rule.coming.length === 0 ? null : (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{t("coming")}</p>
          <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
            {rule.coming.map(({ at, occurrence, variant }) => (
              <li key={occurrence}>
                {t("comingItem", {
                  at: format.dateTime(DateTime.toDate(at), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                  variant: variant ?? 0,
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
};

/** The line a post made by a rule, or repeated by one, shows. */
export const RepeatsLineView = ({
  link,
  rule,
}: {
  readonly link: ReactNode;
  readonly rule: RecyclingRule;
}) => {
  const t = useTranslations("Recycling");
  const everyText = useEveryText();
  const progressText = useProgressText();

  return (
    <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
      <span>
        {t("repeats", {
          every: everyText(rule.every),
          progress: progressText(rule),
        })}
      </span>
      {link}
    </p>
  );
};

/** The form that starts a rule on a post. */
export const RepeatFormView = ({
  busy,
  draft,
  error,
  onCancel,
  onChange,
  onSubmit,
  queues,
}: {
  readonly busy: boolean;
  readonly draft: RepeatDraft;
  /** What the server refused, in words, if it did. */
  readonly error: string | null;
  readonly onCancel: () => void;
  readonly onChange: (draft: RepeatDraft) => void;
  readonly onSubmit: () => void;
  readonly queues: readonly Queue[];
}) => {
  const t = useTranslations("Recycling");
  const everyId = useId();
  const unitId = useId();
  const endingId = useId();
  const countId = useId();
  const untilId = useId();
  const queueId = useId();

  const set = (change: Partial<RepeatDraft>) => {
    onChange({ ...draft, ...change });
  };

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <p className="font-medium">{t("repeatPost")}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={everyId}>{t("form.every")}</Label>
          <Input
            id={everyId}
            type="number"
            className="w-24"
            min={1}
            max={maxRecyclingInterval[draft.unit]}
            value={String(draft.every)}
            onChange={(event) => {
              set({ every: Number(event.target.value) });
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={unitId}>{t("form.unit")}</Label>
          <Select
            value={draft.unit}
            onValueChange={(unit) => {
              if (isUnit(unit)) {
                set({ unit });
              }
            }}
          >
            <SelectTrigger id={unitId} className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {t("form.units", { unit })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={endingId}>{t("form.ending")}</Label>
          <Select
            value={draft.ending}
            onValueChange={(ending) => {
              if (isEnding(ending)) {
                set({ ending });
              }
            }}
          >
            <SelectTrigger id={endingId} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {endings.map((ending) => (
                <SelectItem key={ending} value={ending}>
                  {t("form.endings", { ending, max: maxOccurrences })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {draft.ending === "count" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={countId}>{t("form.count")}</Label>
            <Input
              id={countId}
              type="number"
              className="w-24"
              min={minOccurrences}
              max={maxOccurrences}
              value={String(draft.count)}
              onChange={(event) => {
                set({ count: Number(event.target.value) });
              }}
            />
          </div>
        ) : null}
        {draft.ending === "until" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={untilId}>{t("form.until")}</Label>
            <Input
              id={untilId}
              type="date"
              required
              className="w-44"
              value={draft.until}
              onChange={(event) => {
                set({ until: event.target.value });
              }}
            />
          </div>
        ) : null}
      </div>
      {queues.length === 0 ? null : (
        <div className="flex flex-col gap-2">
          <Label htmlFor={queueId}>{t("form.queue")}</Label>
          <Select
            value={draft.queueId === "" ? "none" : draft.queueId}
            onValueChange={(chosen) => {
              set({
                queueId: chosen === "none" || chosen === null ? "" : chosen,
              });
            }}
          >
            <SelectTrigger id={queueId} className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("form.ownTime")}</SelectItem>
              {queues.map((queue) => (
                <SelectItem key={queue.id} value={queue.id}>
                  {queue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t("variants")}</legend>
        <p className="text-muted-foreground text-sm">
          {t("form.variantsHint", { max: maxRecyclingVariants })}
        </p>
        {draft.variants.map(({ key, text }, place) => (
          <div key={key} className="flex flex-col gap-1">
            <Label htmlFor={`${queueId}-variant-${String(place)}`}>
              {t("form.variant", { number: place + 1 })}
            </Label>
            <Textarea
              id={`${queueId}-variant-${String(place)}`}
              value={text}
              onChange={(event) => {
                set({
                  variants: draft.variants.map((kept) =>
                    kept.key === key ? { key, text: event.target.value } : kept
                  ),
                });
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">
                {t("form.characters", {
                  count: [...graphemes.segment(text)].length,
                })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  set({
                    variants: draft.variants.filter((kept) => kept.key !== key),
                  });
                }}
              >
                {t("form.removeVariant", { number: place + 1 })}
              </Button>
            </div>
          </div>
        ))}
        {draft.variants.length < maxRecyclingVariants ? (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                set({
                  variants: [
                    ...draft.variants,
                    { key: nextVariantKey(draft), text: "" },
                  ],
                });
              }}
            >
              {t("form.addVariant")}
            </Button>
          </div>
        ) : null}
      </fieldset>
      <p className="text-muted-foreground text-sm">{t("form.inPublic")}</p>
      {error === null ? null : (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
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
