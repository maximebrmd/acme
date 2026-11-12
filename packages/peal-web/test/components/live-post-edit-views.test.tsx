import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { LivePostEditView } from "#components/posts/live/live-post-edit-views.tsx";
import { loadMessages } from "#i18n/messages.ts";
import type { EditState } from "#posts/live-post.ts";

// What a member who may publish sees of editing a live post on a channel,
// in each state.

const renderState = async (
  locale: "en" | "fr",
  state: EditState,
  editedAt: Date | null = null
) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      <LivePostEditView
        busy={false}
        channelName="Notes (@notes@social.example)"
        editedAt={editedAt}
        options={undefined}
        platform="Mastodon"
        platformId="mastodon"
        state={state}
        texts={["Our field note."]}
        onSave={() => {
          // Nothing is asked while rendering to markup.
        }}
      />
    </NextIntlClientProvider>
  );

describe("editing a live post on a channel", () => {
  it("offers the edit where the platform lets Peal", async () => {
    await expect(renderState("en", { _tag: "offered" })).resolves.toContain(
      "Edit"
    );
    await expect(renderState("fr", { _tag: "offered" })).resolves.toContain(
      "Modifier"
    );
  });

  it("says an edit runs, and one that failed, with a way to ask again", async () => {
    await expect(renderState("en", { _tag: "editing" })).resolves.toContain(
      "Saving the change…"
    );
    await expect(renderState("fr", { _tag: "editing" })).resolves.toContain(
      "Enregistrement de la modification…"
    );

    const failed = await renderState("en", {
      _tag: "failed",
      code: "postGone",
    });

    expect(failed).toContain("The edit failed (postGone)");
    expect(failed).toContain("Try again");
    await expect(
      renderState("fr", { _tag: "failed", code: "postGone" })
    ).resolves.toContain("La modification a échoué (postGone)");
  });

  it("says when it was edited, and why a platform does not let Peal", async () => {
    await expect(
      renderState("en", { _tag: "offered" }, new Date("2026-06-16T10:00:00Z"))
    ).resolves.toContain("Edited on Jun 16, 2026");
    await expect(
      renderState("fr", { _tag: "offered" }, new Date("2026-06-16T10:00:00Z"))
    ).resolves.toContain("Modifié le 16 juin 2026");
    await expect(
      renderState("en", { _tag: "blocked", by: "unverified" })
    ).resolves.toContain("Peal does not edit posts on Mastodon yet.");
    await expect(renderState("en", { _tag: "none" })).resolves.toBe("");
    await expect(renderState("en", { _tag: "busy" })).resolves.toBe("");
  });
});
