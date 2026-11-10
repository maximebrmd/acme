import { Effect, Schema } from "effect";

import {
  dropped,
  empty,
  formPartsOf,
  headerOf,
  json,
  jsonBodyOf,
  platformServer,
  scripted,
} from "./platform-server.ts";
import type {
  JsonValue,
  PlatformAnswer,
  PlatformRequest,
} from "./platform-server.ts";

/** The synthetic account the channel posts as. */
export const pinterestAccountId = "549755885175";

/** A board of the synthetic account. */
export interface FakeBoard {
  readonly id: string;
  readonly name: string;
  readonly privacy?: "PROTECTED" | "PUBLIC";
  readonly sections?: readonly { readonly id: string; readonly name: string }[];
}

/** A Pin Pinterest made. */
export interface FakePin {
  readonly altText: string | null;
  readonly boardId: string;
  readonly boardSectionId: string | null;
  readonly createdAt: string;
  readonly description: string | null;
  readonly dominantColor: string | null;
  readonly id: string;
  readonly link: string | null;
  /** What its `media_source` was, as sent. */
  readonly source: PinSource;
  readonly title: string | null;
}

/** A video registered for upload. */
export interface FakeMedia {
  readonly id: string;
  /** The bytes uploaded, once they were. */
  bytes: Uint8Array | null;
  /** The file's type, as the form named it. */
  contentType: string;
  /** How many more looks answer `processing`. */
  polls: number;
}

/**
 * What Pinterest does with the next request to a route instead of its own
 * behaviour: an answer, `createThenDrop`, which makes the Pin and drops
 * the connection, so the answer is lost, or `createThenFail`, which makes
 * it and answers a server's error.
 */
export type PinterestScript =
  | PlatformAnswer
  | { readonly _tag: "createThenDrop" }
  | { readonly _tag: "createThenFail"; readonly status: number };

export interface FakePinterestOptions {
  readonly boards?: readonly FakeBoard[];
  /** The lifetime counts of Pins, by id, as analytics answers them. */
  readonly metrics?: Readonly<Record<string, FakePinMetrics>>;
  /** The access tokens Pinterest takes. */
  readonly tokens?: readonly string[];
  /** Whether a video's processing fails. */
  readonly videoFails?: boolean;
  /** How many looks at a video answer `processing` before it is done. */
  readonly videoPolls?: number;
}

/** What a Pin's analytics hold. */
export interface FakePinMetrics {
  readonly comments: number;
  readonly impressions: number;
  readonly reactions: number;
  readonly saves: number;
}

const ImageSchema = Schema.Struct({
  source_type: Schema.Literal("image_url"),
  url: Schema.String,
});

const ImagesSchema = Schema.Struct({
  items: Schema.Array(Schema.Struct({ url: Schema.String })),
  source_type: Schema.Literal("multiple_image_urls"),
});

const VideoSchema = Schema.Struct({
  cover_image_key_frame_time: Schema.optionalKey(Schema.Int),
  cover_image_url: Schema.optionalKey(Schema.String),
  media_id: Schema.String,
  source_type: Schema.Literal("video_id"),
});

const PinSourceSchema = Schema.Union([ImageSchema, ImagesSchema, VideoSchema]);

type PinSource = typeof PinSourceSchema.Type;

// pins/create's body, as the API description gives it.
const PinCreateSchema = Schema.Struct({
  alt_text: Schema.optionalKey(Schema.String),
  board_id: Schema.String,
  board_section_id: Schema.optionalKey(Schema.String),
  description: Schema.optionalKey(Schema.String),
  dominant_color: Schema.optionalKey(Schema.String),
  link: Schema.optionalKey(Schema.String),
  media_source: PinSourceSchema,
  title: Schema.optionalKey(Schema.String),
});

const pinOf = Schema.decodeUnknownOption(
  Schema.fromJsonString(PinCreateSchema)
);

const mediaTypeOf = jsonBodyOf(Schema.Struct({ media_type: Schema.String }));

// Pinterest's refusals: a numeric code and a message. Pinterest documents
// code 2 alone; the others here are synthetic.
const refusal = (status: number, code: number, message: string) =>
  json({ code, message }, status);

const authenticationFailed = refusal(401, 2, "Authentication failed.");

const invalid = (message: string) => refusal(400, 1, message);

const boardNotFound = refusal(404, 40, "Board not found.");

