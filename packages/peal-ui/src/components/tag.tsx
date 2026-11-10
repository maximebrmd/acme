import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../lib/utils";

/** The colours of the theme's tag palette, by name. */
const tagColours = [
  "gray",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
] as const;

type TagColour = (typeof tagColours)[number];

const tagDotVariants = cva("inline-block size-2 shrink-0 rounded-full", {
  defaultVariants: { colour: "gray" },
  variants: {
    colour: {
      amber: "bg-tag-amber",
      blue: "bg-tag-blue",
      gray: "bg-tag-gray",
      green: "bg-tag-green",
      orange: "bg-tag-orange",
      pink: "bg-tag-pink",
      purple: "bg-tag-purple",
      red: "bg-tag-red",
      teal: "bg-tag-teal",
    },
  },
});

/** A tag's colour alone: a dot, hidden from assistive technology. */
const TagDot = ({
  className,
  colour,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof tagDotVariants>) => (
  <span
    aria-hidden="true"
    data-slot="tag-dot"
    className={cn(tagDotVariants({ colour }), className)}
    {...props}
  />
);

/**
 * A label filed on something: its colour as a dot, and its name, which
 * says what the colour cannot.
 */
const Tag = ({
  children,
  className,
  colour,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof tagDotVariants>) => (
  <span
    data-slot="tag"
    className={cn(
      "border-border text-foreground inline-flex h-5 w-fit max-w-full shrink-0 items-center gap-1.5 rounded-4xl border px-2 text-xs font-medium whitespace-nowrap",
      className
    )}
    {...props}
  >
    <TagDot colour={colour} />
    <span className="truncate">{children}</span>
  </span>
);

export { Tag, tagColours, TagDot };

export type { TagColour };
