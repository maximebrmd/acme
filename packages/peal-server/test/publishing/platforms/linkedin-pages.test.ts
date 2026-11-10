import { assert, describe, it } from "@effect/vitest";
import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { LinkedInOptions } from "#publishing/domain/linkedin-options.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import {
  fakeLinkedInApi,
  linkedinMemberId,
  linkedinPageUrn,
  linkedinTestVersion,
} from "#test/publishing/fakes/fake-linkedin-api.ts";
import type { FakeLinkedInOptions } from "#test/publishing/fakes/fake-linkedin-api.ts";
import { headerOf, json } from "#test/publishing/fakes/platform-server.ts";
import type { PlatformServer } from "#test/publishing/fakes/platform-server.ts";

import {
  attached,
  CredentialLog,
  credentialsOf,
  linkedinClientWith,
  outgoing,
  testFile,
} from "./support.ts";
import type { TestFile } from "./support.ts";

// LinkedIn, and the client publishing to it as the synthetic page, or as
// the member when `page` is false.
const onLinkedIn = Effect.fn("test.onLinkedInPages")(function* onLinkedIn(
  options: {
    readonly api?: FakeLinkedInOptions;
    readonly files?: readonly TestFile[];
    readonly page?: boolean;
  } = {}
) {
  const page = options.page ?? true;
  const linkedin = yield* fakeLinkedInApi({ ...options.api, page });
  const accountId = page ? linkedinPageUrn : linkedinMemberId;

  const credentials = yield* Layer.build(
    credentialsOf(
      {
        accountId,
        connection: Option.some(page ? "linkedinPage" : "linkedinProfile"),
        platform: "linkedin",
      },
      ["linkedin-token-1"]
    )
  );

  const client = yield* linkedinClientWith({
    api: linkedin.url,
    credentials: Layer.succeedContext(credentials),
    files: options.files ?? [],
    version: linkedinTestVersion,
  });

  return {
    client,
    linkedin,
    log: Context.get(credentials, CredentialLog),
    post: (fields: Partial<OutgoingPost>) => outgoing({ ...fields, accountId }),
  };
});

const optionsOf = (fields: Omit<LinkedInOptions, "platform" | "problems">) =>
  Option.some(new LinkedInOptions(fields));

const callsTo = (server: PlatformServer, method: string, path: string) =>
  server
    .requests()
    .filter((request) => request.method === method && request.path === path);

