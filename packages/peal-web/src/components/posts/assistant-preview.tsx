"use client";

import { DateTime, Match } from "effect";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { AssistantAction, Suggestion } from "peal-contract";
import { Alert, AlertTitle } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "peal-ui/components/dialog";
import { Skeleton } from "peal-ui/components/skeleton";

import type { AssistantFailure } from "#assistant/suggestion.ts";
import { fitOn } from "#posts/character-count.ts";

/** Where a request to the assistant stands, once one was made. */
export type PreviewState =
  | { readonly _tag: "asking" }
  | { readonly _tag: "failed"; readonly failure: AssistantFailure }
  | { readonly _tag: "ready"; readonly suggestion: Suggestion };

type Translate = ReturnType<typeof useTranslations<"Assistant">>;

type Format = ReturnType<typeof useFormatter>;

// The workspace's own text provider's refusals: its settings are to fix,
// by those who may change them.
const ownRefusals = {
  addressRefused: "providerAddress",
  keyUnreadable: "providerKey",
  redirected: "providerRedirected",
  settingsRefused: "providerRefused",
} as const;

/** What to tell the person about a failed request, in their language. */
export const failureMessage = (
  t: Translate,
  format: Format,
  failure: AssistantFailure
): string =>
  Match.valueTags(failure, {
    AssistantFailed: ({ reason }) => t(`errors.${reason}`),
    AssistantInputRejected: ({ maxLength, reason }) =>
      reason === "empty"
        ? t("errors.empty")
        : t("errors.tooLong", { maxLength }),
    AssistantQuotaExceeded: ({ dailyLimit, resetsAt }) =>
      t("errors.quota", {
        dailyLimit,
        resetsAt: format.dateTime(DateTime.toDate(resetsAt), {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      }),
    AssistantUnavailable: () => t("errors.unavailable"),
    Forbidden: () => t("errors.forbidden"),
    OwnTextLimitReached: ({ dailyLimit }) =>
      t("errors.ownLimit", { dailyLimit }),
    TextProviderBusy: () => t("errors.ownBusy"),
    TextProviderRefused: ({ reason }) => t(`errors.${ownRefusals[reason]}`),
    TooManyRequests: () => t("errors.generic"),
    Unauthenticated: () => t("errors.generic"),
    Unexpected: () => t("errors.generic"),
    WorkspaceNotFound: () => t("errors.generic"),
  });

/**
 * Whether trying again may work: the provider was out of reach, the answer
 * could not be used, or the request failed on the way. A refusal, the quota
 * or the server's settings stay as they are.
 */
export const isRetryable = (failure: AssistantFailure): boolean =>
  failure._tag === "Unexpected" ||
  (failure._tag === "AssistantFailed" && failure.reason !== "declined");

interface AssistantPreviewProps {
  readonly action: AssistantAction;
  readonly onAccept: (suggestion: Suggestion) => void;
  readonly onDiscard: () => void;
  readonly onRetry: () => void;
  readonly state: PreviewState;
}

const languageNames = (locale: string) =>
  new Intl.DisplayNames([locale], { type: "language" });

const TitleOf = ({ action }: { readonly action: AssistantAction }) => {
  const t = useTranslations("Assistant");
  const tPosts = useTranslations("Posts");
  const locale = useLocale();

  return Match.valueTags(action, {
    hashtags: () => t("hashtagsTitle"),
    rewrite: ({ tone }) => t("rewriteTitle", { tone: t("tone", { tone }) }),
    shorten: ({ platform }) =>
      t("shortenTitle", { platform: tPosts("platform", { platform }) }),
    translate: ({ language }) =>
      t("translateTitle", {
        language: languageNames(locale).of(language) ?? language,
      }),
    write: () => t("writeTitle"),
  });
};

// The platform a text was shortened or written for, if any.
const fittedTo = (action: AssistantAction) =>
  action._tag === "shorten" || action._tag === "write"
    ? action.platform
    : undefined;

// How the text fits the platform it was shortened or written for.
const FitOf = ({
  action,
  text,
}: {
  readonly action: AssistantAction;
  readonly text: string;
}) => {
  const t = useTranslations("Assistant");
  const tPosts = useTranslations("Posts");

  const platform = fittedTo(action);

  if (platform === undefined) {
    return null;
  }

  const { tightest } = fitOn(platform, text, 0);

  return tightest === undefined ? null : (
    <Badge variant={tightest.remaining < 0 ? "destructive" : "outline"}>
      {t("fit", {
        length: tightest.length,
        maximum: tightest.maximum,
        platform: tPosts("platform", { platform }),
        unit: tightest.unit,
      })}
    </Badge>
  );
};

const SuggestionOf = ({
  action,
  suggestion,
}: {
  readonly action: AssistantAction;
  readonly suggestion: Suggestion;
}) => {
  const t = useTranslations("Assistant");

  return suggestion._tag === "text" ? (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-muted-foreground text-xs">
        {t("suggestionLabel")}
      </figcaption>
      <blockquote
        dir="auto"
        className="max-h-72 overflow-y-auto rounded-lg border p-3 text-sm whitespace-pre-wrap"
      >
        {suggestion.text}
      </blockquote>
      <div>
        <FitOf action={action} text={suggestion.text} />
      </div>
    </figure>
  ) : (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-muted-foreground text-xs">
        {t("suggestionLabel")}
      </figcaption>
      <ul className="flex flex-wrap gap-2">
        {suggestion.hashtags.map((hashtag) => (
          <li key={hashtag}>
            <Badge variant="secondary">{hashtag}</Badge>
          </li>
        ))}
      </ul>
    </figure>
  );
};

const BodyOf = ({
  action,
  state,
}: {
  readonly action: AssistantAction;
  readonly state: PreviewState;
}) => {
  const t = useTranslations("Assistant");
  const format = useFormatter();

  if (state._tag === "asking") {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <span className="sr-only">{t("writing")}</span>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  return state._tag === "failed" ? (
    <Alert variant="destructive">
      <AlertTitle>{failureMessage(t, format, state.failure)}</AlertTitle>
    </Alert>
  ) : (
    <SuggestionOf action={action} suggestion={state.suggestion} />
  );
};

/**
 * The inside of the assistant's dialog: what was asked, the suggestion once
 * it comes, and the choice to use it or not. Nothing changes in the post
 * until the person accepts.
 */
export const AssistantPreview = ({
  action,
  onAccept,
  onDiscard,
  onRetry,
  state,
}: AssistantPreviewProps) => {
  const t = useTranslations("Assistant");

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <TitleOf action={action} />
        </DialogTitle>
        <DialogDescription>{t("previewDescription")}</DialogDescription>
      </DialogHeader>
      <div aria-live="polite">
        <BodyOf action={action} state={state} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDiscard}>
          {t("discard")}
        </Button>
        {state._tag === "failed" && isRetryable(state.failure) ? (
          <Button onClick={onRetry}>{t("retry")}</Button>
        ) : null}
        {state._tag === "ready" ? (
          <Button
            onClick={() => {
              onAccept(state.suggestion);
            }}
          >
            {state.suggestion._tag === "text"
              ? t("accept")
              : t("acceptHashtags")}
          </Button>
        ) : null}
      </DialogFooter>
    </>
  );
};
