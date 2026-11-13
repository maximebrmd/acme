"use client";

import type { Editor } from "@tiptap/core";
import { SmileIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";
import {
  defaultEmojiDataResolver,
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from "peal-ui/components/emoji-picker";
import type { EmojiDataResolver } from "peal-ui/components/emoji-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "peal-ui/components/popover";
import { useRef, useState } from "react";

import {
  categoryGroupOf,
  emojiDataPath,
  withCategoryGroups,
} from "#emoji/emoji-data.ts";

// Emojibase's data, from the web app itself (`emojiDataPath`), with each
// category named by its group for the catalogues. Kept at module level:
// the picker caches the data by its resolver.
const resolveEmojiData: EmojiDataResolver = async (locale, options) =>
  withCategoryGroups(await defaultEmojiDataResolver(locale, options));

const live = (editor: Editor | null) =>
  editor === null || editor.isDestroyed ? undefined : editor;

/**
 * Which of the composer's texts an emoji goes into: the one that last had
 * the focus (the text for all channels, a channel's own text, a part), else
 * the text for all channels.
 */
export const useEmojiTarget = () => {
  const editors = useRef<{ focused: Editor | null; main: Editor | null }>({
    focused: null,
    main: null,
  });

  return {
    handleFocus: (editor: Editor) => {
      editors.current.focused = editor;
    },
    handleMain: (editor: Editor) => {
      editors.current.main = editor;
    },
    target: () => live(editors.current.focused) ?? live(editors.current.main),
  };
};

/**
 * A button that opens the emoji picker, in the page's language. The emoji
 * chosen goes in at the caret of the target, through the editor's own
 * commands, so undo takes it back and the counters count it; the focus
 * then goes back there.
 */
export const EmojiMenu = ({
  disabled,
  target,
}: {
  readonly disabled: boolean;
  readonly target: () => Editor | undefined;
}) => {
  const t = useTranslations("Posts.Composer.emoji");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  // The editor an emoji just went into, which takes the focus back.
  const chosen = useRef<Editor | undefined>(undefined);

  const handleSelect = ({ emoji }: { readonly emoji: string }) => {
    const editor = target();

    editor?.chain().insertContent({ text: emoji, type: "text" }).run();
    chosen.current = editor;
    setOpen(false);
  };

  // Back to the text an emoji went into, at its caret; else as usual. The
  // editor's own focus restores its caret, and the popover's focus on the
  // element it is given then changes nothing.
  const handleFinalFocus = () => {
    const editor = live(chosen.current ?? null);

    chosen.current = undefined;

    if (editor === undefined) {
      return null;
    }

    editor.commands.focus();

    return editor.view.dom;
  };

  const categoryLabel = (label: string) => {
    const group = categoryGroupOf(label);

    return group === undefined ? label : t("category", { group });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label={t("open")}
            disabled={disabled}
            focusableWhenDisabled
          />
        }
      >
        <SmileIcon aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-fit"
        finalFocus={handleFinalFocus}
      >
        <EmojiPicker
          className="h-80"
          emojibaseUrl={emojiDataPath}
          locale={locale}
          resolveEmojiData={resolveEmojiData}
          onEmojiSelect={handleSelect}
        >
          <EmojiPickerSearch
            aria-label={t("search")}
            placeholder={t("searchPlaceholder")}
          />
          <EmojiPickerContent
            categoryLabel={categoryLabel}
            emptyLabel={t("empty")}
            loadingLabel={t("loading")}
          />
          <EmojiPickerFooter placeholder={t("footer")} />
        </EmojiPicker>
      </PopoverContent>
    </Popover>
  );
};
