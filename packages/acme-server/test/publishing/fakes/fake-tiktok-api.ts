import { Effect, Option, Schema } from "effect";

import { headerOf, json, platformServer, rawJson } from "./platform-server.ts";
import type { PlatformAnswer, PlatformRequest } from "./platform-server.ts";

/** The synthetic creator's open_id, as their channel stores it. */
export const tiktokAccountId = "-000synthetic-open-id-0001";

/** The token the fake takes. */
export const tiktokToken = "act.tiktok-access-1";

/** A creator's settings, as creator info answers them. */
export interface FakeCreator {
  readonly comment_disabled: boolean;
  readonly creator_avatar_url: string;
  readonly creator_nickname: string;
  readonly creator_username: string;
  readonly duet_disabled: boolean;
  readonly max_video_post_duration_sec: number;
  readonly privacy_level_options: readonly string[];
  readonly stitch_disabled: boolean;
}

export const publicCreator: FakeCreator = {
  comment_disabled: false,
  creator_avatar_url: "https://p16-sign.tiktokcdn.example/avatar/acme.jpeg",
  creator_nickname: "Acme Example",
  creator_username: "acme_example",
  duet_disabled: false,
  max_video_post_duration_sec: 600,
  privacy_level_options: [
    "PUBLIC_TO_EVERYONE",
    "MUTUAL_FOLLOW_FRIENDS",
    "SELF_ONLY",
  ],
  stitch_disabled: false,
};

/** A TikTok post id, past what a JavaScript number holds exactly. */
export const tiktokPostId = "7311111111111111111";

/** A post TikTok was asked to make. */
export interface FakeTikTokPost {
  /** The whole init request's body. */
  readonly body: typeof Schema.Json.Type;
  /** The bytes uploaded so far, for a FILE_UPLOAD. */
  bytes: number;
  /** The chunks uploaded, by size. */
  readonly chunks: number[];
  readonly kind: "photo" | "video";
  /** Status looks left before TikTok finishes processing it. */
  processing: number;
  readonly publishId: string;
  readonly source: "FILE_UPLOAD" | "PULL_FROM_URL";
  /** The bytes the upload takes, for a FILE_UPLOAD. */
  readonly videoSize: number;
}

export interface FakeTikTokOptions {
  /** The creator's settings. */
  readonly creator?: FakeCreator;
  /** An error code creator info answers instead, in a 200. */
  readonly creatorError?: string;
  /**
   * How a post ends: published, with an id when it is public, or failed
   * with this `fail_reason`.
   */
  readonly outcome?: { readonly failReason: string } | "published";
  /** Status looks a post stays processing for. */
  readonly processing?: number;
}

const ok = { code: "ok", log_id: "20261109000000SYNTHETIC", message: "" };

const v2Error = (code: string, status: number) =>
  json(
    {
      error: { code, log_id: "20261109000000SYNTHETIC", message: "Synthetic." },
    },
    status
  );

const SourceSchema = Schema.Struct({
  chunk_size: Schema.optionalKey(Schema.Number),
  source: Schema.Literals(["FILE_UPLOAD", "PULL_FROM_URL"]),
  total_chunk_count: Schema.optionalKey(Schema.Number),
  video_size: Schema.optionalKey(Schema.Number),
});

const PrivacySchema = Schema.Struct({
  post_info: Schema.Struct({ privacy_level: Schema.String }),
});

const decodeBody = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Json));

const decodeSource = Schema.decodeUnknownSync(
  Schema.Struct({ source_info: SourceSchema })
);

const decodePrivacy = Schema.decodeUnknownOption(PrivacySchema);

const decodePublishId = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Struct({ publish_id: Schema.String }))
);

const privacyOf = (body: typeof Schema.Json.Type) =>
  decodePrivacy(body).pipe(
    Option.match({
      onNone: () => "",
      onSome: ({ post_info: info }) => info.privacy_level,
    })
  );

const authorized = (request: PlatformRequest) =>
  headerOf(request, "authorization") === `Bearer ${tiktokToken}`;

const textOf = (request: PlatformRequest) =>
  new TextDecoder().decode(request.body);

const rangePattern = /^bytes (?<first>\d+)-(?<last>\d+)\/(?<total>\d+)$/u;

/**
 * TikTok's Content Posting API for one synthetic creator: creator info,
 * direct posts of videos (FILE_UPLOAD in chunks, which it checks as TikTok
 * documents them, or PULL_FROM_URL) and photos, and their status, which
 * stays processing for `processing` looks before the post ends as
 * `outcome` says. `failNext` makes the next answers to a route failures.
 */
