import { Effect, Schema } from "effect";

import { headerOf, json, platformServer, scripted } from "./platform-server.ts";
import type {
  JsonValue,
  PlatformAnswer,
  PlatformRequest,
} from "./platform-server.ts";

/** What a resumable session holds so far. */
interface FakeSession {
  bytes: Uint8Array[];
  expired: boolean;
  readonly id: number;
  readonly metadata: JsonValue;
  readonly notifySubscribers: string;
  received: number;
  readonly size: number;
  videoId?: string;
}

/** A video YouTube made, and how its processing goes. */
interface FakeVideo {
  readonly bytes: Uint8Array;
  readonly id: string;
  readonly metadata: JsonValue;
  readonly notifySubscribers: string;
  polls: number;
}

/** A video category, as videoCategories.list answers one. */
export interface FakeCategory {
  readonly assignable: boolean;
  readonly id: string;
  readonly title: string;
}

/** A playlist, as playlists.list answers one. */
export interface FakePlaylist {
  readonly id: string;
  readonly privacy: string;
  readonly title: string;
}

/** How a video's processing ends. */
export type Processing =
  | { readonly _tag: "processed"; readonly after: number }
  | { readonly _tag: "failed"; readonly reason: string }
  | { readonly _tag: "rejected"; readonly reason: string };

const decodeMetadata = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Json)
);

const rangePattern = /^bytes (?<first>\d+)-(?<last>\d+)\/(?<size>\d+)$/u;

const statusPattern = /^bytes \*\/(?<size>\d+)$/u;

const googleError = (status: number, reason: string): PlatformAnswer =>
  json(
    { error: { code: status, errors: [{ domain: "youtube", reason }] } },
    status
  );

const concat = (parts: readonly Uint8Array[]) => {
  const all = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;

  for (const part of parts) {
    all.set(part, at);
    at += part.length;
  }

  return all;
};

/**
 * The YouTube Data API's resumable videos.insert, videos.list,
 * videoCategories.list and playlists.list (`mine=true`, in pages), for
 * tokens in `tokens`: a POST opens a session whose address comes back in
 * `Location`; PUTs append contiguous byte ranges, answering 308 with the
 * `Range` received, until the last byte makes the video (201); a PUT of
 * `bytes *\/size` asks where the session stands. Videos are listed
 * `uploaded` until processed as `processing` says. `script` queues answers
 * per route before the fake's own; `acceptThenDrop` takes the next part's
 * bytes and drops the connection without answering.
 */