describe("publishing on a LinkedIn page", () => {
  it.live("posts the text as the page, with the member's token", () =>
    Effect.gen(function* postsText() {
      const { client, linkedin, post } = yield* onLinkedIn();
      const result = yield* client.publish(yield* post({ text: "Open today" }));
      const [published] = linkedin.posts();

      assert(published !== undefined);
      assert.strictEqual(published.body.author, linkedinPageUrn);
      assert.strictEqual(published.body.visibility, "PUBLIC");
      assert.deepStrictEqual(result, {
        _tag: "published",
        permalink: `https://www.linkedin.com/feed/update/${published.urn}/`,
        platformPostId: PlatformPostIdSchema.make(published.urn),
      });
    }).pipe(Effect.scoped)
  );

  it.live("uploads images as the page's own", () =>
    Effect.gen(function* images() {
      const first = testFile("image", 1024, "image/png");
      const second = testFile("image", 512, "image/jpeg");

      const { client, linkedin, post } = yield* onLinkedIn({
        files: [first, second],
      });

      const result = yield* client.publish(
        yield* post({ media: [attached(first, "One"), attached(second, "")] })
      );

      assert.strictEqual(result._tag, "published");
      assert.strictEqual(
        linkedin.posts()[0]?.body.content?.multiImage?.images.length,
        2
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "finds a post whose answer was lost among the page's posts, and sends it once",
    () =>
      Effect.gen(function* confirms() {
        const { client, linkedin, post } = yield* onLinkedIn();

        linkedin.script("POST /rest/posts", [{ _tag: "publishThenDrop" }]);

        const result = yield* client.publish(
          yield* post({ text: "Fresh bread at 7 #bakery (really)" })
        );

        const [published] = linkedin.posts();
        const [read] = callsTo(linkedin, "GET", "/rest/posts");

        assert(published !== undefined && read !== undefined);
        assert.deepStrictEqual(result, {
          _tag: "published",
          permalink: `https://www.linkedin.com/feed/update/${published.urn}/`,
          platformPostId: PlatformPostIdSchema.make(published.urn),
        });
        assert.strictEqual(linkedin.posts().length, 1);
        // The finder, as Rest.li 2.0 takes it, in the pinned version.
        assert.strictEqual(read.query.get("q"), "author");
        assert.strictEqual(read.query.get("author"), linkedinPageUrn);
        assert.strictEqual(read.query.get("sortBy"), "CREATED");
        assert.strictEqual(headerOf(read, "x-restli-method"), "FINDER");
        assert.strictEqual(headerOf(read, "linkedin-version"), "202610");
      }).pipe(Effect.scoped)
  );

  it.live(
    "leaves a lost post unconfirmed when no post of the page reads the same",
    () =>
      Effect.gen(function* unknown() {
        // LinkedIn answers the text another way than it was sent.
        const { client, linkedin, post } = yield* onLinkedIn({
          api: { commentaryRead: (sent) => `${sent} ` },
        });

        linkedin.script("POST /rest/posts", [{ _tag: "publishThenDrop" }]);

        const result = yield* client.publish(yield* post({ text: "Open" }));

        assert.deepStrictEqual(result, {
          _tag: "unconfirmed",
          reason: "noResponse",
        });
        assert.strictEqual(linkedin.posts().length, 1);
      }).pipe(Effect.scoped)
  );

  it.live(
    "does not take an older post of the same text for the one just sent",
    () =>
      Effect.gen(function* older() {
        const { client, linkedin, post } = yield* onLinkedIn();

        yield* client.publish(yield* post({ text: "Open today" }));

        // The second never reaches LinkedIn's posts.
        linkedin.script("POST /rest/posts", [
          json({ message: "Service unavailable", status: 503 }, 503),
        ]);

        const again = yield* post({ text: "Open today" });

        // Started well after the first one was made.
        const result = yield* client.publish({
          ...again,
          startedAt: DateTime.add(again.startedAt, { minutes: 10 }),
        });

        assert.strictEqual(result._tag, "unconfirmed");
        assert.strictEqual(linkedin.posts().length, 1);
      }).pipe(Effect.scoped)
  );

  it.live("resumes an interrupted attempt by looking the post up", () =>
    Effect.gen(function* resumes() {
      const { client, linkedin, post } = yield* onLinkedIn();
      const outgoingPost = yield* post({ text: "Open today" });

      // Nothing went out: the search proves nothing, so nothing is sent.
      assert.strictEqual(
        (yield* client.resume(outgoingPost))._tag,
        "unconfirmed"
      );
      assert.strictEqual(linkedin.posts().length, 0);

      linkedin.script("POST /rest/posts", [{ _tag: "publishThenDrop" }]);
      yield* client.publish(outgoingPost);

      const resumed = yield* client.resume(outgoingPost);

      assert.strictEqual(resumed._tag, "published");
      assert.strictEqual(linkedin.posts().length, 1);
    }).pipe(Effect.scoped)
  );

  it.live("never reads a member's posts back: they stay unconfirmed", () =>
    Effect.gen(function* member() {
      const { client, linkedin, post } = yield* onLinkedIn({ page: false });

      linkedin.script("POST /rest/posts", [{ _tag: "publishThenDrop" }]);

      const result = yield* client.publish(yield* post({ text: "Hello" }));

      assert.deepStrictEqual(result, {
        _tag: "unconfirmed",
        reason: "noResponse",
      });
      assert.strictEqual(callsTo(linkedin, "GET", "/rest/posts").length, 0);
    }).pipe(Effect.scoped)
  );
});

describe("a LinkedIn post's options", () => {
  it.live("set who sees the post and whether it can be reshared", () =>
    Effect.gen(function* visibility() {
      const { client, linkedin, post } = yield* onLinkedIn({ page: false });

      yield* client.publish(
        yield* post({
          options: optionsOf({
            disableReshare: true,
            visibility: "connections",
          }),
        })
      );
      yield* client.publish(
        yield* post({ options: optionsOf({ visibility: "loggedIn" }) })
      );

      assert.deepStrictEqual(
        linkedin
          .posts()
          .map(({ body }) => [body.visibility, body.isReshareDisabledByAuthor]),
        [
          ["CONNECTIONS", true],
          ["LOGGED_IN", false],
        ]
      );
    }).pipe(Effect.scoped)
  );

  it.live("link the pages the text names, and leave other names as text", () =>
    Effect.gen(function* mentions() {
      const { client, linkedin, post } = yield* onLinkedIn();

      yield* client.publish(
        yield* post({
          options: optionsOf({
            mentions: [
              {
                name: "Example Bikes (UK)",
                urn: "urn:li:organization:5515715",
              },
            ],
          }),
          text: "With @Example Bikes (UK) and @someone",
        })
      );

      assert.strictEqual(
        linkedin.posts()[0]?.body.commentary,
        "With @[Example Bikes \\(UK\\)](urn:li:organization:5515715) and \\@someone"
      );
    }).pipe(Effect.scoped)
  );

  it.live("show a link as an article, an image as its thumbnail", () =>
    Effect.gen(function* article() {
      const image = testFile("image", 2048, "image/jpeg");

      const { client, linkedin, post } = yield* onLinkedIn({
        files: [image],
      });

      const link = {
        linkDescription: "What ships this week",
        linkTitle: "Launch day",
        linkUrl: "https://example.test/launch",
      };

      yield* client.publish(yield* post({ options: optionsOf(link) }));
      yield* client.publish(
        yield* post({
          media: [attached(image, "")],
          options: optionsOf({
            linkTitle: link.linkTitle,
            linkUrl: link.linkUrl,
          }),
        })
      );

      assert.deepStrictEqual(
        linkedin.posts().map(({ body }) => body.content),
        [
          {
            article: {
              description: "What ships this week",
              source: "https://example.test/launch",
              title: "Launch day",
            },
          },
          {
            article: {
              source: "https://example.test/launch",
              thumbnail: "urn:li:image:C4E10AQ1",
              title: "Launch day",
            },
          },
        ]
      );
    }).pipe(Effect.scoped)
  );

  it.live(
    "refuse a link beside a video or several images, sending nothing",
    () =>
      Effect.gen(function* linkWithMedia() {
        const video = testFile("video", 100_000);

        const { client, linkedin, post } = yield* onLinkedIn({
          files: [video],
        });

        const refused = yield* client
          .publish(
            yield* post({
              media: [attached(video, "")],
              options: optionsOf({
                linkTitle: "Launch day",
                linkUrl: "https://example.test/launch",
              }),
            })
          )
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          refused,
          new BadRequest({ code: "linkWithMedia" })
        );
        assert.strictEqual(linkedin.requests().length, 0);
      }).pipe(Effect.scoped)
  );
});

describe("a document on LinkedIn", () => {
  it.live("goes up through the Documents API, and shows under its title", () =>
    Effect.gen(function* document() {
      const deck = testFile("document", 4096);

      const { client, linkedin, post } = yield* onLinkedIn({ files: [deck] });

      const result = yield* client.publish(
        yield* post({
          media: [attached(deck, "")],
          options: optionsOf({ documentTitle: "Our 2026 menu" }),
          text: "The new menu",
        })
      );

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(linkedin.documents(), [
        {
          bytes: 4096,
          polls: 0,
          status: "AVAILABLE",
          urn: "urn:li:document:D5510AQ1",
        },
      ]);
      assert.deepStrictEqual(linkedin.posts()[0]?.body.content, {
        media: { id: "urn:li:document:D5510AQ1", title: "Our 2026 menu" },
      });

      // The page owns the document, and its status is read by its URN.
      const look = linkedin
        .requests()
        .find(({ path }) => path.startsWith("/rest/documents/"));

      assert.strictEqual(
        look?.path,
        "/rest/documents/urn:li:document:D5510AQ1"
      );
    }).pipe(Effect.scoped)
  );

  it.live("is titled by its file's name when the options give none", () =>
    Effect.gen(function* untitled() {
      const deck = testFile("document", 1024);

      // A member's token writes documents, and may not read them back.
      const { client, linkedin, post } = yield* onLinkedIn({
        files: [deck],
        page: false,
      });

      const result = yield* client.publish(
        yield* post({ media: [attached(deck, "")] })
      );

      assert.strictEqual(result._tag, "published");
      assert.deepStrictEqual(linkedin.posts()[0]?.body.content, {
        media: {
          id: "urn:li:document:D5510AQ1",
          title: deck.media.fileName,
        },
      });
    }).pipe(Effect.scoped)
  );

  it.live("fails the post when LinkedIn cannot process it", () =>
    Effect.gen(function* failed() {
      const deck = testFile("document", 1024);

      const { client, linkedin, post } = yield* onLinkedIn({
        api: { documentFails: true },
        files: [deck],
      });

      const refused = yield* client
        .publish(yield* post({ media: [attached(deck, "")] }))
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        refused,
        new MediaRejected({ code: "processingFailed" })
      );
      assert.strictEqual(linkedin.posts().length, 0);
    }).pipe(Effect.scoped)
  );

  it.live("goes alone: never with an image, nor twice", () =>
    Effect.gen(function* alone() {
      const deck = testFile("document", 1024);
      const image = testFile("image", 1024);

      const { client, linkedin, post } = yield* onLinkedIn({
        files: [deck, image],
      });

      const refused = yield* client
        .publish(
          yield* post({ media: [attached(deck, ""), attached(image, "")] })
        )
        .pipe(Effect.flip);

      assert.deepStrictEqual(
        refused,
        new MediaRejected({ code: "documentWithOtherMedia" })
      );
      assert.strictEqual(linkedin.requests().length, 0);
    }).pipe(Effect.scoped)
  );
});
