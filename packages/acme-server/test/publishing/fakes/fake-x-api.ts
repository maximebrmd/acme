import { Effect, Schema } from "effect";

import {
  dropped,
  formPartsOf,
  headerOf,
  json,
  jsonBodyOf,
  platformServer,
  scripted,
} from "./platform-server.ts";
import type { PlatformAnswer, PlatformRequest } from "./platform-server.ts";

/** The synthetic account the channel posts as. */
export const xAccountId = "1460000000000000001";

/** A file X took. */
export interface FakeXMedia {
  readonly altText: string | null;
  readonly category: string;
  readonly id: string;
  readonly key: string;
  readonly segments: readonly number[];
  readonly type: string;
}

/** A post X published. */
export interface FakeXPost {
  readonly id: string;
  readonly mediaIds: readonly string[];
  readonly text: string;
}

/**
 * What X does with the next request to a route instead of its own
 * behaviour: an answer, or `publishThenDrop`, which publishes the post and
 * drops the connection, so the answer is lost.
 */
export type XScript = PlatformAnswer | { readonly _tag: "publishThenDrop" };

export interface FakeXOptions {
  /** Whether X takes alt text on videos, which it may not. */
  readonly describesVideos?: boolean;
  /** How many looks at a video answer `in_progress` before it is done. */
  readonly videoPolls?: number;
  /** Whether a video's processing fails. */
  readonly videoFails?: boolean;
}

const InitializeSchema = Schema.Struct({
  media_category: Schema.String,
  media_type: Schema.String,
  total_bytes: Schema.Int,
});

const initializeOf = jsonBodyOf(InitializeSchema);

const metadataOf = jsonBodyOf(
  Schema.Struct({
    id: Schema.String,
    metadata: Schema.Struct({
      alt_text: Schema.Struct({ text: Schema.String }),
    }),
  })
);

const postOf = jsonBodyOf(
  Schema.Struct({
    media: Schema.optionalKey(
      Schema.Struct({ media_ids: Schema.Array(Schema.String) })
    ),
    text: Schema.optionalKey(Schema.String),
  })
);

const problem = (status: number, type: string, detail: string) =>
  json(
    {
      detail,
      status,
      title: type,
      type: `https://api.x.com/2/problems/${type}`,
    },
    status
  );

const unauthorized = json(
  { status: 401, title: "Unauthorized", type: "about:blank" },
  401
);

// The text as X shows it back: `&`, `<` and `>` as entities, links as its
// short ones, and a link to the media at the end.
const shownText = (post: FakeXPost) =>
  [
    post.text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll(/https?:\/\/\S+/gu, "https://t.co/aBcDeF1234"),
    ...(post.mediaIds.length > 0 ? ["https://t.co/MeDiA56789"] : []),
  ]
    .join(" ")
    .trim();

// The route a request takes, and the id in its path.
const routeOf = (request: PlatformRequest) => {
  const step =
    /^\/2\/media\/upload\/(?<id>\d+)\/(?<step>append|finalize)$/u.exec(
      request.path
    )?.groups;

  if (step !== undefined) {
    return {
      id: step["id"] ?? "",
      route: `POST /2/media/upload/:id/${step["step"] ?? ""}`,
    };
  }

  const timeline = /^\/2\/users\/(?<id>\d+)\/tweets$/u.exec(
    request.path
  )?.groups;

  return timeline === undefined
    ? { id: "", route: `${request.method} ${request.path}` }
    : { id: timeline["id"] ?? "", route: "GET /2/users/:id/tweets" };
};

interface Upload {
  altText: string | null;
  readonly category: string;
  readonly id: string;
  readonly key: string;
  polls: number;
  readonly segments: number[];
  state: "failed" | "in_progress" | "pending" | "succeeded" | "uploading";
  readonly total: number;
  readonly type: string;
}

/**
 * X's API v2 for one synthetic account: chunked media uploads (initialize,
 * append, finalize), video processing it reports through STATUS, alt text,
 * posts, which it refuses when they repeat the account's text, and the
 * account's recent posts. Tokens are those in `validTokens`.
 */