export const fakeYouTubeApi = Effect.fnUntraced(function* fakeYouTubeApi(
  options: {
    /** The video categories of every region but "ZZ", which YouTube refuses. */
    readonly categories?: readonly FakeCategory[];
    /** The playlists of the token's channel, in order. */
    readonly playlists?: readonly FakePlaylist[];
    readonly privacy?: "private" | "public";
    readonly processing?: Processing;
    readonly tokens?: readonly string[];
  } = {}
) {
  const tokens = new Set(options.tokens ?? ["token-1"]);
  const sessions = new Map<number, FakeSession>();
  const videos: FakeVideo[] = [];
  const script = scripted<PlatformAnswer>();
  const processing = options.processing ?? { _tag: "processed", after: 1 };
  let dropAt = 0;
  let partsSeen = 0;

  const statusOf = (video: FakeVideo) => {
    if (processing._tag === "failed") {
      return { failureReason: processing.reason, uploadStatus: "failed" };
    }

    if (processing._tag === "rejected") {
      return { rejectionReason: processing.reason, uploadStatus: "rejected" };
    }

    return {
      uploadStatus: video.polls >= processing.after ? "processed" : "uploaded",
    };
  };

  const videoJson = (video: FakeVideo): JsonValue => {
    const status = statusOf(video);

    return {
      id: video.id,
      kind: "youtube#video",
      status: { ...status, privacyStatus: options.privacy ?? "public" },
    };
  };

  // A video as the upload's last answer shows it: still to process.
  const uploaded = (id: string): PlatformAnswer =>
    json(
      {
        id,
        kind: "youtube#video",
        status: {
          privacyStatus: options.privacy ?? "public",
          uploadStatus: "uploaded",
        },
      },
      201
    );

  const made = (session: FakeSession): PlatformAnswer => {
    if (session.videoId !== undefined) {
      return uploaded(session.videoId);
    }

    const video: FakeVideo = {
      bytes: concat(session.bytes),
      id: `synthVideo${String(videos.length + 1).padStart(2, "0")}`,
      metadata: session.metadata,
      notifySubscribers: session.notifySubscribers,
      polls: 0,
    };

    session.videoId = video.id;
    videos.push(video);

    return uploaded(video.id);
  };

  const standing = (session: FakeSession): PlatformAnswer => {
    if (session.videoId !== undefined) {
      return made(session);
    }

    return session.received === 0
      ? { _tag: "answer", status: 308 }
      : {
          _tag: "answer",
          headers: { range: `bytes=0-${session.received - 1}` },
          status: 308,
        };
  };

  const put = (request: PlatformRequest): PlatformAnswer => {
    const session = sessions.get(Number(request.query.get("upload_id")));

    if (session === undefined || session.expired) {
      return json({ error: { code: 404, message: "Not Found" } }, 404);
    }

    const range = headerOf(request, "content-range");

    if (statusPattern.test(range)) {
      return standing(session);
    }

    const parts = rangePattern.exec(range)?.groups;
    const first = Number(parts?.["first"]);
    const last = Number(parts?.["last"]);

    if (
      parts === undefined ||
      first !== session.received ||
      last - first + 1 !== request.body.length ||
      Number(parts["size"]) !== session.size
    ) {
      return googleError(400, "badContent");
    }

    session.bytes.push(request.body);
    session.received = last + 1;
    partsSeen += 1;

    if (partsSeen === dropAt) {
      if (session.received === session.size) {
        made(session);
      }

      return { _tag: "drop" };
    }

    return session.received === session.size
      ? made(session)
      : standing(session);
  };

  const handle = (request: PlatformRequest, origin: string): PlatformAnswer => {
    const route = `${request.method} ${request.path}`;
    const queued = script.next(route);

    if (queued !== undefined) {
      return queued;
    }

    const bearer = headerOf(request, "authorization").replace(/^Bearer /u, "");

    if (!tokens.has(bearer)) {
      return googleError(401, "authError");
    }

    if (route === "POST /upload/youtube/v3/videos") {
      const id = sessions.size + 1;

      sessions.set(id, {
        bytes: [],
        expired: false,
        id,
        metadata: decodeMetadata(new TextDecoder().decode(request.body)),
        notifySubscribers: request.query.get("notifySubscribers") ?? "",
        received: 0,
        size: Number(headerOf(request, "x-upload-content-length")),
      });

      return {
        _tag: "answer",
        headers: {
          location: `${origin}/upload/youtube/v3/videos?uploadType=resumable&upload_id=${id}`,
        },
        status: 200,
      };
    }

    if (route === "PUT /upload/youtube/v3/videos") {
      return put(request);
    }

    if (route === "GET /youtube/v3/videoCategories") {
      return request.query.get("regionCode") === "ZZ"
        ? googleError(400, "invalidParameter")
        : json({
            items: (options.categories ?? []).map(
              ({ assignable, id, title }) => ({
                id,
                kind: "youtube#videoCategory",
                snippet: {
                  assignable,
                  // The title in the language asked, to tell `hl` arrived.
                  title: `${title} (${request.query.get("hl") ?? "en_US"})`,
                },
              })
            ),
            kind: "youtube#videoCategoryListResponse",
          });
    }

    if (route === "GET /youtube/v3/playlists") {
      const all = options.playlists ?? [];
      const token = request.query.get("pageToken");
      const from = token === null ? 0 : Number(token.replace(/^page-/u, ""));
      const size = Number(request.query.get("maxResults") ?? "5");

      if (request.query.get("mine") !== "true" || Number.isNaN(from)) {
        return googleError(400, "invalidPageToken");
      }

      const items = all
        .slice(from, from + size)
        .map(({ id, privacy, title }) => ({
          id,
          kind: "youtube#playlist",
          snippet: { title },
          status: { privacyStatus: privacy },
        }));

      const kind = "youtube#playlistListResponse";

      return json(
        from + size < all.length
          ? { items, kind, nextPageToken: `page-${from + size}` }
          : { items, kind }
      );
    }

    if (route === "GET /youtube/v3/videos") {
      const video = videos.find(({ id }) => id === request.query.get("id"));

      if (video === undefined) {
        return json({ items: [] });
      }

      video.polls += 1;

      return json({ items: [videoJson(video)] });
    }

    return json({ error: { code: 404, message: "Not Found" } }, 404);
  };

  const server = yield* platformServer(handle);

  return {
    ...server,
    /** Takes the bytes of the `part`th part, then drops the connection. */
    acceptThenDrop: (part: number) => {
      dropAt = part;
    },
    /** Expires every session, as a week would. */
    expireSessions: () => {
      for (const session of sessions.values()) {
        session.expired = true;
      }
    },
    googleError,
    script,
    sessions: () => [...sessions.values()],
    videos: () => [...videos],
  };
});
