"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { SparklesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AssistantToneSchema, TranslationLanguageSchema } from "peal-contract";
import type {
  AssistantAction,
  AssistantStatus,
  Permission,
  Platform,
  Suggestion,
} from "peal-contract";
import { Button } from "peal-ui/components/button";
import { Dialog, DialogContent } from "peal-ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "peal-ui/components/dropdown-menu";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { assistantStatus, suggestChange } from "#assistant/api.ts";
import {
  acceptedText,
  languageLabel,
  shortenablePlatforms,
  writablePlatforms,
} from "#assistant/suggestion.ts";
import type { AssistantFailure } from "#assistant/suggestion.ts";
import { useOfferUpgrade } from "#components/billing/use-offer-upgrade.ts";
import { AssistantPreview } from "#components/posts/assistant-preview.tsx";
import type { PreviewState } from "#components/posts/assistant-preview.tsx";
import { AssistantWriteForm } from "#components/posts/assistant-write-form.tsx";
import { failureOf } from "#posts/outcome.ts";

interface AssistantMenuProps {
  /** Whether the text can be changed now. */
  readonly disabled: boolean;
  /** Replaces the text for all channels with the accepted one. */
  readonly onAccept: (text: string) => void;
  readonly permissions: readonly Permission[];
  /** The platforms of the channels the post goes to. */
  readonly platforms: readonly Platform[];
  /** The text for all channels, which the assistant works on. */
  readonly text: string;
  readonly workspaceId: string;
}

/** A request the person made, and where it stands. */
interface Asked {
  readonly action: AssistantAction;
  readonly state: PreviewState;
  /** The text the assistant was given. */
  readonly text: string;
}

const unexpected = (): AssistantFailure => ({ _tag: "Unexpected" });

/**
 * Why the person cannot ask now, if they cannot: no text, too much of it,
 * or no request left today (which the count of requests left says).
 */
const blockedBy = (
  status: AssistantStatus,
  text: string
): "needsText" | "noRequestsLeft" | "textTooLong" | null => {
  if (status.remaining <= 0) {
    return "noRequestsLeft";
  }

  if (text.trim() === "") {
    return "needsText";
  }

  return text.length > status.maxTextLength ? "textTooLong" : null;
};

interface ActionsProps {
  readonly locale: string;
  readonly names: Intl.DisplayNames;
  readonly onAction: (action: AssistantAction) => void;
  readonly platforms: readonly Platform[];
}

