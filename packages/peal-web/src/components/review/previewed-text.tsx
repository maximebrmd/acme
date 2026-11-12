"use client";

import type { ComponentProps } from "react";

/**
 * A post's text as a channel receives it, as plain text in the direction
 * it is written, line breaks kept; `empty` when there is none. The review
 * page and the composer's previews draw it the same way.
 */
export const PreviewedText = ({
  empty,
  text,
  ...props
}: ComponentProps<"p"> & {
  readonly empty: string;
  readonly text: string;
}) =>
  text === "" ? (
    <p className="text-muted-foreground text-sm">{empty}</p>
  ) : (
    <p dir="auto" className="break-words whitespace-pre-wrap" {...props}>
      {text}
    </p>
  );