const pinNotFound = refusal(404, 50, "Pin not found.");

const mediaNotFound = refusal(404, 2625, "Media upload not found.");

// The form fields a registered upload must be sent with, as media/create
// lists them.
const uploadParameters = (mediaId: string) => ({
  "Content-Type": "multipart/form-data",
  key: `uploads/synthetic/${mediaId}`,
  policy: "c3ludGhldGljLXBvbGljeQ==",
  "x-amz-algorithm": "AWS4-HMAC-SHA256",
  "x-amz-credential": "SYNTHETIC/20260101/us-east-1/s3/aws4_request",
  "x-amz-date": "20260101T000000Z",
  "x-amz-security-token": "synthetic-security-token",
  "x-amz-signature": "0123456789abcdef",
});

const mediaTypeFor = (source: PinSource) => {
  if (source.source_type === "video_id") {
    return "video";
  }

  return source.source_type === "image_url" ? "image" : "multiple_images";
};

// A Pin as pins/create, pins/get and the lists answer it.
const shown = (pin: FakePin): JsonValue => ({
  alt_text: pin.altText,
  board_id: pin.boardId,
  board_owner: { username: "pealexample" },
  board_section_id: pin.boardSectionId,
  created_at: pin.createdAt,
  creative_type: pin.source.source_type === "video_id" ? "VIDEO" : "REGULAR",
  description: pin.description,
  dominant_color: pin.dominantColor,
  id: pin.id,
  is_owner: true,
  link: pin.link,
  media: { media_type: mediaTypeFor(pin.source) },
  title: pin.title,
});

// A page of `items`, as Pinterest's lists answer: `page_size` of them from
// the `bookmark`, and the next page's bookmark while there is one.
const page = (items: readonly JsonValue[], request: PlatformRequest) => {
  const size = Number(request.query.get("page_size") ?? "25");
  const bookmark = request.query.get("bookmark");

  if (bookmark !== null && !/^page-\d+$/u.test(bookmark)) {
    return invalid("Invalid bookmark.");
  }

  const from = bookmark === null ? 0 : Number(bookmark.slice(5));
  const until = from + size;

  return json({
    bookmark: until < items.length ? `page-${until}` : null,
    items: items.slice(from, until),
  });
};

type NewPin = typeof PinCreateSchema.Type;

// Whether a field is longer than pins/create takes.
const tooLong = (pin: NewPin) =>
  (pin.title ?? "").length > 100 ||
  (pin.description ?? "").length > 800 ||
  (pin.alt_text ?? "").length > 500 ||
  (pin.link ?? "").length > 2048;

// What pins/create refuses in a Pin's media, if anything.
const sourceRefusal = (
  source: PinSource,
  media: ReadonlyMap<string, FakeMedia>
): PlatformAnswer | undefined => {
  if (
    source.source_type === "multiple_image_urls" &&
    (source.items.length < 2 || source.items.length > 5)
  ) {
    return invalid("Invalid request: 2 to 5 images.");
  }

  if (source.source_type !== "video_id") {
    return undefined;
  }

  const video = media.get(source.media_id);

  return video === undefined || video.bytes === null || video.polls > 0
    ? invalid("Invalid request: the media is not ready.")
    : undefined;
};

// What pins/create refuses in where the Pin goes, if anything.
const boardRefusal = (
  pin: NewPin,
  boards: readonly FakeBoard[]
): PlatformAnswer | undefined => {
  const board = boards.find(({ id }) => id === pin.board_id);

  if (board === undefined) {
    return boardNotFound;
  }

  return pin.board_section_id !== undefined &&
    !(board.sections ?? []).some(({ id }) => id === pin.board_section_id)
    ? refusal(404, 2031, "Board section not found.")
    : undefined;
};

// A Pin's analytics: its counts over the days asked, and its lifetime
// comments and reactions.
const analyticsOf = (
  request: PlatformRequest,
  counts: FakePinMetrics | undefined
) => {
  if (counts === undefined) {
    return pinNotFound;
  }

  const asked = (request.query.get("metric_types") ?? "").split(",");

  if (
    request.query.get("start_date") === null ||
    request.query.get("end_date") === null ||
    asked.length === 0
  ) {
    return invalid("Invalid request.");
  }

  return json({
    all: {
      daily_metrics: [],
      lifetime_metrics: {
        TOTAL_COMMENTS: counts.comments,
        TOTAL_REACTIONS: counts.reactions,
      },
      summary_metrics: Object.fromEntries(
        [
          ["IMPRESSION", counts.impressions] as const,
          ["SAVE", counts.saves] as const,
        ].filter(([name]) => asked.includes(name))
      ),
    },
  });
};

