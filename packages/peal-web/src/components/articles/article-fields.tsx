"use client";

import type { JSONContent } from "@tiptap/core";
import { useTranslations } from "next-intl";
import type { Channel, Media } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { Textarea } from "peal-ui/components/textarea";
import { useId } from "react";
import type { ChangeEvent } from "react";

import type { ArticleDraft } from "#articles/article-draft.ts";
import { RichTextEditor } from "#components/articles/rich-text-editor.tsx";
import { MediaPicker } from "#components/posts/media-picker.tsx";

interface ArticleFieldsProps {
  readonly draft: ArticleDraft;
  /** Whether the article may still choose its site: a new one. */
  readonly choosesSite: boolean;
  readonly onChange: (change: Partial<ArticleDraft>) => void;
  readonly readOnly: boolean;
  /** Whether the time and the site's status may be chosen. */
  readonly schedules: boolean;
  readonly sites: readonly Channel[];
  readonly timeZone: string;
  readonly workspaceId: string;
}

const siteStatuses = ["publish", "draft", "future"] as const;

const isSiteStatus = (value: string): value is ArticleDraft["siteStatus"] =>
  siteStatuses.some((status) => status === value);

const selectClass =
  "border-input h-9 rounded-md border bg-transparent px-2 text-sm";

/** The article's fields: what it says, and how and when it goes out. */
export const ArticleFields = ({
  choosesSite,
  draft,
  onChange,
  readOnly,
  schedules,
  sites,
  timeZone,
  workspaceId,
}: ArticleFieldsProps) => {
  const t = useTranslations("Articles.editor");
  const id = useId();

  const text =
    (field: "categories" | "excerpt" | "tags" | "time" | "title") =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [field]: event.target.value });
    };

  const handleSite = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange({ channelId: event.target.value });
  };

  const handleStatus = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;

    if (isSiteStatus(next)) {
      onChange({ siteStatus: next });
    }
  };

  const handleBody = (body: JSONContent) => {
    onChange({ body });
  };

  const handleCover = (picked: readonly Media[]) => {
    onChange({ cover: picked[0]?.id ?? null });
  };

  const handleRemoveCover = () => {
    onChange({ cover: null });
  };

  return (
    <div className="flex flex-col gap-6">
      {choosesSite ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-site`}>{t("site")}</Label>
          <select
            id={`${id}-site`}
            className={selectClass}
            value={draft.channelId}
            onChange={handleSite}
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.label ?? site.displayName ?? site.handle}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-title`}>{t("title")}</Label>
        <Input
          id={`${id}-title`}
          value={draft.title}
          onChange={text("title")}
          readOnly={readOnly}
          maxLength={500}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span id={`${id}-body`} className="text-sm font-medium">
          {t("body")}
        </span>
        <RichTextEditor
          labelledBy={`${id}-body`}
          onChange={handleBody}
          readOnly={readOnly}
          value={draft.body}
          workspaceId={workspaceId}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-excerpt`}>{t("excerpt")}</Label>
        <Textarea
          id={`${id}-excerpt`}
          value={draft.excerpt}
          onChange={text("excerpt")}
          readOnly={readOnly}
          maxLength={1000}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-tags`}>{t("tags")}</Label>
          <Input
            id={`${id}-tags`}
            value={draft.tags}
            onChange={text("tags")}
            readOnly={readOnly}
            aria-describedby={`${id}-terms`}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-categories`}>{t("categories")}</Label>
          <Input
            id={`${id}-categories`}
            value={draft.categories}
            onChange={text("categories")}
            readOnly={readOnly}
            aria-describedby={`${id}-terms`}
          />
        </div>
        <p
          id={`${id}-terms`}
          className="text-muted-foreground text-xs sm:col-span-2"
        >
          {t("termsHint")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{t("cover")}</span>
        <MediaPicker
          accepts={(media) => media.kind === "image"}
          attached={draft.cover === null ? [] : [draft.cover]}
          disabled={readOnly}
          onPick={handleCover}
          room={1}
          workspaceId={workspaceId}
        />
        {draft.cover === null ? (
          <span className="text-muted-foreground text-sm">{t("noCover")}</span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={readOnly}
            onClick={handleRemoveCover}
          >
            {t("removeCover")}
          </Button>
        )}
      </div>
      {schedules ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-status`}>{t("siteStatus")}</Label>
            <select
              id={`${id}-status`}
              className={selectClass}
              value={draft.siteStatus}
              onChange={handleStatus}
              disabled={readOnly}
            >
              {siteStatuses.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-at`}>{t("at")}</Label>
            <Input
              id={`${id}-at`}
              type="datetime-local"
              value={draft.time}
              onChange={text("time")}
              readOnly={readOnly}
              aria-describedby={`${id}-at-hint`}
            />
            <p id={`${id}-at-hint`} className="text-muted-foreground text-xs">
              {t("atHint", { zone: timeZone })}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};
