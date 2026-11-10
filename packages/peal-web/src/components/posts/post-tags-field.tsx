"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { maxTagsPerPost } from "peal-contract";
import type { Permission, Tag } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "peal-ui/components/popover";
import { TagDot } from "peal-ui/components/tag";
import { useId, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { useSavedItemErrorText } from "#components/settings/saved-item-error.tsx";
import { TagList } from "#components/tags/tag-views.tsx";
import { CreateTagForm } from "#components/tags/tags-settings.tsx";
import { savedItemErrorOf } from "#settings/saved-item-error.ts";
import { tagPost, workspaceTags } from "#tags/atoms.ts";
import { hasRoomForTag, tagsOf, withTag } from "#tags/post-tags.ts";

/**
 * A post's tags, with what changes them (`editor`) for a member who may.
 */
export const PostTagsView = ({
  editor,
  tags,
}: {
  readonly editor?: ReactNode;
  /** The post's tags, among the workspace's. */
  readonly tags: readonly Tag[];
}) => {
  const t = useTranslations("Tags");
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="text-sm font-medium">
        {t("postTitle")}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        {tags.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("postEmpty")}</p>
        ) : (
          <TagList label={t("postTitle")} tags={tags} />
        )}
        {editor}
      </div>
    </section>
  );
};

/**
 * The workspace's tags, a box each, ticked for those of the post. A post
 * that has as many as it may takes no other until one is unticked.
 */
export const TagChoicesView = ({
  disabled,
  idPrefix,
  onToggle,
  tagIds,
  tags,
}: {
  readonly disabled: boolean;
  readonly idPrefix: string;
  readonly onToggle: (tagId: string, chosen: boolean) => void;
  readonly tagIds: readonly string[];
  readonly tags: readonly Tag[];
}) => {
  const t = useTranslations("Tags");
  const full = !hasRoomForTag(tagsOf(tagIds, tags).map(({ id }) => id));

  if (tags.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {tags.map((tag) => {
          const id = `${idPrefix}-tag-${tag.id}`;
          const chosen = tagIds.includes(tag.id);

          return (
            <li key={tag.id} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={chosen}
                disabled={disabled || (full && !chosen)}
                onCheckedChange={(checked) => {
                  onToggle(tag.id, checked);
                }}
              />
              <Label htmlFor={id} className="min-w-0">
                <TagDot colour={tag.colour} />
                <span className="truncate">{tag.name}</span>
              </Label>
            </li>
          );
        })}
      </ul>
      {full ? (
        <p className="text-muted-foreground text-xs">
          {t("postFull", { max: maxTagsPerPost })}
        </p>
      ) : null}
    </div>
  );
};

interface PostTagsFieldProps {
  /** Whether the tags can be changed now. */
  readonly disabled: boolean;
  /** Hears of the post's tags once the member changed them. */
  readonly onChange: (tagIds: readonly string[]) => void;
  readonly permissions: readonly Permission[];
  /**
   * The post whose tags are saved at once, each time one is ticked: a
   * post that is no longer written, whose tags still change. None while
   * the post is written: its tags are saved with it.
   */
  readonly savedOn: string | undefined;
  readonly tagIds: readonly string[];
  readonly workspaceId: string;
}

// The post's tags, once the workspace's are known.
const LoadedTags = ({
  disabled,
  onChange,
  permissions,
  savedOn,
  tagIds,
  tags,
  workspaceId,
}: PostTagsFieldProps & { readonly tags: readonly Tag[] }) => {
  const t = useTranslations("Tags");
  const explain = useSavedItemErrorText("tag");
  const idPrefix = useId();
  const file = useAtomSet(tagPost, { mode: "promiseExit" });
  const [isSaving, startSaving] = useTransition();
  const [creating, setCreating] = useState(false);
  const mayManage = permissions.includes("post:update");
  const editable = savedOn === undefined || mayManage;

  const change = (next: readonly string[]) => {
    if (savedOn === undefined) {
      onChange(next);

      return;
    }

    startSaving(async () => {
      const exit = await file({
        params: { postId: savedOn, workspaceId },
        payload: { tagIds: next },
        reactivityKeys: ["posts"],
      });

      if (Exit.isSuccess(exit)) {
        onChange(exit.value.tagIds);
      } else {
        Option.match(savedItemErrorOf(exit), {
          onNone: () => {
            // A failure always has a reason.
          },
          onSome: (error) => {
            toast.error(explain(error));
          },
        });
      }
    });
  };

  if (tags.length === 0 && !(editable && mayManage)) {
    return null;
  }

  const editor = editable ? (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        render={<Button variant="outline" size="sm" />}
      >
        {t("postEdit")}
      </PopoverTrigger>
      <PopoverContent align="start">
        <div className="flex flex-col gap-4">
          <TagChoicesView
            disabled={disabled || isSaving}
            idPrefix={idPrefix}
            tagIds={tagIds}
            tags={tags}
            onToggle={(tagId, chosen) => {
              change(withTag(tagIds, tags, tagId, chosen));
            }}
          />
          {mayManage ? (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              aria-expanded={creating}
              onClick={() => {
                setCreating(!creating);
              }}
            >
              {t("postCreate")}
            </Button>
          ) : null}
          {mayManage && creating ? (
            <CreateTagForm
              idPrefix={idPrefix}
              workspaceId={workspaceId}
              onCreated={(tag) => {
                setCreating(false);
                change(withTag(tagIds, [...tags, tag], tag.id, true));
              }}
            />
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  ) : undefined;

  return <PostTagsView tags={tagsOf(tagIds, tags)} editor={editor} />;
};

/**
 * The tags a post is filed under, and a way to change them: with the post
 * while it is written, or at once (`savedOn`) on a post that is scheduled
 * or went out, for members who may change posts. Nothing shows until the
 * workspace's tags are known, nor in a workspace without tags for a
 * member who cannot make one.
 */
export const PostTagsField = (props: PostTagsFieldProps) => {
  const tags = useAtomValue(workspaceTags(props.workspaceId));

  return AsyncResult.isSuccess(tags) ? (
    <LoadedTags {...props} tags={tags.value} />
  ) : null;
};