export const fakeXApi = Effect.fnUntraced(function* fakeXApi(
  options: FakeXOptions = {}
) {
  const validTokens = new Set(["x-access-1"]);
  const uploads = new Map<string, Upload>();
  const posts: FakeXPost[] = [];
  const scripts = scripted<XScript>();

  const isAuthorized = (request: PlatformRequest) =>
    validTokens.has(
      headerOf(request, "authorization").replace(/^Bearer /u, "")
    );

  const initialize = (request: PlatformRequest) => {
    const body = initializeOf(request);
    const id = `18800000000000${String(uploads.size + 1).padStart(5, "0")}`;
    const video = body.media_category === "tweet_video";

    uploads.set(id, {
      altText: null,
      category: body.media_category,
      id,
      key: `${video ? "7" : "3"}_${id}`,
      polls: options.videoPolls ?? 2,
      segments: [],
      state: "uploading",
      total: body.total_bytes,
      type: body.media_type,
    });

    return json({
      data: {
        expires_after_secs: 86_400,
        id,
        media_key: `${video ? "7" : "3"}_${id}`,
      },
    });
  };

  const append = (request: PlatformRequest, id: string) => {
    const upload = uploads.get(id);
    const parts = formPartsOf(request);
    const index = parts.find(({ name }) => name === "segment_index");
    const media = parts.find(({ name }) => name === "media");

    if (upload === undefined || index === undefined || media === undefined) {
      return problem(
        400,
        "invalid-request",
        "One or more parameters are invalid."
      );
    }

    const segment = Number(new TextDecoder().decode(index.data));

    if (segment !== upload.segments.length) {
      return problem(400, "invalid-request", "Segments must come in order.");
    }

    upload.segments.push(media.data.length);

    return json({ data: { expires_at: 1_781_000_000 } });
  };

  // How X reports a file's processing: not at all for an image it took at
  // once, and an error for a video it could not process.
  const processingInfo = (upload: Upload) => {
    if (upload.state === "succeeded" && upload.category !== "tweet_video") {
      return {};
    }

    if (upload.state === "failed") {
      return {
        processing_info: {
          check_after_secs: 1,
          error: { code: 1, message: "Unsupported", name: "InvalidMedia" },
          state: upload.state,
        },
      };
    }

    return { processing_info: { check_after_secs: 1, state: upload.state } };
  };

  const finalize = (id: string) => {
    const upload = uploads.get(id);
    const received = upload?.segments.reduce((sum, size) => sum + size, 0);

    if (upload === undefined || received !== upload.total) {
      return problem(400, "invalid-request", "Segments do not add up.");
    }

    upload.state = upload.category === "tweet_video" ? "pending" : "succeeded";

    return json({
      data: {
        id,
        media_key: upload.key,
        size: upload.total,
        ...processingInfo(upload),
      },
    });
  };

  const status = (id: string) => {
    const upload = uploads.get(id);

    if (upload === undefined) {
      return problem(404, "resource-not-found", "Unknown media.");
    }

    if (upload.polls > 0) {
      upload.polls -= 1;
      upload.state = "in_progress";
    } else {
      upload.state = options.videoFails === true ? "failed" : "succeeded";
    }

    return json({
      data: { id, media_key: upload.key, ...processingInfo(upload) },
    });
  };

  const publish = (request: PlatformRequest, script: XScript | undefined) => {
    const body = postOf(request);
    const text = body.text ?? "";
    const mediaIds = body.media?.media_ids ?? [];

    if (text !== "" && posts.some((post) => post.text === text)) {
      return problem(
        403,
        "about:blank",
        "You are not allowed to create a Tweet with duplicate content."
      );
    }

    if (mediaIds.some((id) => uploads.get(id)?.state !== "succeeded")) {
      return problem(400, "invalid-request", "Your media IDs are invalid.");
    }

    const post: FakeXPost = {
      id: `19900000000000${String(posts.length + 1).padStart(5, "0")}`,
      mediaIds,
      text,
    };

    posts.push(post);

    return script?._tag === "publishThenDrop"
      ? dropped
      : json(
          { data: { edit_history_tweet_ids: [post.id], id: post.id, text } },
          201
        );
  };

  // A post as X lists it, with its files' keys when it has some.
  const listed = (post: FakeXPost) => {
    const shown = {
      edit_history_tweet_ids: [post.id],
      id: post.id,
      text: shownText(post),
    };

    return post.mediaIds.length === 0
      ? shown
      : {
          ...shown,
          attachments: {
            media_keys: post.mediaIds.map((id) => uploads.get(id)?.key ?? id),
          },
        };
  };

  const recent = (accountId: string) =>
    accountId === xAccountId
      ? json({
          data: posts.toReversed().map(listed),
          meta: { result_count: posts.length },
        })
      : problem(404, "resource-not-found", "Could not find user.");

  const describe = (request: PlatformRequest) => {
    const { id, metadata } = metadataOf(request);
    const upload = uploads.get(id);

    if (upload === undefined) {
      return problem(404, "resource-not-found", "Unknown media.");
    }

    if (
      upload.category === "tweet_video" &&
      options.describesVideos === false
    ) {
      return problem(400, "invalid-request", "Alt text is not supported.");
    }

    upload.altText = metadata.alt_text.text;

    return json({ data: { id } });
  };

  const handle = (request: PlatformRequest): PlatformAnswer => {
    const { id, route } = routeOf(request);
    const script = scripts.next(route);

    if (script !== undefined && script._tag !== "publishThenDrop") {
      return script;
    }

    if (!isAuthorized(request)) {
      return unauthorized;
    }

    switch (route) {
      case "POST /2/media/upload/initialize": {
        return initialize(request);
      }

      case "POST /2/media/upload/:id/append": {
        return append(request, id);
      }

      case "POST /2/media/upload/:id/finalize": {
        return finalize(id);
      }

      case "GET /2/media/upload": {
        return request.query.get("command") === "STATUS"
          ? status(request.query.get("media_id") ?? "")
          : problem(400, "invalid-request", "Unknown command.");
      }

      case "POST /2/media/metadata": {
        return describe(request);
      }

      case "POST /2/tweets": {
        return publish(request, script);
      }

      case "GET /2/users/:id/tweets": {
        return recent(id);
      }

      default: {
        return problem(404, "resource-not-found", "Not found.");
      }
    }
  };

  const server = yield* platformServer(handle);

  return {
    ...server,
    /** Makes `token` work, as after a refresh. */
    allowToken: (token: string) => {
      validTokens.add(token);
    },
    /** The files taken, in order. */
    media: (): readonly FakeXMedia[] =>
      [...uploads.values()].map(
        ({ altText, category, id, key, segments, type }) => ({
          altText,
          category,
          id,
          key,
          segments: [...segments],
          type,
        })
      ),
    /** The posts published, in order. */
    posts: () => [...posts],
    /** Makes the next requests to `route` go as scripted. */
    script: (route: string, answers: readonly XScript[]) => {
      scripts.push(route, answers);
    },
  };
});