// How a registered video's processing goes, one look further.
const statusOf = (registered: FakeMedia, fails: boolean) => {
  if (registered.bytes === null) {
    return "registered";
  }

  if (registered.polls > 0) {
    registered.polls -= 1;

    return "processing";
  }

  return fails ? "failed" : "succeeded";
};

const sectionsPath = /^\/v5\/boards\/(?<board>\d+)\/sections$/u;

const pinsPath =
  /^\/v5\/boards\/(?<board>\d+)(?:\/sections\/(?<section>\d+))?\/pins$/u;

const mediaPath = /^\/v5\/media\/(?<id>\d+)$/u;

const analyticsPath = /^\/v5\/pins\/(?<id>\d+)\/analytics$/u;

const uploadPath = /^\/upload\/(?<id>\d+)$/u;

const defaultBoards: readonly FakeBoard[] = [
  {
    id: "549755885001",
    name: "Summer recipes",
    sections: [{ id: "5000000000001", name: "Salads" }],
  },
];

/**
 * Pinterest's API v5 for one synthetic account, from its API description
 * and its guide to creating boards and Pins:
 *
 * - `GET /v5/boards` and `GET /v5/boards/{id}/sections` list in pages of
 *   `page_size`, each naming the next one's `bookmark`.
 * - `POST /v5/media` registers a video and answers where to POST it, with
 *   the form fields to send before the `file`; that upload answers 204;
 *   `GET /v5/media/{id}` says how its processing goes.
 * - `POST /v5/pins` makes a Pin on a board from an image address, 2 to 5
 *   of them, or a processed video, and answers 201 with it.
 * - `GET /v5/boards/{id}/pins` and `…/sections/{id}/pins` list a board's
 *   Pins, the newest first.
 * - `GET /v5/pins/{id}/analytics` answers a Pin's counts over the days
 *   asked, and its lifetime comments and reactions.
 *
 * Calls without one of `tokens` answer 401 with code 2. `script` makes the
 * next answers to a route (`METHOD /path`) something else.
 */
