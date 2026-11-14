"use client";

import type { ChainedCommands, Editor, JSONContent } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
  BoldIcon,
  CodeIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
  StrikethroughIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Media } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { Input } from "peal-ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "peal-ui/components/popover";
import { useId, useMemo, useState } from "react";
import type { ChangeEvent, SubmitEvent } from "react";

import { ArticleImage, textAttribute } from "#articles/article-image.tsx";
import { MediaPicker } from "#components/posts/media-picker.tsx";

// The article's editor: the nodes and marks the server takes and nothing
// else (headings 2 to 4, paragraphs, bold, italic, struck and code text,
// links, lists, quotes, rules, code blocks and the library's images).
// What a member pastes is read into those, and anything else dropped.

const extensionsFor = (workspaceId: string) => [
  StarterKit.configure({
    dropcursor: false,
    heading: { levels: [2, 3, 4] },
    link: {
      autolink: true,
      defaultProtocol: "https",
      openOnClick: false,
      protocols: ["https", "http", "mailto"],
    },
    underline: false,
  }),
  ArticleImage.configure({ workspaceId }),
];

type ToolName =
  | "blockquote"
  | "bold"
  | "bulletList"
  | "code"
  | "heading2"
  | "heading3"
  | "italic"
  | "orderedList"
  | "rule"
  | "strike";

interface ToolSpec {
  readonly apply: (chain: ChainedCommands) => ChainedCommands;
  readonly icon: LucideIcon;
  readonly isActive: (editor: Editor) => boolean;
  readonly name: ToolName;
}

const tools: readonly ToolSpec[] = [
  {
    apply: (chain) => chain.toggleHeading({ level: 2 }),
    icon: Heading2Icon,
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    name: "heading2",
  },
  {
    apply: (chain) => chain.toggleHeading({ level: 3 }),
    icon: Heading3Icon,
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    name: "heading3",
  },
  {
    apply: (chain) => chain.toggleBold(),
    icon: BoldIcon,
    isActive: (editor) => editor.isActive("bold"),
    name: "bold",
  },
  {
    apply: (chain) => chain.toggleItalic(),
    icon: ItalicIcon,
    isActive: (editor) => editor.isActive("italic"),
    name: "italic",
  },
  {
    apply: (chain) => chain.toggleStrike(),
    icon: StrikethroughIcon,
    isActive: (editor) => editor.isActive("strike"),
    name: "strike",
  },
  {
    apply: (chain) => chain.toggleCode(),
    icon: CodeIcon,
    isActive: (editor) => editor.isActive("code"),
    name: "code",
  },
  {
    apply: (chain) => chain.toggleBulletList(),
    icon: ListIcon,
    isActive: (editor) => editor.isActive("bulletList"),
    name: "bulletList",
  },
  {
    apply: (chain) => chain.toggleOrderedList(),
    icon: ListOrderedIcon,
    isActive: (editor) => editor.isActive("orderedList"),
    name: "orderedList",
  },
  {
    apply: (chain) => chain.toggleBlockquote(),
    icon: QuoteIcon,
    isActive: (editor) => editor.isActive("blockquote"),
    name: "blockquote",
  },
  {
    apply: (chain) => chain.setHorizontalRule(),
    icon: MinusIcon,
    isActive: () => false,
    name: "rule",
  },
];

const Tool = ({
  editor,
  readOnly,
  spec,
}: {
  readonly editor: Editor;
  readonly readOnly: boolean;
  readonly spec: ToolSpec;
}) => {
  const t = useTranslations("Articles.editor");

  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => spec.isActive(current),
  });

  const Icon = spec.icon;

  const handleClick = () => {
    spec.apply(editor.chain().focus()).run();
  };

  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={t(spec.name)}
      aria-pressed={active}
      disabled={readOnly}
      onClick={handleClick}
    >
      <Icon aria-hidden />
    </Button>
  );
};

// The link of the selection: its address typed, or none to remove it.
const LinkTool = ({
  editor,
  readOnly,
}: {
  readonly editor: Editor;
  readonly readOnly: boolean;
}) => {
  const t = useTranslations("Articles.editor");
  const id = useId();
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);

    if (next) {
      setHref(textAttribute(editor.getAttributes("link"), "href"));
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setHref(event.target.value);
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const chain = editor.chain().focus().extendMarkRange("link");

    if (href.trim() === "") {
      chain.unsetLink().run();
    } else {
      chain.setLink({ href: href.trim() }).run();
    }

    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("link")}
            disabled={readOnly}
          />
        }
      >
        <LinkIcon aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start">
        <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
          <label htmlFor={id} className="text-sm font-medium">
            {t("linkAddress")}
          </label>
          <Input
            id={id}
            type="url"
            value={href}
            onChange={handleChange}
            aria-describedby={`${id}-hint`}
          />
          <p id={`${id}-hint`} className="text-muted-foreground text-xs">
            {t("linkHint")}
          </p>
          <Button type="submit" size="sm">
            {t("linkApply")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
};

const Toolbar = ({
  editor,
  readOnly,
  workspaceId,
}: {
  readonly editor: Editor;
  readonly readOnly: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Articles.editor");

  const insertImages = (picked: readonly Media[]) => {
    for (const media of picked) {
      editor
        .chain()
        .focus()
        .insertContent({
          attrs: { alt: media.altText ?? "", mediaId: media.id },
          type: "image",
        })
        .run();
    }
  };

  return (
    <div
      role="toolbar"
      aria-label={t("toolbar")}
      className="flex flex-wrap items-center gap-1 border-b p-1"
    >
      {tools.map((spec) => (
        <Tool key={spec.name} editor={editor} readOnly={readOnly} spec={spec} />
      ))}
      <LinkTool editor={editor} readOnly={readOnly} />
      <MediaPicker
        accepts={(media) => media.kind === "image"}
        attached={[]}
        disabled={readOnly}
        onPick={insertImages}
        room={10}
        workspaceId={workspaceId}
      />
    </div>
  );
};

interface RichTextEditorProps {
  readonly labelledBy: string;
  readonly onChange: (document: JSONContent) => void;
  readonly readOnly: boolean;
  /** The document the editor starts with; later changes are the user's. */
  readonly value: JSONContent;
  readonly workspaceId: string;
}

/** The rich-text editor of an article's body. */
export const RichTextEditor = ({
  labelledBy,
  onChange,
  readOnly,
  value,
  workspaceId,
}: RichTextEditorProps) => {
  const extensions = useMemo(() => extensionsFor(workspaceId), [workspaceId]);

  const editor = useEditor({
    content: value,
    editable: !readOnly,
    editorProps: {
      attributes: {
        "aria-labelledby": labelledBy,
        "aria-multiline": "true",
        class:
          "min-h-64 px-3 py-2 text-sm outline-none [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
        role: "textbox",
      },
    },
    extensions,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      onChange(current.getJSON());
    },
  });

  return (
    <div className="rounded-lg border">
      {editor === null ? null : (
        <Toolbar
          editor={editor}
          readOnly={readOnly}
          workspaceId={workspaceId}
        />
      )}
      <EditorContent editor={editor} />
    </div>
  );
};
