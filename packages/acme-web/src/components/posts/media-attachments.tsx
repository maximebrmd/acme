"use client";

import type { MediaAttachment } from "acme-contract";
import { Input } from "acme-ui/components/input";
import { Label } from "acme-ui/components/label";
import { useTranslations } from "next-intl";

interface MediaAttachmentsProps {
  readonly disabled: boolean;
  readonly media: readonly MediaAttachment[];
  readonly onChange: (media: readonly MediaAttachment[]) => void;
}

// The images and videos the post shows, in order, each with its alt text.
//
// The seam for the media library: once the media API can upload and list a
// workspace's assets, a picker goes here and appends `{ mediaId, altText }`
// to `media`. The post's content, the API and the server's checks already
// carry them; until then the server accepts no media id, and nothing here
// pretends to upload.
export const MediaAttachments = ({
  disabled,
  media,
  onChange,
}: MediaAttachmentsProps) => {
  const t = useTranslations("Posts.Composer");

  return (
    <div className="flex flex-col gap-3">
      {media.length === 0 ? null : (
        <ol className="flex flex-col gap-2">
          {media.map((attachment, position) => {
            const id = `alt-${attachment.mediaId}`;

            return (
              <li key={attachment.mediaId} className="flex flex-col gap-2">
                <Label htmlFor={id}>{t("altTextLabel")}</Label>
                <Input
                  id={id}
                  value={attachment.altText}
                  disabled={disabled}
                  onChange={(event) => {
                    onChange(
                      media.map((item, index) =>
                        index === position
                          ? { ...item, altText: event.target.value }
                          : item
                      )
                    );
                  }}
                />
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-muted-foreground text-sm">
        {media.length === 0
          ? t("mediaUnavailable")
          : t("mediaAttached", { count: media.length })}
      </p>
    </div>
  );
};
