import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { constVoid } from "effect/Function";
import { NextIntlClientProvider } from "next-intl";
import type {
  SocialChannel,
  InboxComment,
  InboxReply,
  InboxThread,
} from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  CommentView,
  InboxEmptyView,
  ReplyAbilityNotice,
  ReplyBoxView,
  ReplyView,
  ThreadRowView,
} from "#components/inbox/inbox-views.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { replyFit } from "#inbox/reply-text.ts";

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

const at = (iso: string) => DateTime.makeUnsafe(iso);

// The texts among `expected` that the markup lacks.
const missingFrom = (html: string, expected: readonly string[]) =>
  expected.filter((text) => !html.includes(text));

const link = (href: string, label: string) => <a href={href}>{label}</a>;

const workspaceId = "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f";

const channel: SocialChannel = {
  avatarUrl: null,
  connection: null,
  displayName: "Peal example",
  handle: "@peal@social.example",
  id: "00000000-0000-7000-8000-0000000000c1",
  label: null,
  platform: "mastodon",
  status: { _tag: "active" },
  tokenExpiresAt: null,
};

const thread: InboxThread = {
  channelId: channel.id,
  collectionEnded: null,
  comments: 12,
  id: "00000000-0000-7000-8000-0000000000a1",
  lastCollectedAt: at("2026-11-10T09:07:00Z"),
  lastCommentAt: at("2026-11-10T08:30:00Z"),
  permalink: "https://social.example/@peal/1",
  postId: "00000000-0000-7000-8000-0000000000b1",
  publishedAt: at("2026-11-08T10:00:00Z"),
  targetId: "00000000-0000-7000-8000-0000000000b2",
  unanswered: 3,
};

const comment: InboxComment = {
  author: {
    displayName: "Ada Example",
    handle: "ada@social.example",
    platformId: "1001",
  },
  id: "00000000-0000-7000-8000-0000000000d1",
  liked: false,
  parentId: null,
  permalink: "https://social.example/@ada/2",
  receivedAt: at("2026-11-10T08:37:00Z"),
  state: "new",
  text: "When does it open?",
  threadId: thread.id,
  writtenAt: at("2026-11-10T08:30:00Z"),
};

const reply: InboxReply = {
  authorId: null,
  commentId: comment.id,
  createdAt: at("2026-11-10T09:00:00Z"),
  id: "00000000-0000-7000-8000-0000000000e1",
  permalink: null,
  reason: null,
  settledAt: null,
  status: "sending",
  text: "@ada@social.example On Monday.",
  threadId: thread.id,
};

