"use client";

import { useTranslations } from "next-intl";
import type { Channel, MediaAttachment, Platform } from "peal-contract";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import { useId } from "react";

import { MediaAttachments } from "#components/posts/media-attachments.tsx";
import type { AttachedMedia } from "#posts/media-fit.ts";

interface ChannelMediaFieldProps {
  readonly canBrowse: boolean;
  readonly canGenerate: boolean;
  readonly canUpload: boolean;
  readonly channel: Channel;
  readonly disabled: boolean;
  readonly editable: boolean;
  /**
   * Changes the channel's own media, from what they are now; `undefined`
   * gives it the post's media again.
   */
  readonly onChange: (
    update: (
      current: readonly MediaAttachment[]
    ) => readonly MediaAttachment[] | undefined
  ) => void;
  /** The channel's own media, with their files once loaded; none while it shows the post's. */
  readonly own: readonly AttachedMedia[] | undefined;
  /** Its platform, when it shows alt text with the options it has. */
  readonly platforms: readonly Platform[];
  /** The post's own media, which the channel's start from. */
  readonly postMedia: readonly MediaAttachment[];
  /** Neither the channel nor the post has a text, which its media need. */
  readonly waitingForText: boolean;
  readonly workspaceId: string;
}

/**
 * Under a channel's text of its own: whether it shows images and videos of
 * its own instead of the post's, and which, in order, with their alt text.
 * Turned on, it starts from the post's media; turned off, it shows the
 * post's again.
 */
export const ChannelMediaField = ({
  canBrowse,
  canGenerate,
  canUpload,
  channel,
  disabled,
  editable,
  onChange,
  own,
  platforms,
  postMedia,
  waitingForText,
  workspaceId,
}: ChannelMediaFieldProps) => {
  const t = useTranslations("Posts.Composer");
  const id = useId();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <Checkbox
          id={id}
          checked={own !== undefined}
          disabled={disabled || !editable}
          aria-describedby={`${id}-hint`}
          onCheckedChange={(next) => {
            onChange(() => (next === true ? postMedia : undefined));
          }}
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor={id}>
            {t("ownMedia", { handle: channel.handle })}
          </Label>
          <p id={`${id}-hint`} className="text-muted-foreground text-xs">
            {own === undefined ? t("ownMediaOff") : t("ownMediaOn")}
          </p>
        </div>
      </div>
      {own === undefined ? null : (
        <MediaAttachments
          attached={own}
          canBrowse={canBrowse}
          canGenerate={canGenerate}
          canUpload={canUpload}
          disabled={disabled}
          editable={editable}
          label={t("ownMediaList", { handle: channel.handle })}
          platforms={platforms}
          workspaceId={workspaceId}
          onChange={(update) => {
            onChange((current) => update(current));
          }}
        />
      )}
      {waitingForText ? (
        <output className="text-destructive text-xs">
          {t("ownMediaNeedsText")}
        </output>
      ) : null}
    </div>
  );
};
