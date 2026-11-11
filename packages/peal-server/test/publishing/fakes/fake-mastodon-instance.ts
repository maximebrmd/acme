import { Effect, Option, Schema } from "effect";

import {
  dropped,
  formPartsOf,
  headerOf,
  json,
  jsonBodyOf,
  platformServer,
  scripted,
  textOf,
} from "./platform-server.ts";
import type { PlatformAnswer, PlatformRequest } from "./platform-server.ts";

/** A synthetic account, as the channels context names it: `<id>@<host>`. */
export const mastodonAccountId = (instanceUrl: string) =>
  `109372@${new URL(instanceUrl).host}`;

/** A file the instance took. */
export interface FakeMedia {
  readonly description: string | null;
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly type: string;
}

/** A status the instance published. */
export interface FakeStatus {
  readonly id: string;
  readonly idempotencyKey: string | null;
  /** The status it replies to, when it was sent as a reply. */
  readonly inReplyToId: string | null;
  readonly mediaIds: readonly string[];
  readonly text: string;
}

/**
 * What the instance does with the next request to a route instead of its
 * own behaviour: an answer, or `publishThenDrop`, which publishes the status
 * and drops the connection, so the answer is lost.
 */
export type MastodonScript =
  | PlatformAnswer
  | { readonly _tag: "publishThenDrop" };

export interface FakeMastodonOptions {
  /** What /api/v2/instance says about media; none answers 404. */
  readonly mediaLimits?: {
    readonly image_size_limit?: number;
    readonly supported_mime_types?: readonly string[];
    readonly video_size_limit?: number;
  };
  /** How many times a video answers 206 before it is processed. */
  readonly videoPolls?: number;
}

// What the instance takes of a status: Mastodon's parameters for the
// options, with the values it knows.
const StatusBodySchema = Schema.Struct({
  in_reply_to_id: Schema.optionalKey(Schema.String),
  language: Schema.optionalKey(Schema.String),
  media_ids: Schema.Array(Schema.String),
  quote_approval_policy: Schema.optionalKey(
    Schema.Literals(["public", "followers", "nobody"])
  ),
  sensitive: Schema.optionalKey(Schema.Boolean),
  spoiler_text: Schema.optionalKey(Schema.String),
  status: Schema.String,
  visibility: Schema.optionalKey(
    Schema.Literals(["public", "unlisted", "private", "direct"])
  ),
});

const readStatusBody = Schema.decodeUnknownOption(
  Schema.fromJsonString(StatusBodySchema)
);

const statusBodyOf = jsonBodyOf(StatusBodySchema);

const invalidToken = json({ error: "The access token is invalid" }, 401);

/**
 * A Mastodon instance for publishing: it takes media (images processed at
 * once, videos after `videoPolls` looks), publishes statuses, and keeps
 * Idempotency-Keys as Mastodon does, answering a key it saw with the status
 * it made. Tokens are those in `validTokens`.
 */
export const fakeMastodonInstance = Effect.fnUntraced(
  function* fakeMastodonInstance(options: FakeMastodonOptions = {}) {
    const validTokens = new Set(["token-1"]);
    const media = new Map<string, FakeMedia & { polls: number }>();
    const statuses: FakeStatus[] = [];
    const keys = new Map<string, FakeStatus>();
    const scripts = scripted<MastodonScript>();

    const isAuthorized = (request: PlatformRequest) =>
      validTokens.has(
        headerOf(request, "authorization").replace(/^Bearer /u, "")
      );

    const statusJson = (status: FakeStatus, origin: string) => ({
      content: `<p>${status.text}</p>`,
      id: status.id,
      media_attachments: status.mediaIds.map((id) => ({ id })),
      uri: `${origin}/users/alice/statuses/${status.id}`,
      url: `${origin}/@alice/${status.id}`,
    });

    const publish = (request: PlatformRequest) => {
      const key = headerOf(request, "idempotency-key");
      const known = keys.get(key);

      if (known !== undefined) {
        return known;
      }

      const body = statusBodyOf(request);

      const status: FakeStatus = {
        id: String(110_000_000 + statuses.length + 1),
        idempotencyKey: key === "" ? null : key,
        inReplyToId: body.in_reply_to_id ?? null,
        mediaIds: body.media_ids,
        text: body.status,
      };

      statuses.push(status);

      if (key !== "") {
        keys.set(key, status);
      }

      return status;
    };

    const upload = (request: PlatformRequest) => {
      const parts = formPartsOf(request);
      const file = parts.find((part) => part.name === "file");
      const description = parts.find((part) => part.name === "description");

      if (file === undefined) {
        return json({ error: "Validation failed: File can't be blank" }, 422);
      }

      const isVideo = file.contentType.startsWith("video/");

      const stored = {
        description:
          description === undefined
            ? null
            : new TextDecoder().decode(description.data),
        id: String(200_000 + media.size + 1),
        name: file.fileName ?? "",
        polls: isVideo ? (options.videoPolls ?? 2) : 0,
        size: file.data.length,
        type: file.contentType,
      };

      media.set(stored.id, stored);

      return isVideo
        ? json({ id: stored.id, type: "video", url: null }, 202)
        : json({
            id: stored.id,
            type: "image",
            url: "https://files.example/1",
          });
    };

    const handle = (
      request: PlatformRequest,
      origin: string
    ): PlatformAnswer => {
      const mediaPath = /^\/api\/v1\/media\/(?<id>\w+)$/u.exec(request.path);

      const route =
        mediaPath === null
          ? `${request.method} ${request.path}`
          : `${request.method} /api/v1/media/:id`;

      const script = scripts.next(route);

      if (script !== undefined && script._tag !== "publishThenDrop") {
        return script;
      }

      if (route === "GET /api/v2/instance") {
        return options.mediaLimits === undefined
          ? json({ error: "Not found" }, 404)
          : json({
              configuration: { media_attachments: options.mediaLimits },
            });
      }

      if (!isAuthorized(request)) {
        return invalidToken;
      }

      if (route === "POST /api/v2/media") {
        return upload(request);
      }

      if (route === "GET /api/v1/media/:id") {
        const found = media.get(mediaPath?.groups?.["id"] ?? "");

        if (found === undefined) {
          return json({ error: "Record not found" }, 404);
        }

        if (found.polls > 0) {
          found.polls -= 1;

          return { _tag: "answer", status: 206 };
        }

        return json({ id: found.id, url: "https://files.example/2" });
      }

      if (route === "POST /api/v1/statuses") {
        if (Option.isNone(readStatusBody(textOf(request)))) {
          return json({ error: "Validation failed" }, 422);
        }

        const status = publish(request);

        return script?._tag === "publishThenDrop"
          ? dropped
          : json(statusJson(status, origin));
      }

      return json({ error: "Not found" }, 404);
    };

    const server = yield* platformServer(handle);

    return {
      ...server,
      /** Makes `token` work, as after the user reconnected. */
      allowToken: (token: string) => {
        validTokens.add(token);
      },
      /** The files taken, by id. */
      media: () => [...media.values()],
      /** Revokes every token. */
      revokeTokens: () => {
        validTokens.clear();
      },
      /** Makes the next requests to `route` go as scripted. */
      script: (route: string, answers: readonly MastodonScript[]) => {
        scripts.push(route, answers);
      },
      /** The statuses published, in order. */
      statuses: () => [...statuses],
    };
  }
);
