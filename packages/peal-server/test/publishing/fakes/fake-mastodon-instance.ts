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

/** A status the instance published, as edited since. */
export interface FakeStatus {
  /** How many times it was edited. */
  edits: number;
  readonly id: string;
  readonly idempotencyKey: string | null;
  /** The status it replies to, when it was sent as a reply. */
  readonly inReplyToId: string | null;
  language: string | null;
  mediaIds: readonly string[];
  /** Whether it holds a poll, as one made elsewhere would. */
  poll: boolean;
  /** The poll it was sent with, as the instance took it; null without. */
  readonly sentPoll: {
    readonly expiresIn: number;
    readonly multiple: boolean;
    readonly options: readonly string[];
  } | null;
  sensitive: boolean;
  spoilerText: string;
  text: string;
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
  /**
   * Whether tokens hold `read:statuses`; false as for an app registered
   * before Peal asked for it, whose GET of a status is refused 403.
   */
  readonly readStatuses?: boolean;
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
  media_ids: Schema.optionalKey(Schema.Array(Schema.String)),
  poll: Schema.optionalKey(
    Schema.Struct({
      expires_in: Schema.Int,
      multiple: Schema.optionalKey(Schema.Boolean),
      options: Schema.Array(Schema.String),
    })
  ),
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

// What PUT /api/v1/statuses/:id takes: every field may be left out.
const EditBodySchema = Schema.Struct({
  language: Schema.optionalKey(Schema.String),
  media_ids: Schema.optionalKey(Schema.Array(Schema.String)),
  sensitive: Schema.optionalKey(Schema.Boolean),
  spoiler_text: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(Schema.String),
});

const editBodyOf = jsonBodyOf(EditBodySchema);

const outsideScopes = json(
  { error: "This action is outside the authorized scopes" },
  403
);

const invalidToken = json({ error: "The access token is invalid" }, 401);

// The id of the status a request names, as `/api/v1/statuses/:id` does.
const statusIdOf = (request: PlatformRequest) =>
  /^\/api\/v1\/statuses\/(?<id>\w+)$/u.exec(request.path)?.groups?.["id"];

// The route a request takes, its ids left out.
const routeOf = (
  request: PlatformRequest,
  isMedia: boolean,
  statusId: string | undefined
) => {
  if (isMedia) {
    return `${request.method} /api/v1/media/:id`;
  }

  return statusId === undefined
    ? `${request.method} ${request.path}`
    : `${request.method} /api/v1/statuses/:id`;
};

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
      edited_at: status.edits === 0 ? null : new Date().toISOString(),
      id: status.id,
      language: status.language,
      media_attachments: status.mediaIds.map((id) => ({
        id,
        type: "image",
      })),
      poll: status.poll
        ? { expired: false, id: `poll-${status.id}`, options: [] }
        : null,
      sensitive: status.sensitive,
      spoiler_text: status.spoilerText,
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
        edits: 0,
        id: String(110_000_000 + statuses.length + 1),
        idempotencyKey: key === "" ? null : key,
        inReplyToId: body.in_reply_to_id ?? null,
        language: body.language ?? null,
        mediaIds: body.media_ids ?? [],
        poll: body.poll !== undefined,
        sentPoll:
          body.poll === undefined
            ? null
            : {
                expiresIn: body.poll.expires_in,
                multiple: body.poll.multiple === true,
                options: body.poll.options,
              },
        sensitive: body.sensitive === true || body.spoiler_text !== undefined,
        spoilerText: body.spoiler_text ?? "",
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

    // As Mastodon deletes: only the token's own statuses, and 404 for one
    // that is not, or no longer, there.
    const deleteStatus = (id: string | undefined, origin: string) => {
      const index = statuses.findIndex((status) => status.id === id);
      const [removed] = index === -1 ? [] : statuses.splice(index, 1);

      return removed === undefined
        ? json({ error: "Record not found" }, 404)
        : json(statusJson(removed, origin));
    };

    // As Mastodon's UpdateStatusService edits (its statuses controller
    // passes every field, so one left out is nil): no `media_ids` drops
    // the attachments, no `spoiler_text` clears the warning, `sensitive`
    // is false unless given or a warning is, a poll left out is destroyed,
    // and a language left out is kept.
    const editStatus = (
      request: PlatformRequest,
      id: string | undefined,
      origin: string
    ) => {
      const status = statuses.find((found) => found.id === id);

      if (status === undefined) {
        return json({ error: "Record not found" }, 404);
      }

      const body = editBodyOf(request);
      const text = body.status ?? "";

      if (text === "" && (body.media_ids ?? []).length === 0) {
        return json({ error: "Validation failed: Text can't be blank" }, 422);
      }

      const warning = body.spoiler_text ?? "";

      status.text = text;
      status.mediaIds = (body.media_ids ?? []).filter((mediaId) =>
        status.mediaIds.includes(mediaId)
      );
      status.spoilerText = warning;
      status.sensitive = body.sensitive === true || warning !== "";
      status.poll = false;
      status.language = body.language ?? status.language;
      status.edits += 1;

      return json(statusJson(status, origin));
    };

    const readStatus = (id: string | undefined, origin: string) => {
      if (options.readStatuses === false) {
        return outsideScopes;
      }

      const found = statuses.find((status) => status.id === id);

      return found === undefined
        ? json({ error: "Record not found" }, 404)
        : json(statusJson(found, origin));
    };

    // What the instance does at a status's own address; none elsewhere.
    const atStatus = (
      route: string,
      request: PlatformRequest,
      id: string | undefined,
      origin: string
    ): PlatformAnswer | undefined => {
      switch (route) {
        case "DELETE /api/v1/statuses/:id": {
          return deleteStatus(id, origin);
        }

        case "GET /api/v1/statuses/:id": {
          return readStatus(id, origin);
        }

        case "PUT /api/v1/statuses/:id": {
          return editStatus(request, id, origin);
        }

        default: {
          return undefined;
        }
      }
    };

    const handle = (
      request: PlatformRequest,
      origin: string
    ): PlatformAnswer => {
      const mediaPath = /^\/api\/v1\/media\/(?<id>\w+)$/u.exec(request.path);
      const statusId = statusIdOf(request);
      const route = routeOf(request, mediaPath !== null, statusId);

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

      if (route === "GET /api/v1/accounts/verify_credentials") {
        return json({ acct: "synthetic", id: "1", username: "synthetic" });
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

      const onStatus = atStatus(route, request, statusId, origin);

      if (onStatus !== undefined) {
        return onStatus;
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
      /** Gives the status a poll, as one made elsewhere would have. */
      addPoll: (id: string) => {
        const status = statuses.find((found) => found.id === id);

        if (status !== undefined) {
          status.poll = true;
        }
      },
      /** Makes `token` work, as after the user reconnected. */
      allowToken: (token: string) => {
        validTokens.add(token);
      },
      /**
       * Changes a status's warning, sensitivity or language, as its author
       * would on Mastodon itself.
       */
      changeOnMastodon: (
        id: string,
        change: Partial<
          Pick<FakeStatus, "language" | "sensitive" | "spoilerText">
        >
      ) => {
        const status = statuses.find((found) => found.id === id);

        if (status !== undefined) {
          Object.assign(status, change);
        }
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
      /** The statuses published, in order, as they now are. */
      statuses: () => statuses.map((status) => ({ ...status })),
    };
  }
);
