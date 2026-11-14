"use client";

import { useAtomValue } from "@effect/atom-react";
import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import Image from "next/image";

import { mediaItem } from "#posts/attached-media.ts";

interface ArticleImageOptions {
  /** The workspace whose library the images come from. */
  readonly workspaceId: string;
}

const readText = Schema.decodeUnknownOption(Schema.String);

type Json = typeof Schema.Json.Type;

/** A text attribute of a node, or nothing. */
export const textAttribute = (
  attributes: Readonly<Record<string, Json>>,
  name: string
): string => Option.getOrElse(readText(attributes[name]), () => "");

// The image as the editor shows it: the library's file, at the address the
// media API gives it for a while, never one stored in the article.
const ArticleImageView = ({
  node,
  workspaceId,
}: ReactNodeViewProps & { readonly workspaceId: string }) => {
  const mediaId = textAttribute(node.attrs, "mediaId");
  const alt = textAttribute(node.attrs, "alt");
  const media = useAtomValue(mediaItem(workspaceId, mediaId));
  const url = AsyncResult.isSuccess(media) ? media.value.url : null;

  return (
    <NodeViewWrapper className="my-2" data-drag-handle="">
      {url === null ? (
        <div className="bg-muted text-muted-foreground rounded-md p-4 text-sm">
          {alt}
        </div>
      ) : (
        // The file comes from the workspace's media store, at an address
        // that works a while: it is shown as it is.
        <div className="bg-muted relative aspect-video overflow-hidden rounded-md">
          <Image
            src={url}
            alt={alt}
            fill
            unoptimized
            referrerPolicy="no-referrer"
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-contain"
          />
        </div>
      )}
    </NodeViewWrapper>
  );
};

/**
 * An image of the workspace's library in an article's body: the node the
 * server takes (`image`, with `mediaId` and `alt`), nothing else.
 */
export const ArticleImage = Node.create<ArticleImageOptions>({
  addAttributes: () => ({
    alt: { default: "" },
    mediaId: { default: null },
  }),
  addNodeView() {
    const { workspaceId } = this.options;

    return ReactNodeViewRenderer((props: ReactNodeViewProps) => (
      <ArticleImageView {...props} workspaceId={workspaceId} />
    ));
  },
  addOptions: () => ({ workspaceId: "" }),
  atom: true,
  draggable: true,
  group: "block",
  name: "image",
  renderHTML: ({ node }) => [
    "figure",
    { "data-media-id": textAttribute(node.attrs, "mediaId") },
  ],
});
