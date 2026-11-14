"use client";

import type { Editor } from "@tiptap/core";
import { useTranslations } from "next-intl";
import type { SocialChannel } from "peal-contract";
import { Button } from "peal-ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "peal-ui/components/tabs";
import { useState } from "react";
import type { ReactNode } from "react";

import { PlainTextEditor } from "#components/posts/plain-text-editor.tsx";

const allChannels = "all";

interface TextTabsProps {
  /**
   * What a channel's tab shows under its text of its own: its media of its
   * own, when the composer offers them.
   */
  readonly renderChannelMedia?:
    | ((channel: SocialChannel) => ReactNode)
    | undefined;
  /** Hears a text's editor take the focus. */
  readonly onEditorFocus?: ((editor: Editor) => void) | undefined;
  /** Hears the editor of the text for all channels made. */
  readonly onMainEditor?: ((editor: Editor) => void) | undefined;
  readonly onOverride: (channelId: string, text: string | undefined) => void;
  /** Takes files pasted into a text, as `PlainTextEditor`'s. */
  readonly onPasteFiles?: ((files: readonly File[]) => boolean) | undefined;
  readonly onText: (text: string) => void;
  readonly overrides: Readonly<Record<string, string>>;
  readonly readOnly: boolean;
  readonly selected: readonly SocialChannel[];
  readonly text: string;
}

interface OverrideEditorProps {
  readonly channel: SocialChannel;
  readonly onEditorFocus: TextTabsProps["onEditorFocus"];
  readonly onOverride: TextTabsProps["onOverride"];
  readonly onPasteFiles: TextTabsProps["onPasteFiles"];
  readonly readOnly: boolean;
  readonly value: string;
}

// The text a post has on one channel instead of the common one. Clearing it
// goes back to the common text; so does the reset button, which starts a
// fresh editor.
const OverrideEditor = ({
  channel,
  onEditorFocus,
  onOverride,
  onPasteFiles,
  readOnly,
  value,
}: OverrideEditorProps) => {
  const t = useTranslations("Posts.Composer");
  const [resets, setResets] = useState(0);
  const labelId = `override-label-${channel.id}`;

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="sr-only">
        {t("overrideLabel", { handle: channel.handle })}
      </span>
      <PlainTextEditor
        key={resets}
        id={`override-${channel.id}`}
        labelledBy={labelId}
        describedBy={`${labelId}-hint`}
        placeholder={t("overridePlaceholder")}
        readOnly={readOnly}
        value={value}
        onChange={(text) => {
          onOverride(channel.id, text);
        }}
        onEditorFocus={onEditorFocus}
        onPasteFiles={onPasteFiles}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${labelId}-hint`} className="text-muted-foreground text-xs">
          {value.trim() === "" ? t("usesCommonText") : null}
        </p>
        {value === "" || readOnly ? null : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onOverride(channel.id, undefined);
              setResets((count) => count + 1);
            }}
          >
            {t("resetOverride")}
          </Button>
        )}
      </div>
    </div>
  );
};

// The post's text for all channels, and a tab per selected channel for a
// text, and media, of its own there.
export const TextTabs = ({
  onEditorFocus,
  onMainEditor,
  onOverride,
  onPasteFiles,
  onText,
  overrides,
  readOnly,
  renderChannelMedia,
  selected,
  text,
}: TextTabsProps) => {
  const t = useTranslations("Posts.Composer");
  const [tab, setTab] = useState(allChannels);

  // A tab whose channel was unselected falls back to the common text.
  const active = selected.some(({ id }) => id === tab) ? tab : allChannels;

  return (
    <Tabs
      value={active}
      onValueChange={(value) => {
        setTab(String(value));
      }}
    >
      <TabsList>
        <TabsTrigger value={allChannels}>{t("allChannels")}</TabsTrigger>
        {selected.map((channel) => (
          <TabsTrigger key={channel.id} value={channel.id}>
            {channel.handle}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={allChannels}>
        <div className="flex flex-col gap-2">
          <span id="text-label" className="sr-only">
            {t("textLabel")}
          </span>
          <PlainTextEditor
            id="post-text"
            labelledBy="text-label"
            describedBy="text-hint"
            placeholder={t("textPlaceholder")}
            readOnly={readOnly}
            value={text}
            onChange={onText}
            onEditorFocus={onEditorFocus}
            onEditorReady={onMainEditor}
            onPasteFiles={onPasteFiles}
          />
          <p id="text-hint" className="text-muted-foreground text-xs">
            {t("textHint")}
          </p>
        </div>
      </TabsContent>
      {selected.map((channel) => (
        <TabsContent key={channel.id} value={channel.id}>
          <div className="flex flex-col gap-4">
            <OverrideEditor
              channel={channel}
              onEditorFocus={onEditorFocus}
              onPasteFiles={onPasteFiles}
              onOverride={onOverride}
              readOnly={readOnly}
              value={overrides[channel.id] ?? ""}
            />
            {renderChannelMedia?.(channel)}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
};
