import { DateTime, Duration, Effect, Layer, Option, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { ArticleJournal } from "#publishing/application/article-journal.ts";
import type { SiteFile } from "#publishing/application/article-journal.ts";
import { ArticleStore } from "#publishing/application/article-store.ts";
import { MediaForPublishing } from "#publishing/application/media-for-publishing.ts";
import { SiteCredentials } from "#publishing/application/site-credentials.ts";
import type { SiteToken } from "#publishing/application/site-credentials.ts";
import { SitePublisher } from "#publishing/application/site-publisher.ts";
import type { SitePublishRequest } from "#publishing/application/site-publisher.ts";
import { articleHtml, escapeHtml } from "#publishing/domain/article-html.ts";
import { articleMediaOf } from "#publishing/domain/article.ts";
import type { Article } from "#publishing/domain/article.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { storableLine } from "#shared/domain/platform-text.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type {
  PublishResult,
  UnconfirmedReason,
} from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import {
  publicHttpClient,
  publicHttpClientWith,
  streamedBody,
} from "#shared/infrastructure/platforms/public-http.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";
import {
  routeUrl,
  withSiteCredential,
  wordpressErrorOf,
} from "#shared/infrastructure/platforms/wordpress-api.ts";

// Articles on a WordPress site, through its REST API as the handbook
// documents it (developer.wordpress.org/rest-api/reference): each file
// the article shows goes to `/wp/v2/media`, its bytes as the request's
// body with `Content-Disposition` naming the file (the attachments
// controller's `upload_from_data`); its tags and categories are found by
// name, or made, under `/wp/v2/tags` and `/wp/v2/categories`; the post is
// made with one `POST /wp/v2/posts`, the commit: `status` publish, draft
// or future with `date_gmt`, `featured_media`, `tags` and `categories` by
// id. WordPress keeps no idempotency key: a post whose answer was lost is
// looked for among the user's posts changed since the attempt began, by
// its title, and adopted only when exactly one, not another article's,
// matches. `DELETE /wp/v2/posts/{id}` without `force` moves it to the
// trash; `POST /wp/v2/posts/{id}` sends it again.

// Uploads take longer than the API's calls.
const uploadTimeout = Duration.minutes(10);

// How far before the attempt a post made by it may say it changed: the
// site's clock and Peal's may differ.
const clockSlack = Duration.minutes(1);

// The site's refusal of a featured image it does not have.
const lostFileCode = "rest_invalid_featured_media";

// The longest of WordPress's codes kept.
const maxCodeLength = 100;

type Client = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

const PostSchema = Schema.Struct({
  id: Schema.Number,
  link: Schema.optionalKey(Schema.String),
});

const FoundPostSchema = Schema.Struct({
  id: Schema.Number,
  link: Schema.optionalKey(Schema.String),
  modified_gmt: Schema.optionalKey(Schema.String),
  title: Schema.Struct({ raw: Schema.optionalKey(Schema.String) }),
});

const MediaSchema = Schema.Struct({
  id: Schema.Number,
  source_url: Schema.String,
});

const TermSchema = Schema.Struct({ id: Schema.Number, name: Schema.String });

// The answer to a term made twice: the one the site has, by its id.
const TermExistsSchema = Schema.Struct({
  code: Schema.Literal("term_exists"),
  data: Schema.Struct({ term_id: Schema.Number }),
});

// A term's name as WordPress answers it, read back: it encodes `&`, `<`
// and `>` (`_wp_specialchars` on `pre_term_name`), and quotes where a
// plugin escapes more; `&amp;` last, so `&amp;lt;` stays `&lt;`.
const decodedName = (name: string) =>
  name
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&amp;", "&");

/** Whether the site's term is the one named, whatever its case. */
const sameTerm = (stored: string, wanted: string) =>
  decodedName(stored).trim().toLowerCase() === wanted.toLowerCase();

const MeSchema = Schema.Struct({ id: Schema.Number });

// Peal's own refusal for an article it cannot read any more.
const articleGone = new BadRequest({
  code: ownRefusalCodes.channelDisconnected,
});

const codeOf = (code: string) => storableLine(code, maxCodeLength);

/**
 * How WordPress refused a request, from its status and its own error:
 * only its 401, in its words, is a refused credential; a 403 is the user
 * lacking a right; anything a proxy says is the site being unreachable.
 */
