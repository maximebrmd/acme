"use client";

import { Extension } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { UndoRedo } from "@tiptap/extensions";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect } from "react";

// A Tiptap editor that holds plain text only: paragraphs of text, no marks,
// no nodes for mentions or tags. Each line is a paragraph, so the text reads
// back with one line break between paragraphs.

/** The editor's document for a plain text. */
export const documentOf = (text: string): JSONContent => ({
  content: text.split("\n").map((line) => ({
    content: line === "" ? [] : [{ text: line, type: "text" }],
    type: "paragraph",
  })),
  type: "doc",
});

const lineBreak = "\n";

// Mentions, hashtags and links stand out while the user types, and stay
// plain text in what the editor reads back.
const highlighted =
  /(?<![\p{L}\p{N}_])[#@][\p{L}\p{N}_.]*[\p{L}\p{N}_]|https?:\/\/\S+/gu;

const highlightKey = new PluginKey("plainTextHighlight");

const Highlight = Extension.create({
  addProseMirrorPlugins: () => [
    new Plugin({
      key: highlightKey,
      props: {
        decorations: (state) => {
          const decorations: Decoration[] = [];

          state.doc.descendants((node, position) => {
            const { text } = node;

            if (text === undefined) {
              return;
            }

            for (const match of text.matchAll(highlighted)) {
              const from = position + match.index;

              decorations.push(
                Decoration.inline(from, from + match[0].length, {
                  class: "rounded-sm bg-accent text-accent-foreground",
                })
              );
            }
          });

          return DecorationSet.create(state.doc, decorations);
        },
      },
    }),
  ],
  name: "plainTextHighlight",
});

const extensions = [Document, Paragraph, Text, UndoRedo, Highlight];

interface PlainTextEditorProps {
  /** The element whose text describes the editor. */
  readonly describedBy: string;
  readonly id: string;
  readonly labelledBy: string;
  readonly onChange: (text: string) => void;
  readonly placeholder: string;
  readonly readOnly?: boolean;
  /** The text the editor starts with; later changes come from the user. */
  readonly value: string;
}

export const PlainTextEditor = ({
  describedBy,
  id,
  labelledBy,
  onChange,
  placeholder,
  readOnly = false,
  value,
}: PlainTextEditorProps) => {
  const attributes = {
    "aria-describedby": describedBy,
    "aria-labelledby": labelledBy,
    "aria-multiline": "true",
    // The placeholder drawn over the editor is hidden from screen readers,
    // which read this instead.
    "aria-placeholder": placeholder,
    "aria-readonly": readOnly ? "true" : "false",
    class:
      "min-h-32 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base whitespace-pre-wrap outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
    id,
    role: "textbox",
  };

  const editor = useEditor({
    content: documentOf(value),
    editable: !readOnly,
    editorProps: { attributes },
    extensions,
    // Rendered on the server too: the editor mounts in the browser.
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      onChange(current.getText({ blockSeparator: lineBreak }));
    },
  });

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  return (
    <div className="relative">
      {value === "" ? (
        <span
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-2 left-2.5 text-base md:text-sm"
        >
          {placeholder}
        </span>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
};
