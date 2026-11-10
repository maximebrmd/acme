"use client";

import { useTranslations } from "next-intl";
import { maxTagNameLength, TagColourSchema } from "peal-contract";
import type { Tag as WorkspaceTag } from "peal-contract";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { Tag, TagDot } from "peal-ui/components/tag";
import type { ReactNode } from "react";

import { SavedItemErrorAlert } from "#components/settings/saved-item-error.tsx";
import type { SavedItemError } from "#settings/saved-item-error.ts";
import type { TagDraft } from "#tags/post-tags.ts";

// The views of a workspace's tags: what a tag, a list of them and a tag's
// form look like, whatever fetched them. The settings page's state lives
// in tags-settings.tsx.

/** Some tags, each with its colour and its name; nothing for none. */
export const TagList = ({
  label,
  tags,
}: {
  /** What the list is, for assistive technology. */
  readonly label: string;
  readonly tags: readonly WorkspaceTag[];
}) =>
  tags.length === 0 ? null : (
    <ul aria-label={label} className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <li key={tag.id} className="flex max-w-full">
          <Tag colour={tag.colour}>{tag.name}</Tag>
        </li>
      ))}
    </ul>
  );

/**
 * A tag's form: its name, and its colour among the palette, each colour a
 * radio button named in the reader's language.
 */
export const TagFieldsView = ({
  disabled,
  draft,
  error,
  idPrefix,
  onChange,
}: {
  readonly disabled: boolean;
  readonly draft: TagDraft;
  readonly error: SavedItemError | null;
  /** Tells this form's fields from another's on the page. */
  readonly idPrefix: string;
  readonly onChange: (draft: TagDraft) => void;
}) => {
  const t = useTranslations("Tags");
  const nameId = `${idPrefix}-tag-name`;

  return (
    <div className="flex flex-col gap-4">
      <SavedItemErrorAlert error={error} kind="tag" />
      <div className="flex max-w-sm flex-col gap-2">
        <Label htmlFor={nameId}>{t("name")}</Label>
        <Input
          id={nameId}
          value={draft.name}
          maxLength={maxTagNameLength}
          disabled={disabled}
          required
          aria-describedby={`${nameId}-hint`}
          onChange={(event) => {
            onChange({ ...draft, name: event.target.value });
          }}
        />
        <p id={`${nameId}-hint`} className="text-muted-foreground text-xs">
          {t("nameHint", { max: maxTagNameLength })}
        </p>
      </div>
      <fieldset disabled={disabled}>
        <legend className="mb-2 text-sm font-medium">{t("colour")}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {TagColourSchema.literals.map((colour) => {
            const id = `${idPrefix}-tag-colour-${colour}`;

            return (
              <div key={colour} className="flex items-center gap-2">
                <input
                  id={id}
                  type="radio"
                  name={`${idPrefix}-tag-colour`}
                  className="accent-primary"
                  checked={draft.colour === colour}
                  onChange={() => {
                    onChange({ ...draft, colour });
                  }}
                />
                <label
                  htmlFor={id}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <TagDot colour={colour} />
                  {t("colourName", { colour })}
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
};

/**
 * One of the workspace's tags: its colour and name, what a member may do
 * to it (`actions`), and what they opened under it (`children`).
 */
export const TagItemView = ({
  actions,
  children,
  nameId,
  tag,
}: {
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
  /** The id of the tag's name, which names its actions. */
  readonly nameId?: string;
  readonly tag: WorkspaceTag;
}) => {
  const t = useTranslations("Tags");

  return (
    <li className="flex flex-col gap-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <Tag id={nameId} colour={tag.colour}>
            {tag.name}
          </Tag>
          <span className="text-muted-foreground text-xs">
            {t("colourName", { colour: tag.colour })}
          </span>
        </span>
        {actions === undefined ? null : (
          <div className="flex flex-wrap gap-2">{actions}</div>
        )}
      </div>
      {children}
    </li>
  );
};