const refusalOf = Effect.fnUntraced(function* refusalOf(
  response: HttpClientResponse.HttpClientResponse
) {
  const now = yield* DateTime.now;
  const own = yield* wordpressErrorOf(response);
  const code = own.pipe(Option.map((error) => codeOf(error.code)));

  if (response.status === 429) {
    const wait = retryAfterOf(response.headers, now);

    return yield* Option.isSome(wait)
      ? new RateLimited({ retryAfter: wait.value })
      : new RateLimited();
  }

  // A site whose trash is off cannot take a post there: it says so with
  // a 501, which is no outage.
  if (Option.isSome(code) && code.value === "rest_trash_not_supported") {
    return yield* new BadRequest({ code: code.value });
  }

  if (response.status >= 500 || Option.isNone(code)) {
    return yield* new PlatformUnavailable();
  }

  if (response.status === 401) {
    return yield* new TokenRejected();
  }

  if (response.status === 413 || code.value.startsWith("rest_upload")) {
    return yield* new MediaRejected({ code: code.value });
  }

  return yield* new BadRequest({ code: code.value });
});

const sentJson = <A, I>(schema: Schema.Codec<A, I>, ok: readonly number[]) =>
  Effect.fnUntraced(function* answeredJson(
    response: HttpClientResponse.HttpClientResponse
  ) {
    if (!ok.includes(response.status)) {
      return yield* refusalOf(response);
    }

    return yield* HttpClientResponse.schemaBodyJson(schema)(response).pipe(
      Effect.mapError(() => new PlatformUnavailable())
    );
  });

// A request the outbound guard refused, which never left: its name not
// resolving for now is the site being down for now, tried again later;
// any other refusal one Peal cannot send any more.
const guardRefusalOf = (refused: OutboundRequestRefused) =>
  refused.reason === "lookupFailed"
    ? new PlatformUnavailable()
    : new BadRequest({ code: ownRefusalCodes.channelDisconnected });

// The site's answer; a failure to reach it is the site being down.
const execute = (
  client: Client,
  request: HttpClientRequest.HttpClientRequest
): Effect.Effect<
  HttpClientResponse.HttpClientResponse,
  BadRequest | PlatformUnavailable
> =>
  client.execute(request).pipe(
    Effect.catchTags({
      HttpClientError: () => Effect.fail(new PlatformUnavailable()),
      OutboundRequestRefused: (refused) => Effect.fail(guardRefusalOf(refused)),
    })
  );

const isoGmt = (instant: DateTime.Utc) =>
  DateTime.formatIso(instant).slice(0, 19);

/**
 * The fields of the post, as `/wp/v2/posts` takes them; one left
 * undefined is not sent, as JSON leaves it out.
 */
interface PostFields {
  readonly categories?: readonly number[];
  readonly content: string;
  readonly date_gmt?: string;
  readonly excerpt: string;
  /** 0 for none. */
  readonly featured_media: number;
  readonly status?: string;
  readonly tags?: readonly number[];
  readonly title: string;
}

/**
 * The title as the site keeps it: plain text, escaped, for WordPress
 * takes a title as HTML and keeps it unfiltered for a user who may post
 * any HTML.
 */
const siteTitle = (article: Article) =>
  escapeHtml(article.content.title.trim());

const signed = (
  token: SiteToken,
  request: HttpClientRequest.HttpClientRequest
) => request.pipe(withSiteCredential(token.credential));

// The post's own route; `answered` asks for its id and address alone, not
// the content the site would send back whole.
const postRoute = (
  token: SiteToken,
  platformPostId: string,
  answered: boolean
) =>
  routeUrl(
    token.root,
    `/wp/v2/posts/${encodeURIComponent(platformPostId)}`,
    answered ? { _fields: "id,link" } : {}
  );

// The post's address, when it is a web page's: anything else the site
// answers is not kept, nor linked to.
const webAddress = (link: string | undefined) => {
  const protocol =
    link !== undefined && URL.canParse(link) ? new URL(link).protocol : "";

  return protocol === "https:" || protocol === "http:" ? link : undefined;
};

const published = (post: {
  readonly id: number;
  readonly link?: string;
}): PublishResult => {
  const permalink = webAddress(post.link);
  const platformPostId = PlatformPostIdSchema.make(String(post.id));

  return permalink === undefined
    ? { _tag: "published", platformPostId }
    : { _tag: "published", permalink, platformPostId };
};

