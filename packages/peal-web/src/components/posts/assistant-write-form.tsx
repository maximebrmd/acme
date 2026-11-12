"use client";

import { Schema } from "effect";
import { useTranslations } from "next-intl";
import { AssistantToneSchema, PlatformSchema } from "peal-contract";
import type { AssistantAction, Platform } from "peal-contract";
import { Button } from "peal-ui/components/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "peal-ui/components/dialog";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { Textarea } from "peal-ui/components/textarea";
import { useId, useState } from "react";

import { writeAction } from "#assistant/suggestion.ts";
import type { WriteChoices } from "#assistant/suggestion.ts";

const isTone = Schema.is(AssistantToneSchema);
const isPlatform = Schema.is(PlatformSchema);

// The choice that names nothing: any tone, any platform's length.
const anything = "any";

interface AssistantWriteFormProps {
  /** The longest subject the assistant takes. */
  readonly maxLength: number;
  readonly onCancel: () => void;
  /** Asks for a post on `subject`, written as `action` says. */
  readonly onWrite: (action: AssistantAction, subject: string) => void;
  /** The platforms whose short limit the post may be written to fit. */
  readonly platforms: readonly Platform[];
}

/**
 * The first step of writing a post with the assistant: what the post is
 * about, in the person's words, and optionally its tone and the platform
 * whose limit it must fit. The suggestion then shows in the assistant's
 * preview, as any other.
 */
export const AssistantWriteForm = ({
  maxLength,
  onCancel,
  onWrite,
  platforms,
}: AssistantWriteFormProps) => {
  const t = useTranslations("Assistant");
  const tPosts = useTranslations("Posts");
  const subjectId = useId();
  const hintId = useId();
  const toneId = useId();
  const platformId = useId();
  const [subject, setSubject] = useState("");

  const [choices, setChoices] = useState<WriteChoices>({
    platform: null,
    tone: null,
  });

  const blank = subject.trim() === "";

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (!blank) {
          onWrite(writeAction(choices), subject);
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>{t("writeTitle")}</DialogTitle>
        <DialogDescription>{t("writeDescription")}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor={subjectId}>{t("subject")}</Label>
        <Textarea
          id={subjectId}
          aria-describedby={hintId}
          maxLength={maxLength}
          required
          rows={4}
          value={subject}
          onChange={(event) => {
            setSubject(event.target.value);
          }}
        />
        <p id={hintId} className="text-muted-foreground text-xs">
          {t("subjectHint")}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={toneId}>{t("writeTone")}</Label>
          <Select
            items={[
              { label: t("anyTone"), value: anything },
              ...AssistantToneSchema.literals.map((tone) => ({
                label: t("tone", { tone }),
                value: tone,
              })),
            ]}
            value={choices.tone ?? anything}
            onValueChange={(tone) => {
              setChoices((current) => ({
                ...current,
                tone: isTone(tone) ? tone : null,
              }));
            }}
          >
            <SelectTrigger id={toneId} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={anything}>{t("anyTone")}</SelectItem>
              {AssistantToneSchema.literals.map((tone) => (
                <SelectItem key={tone} value={tone}>
                  {t("tone", { tone })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {platforms.length === 0 ? null : (
          <div className="flex flex-col gap-2">
            <Label htmlFor={platformId}>{t("writeFit")}</Label>
            <Select
              items={[
                { label: t("anyPlatform"), value: anything },
                ...platforms.map((platform) => ({
                  label: tPosts("platform", { platform }),
                  value: platform,
                })),
              ]}
              value={choices.platform ?? anything}
              onValueChange={(platform) => {
                setChoices((current) => ({
                  ...current,
                  platform: isPlatform(platform) ? platform : null,
                }));
              }}
            >
              <SelectTrigger id={platformId} className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={anything}>{t("anyPlatform")}</SelectItem>
                {platforms.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {tPosts("platform", { platform })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={blank}>
          {t("write")}
        </Button>
      </DialogFooter>
    </form>
  );
};
