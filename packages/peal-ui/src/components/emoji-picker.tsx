"use client";

import { EmojiPicker as EmojiPickerPrimitive } from "frimousse";
import type {
  EmojiPickerListCategoryHeaderProps,
  EmojiPickerListEmojiProps,
  EmojiPickerListRowProps,
} from "frimousse";
import { LoaderIcon, SearchIcon } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils";

const EmojiPicker = ({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Root>) => (
  <EmojiPickerPrimitive.Root
    className={cn(
      "bg-popover text-popover-foreground isolate flex h-full w-fit flex-col overflow-hidden rounded-md",
      className
    )}
    data-slot="emoji-picker"
    {...props}
  />
);

// The search field: its label and placeholder are the page's.
const EmojiPickerSearch = ({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Search>) => (
  <div
    className={cn("flex h-9 items-center gap-2 border-b px-3", className)}
    data-slot="emoji-picker-search-wrapper"
  >
    <SearchIcon aria-hidden className="size-4 shrink-0 opacity-50" />
    <EmojiPickerPrimitive.Search
      className="placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
      data-slot="emoji-picker-search"
      {...props}
    />
  </div>
);

const EmojiPickerRow = ({ children, ...props }: EmojiPickerListRowProps) => (
  <div {...props} className="scroll-my-1 px-1" data-slot="emoji-picker-row">
    {children}
  </div>
);

const EmojiPickerEmoji = ({
  emoji,
  className,
  ...props
}: EmojiPickerListEmojiProps) => (
  <button
    type="button"
    {...props}
    className={cn(
      "data-[active]:bg-accent flex size-7 items-center justify-center rounded-sm text-base",
      className
    )}
    data-slot="emoji-picker-emoji"
  >
    {emoji.emoji}
  </button>
);

// Names a category from the label the emoji data gives it.
const CategoryLabel = React.createContext((label: string) => label);

const EmojiPickerCategoryHeader = ({
  category,
  ...props
}: EmojiPickerListCategoryHeaderProps) => (
  <div
    {...props}
    className="bg-popover text-muted-foreground px-3 pt-3.5 pb-2 text-xs leading-none"
    data-slot="emoji-picker-category-header"
  >
    {React.use(CategoryLabel)(category.label)}
  </div>
);

const listComponents = {
  CategoryHeader: EmojiPickerCategoryHeader,
  Emoji: EmojiPickerEmoji,
  Row: EmojiPickerRow,
};

const EmojiPickerContent = ({
  categoryLabel,
  className,
  emptyLabel,
  loadingLabel,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Viewport> & {
  /** A category's name, from the label the emoji data gives it. */
  categoryLabel: (label: string) => string;
  /** What the list says when the search finds nothing. */
  emptyLabel: string;
  /** What a screen reader hears while the emoji data loads. */
  loadingLabel: string;
}) => (
  <EmojiPickerPrimitive.Viewport
    className={cn("relative flex-1 outline-hidden", className)}
    data-slot="emoji-picker-viewport"
    {...props}
  >
    <EmojiPickerPrimitive.Loading
      className="text-muted-foreground absolute inset-0 flex items-center justify-center"
      data-slot="emoji-picker-loading"
    >
      <LoaderIcon aria-hidden className="size-4 animate-spin" />
      <span className="sr-only">{loadingLabel}</span>
    </EmojiPickerPrimitive.Loading>
    <EmojiPickerPrimitive.Empty
      className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm"
      data-slot="emoji-picker-empty"
    >
      {emptyLabel}
    </EmojiPickerPrimitive.Empty>
    <CategoryLabel value={categoryLabel}>
      <EmojiPickerPrimitive.List
        className="pb-1 select-none"
        components={listComponents}
        data-slot="emoji-picker-list"
      />
    </CategoryLabel>
  </EmojiPickerPrimitive.Viewport>
);

const EmojiPickerFooter = ({
  className,
  placeholder,
  ...props
}: React.ComponentProps<"div"> & {
  /** What the footer says while no emoji is hovered or selected. */
  placeholder: string;
}) => (
  <div
    className={cn(
      "flex w-full max-w-(--frimousse-viewport-width) min-w-0 items-center gap-1 border-t p-2",
      className
    )}
    data-slot="emoji-picker-footer"
    {...props}
  >
    <EmojiPickerPrimitive.ActiveEmoji>
      {({ emoji }) =>
        emoji ? (
          <>
            <div className="flex size-7 flex-none items-center justify-center text-lg">
              {emoji.emoji}
            </div>
            <span className="text-secondary-foreground truncate text-xs">
              {emoji.label}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground ml-1.5 flex h-7 items-center truncate text-xs">
            {placeholder}
          </span>
        )
      }
    </EmojiPickerPrimitive.ActiveEmoji>
  </div>
);

export {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
};

export { defaultEmojiDataResolver } from "frimousse";

export type { EmojiData, EmojiDataResolver } from "frimousse";