export const fakePinterestApi = Effect.fnUntraced(function* fakePinterestApi(
  options: FakePinterestOptions = {}
) {
  const boards = options.boards ?? defaultBoards;
  const tokens = new Set(options.tokens ?? ["token-1"]);
  const pins: FakePin[] = [];
  const media = new Map<string, FakeMedia>();
  const script = scripted<PinterestScript>();
  let clock = Date.now();

  const create = (request: PlatformRequest): PlatformAnswer | FakePin => {
    const body = pinOf(new TextDecoder().decode(request.body));

    if (body._tag === "None") {
      return invalid("Invalid request.");
    }

    const pin = body.value;

    const refused =
      boardRefusal(pin, boards) ??
      (tooLong(pin)
        ? invalid("Invalid request: a field is too long.")
        : sourceRefusal(pin.media_source, media));

    if (refused !== undefined) {
      return refused;
    }

    clock += 1000;

    const made: FakePin = {
      altText: pin.alt_text ?? null,
      boardId: pin.board_id,
      boardSectionId: pin.board_section_id ?? null,
      createdAt: new Date(clock).toISOString(),
      description: pin.description ?? null,
      dominantColor: pin.dominant_color ?? null,
      id: `86000000000000${String(pins.length + 1).padStart(4, "0")}`,
      link: pin.link ?? null,
      source: pin.media_source,
      title: pin.title ?? null,
    };

    pins.unshift(made);

    return made;
  };

  const upload = (request: PlatformRequest, mediaId: string) => {
    const registered = media.get(mediaId);

    if (registered === undefined) {
      return empty(404);
    }

    // The object store takes the form only with its length declared.
    if (headerOf(request, "content-length") === "") {
      return empty(411);
    }

    const parts = formPartsOf(request);
    const file = parts.at(-1);

    const fields = new Map(
      parts
        .slice(0, -1)
        .map((part) => [part.name, new TextDecoder().decode(part.data)])
    );

    const expected = Object.entries(uploadParameters(mediaId));

    if (
      file?.name !== "file" ||
      fields.size !== expected.length ||
      expected.some(([name, value]) => fields.get(name) !== value)
    ) {
      return empty(403);
    }

    registered.bytes = file.data;
    registered.contentType = file.contentType;

    return empty(204);
  };

  const register = (request: PlatformRequest, origin: string) => {
    if (mediaTypeOf(request).media_type !== "video") {
      return invalid("Invalid media type.");
    }

    const id = `7000000000${String(media.size + 1).padStart(3, "0")}`;

    media.set(id, {
      bytes: null,
      contentType: "",
      id,
      polls: options.videoPolls ?? 0,
    });

    return json(
      {
        media_id: id,
        media_type: "video",
        upload_parameters: uploadParameters(id),
        upload_url: `${origin}/upload/${id}`,
      },
      201
    );
  };

  const processing = (mediaId: string) => {
    const registered = media.get(mediaId);

    return registered === undefined
      ? mediaNotFound
      : json({
          media_id: registered.id,
          media_type: "video",
          status: statusOf(registered, options.videoFails === true),
        });
  };

  const listed = (
    request: PlatformRequest,
    board: string | undefined,
    section: string | undefined
  ) =>
    boards.some(({ id }) => id === board)
      ? page(
          pins.flatMap((pin) =>
            pin.boardId === board &&
            (section === undefined || pin.boardSectionId === section)
              ? [shown(pin)]
              : []
          ),
          request
        )
      : boardNotFound;

  const sectionsOf = (
    request: PlatformRequest,
    boardId: string | undefined
  ) => {
    const board = boards.find(({ id }) => id === boardId);

    return board === undefined
      ? boardNotFound
      : page([...(board.sections ?? [])], request);
  };

  const reads = (request: PlatformRequest): PlatformAnswer | undefined => {
    const { path } = request;

    if (path === "/v5/boards") {
      return page(
        boards.map(({ id, name, privacy }) => ({
          id,
          name,
          privacy: privacy ?? "PUBLIC",
        })),
        request
      );
    }

    const sections = sectionsPath.exec(path)?.groups;

    if (sections !== undefined) {
      return sectionsOf(request, sections["board"]);
    }

    const board = pinsPath.exec(path)?.groups;

    if (board !== undefined) {
      return listed(request, board["board"], board["section"]);
    }

    const status = mediaPath.exec(path)?.groups;

    if (status !== undefined) {
      return processing(status["id"] ?? "");
    }

    const counted = analyticsPath.exec(path)?.groups;

    return counted === undefined
      ? undefined
      : analyticsOf(request, options.metrics?.[counted["id"] ?? ""]);
  };

  const writes = (
    request: PlatformRequest,
    origin: string
  ): PlatformAnswer | undefined => {
    if (request.path === "/v5/media") {
      return register(request, origin);
    }

    if (request.path === "/v5/pins") {
      const made = create(request);

      return "_tag" in made ? made : json(shown(made), 201);
    }

    return undefined;
  };

  const route = (request: PlatformRequest, origin: string): PlatformAnswer =>
    (request.method === "GET" ? reads(request) : writes(request, origin)) ??
    refusal(404, 404, "Not found.");

  const handle = (request: PlatformRequest, origin: string): PlatformAnswer => {
    const key = `${request.method} ${request.path}`;
    const uploaded = uploadPath.exec(request.path)?.groups;
    const next = script.next(key);

    // The upload goes to the object store, which knows no token.
    if (request.method === "POST" && uploaded !== undefined) {
      return next === undefined ||
        next._tag === "createThenDrop" ||
        next._tag === "createThenFail"
        ? upload(request, uploaded["id"] ?? "")
        : next;
    }

    if (
      next !== undefined &&
      next._tag !== "createThenDrop" &&
      next._tag !== "createThenFail"
    ) {
      return next;
    }

    if (
      !tokens.has(headerOf(request, "authorization").replace(/^Bearer /u, ""))
    ) {
      if (next !== undefined) {
        script.putBack(key, next);
      }

      return authenticationFailed;
    }

    if (next !== undefined) {
      create(request);

      return next._tag === "createThenFail"
        ? json({ message: "Bad gateway" }, next.status)
        : dropped;
    }

    return route(request, origin);
  };

  const server = yield* platformServer(handle);

  return {
    ...server,
    /** The videos registered, in order. */
    media: () => [...media.values()],
    /** The Pins made, the newest first. */
    pins: () => [...pins],
    refusal,
    script,
  };
});