// What the assistant can do, each tone, platform or language in a submenu.
const Actions = ({ locale, names, onAction, platforms }: ActionsProps) => {
  const t = useTranslations("Assistant");
  const tPosts = useTranslations("Posts");

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>{t("rewrite")}</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {AssistantToneSchema.literals.map((tone) => (
            <DropdownMenuItem
              key={tone}
              onClick={() => {
                onAction({ _tag: "rewrite", tone });
              }}
            >
              {t("tone", { tone })}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>{t("shorten")}</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {shortenablePlatforms(platforms).map((platform) => (
            <DropdownMenuItem
              key={platform}
              onClick={() => {
                onAction({ _tag: "shorten", platform });
              }}
            >
              {tPosts("platform", { platform })}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>{t("translate")}</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {TranslationLanguageSchema.literals.map((language) => (
            <DropdownMenuItem
              key={language}
              onClick={() => {
                onAction({ _tag: "translate", language });
              }}
            >
              {languageLabel(names, locale, language)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuItem
        onClick={() => {
          onAction({ _tag: "hashtags" });
        }}
      >
        {t("hashtags")}
      </DropdownMenuItem>
    </>
  );
};

// The same actions, listed but out of reach, while the label above says
// why.
const DisabledActions = () => {
  const t = useTranslations("Assistant");

  return (
    <>
      <DropdownMenuItem disabled>{t("rewrite")}</DropdownMenuItem>
      <DropdownMenuItem disabled>{t("shorten")}</DropdownMenuItem>
      <DropdownMenuItem disabled>{t("translate")}</DropdownMenuItem>
      <DropdownMenuItem disabled>{t("hashtags")}</DropdownMenuItem>
    </>
  );
};

const Controls = ({
  disabled,
  onAccept,
  platforms,
  status,
  text,
  workspaceId,
}: Omit<AssistantMenuProps, "permissions"> & {
  readonly status: AssistantStatus;
}) => {
  const t = useTranslations("Assistant");
  const locale = useLocale();
  const hintId = useId();
  const suggest = useAtomSet(suggestChange, { mode: "promiseExit" });
  const offerUpgrade = useOfferUpgrade();
  // Whatever a request ends with, the count of requests left may change.
  const refreshStatus = useAtomRefresh(assistantStatus(workspaceId));
  const [asked, setAsked] = useState<Asked | null>(null);
  // Whether the person is writing the subject of a post to write.
  const [composing, setComposing] = useState(false);

  // Each request has a number: an answer that comes after the person closed
  // the dialog, or asked again, is dropped.
  const latest = useRef(0);

  const names = new Intl.DisplayNames([locale], { type: "language" });
  const blocked = blockedBy(status, text);

  const ask = async (action: AssistantAction, from: string) => {
    latest.current += 1;

    const request = latest.current;

    setAsked({ action, state: { _tag: "asking" }, text: from });

    const exit = await suggest({
      params: { workspaceId },
      payload: { action, text: from },
    });

    refreshStatus();
    offerUpgrade(exit);

    if (request !== latest.current) {
      return;
    }

    setAsked({
      action,
      state: Exit.isSuccess(exit)
        ? { _tag: "ready", suggestion: exit.value }
        : {
            _tag: "failed",
            failure: Option.getOrElse(failureOf(exit), unexpected),
          },
      text: from,
    });
  };

  const run = (action: AssistantAction) => {
    void ask(action, text);
  };

  const close = () => {
    latest.current += 1;
    setAsked(null);
    setComposing(false);
  };

  const accept = (suggestion: Suggestion, from: string) => {
    onAccept(acceptedText(from, suggestion));
    close();
    toast.success(t("accepted"));
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <p id={hintId} className="sr-only">
        {t("worksOn")}
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              focusableWhenDisabled
            />
          }
          aria-describedby={hintId}
        >
          <SparklesIcon data-icon="inline-start" aria-hidden />
          {t("trigger")}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {t("remaining", { remaining: status.remaining })}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={blocked === "noRequestsLeft"}
            onClick={() => {
              setComposing(true);
            }}
          >
            {t("writePost")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {blocked === "needsText" ? (
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("needsText")}</DropdownMenuLabel>
            </DropdownMenuGroup>
          ) : null}
          {blocked === "textTooLong" ? (
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {t("textTooLong", { maxLength: status.maxTextLength })}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
          ) : null}
          {blocked === null ? (
            <Actions
              locale={locale}
              names={names}
              platforms={platforms}
              onAction={run}
            />
          ) : (
            <DisabledActions />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={asked !== null || composing}
        onOpenChange={(open) => {
          if (!open) {
            close();
          }
        }}
      >
        <DialogContent closeLabel={t("close")}>
          {asked === null && composing ? (
            <AssistantWriteForm
              maxLength={status.maxTextLength}
              platforms={writablePlatforms(platforms)}
              onCancel={close}
              onWrite={(action, subject) => {
                setComposing(false);
                void ask(action, subject);
              }}
            />
          ) : null}
          {asked === null ? null : (
            <AssistantPreview
              action={asked.action}
              state={asked.state}
              onAccept={(suggestion) => {
                accept(suggestion, asked.text);
              }}
              onDiscard={close}
              onRetry={() => {
                void ask(asked.action, asked.text);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// The last status read: a refresh that fails keeps the assistant, and its
// open dialog, where they are.
const WhenAvailable = (props: Omit<AssistantMenuProps, "permissions">) => {
  const status = AsyncResult.value(
    useAtomValue(assistantStatus(props.workspaceId))
  );

  return Option.isSome(status) && status.value.available ? (
    <Controls
      disabled={props.disabled}
      platforms={props.platforms}
      status={status.value}
      text={props.text}
      workspaceId={props.workspaceId}
      onAccept={props.onAccept}
    />
  ) : null;
};

/**
 * The writing assistant, in the composer: a menu of what it can do with the
 * text for all channels, and a preview of its suggestion, which the person
 * uses or discards. Hidden from members who may not use it, and while the
 * server has no language model.
 */
export const AssistantMenu = ({
  disabled,
  onAccept,
  permissions,
  platforms,
  text,
  workspaceId,
}: AssistantMenuProps) =>
  permissions.includes("assistant:use") ? (
    <WhenAvailable
      disabled={disabled}
      platforms={platforms}
      text={text}
      workspaceId={workspaceId}
      onAccept={onAccept}
    />
  ) : null;