/**
 * SitePublisher for WordPress sites. Every request goes through the public
 * HTTP client and the outbound guard, to the API's root the channel keeps.
 */
export const WordPressSitePublisherLive = Layer.effect(
  SitePublisher,
  Effect.gen(function* WordPressSitePublisherLive() {
    const store = yield* ArticleStore;
    const journal = yield* ArticleJournal;
    const credentials = yield* SiteCredentials;
    const library = yield* MediaForPublishing;
    const api = yield* publicHttpClient;
    const uploads = yield* publicHttpClientWith({ timeout: uploadTimeout });

    // Sends one file of the article: its id and address on the site.
    const upload = Effect.fn("WordPressArticles.upload")(function* upload(
      client: Client,
      token: SiteToken,
      article: Article,
      mediaId: MediaAssetId
    ) {
      const described = yield* library.describe(article.workspaceId, mediaId);

      return yield* Effect.scoped(
        Effect.gen(function* uploading() {
          const bytes = yield* library.held(article.workspaceId, mediaId);

          return yield* execute(
            client,
            signed(
              token,
              HttpClientRequest.post(
                // Its id and address are all Peal reads of the answer.
                routeUrl(token.root, "/wp/v2/media", {
                  _fields: "id,source_url",
                })
              ).pipe(
                HttpClientRequest.setHeader(
                  "content-disposition",
                  `attachment; filename="${described.fileName.replaceAll(/["\\\r\n]/gu, "_")}"`
                ),
                streamedBody(bytes, {
                  contentLength: described.byteSize,
                  contentType: described.contentType,
                })
              )
            )
          ).pipe(Effect.flatMap(sentJson(MediaSchema, [200, 201])));
        })
      );
    });

    // The ids of the terms named, found by name whatever its case, or
    // made: a tag by any author, a category by a user who may manage them.
    const termIds = Effect.fn("WordPressArticles.termIds")(function* termIds(
      token: SiteToken,
      taxonomy: "categories" | "tags",
      names: readonly string[]
    ) {
      const ids: number[] = [];

      for (const name of names) {
        const wanted = name.trim();

        const found = yield* execute(
          api,
          signed(
            token,
            HttpClientRequest.get(
              routeUrl(token.root, `/wp/v2/${taxonomy}`, {
                _fields: "id,name",
                per_page: "100",
                search: wanted,
              })
            )
          )
        ).pipe(Effect.flatMap(sentJson(Schema.Array(TermSchema), [200])));

        // WordPress answers the name as it stores it, `&` as `&amp;`.
        const same = found.find((term) => sameTerm(term.name, wanted));

        if (same !== undefined) {
          ids.push(same.id);
          continue;
        }

        const made = yield* execute(
          api,
          signed(
            token,
            HttpClientRequest.post(
              routeUrl(token.root, `/wp/v2/${taxonomy}`)
            ).pipe(HttpClientRequest.bodyJsonUnsafe({ name: wanted }))
          )
        ).pipe(
          // A 400 may be the site having it under a name its search did
          // not match: `term_exists` says which.
          Effect.flatMap((response) =>
            response.status === 400
              ? HttpClientResponse.schemaBodyJson(TermExistsSchema)(
                  response
                ).pipe(
                  Effect.map(({ data }) => ({ id: data.term_id })),
                  Effect.catch(() => refusalOf(response))
                )
              : sentJson(TermSchema, [200, 201])(response)
          )
        );

        ids.push(made.id);
      }

      return ids;
    });

    // Everything the post is made of, its files sent first.
    const fieldsOf = Effect.fn("WordPressArticles.fieldsOf")(function* fieldsOf(
      token: SiteToken,
      article: Article,
      withStatus: boolean
    ) {
      const { content } = article;
      const images = new Map<MediaAssetId, string>();
      let featured = 0;

      // A file the site took for the article already, in an attempt
      // before or for an earlier version, is not sent again.
      const sent = yield* journal
        .filesSent(article.id)
        .pipe(Effect.mapError(() => new PlatformUnavailable()));

      for (const mediaId of new Set(articleMediaOf(content))) {
        const known = sent.get(mediaId);

        const file =
          known ??
          (yield* upload(uploads, token, article, mediaId).pipe(
            Effect.map((uploaded): SiteFile => ({
              id: uploaded.id,
              sourceUrl: uploaded.source_url,
            })),
            Effect.tap((uploaded) =>
              journal
                .fileSent(article.id, mediaId, uploaded)
                .pipe(Effect.mapError(() => new PlatformUnavailable()))
            )
          ));

        images.set(mediaId, file.sourceUrl);

        if (Option.contains(content.coverMediaId, mediaId)) {
          featured = file.id;
        }
      }

      const categories = yield* termIds(
        token,
        "categories",
        content.categories
      );

      const tags = yield* termIds(token, "tags", content.tags);

      const said: PostFields = {
        content: articleHtml(content.body, images),
        // None removes the site's, as a change on the site must.
        excerpt: Option.getOrElse(
          content.excerpt.pipe(Option.map(escapeHtml)),
          () => ""
        ),
        featured_media: featured,
        title: siteTitle(article),
      };

      // A new post naming no category takes the site's default one, which
      // an empty list would take away; a change on the site sends them
      // whole, empty included.
      const categorised: PostFields =
        withStatus && categories.length === 0 ? said : { ...said, categories };

      const fields: PostFields =
        withStatus && tags.length === 0
          ? categorised
          : { ...categorised, tags };

      if (!withStatus) {
        return fields;
      }

      const { state } = article;

      if (content.siteStatus === "future" && state._tag !== "draft") {
        return {
          ...fields,
          date_gmt: isoGmt(state.schedule.at),
          status: "future",
        };
      }

      return { ...fields, status: content.siteStatus };
    });

    // The post this attempt made, looked for on the site: the user's own,
    // changed since the attempt began, of the article's title, and made by
    // no other of the channel's articles. None, or several, settle nothing.
    const lookUp = Effect.fn("WordPressArticles.lookUp")(function* lookUp(
      token: SiteToken,
      article: Article,
      startedAt: DateTime.Utc
    ) {
      const me = yield* execute(
        api,
        signed(
          token,
          HttpClientRequest.get(
            routeUrl(token.root, "/wp/v2/users/me", { _fields: "id" })
          )
        )
      ).pipe(Effect.flatMap(sentJson(MeSchema, [200])));

      const title = siteTitle(article);

      const posts = yield* execute(
        api,
        signed(
          token,
          HttpClientRequest.get(
            routeUrl(token.root, "/wp/v2/posts", {
              _fields: "id,link,modified_gmt,title",
              author: String(me.id),
              context: "edit",
              modified_after: DateTime.formatIso(
                DateTime.subtractDuration(startedAt, clockSlack)
              ),
              per_page: "20",
              search: title,
              status: "publish,future,draft,pending,private",
            })
          )
        )
      ).pipe(Effect.flatMap(sentJson(Schema.Array(FoundPostSchema), [200])));

      // A site before WordPress 5.7 ignores `modified_after`: the posts
      // changed before the attempt are left out here as well.
      const since = isoGmt(DateTime.subtractDuration(startedAt, clockSlack));

      const titled = posts.filter(
        (post) =>
          post.title.raw?.trim() === title &&
          (post.modified_gmt === undefined || post.modified_gmt >= since)
      );

      const recorded = yield* store
        .recordedOn(
          article.channelId,
          titled.map((post) => String(post.id))
        )
        .pipe(Effect.orDie);

      const unclaimed = titled.filter((post) => !recorded.has(String(post.id)));

      return unclaimed.length === 1
        ? Option.fromUndefinedOr(unclaimed[0])
        : Option.none();
    });

    const articleOf = (articleId: SitePublishRequest["articleId"]) =>
      store.get(articleId).pipe(
        Effect.orDie,
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.fail(articleGone),
            onSome: Effect.succeed,
          })
        )
      );

    // Found among the user's posts, or not known.
    const lookedUp = (
      token: SiteToken,
      article: Article,
      startedAt: DateTime.Utc,
      reason: UnconfirmedReason
    ) =>
      lookUp(token, article, startedAt).pipe(
        Effect.map(
          Option.match({
            onNone: (): PublishResult => ({ _tag: "unconfirmed", reason }),
            onSome: published,
          })
        ),
        // The search failed: whether it went out is not known.
        Effect.catchTag(
          ["PlatformUnavailable", "RateLimited", "BadRequest", "MediaRejected"],
          (): Effect.Effect<PublishResult> =>
            Effect.succeed({ _tag: "unconfirmed", reason })
        )
      );

    const publish = Effect.fn("WordPressArticles.publish")(function* publish(
      request: SitePublishRequest
    ) {
      const article = yield* articleOf(request.articleId);

      return yield* credentials.withToken(article.channelId, (token) =>
        Effect.gen(function* publishing() {
          const fields = yield* fieldsOf(token, article, true);

          // From here a run that stops looks for the post, never makes it.
          const committedAt = yield* request.committing.pipe(
            Effect.mapError(() => new PlatformUnavailable())
          );

          // The commit: once it may have reached the site, nothing is
          // sent again; an answer lost, or unreadable, is looked for. A
          // request the guard refused never left.
          const response = yield* api
            .execute(
              signed(
                token,
                HttpClientRequest.post(
                  routeUrl(token.root, "/wp/v2/posts", { _fields: "id,link" })
                ).pipe(HttpClientRequest.bodyJsonUnsafe(fields))
              )
            )
            .pipe(
              Effect.map(Option.some),
              Effect.catchTags({
                HttpClientError: () => Effect.succeedNone,
                OutboundRequestRefused: (refused) =>
                  Effect.fail(guardRefusalOf(refused)),
              })
            );

          if (Option.isNone(response) || response.value.status >= 500) {
            return yield* lookedUp(token, article, committedAt, "noResponse");
          }

          if (response.value.status !== 200 && response.value.status !== 201) {
            return yield* refusalOf(response.value);
          }

          const post = yield* HttpClientResponse.schemaBodyJson(PostSchema)(
            response.value
          ).pipe(Effect.option);

          return Option.isSome(post)
            ? published(post.value)
            : yield* lookedUp(
                token,
                article,
                committedAt,
                "unreadableResponse"
              );
        })
      );
    });

    const resume = Effect.fn("WordPressArticles.resume")(function* resume(
      request: SitePublishRequest
    ) {
      const article = yield* articleOf(request.articleId);

      return yield* credentials.withToken(article.channelId, (token) =>
        lookedUp(token, article, request.startedAt, "interrupted")
      );
    });

    const remove = Effect.fn("WordPressArticles.remove")(function* remove(
      article: Article,
      platformPostId: string
    ) {
      yield* credentials.withToken(article.channelId, (token) =>
        execute(
          api,
          signed(
            token,
            HttpClientRequest.delete(postRoute(token, platformPostId, false))
          )
        ).pipe(
          Effect.flatMap((response) =>
            Effect.gen(function* removed() {
              const own =
                response.status === 200
                  ? Option.none()
                  : yield* wordpressErrorOf(response);

              // In the trash already, or deleted for good: gone either way.
              const gone =
                response.status === 200 ||
                own.pipe(
                  Option.exists(
                    ({ code }) =>
                      code === "rest_already_trashed" ||
                      code === "rest_post_invalid_id"
                  )
                );

              return yield* gone ? Effect.void : refusalOf(response);
            })
          )
        )
      );
    });

    const update = Effect.fn("WordPressArticles.update")(function* update(
      article: Article,
      platformPostId: string
    ) {
      yield* credentials.withToken(article.channelId, (token) =>
        Effect.gen(function* updating() {
          // What it says, never how it stands: the site keeps its status.
          const send = fieldsOf(token, article, false).pipe(
            Effect.flatMap((fields) =>
              execute(
                api,
                signed(
                  token,
                  HttpClientRequest.post(
                    postRoute(token, platformPostId, true)
                  ).pipe(HttpClientRequest.bodyJsonUnsafe(fields))
                )
              )
            ),
            Effect.flatMap(sentJson(PostSchema, [200]))
          );

          // The site lost a file it took, as when its administrator
          // deleted it: the files are sent once more.
          yield* send.pipe(
            Effect.catchTag("BadRequest", (refused) =>
              refused.code === lostFileCode
                ? journal.forgetFiles(article.id).pipe(
                    Effect.mapError(() => new PlatformUnavailable()),
                    Effect.andThen(send)
                  )
                : Effect.fail(refused)
            )
          );
        })
      );
    });

    return SitePublisher.of({
      publish,
      remove,
      resume,
      update,
    });
  })
);
