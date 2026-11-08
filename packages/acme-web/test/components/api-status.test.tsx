import { describe, expect, it } from "@effect/vitest";
import { constVoid } from "effect/Function";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ApiStatusView } from "#components/api-status.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (props: ComponentProps<typeof ApiStatusView>) => {
  const messages = await loadMessages("en");

  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ApiStatusView {...props} />
    </NextIntlClientProvider>
  );
};

describe(ApiStatusView, () => {
  // A natively disabled button drops keyboard focus to the document.
  it("keeps the button focusable while a check runs", async () => {
    const html = await render({
      checking: true,
      onCheck: constVoid,
      status: "healthy",
    });

    expect(html).toMatch(/<button[^>]*aria-disabled="true"/u);
    expect(html).not.toMatch(/<button[^>]*\sdisabled[\s=>]/u);
  });

  it("announces that a check runs, then how it ended", async () => {
    const checking = await render({
      checking: true,
      onCheck: constVoid,
      status: "healthy",
    });

    const done = await render({ onCheck: constVoid, status: "healthy" });

    expect(checking).toContain('<output class="sr-only">Checking…</output>');
    expect(done).toContain(
      '<output class="sr-only">The server answered its health check.</output>'
    );
  });
});
