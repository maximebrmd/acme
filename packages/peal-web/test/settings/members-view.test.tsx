import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MembersView } from "#components/settings/members-list.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (locale: "en" | "fr", view: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      {view}
    </NextIntlClientProvider>
  );

const members = [
  {
    id: "member-1",
    role: "owner",
    user: { email: "ana@example.test", name: "Ana" },
    userId: "ana",
  },
  {
    id: "member-2",
    role: "editor",
    user: { email: "ben@example.test", name: "Ben" },
    userId: "ben",
  },
];

const onChanged = () => {
  // Nothing changes while rendering to markup.
};

describe(MembersView, () => {
  it("offers an owner to change and remove others, but not themselves", async () => {
    const html = await render(
      "en",
      <MembersView
        manager={{
          mayRemove: true,
          mayUpdate: true,
          role: "owner",
          userId: "ana",
        }}
        members={members}
        workspaceId="workspace"
        onChanged={onChanged}
      />
    );

    expect(html).toContain("2 members");
    expect(html).toContain("Role of Ben");
    expect(html).toContain('aria-label="Remove Ben"');
    expect(html).not.toContain("Remove Ana");
    // Ana is the last owner: her role stays as it is.
    expect(html).not.toContain("Role of Ana");
  });

  it("shows a viewer the roles, in French, and nothing to change", async () => {
    const html = await render(
      "fr",
      <MembersView
        manager={{
          mayRemove: false,
          mayUpdate: false,
          role: "viewer",
          userId: "carl",
        }}
        members={members}
        workspaceId="workspace"
        onChanged={onChanged}
      />
    );

    expect(html).toContain("2 membres");
    expect(html).toContain("Propriétaire");
    expect(html).toContain("Éditeur");
    expect(html).not.toContain("Retirer");
  });
});