describe(ThreadRowView, () => {
  it("shows a thread: its channel, what waits, and the ways to it", async () => {
    const html = await render(
      "en",
      <ul>
        <ThreadRowView
          channel={channel}
          link={link}
          thread={thread}
          workspaceId={workspaceId}
        />
      </ul>
    );

    expect(
      missingFrom(html, [
        `<a href="/app/${workspaceId}/inbox/${thread.id}">Comments under the post on @peal@social.example on Mastodon</a>`,
        "3 waiting of 12",
        "Latest comment on Nov 10, 2026, 8:30 AM",
        `<a href="/app/${workspaceId}/posts/${thread.postId}">Open the post</a>`,
        'href="https://social.example/@peal/1"',
        "View the post on the platform",
      ])
    ).toStrictEqual([]);
  });

  it("says why comments are no longer read, in French, without a channel", async () => {
    const html = await render(
      "fr",
      <ul>
        <ThreadRowView
          channel={undefined}
          link={link}
          thread={{
            ...thread,
            collectionEnded: "disconnected",
            permalink: null,
            unanswered: 0,
          }}
          workspaceId={workspaceId}
        />
      </ul>
    );

    expect(
      missingFrom(html, [
        "Commentaires sous la publication sur Un canal déconnecté",
        "0 en attente sur 12",
        "Ses commentaires ne sont plus lus : son canal a été déconnecté.",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("Voir la publication sur la plateforme");
  });

  it("links no address a platform gave that is not a web address", async () => {
    const html = await render(
      "en",
      <ul>
        <ThreadRowView
          channel={channel}
          link={link}
          thread={{ ...thread, permalink: "data:text/html,hello" }}
          workspaceId={workspaceId}
        />
      </ul>
    );

    expect(html).not.toContain("data:text/html");
    expect(html).not.toContain("View the post on the platform");
  });
});

describe(InboxEmptyView, () => {
  it("says what Peal collects, and for how long", async () => {
    await expect(
      render("en", <InboxEmptyView filtered={false} />)
    ).resolves.toContain(
      "Peal reads comments on Mastodon and Bluesky, and on Facebook, Instagram, YouTube, and LinkedIn where whoever runs Peal turned them on, for 30 days after a post went live unless whoever runs Peal set another window, and keeps them 30 days after that."
    );
    await expect(
      render("fr", <InboxEmptyView filtered={false} />)
    ).resolves.toContain(
      "Peal lit les commentaires sur Mastodon et Bluesky, et sur Facebook, Instagram, YouTube et LinkedIn là où la personne qui exploite Peal les a activés, pendant 30 jours après la mise en ligne d’une publication sauf si la personne qui exploite Peal a fixé une autre fenêtre, et les conserve 30 jours de plus."
    );
  });

  it("says when the filters alone leave nothing", async () => {
    const html = await render("en", <InboxEmptyView filtered />);

    expect(html).toContain("No post matches these filters.");
    expect(html).not.toContain("No comment has been read yet.");
  });
});

// A LinkedIn comment by `platformId`, which Peal keeps without a name.
const linkedinComment = (platformId: string) => (
  <ul>
    <CommentView
      comment={{
        ...comment,
        author: { displayName: null, handle: "", platformId },
      }}
      platform="linkedin"
    />
  </ul>
);

describe(CommentView, () => {
  it("shows who wrote, when, the state and the way to the platform", async () => {
    const html = await render(
      "en",
      <ul>
        <CommentView comment={comment} />
      </ul>
    );

    expect(
      missingFrom(html, [
        "Ada Example",
        "@ada@social.example",
        "When does it open?",
        ">New<",
        "Written on Nov 10, 2026, 8:30 AM",
        'href="https://social.example/@ada/2"',
        "View the comment on the platform",
      ])
    ).toStrictEqual([]);
  });

  it("isolates the direction of a name and a handle from what stands beside them", async () => {
    const html = await render(
      "en",
      <ul>
        <CommentView comment={comment} />
      </ul>
    );

    expect(html).toMatch(/<bdi[^>]*>Ada Example<\/bdi>/u);
    expect(html).toMatch(/<bdi[^>]*>@ada@social\.example<\/bdi>/u);
  });

  it("names a Facebook commenter by name alone, and one with neither as someone", async () => {
    const named = await render(
      "en",
      <ul>
        <CommentView
          comment={{
            ...comment,
            author: {
              displayName: "Ada Example",
              handle: "",
              platformId: "71",
            },
          }}
        />
      </ul>
    );

    expect(named).toMatch(/<bdi[^>]*>Ada Example<\/bdi>/u);
    expect(named).not.toMatch(/<bdi[^>]*>@<\/bdi>/u);

    const nameless = await render(
      "en",
      <ul>
        <CommentView
          comment={{
            ...comment,
            author: { displayName: null, handle: "", platformId: "71" },
          }}
        />
      </ul>
    );

    expect(nameless).toContain("Someone");
  });

  it("renders markup and Markdown in a comment as the text it is", async () => {
    const hostile: InboxComment = {
      ...comment,
      author: {
        displayName: "<i>Ada</i>",
        handle: "ada<script>@social.example",
        platformId: "1001",
      },
      text: '<b>bold</b> <img src=x onerror="alert(1)">\n**not bold** [link](https://phish.example)',
    };

    const html = await render(
      "en",
      <ul>
        <CommentView comment={hostile} />
      </ul>
    );

    expect(
      missingFrom(html, [
        "&lt;b&gt;bold&lt;/b&gt; &lt;img src=x onerror=&quot;alert(1)&quot;&gt;\n**not bold** [link](https://phish.example)",
        "&lt;i&gt;Ada&lt;/i&gt;",
        "@ada&lt;script&gt;@social.example",
        "whitespace-pre-wrap",
      ])
    ).toStrictEqual([]);

    for (const markup of [
      "<b>",
      "<img",
      "<i>",
      "<script",
      "<strong>",
      'href="https://phish.example"',
    ]) {
      expect(html).not.toContain(markup);
    }
  });

  it.each([
    { english: ">Answered<", french: ">Répondu<", state: "answered" },
    { english: ">Hidden<", french: ">Masqué<", state: "hidden" },
    { english: ">New<", french: ">Nouveau<", state: "new" },
  ] as const)("badges a comment $state", async ({ english, french, state }) => {
    const view = (
      <ul>
        <CommentView comment={{ ...comment, state }} />
      </ul>
    );

    await expect(render("en", view)).resolves.toContain(english);
    await expect(render("fr", view)).resolves.toContain(french);
  });

  it("says a deleted comment is gone, and links nothing of it", async () => {
    const view = (
      <ul>
        <CommentView
          comment={{
            ...comment,
            author: null,
            state: "deleted",
            text: "",
          }}
        />
      </ul>
    );

    const html = await render("en", view);

    expect(
      missingFrom(html, [
        "This comment is no longer on the platform",
        ">Deleted<",
        "Someone",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("View the comment on the platform");
    await expect(render("fr", view)).resolves.toContain(
      "Ce commentaire n’est plus sur la plateforme"
    );
  });

  it("names a LinkedIn commenter a member or a page, as Peal keeps no name", async () => {
    await expect(
      render("en", linkedinComment("urn:li:person:syntheticMember1"))
    ).resolves.toContain("A LinkedIn member");
    await expect(
      render("fr", linkedinComment("urn:li:organization:9000000002"))
    ).resolves.toContain("Une page LinkedIn");
  });

  it("says a comment forgotten for its age is no longer kept, naming its platform", async () => {
    const forgotten: InboxComment = {
      ...comment,
      author: null,
      forgotten: "expired",
      state: "deleted",
      text: "",
    };

    const view = (platform: "youtube" | null) => (
      <ul>
        <CommentView comment={forgotten} platform={platform} />
      </ul>
    );

    const html = await render("en", view("youtube"));

    expect(
      missingFrom(html, [
        "No longer kept: YouTube lets Peal keep a comment for a limited time.",
        ">No longer kept<",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("This comment is no longer on the platform");
    await expect(render("fr", view("youtube"))).resolves.toContain(
      "Plus conservé : YouTube ne laisse Peal conserver un commentaire que pour un temps limité."
    );
    await expect(render("en", view(null))).resolves.toContain(
      "No longer kept: the platform lets Peal keep a comment for a limited time."
    );
  });

  it("nests the replies, the actions, the box and the answers under it", async () => {
    const html = await render(
      "en",
      <ul>
        <CommentView
          comment={{ ...comment, liked: true }}
          actions={<button type="button">Mark as answered</button>}
          replies={<ReplyView reply={reply} />}
          replyBox={<p>box</p>}
        >
          <CommentView comment={{ ...comment, id: "nested", text: "Me too" }} />
        </CommentView>
      </ul>
    );

    expect(
      missingFrom(html, [
        ">Liked<",
        "Mark as answered",
        'aria-label="Replies sent from Peal"',
        "<p>box</p>",
        'aria-label="Answers to this comment"',
        "Me too",
      ])
    ).toStrictEqual([]);
  });
});

describe(ReplyView, () => {
  it("shows a reply on its way as sending, never as sent", async () => {
    const html = await render(
      "en",
      <ul>
        <ReplyView reply={reply} />
      </ul>
    );

    expect(
      missingFrom(html, [
        "Reply sent from Peal on Nov 10, 2026, 9:00 AM",
        "Sending…",
        "@ada@social.example On Monday.",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain(">Sent<");
  });

  it("links a sent reply to the platform", async () => {
    const html = await render(
      "en",
      <ul>
        <ReplyView
          reply={{
            ...reply,
            permalink: "https://social.example/@peal/3",
            settledAt: at("2026-11-10T09:00:02Z"),
            status: "sent",
          }}
          actions={<button type="button">Withdraw</button>}
        />
      </ul>
    );

    expect(
      missingFrom(html, [
        ">Sent<",
        'href="https://social.example/@peal/3"',
        "View the reply on the platform",
        "Withdraw",
      ])
    ).toStrictEqual([]);
  });

  it.each([
    {
      english: "Nothing went out: the channel was disconnected or turned off.",
      french: "Rien n’est parti : le canal a été déconnecté ou désactivé.",
      reason: "channelUnavailable",
    },
    {
      english:
        "Nothing went out: the platform refuses the account’s authorization. Disconnect the channel and connect the account again.",
      french:
        "Rien n’est parti : la plateforme refuse l’autorisation du compte. Déconnectez le canal et connectez à nouveau le compte.",
      reason: "reconnectNeeded",
    },
    {
      english: "Nothing went out: the platform kept turning requests away.",
      french:
        "Rien n’est parti : la plateforme a continué de refuser les requêtes.",
      reason: "rateLimited",
    },
    {
      english: "Nothing went out: the platform could not be reached.",
      french: "Rien n’est parti : la plateforme était injoignable.",
      reason: "platformUnavailable",
    },
    {
      english: "Nothing went out: the comment is no longer on the platform.",
      french: "Rien n’est parti : le commentaire n’est plus sur la plateforme.",
      reason: "commentGone",
    },
    {
      english: "Nothing went out: the platform refused the reply.",
      french: "Rien n’est parti : la plateforme a refusé la réponse.",
      reason: "refused",
    },
    {
      english:
        "Nothing went out: someone checked the platform and did not find it.",
      french:
        "Rien n’est parti : quelqu’un a vérifié sur la plateforme et ne l’a pas trouvée.",
      reason: "notSent",
    },
  ] as const)(
    "says why a reply failed: $reason",
    async ({ english, french, reason }) => {
      const view = (
        <ul>
          <ReplyView
            reply={{
              ...reply,
              reason,
              settledAt: at("2026-11-10T09:00:02Z"),
              status: "failed",
            }}
          />
        </ul>
      );

      const inEnglish = await render("en", view);

      expect(inEnglish).toContain(english);
      expect(inEnglish).toContain(">Not sent<");
      await expect(render("fr", view)).resolves.toContain(french);
    }
  );

  it.each([
    {
      english: "the request left and no answer came.",
      french: "la requête est partie et aucune réponse n’est venue.",
      reason: "noResponse",
    },
    {
      english:
        "Peal stopped during the call, and the platform could not say afterwards.",
      french:
        "Peal s’est arrêté pendant l’appel, et la plateforme n’a pas pu le dire ensuite.",
      reason: "interrupted",
    },
    {
      english: "a fault in Peal happened after the request may have left.",
      french:
        "une erreur de Peal est survenue alors que la requête était peut-être partie.",
      reason: "adapterFailure",
    },
  ] as const)(
    "asks to check an unconfirmed reply: $reason",
    async ({ english, french, reason }) => {
      const view = (
        <ul>
          <ReplyView
            reply={{
              ...reply,
              reason,
              settledAt: at("2026-11-10T09:00:20Z"),
              status: "unconfirmed",
            }}
            actions={
              <>
                <button type="button">It is there</button>
                <button type="button">It did not go out</button>
              </>
            }
          />
        </ul>
      );

      const inEnglish = await render("en", view);

      expect(
        missingFrom(inEnglish, [
          ">To check<",
          `This reply may be on the platform: ${english} Peal never sends it again. Check the platform, then say what you found.`,
          "It is there",
          "It did not go out",
        ])
      ).toStrictEqual([]);
      await expect(render("fr", view)).resolves.toContain(
        `Cette réponse est peut-être sur la plateforme : ${french} Peal ne la renvoie jamais.`
      );
    }
  );

  it("says a withdrawn reply was deleted from the platform", async () => {
    const html = await render(
      "en",
      <ul>
        <ReplyView
          reply={{
            ...reply,
            permalink: "https://social.example/@peal/3",
            settledAt: at("2026-11-10T10:00:00Z"),
            status: "withdrawn",
          }}
        />
      </ul>
    );

    expect(html).toContain(">Withdrawn<");
    expect(html).toContain("It was deleted from the platform.");
    expect(html).not.toContain("View the reply on the platform");
  });

  it("renders markup in a reply as the text it is", async () => {
    const html = await render(
      "en",
      <ul>
        <ReplyView reply={{ ...reply, text: "<b>hello</b>" }} />
      </ul>
    );

    expect(html).toContain("&lt;b&gt;hello&lt;/b&gt;");
    expect(html).not.toContain("<b>");
  });
});

const box = (
  text: string,
  props: Partial<Parameters<typeof ReplyBoxView>[0]> = {}
) => (
  <ReplyBoxView
    author="@ada@social.example"
    error={null}
    fit={replyFit("mastodon", "ada@social.example", text)}
    pending={null}
    sending={false}
    text={text}
    onChange={constVoid}
    onSend={constVoid}
    {...props}
  />
);

// The Send button's opening tag.
const send = (html: string) =>
  /<button[^>]*type="submit"[^>]*>/u.exec(html)?.[0] ?? "";

describe(ReplyBoxView, () => {
  it("counts the mention with the text on Mastodon, and says so", async () => {
    const html = await render("en", box("Thank you!"));

    expect(
      missingFrom(html, [
        "Reply to @ada@social.example",
        "30 of 500 characters",
        "On Mastodon a reply reaches the person only when it mentions them: it will start with @ada@social.example, which the count includes.",
        "Everyone who sees the post sees the reply, sent as the channel’s account.",
      ])
    ).toStrictEqual([]);
    // Send is on: nothing marks it disabled.
    expect(send(html)).not.toMatch(/ (?<aria>aria-)?disabled(?<end>=| |>)/u);

    await expect(render("fr", box("Merci !"))).resolves.toContain(
      "elle commencera par @ada@social.example, que le décompte inclut."
    );
  });

  it("keeps Send off while there is nothing to send", async () => {
    const html = await render("en", box("  "));

    expect(send(html)).toContain('aria-disabled="true"');
  });

  it("keeps Send off, and says by how much, once the reply is too long", async () => {
    const html = await render("en", box("a".repeat(490)));

    expect(html).toContain("510 of 500 characters");
    expect(html).toContain("10 too many");
    expect(html).toContain('aria-invalid="true"');
    expect(send(html)).toContain('aria-disabled="true"');
  });

  it.each([
    {
      english:
        "A reply to this comment is on its way. Wait until it has gone out to write another.",
      pending: "sending",
    },
    {
      english:
        "A reply to this comment may have gone out. Say what you found on the platform before writing another.",
      pending: "unconfirmed",
    },
  ] as const)(
    "waits while a reply to the comment is $pending",
    async ({ english, pending }) => {
      const html = await render("en", box("Thank you!", { pending }));

      expect(html).toContain(english);
      expect(send(html)).toContain('aria-disabled="true"');
    }
  );

  it("shows why the last send was refused", async () => {
    const html = await render(
      "en",
      box("Thank you!", { error: "The reply says nothing." })
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("The reply says nothing.");
  });
});

describe(ReplyAbilityNotice, () => {
  const channels = <a href="https://app.example/channels">Open the channels</a>;

  it("tells to connect the account again when replies need it", async () => {
    const html = await render(
      "en",
      <ReplyAbilityNotice
        channels={channels}
        disconnected={false}
        standing="reconnect"
      />
    );

    expect(html).toContain(
      "To answer comments here, disconnect the channel and connect the account again."
    );
    expect(html).toContain(
      '<a href="https://app.example/channels">Open the channels</a>'
    );
  });

  it("says replies are not possible where the platform has none", async () => {
    await expect(
      render(
        "en",
        <ReplyAbilityNotice
          channels={channels}
          disconnected={false}
          standing="unsupported"
        />
      )
    ).resolves.toContain("Replies are not possible here: the platform");
    await expect(
      render(
        "fr",
        <ReplyAbilityNotice
          channels={channels}
          disconnected
          standing="unsupported"
        />
      )
    ).resolves.toContain(
      "Répondre n’est pas possible ici : le canal a été déconnecté."
    );
  });

  it("says nothing while replies are available", async () => {
    await expect(
      render(
        "en",
        <ReplyAbilityNotice
          channels={channels}
          disconnected={false}
          standing="available"
        />
      )
    ).resolves.toBe("");
  });
});
