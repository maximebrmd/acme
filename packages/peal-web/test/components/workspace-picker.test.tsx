import { describe, expect, it } from "@effect/vitest";
import { constVoid } from "effect/Function";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { WorkspacePickerView } from "#components/oauth/workspace-picker.tsx";
import { loadMessages } from "#i18n/messages.ts";

const workspaces = [
  { id: "studio", name: "Studio", role: "owner" },
  { id: "shop", name: "Shop", role: "editor" },
];

const render = async (
  props: Partial<ComponentProps<typeof WorkspacePickerView>>
) => {
  const messages = await loadMessages("en");

  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages}>
      <WorkspacePickerView
        failed={false}
        onPick={() => constVoid}
        picking={null}
        workspaces={workspaces}
        {...props}
      />
    </NextIntlClientProvider>
  );
};

// What each button reads, in order.
const buttonTexts = (html: string) =>
  [...html.matchAll(/<button[^>]*>(?<text>[^<]*)<\/button>/gu)].map(
    (match) => match.groups?.["text"] ?? ""
  );

describe(WorkspacePickerView, () => {
  it("names each workspace on its button", async () => {
    expect(buttonTexts(await render({}))).toStrictEqual([
      "Use Studio",
      "Use Shop",
    ]);
  });

  it("tells which workspace is being picked, and keeps the others' names", async () => {
    const html = await render({ picking: "shop" });

    expect(buttonTexts(html)).toStrictEqual(["Use Studio", "Continuing…"]);
    // Every button waits, and stays focusable.
    expect(html.match(/aria-disabled="true"/gu)).toHaveLength(2);
  });
});