export const fakeTikTokApi = Effect.fnUntraced(function* fakeTikTokApi(
  options: FakeTikTokOptions = {}
) {
  const posts = new Map<string, FakeTikTokPost>();
  const failures = new Map<string, PlatformAnswer[]>();
  let issued = 0;

  const creator = options.creator ?? publicCreator;

  const creatorInfo = (): PlatformAnswer =>
    options.creatorError === undefined
      ? json({ data: { ...creator }, error: ok })
      : json({ data: {}, error: { ...ok, code: options.creatorError } });

  const init =
    (kind: "photo" | "video") =>
    (request: PlatformRequest, origin: string): PlatformAnswer => {
      const body = decodeBody(textOf(request));
      const { source_info: source } = decodeSource(body);

      if (!creator.privacy_level_options.includes(privacyOf(body))) {
        return v2Error("privacy_level_option_mismatch", 403);
      }

      issued += 1;

      const publishId = `v_pub_${kind}~v2.synthetic${issued}`;

      posts.set(publishId, {
        body,
        bytes: 0,
        chunks: [],
        kind,
        processing: options.processing ?? 1,
        publishId,
        source: source.source,
        videoSize: source.video_size ?? 0,
      });

      return json({
        data:
          source.source === "FILE_UPLOAD"
            ? {
                publish_id: publishId,
                upload_url: `${origin}/upload/?upload_id=${issued}&upload_token=synthetic`,
              }
            : { publish_id: publishId },
        error: ok,
      });
    };

  const upload = (request: PlatformRequest): PlatformAnswer => {
    const post = [...posts.values()].find(({ publishId }) =>
      publishId.endsWith(`synthetic${request.query.get("upload_id") ?? ""}`)
    );

    const range = rangePattern.exec(headerOf(request, "content-range"))?.groups;

    if (post === undefined || range === undefined) {
      return json({}, 404);
    }

    const first = Number(range["first"]);
    const last = Number(range["last"]);

    // Chunks go in order, each as long as it says.
    if (
      first !== post.bytes ||
      last - first + 1 !== request.body.length ||
      Number(range["total"]) !== post.videoSize
    ) {
      return json({}, 416);
    }

    post.bytes += request.body.length;
    post.chunks.push(request.body.length);

    return json({}, post.bytes === post.videoSize ? 201 : 206);
  };

  const status = (request: PlatformRequest): PlatformAnswer => {
    const { publish_id: publishId } = decodePublishId(textOf(request));
    const post = posts.get(publishId);

    if (post === undefined) {
      return v2Error("invalid_publish_id", 400);
    }

    if (post.source === "FILE_UPLOAD" && post.bytes < post.videoSize) {
      return json({
        data: { status: "PROCESSING_UPLOAD", uploaded_bytes: post.bytes },
        error: ok,
      });
    }

    if (post.processing > 0) {
      post.processing -= 1;

      return json({
        data: {
          status:
            post.source === "FILE_UPLOAD"
              ? "PROCESSING_UPLOAD"
              : "PROCESSING_DOWNLOAD",
        },
        error: ok,
      });
    }

    const outcome = options.outcome ?? "published";

    if (outcome !== "published") {
      return json({
        data: {
          fail_reason: outcome.failReason,
          publicaly_available_post_id: [],
          status: "FAILED",
        },
        error: ok,
      });
    }

    // An id only for posts others see, written as TikTok does: an int64.
    const ids = privacyOf(post.body) === "SELF_ONLY" ? "" : tiktokPostId;

    return rawJson(
      `{"data":{"status":"PUBLISH_COMPLETE","publicaly_available_post_id":[${ids}]},"error":${JSON.stringify(ok)}}`
    );
  };

  const handle = (request: PlatformRequest, origin: string): PlatformAnswer => {
    const route = `${request.method} ${request.path}`;
    const failure = failures.get(route)?.shift();

    if (failure !== undefined) {
      return failure;
    }

    if (route === "PUT /upload/") {
      return upload(request);
    }

    if (!authorized(request)) {
      return v2Error("access_token_invalid", 401);
    }

    if (route === "POST /v2/post/publish/creator_info/query/") {
      return creatorInfo();
    }

    if (route === "POST /v2/post/publish/video/init/") {
      return init("video")(request, origin);
    }

    if (route === "POST /v2/post/publish/content/init/") {
      return init("photo")(request, origin);
    }

    if (route === "POST /v2/post/publish/status/fetch/") {
      return status(request);
    }

    return v2Error("not_found", 404);
  };

  const server = yield* platformServer(handle);

  return {
    ...server,
    failNext: (route: string, answers: readonly PlatformAnswer[]) => {
      failures.set(route, [...(failures.get(route) ?? []), ...answers]);
    },
    /** The posts TikTok was asked to make, in order. */
    posts: () => [...posts.values()],
  };
});
