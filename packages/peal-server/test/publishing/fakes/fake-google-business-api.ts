import { Effect, Schema } from "effect";

import {
  dropped,
  headerOf,
  json,
  jsonBodyOf,
  platformServer,
  scripted,
} from "./platform-server.ts";
import type { PlatformAnswer, PlatformRequest } from "./platform-server.ts";

/** The synthetic location the channel posts to, under its account. */
export const businessLocationPath =
  "accounts/200000000000000001/locations/100000000000000001";

/** A local post Google holds. */
export interface FakeLocalPost {
  /** What the post holds: what it was made with, as patched since. */
  body: NewLocalPost;
  readonly createTime: string;
  readonly name: string;
  /** The states the next reads answer, the last one for good. */
  states: string[];
}

/**
 * What Google does with the next request to a route instead of its own
 * behaviour: an answer, or `publishThenDrop`, which makes the post and
 * drops the connection, so the answer is lost.
 */
export type BusinessScript =
  | PlatformAnswer
  | { readonly _tag: "publishThenDrop" };

export interface FakeGoogleBusinessOptions {
  /**
   * The states a new post goes through, one per read, the last one for
   * good: `["LIVE"]` unless said.
   */
  readonly states?: readonly string[];
  /** Photo addresses Google cannot fetch. */
  readonly unfetchable?: readonly string[];
  /** Whether the location may post: one Google has not verified may not. */
  readonly verified?: boolean;
}

const DateSchema = Schema.Struct({
  day: Schema.Int,
  month: Schema.Int,
  year: Schema.Int,
});

const TimeOfDaySchema = Schema.Struct({
  hours: Schema.Int,
  minutes: Schema.Int,
  nanos: Schema.Int,
  seconds: Schema.Int,
});

// A LocalPost as accounts.locations.localPosts.create takes one, from the
// My Business API v4's reference. Everything is optional here: the fake
// says what is missing as Google does, rather than failing to decode.
const NewLocalPostSchema = Schema.Struct({
  callToAction: Schema.optionalKey(
    Schema.Struct({
      actionType: Schema.optionalKey(Schema.String),
      url: Schema.optionalKey(Schema.String),
    })
  ),
  event: Schema.optionalKey(
    Schema.Struct({
      schedule: Schema.optionalKey(
        Schema.Struct({
          endDate: Schema.optionalKey(DateSchema),
          endTime: Schema.optionalKey(TimeOfDaySchema),
          startDate: Schema.optionalKey(DateSchema),
          startTime: Schema.optionalKey(TimeOfDaySchema),
        })
      ),
      title: Schema.optionalKey(Schema.String),
    })
  ),
  languageCode: Schema.optionalKey(Schema.String),
  media: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        mediaFormat: Schema.optionalKey(Schema.String),
        sourceUrl: Schema.optionalKey(Schema.String),
      })
    )
  ),
  offer: Schema.optionalKey(
    Schema.Struct({
      couponCode: Schema.optionalKey(Schema.String),
      redeemOnlineUrl: Schema.optionalKey(Schema.String),
      termsConditions: Schema.optionalKey(Schema.String),
    })
  ),
  summary: Schema.optionalKey(Schema.String),
  topicType: Schema.optionalKey(Schema.String),
});

export type NewLocalPost = typeof NewLocalPostSchema.Type;

const postOf = jsonBodyOf(NewLocalPostSchema);

// The numeric ErrorCodes the fake answers with. Google's reference gives
// each range, not each number: these stand for a code of the common range
// (1 to 199), of the photos' (1000 to 1099, as PHOTO_FETCH_FAILED) and of
// the operations' (1300 to 1399, as LOCATION_DISABLED_FOR_LOCAL_POST_API).
export const businessErrorCodes = {
  invalidValue: 3,
  locationDisabledForLocalPosts: 1302,
  missingValue: 2,
  photoFetchFailed: 1001,
} as const;

/** A Google API error, as its JSON answers write one. */
export const businessError = (
  httpStatus: number,
  status: string,
  details: readonly Schema.Json[] = []
): PlatformAnswer =>
  json(
    {
      error: {
        code: httpStatus,
        details,
        message: "A synthetic message, which may quote what was sent.",
        status,
      },
    },
    httpStatus
  );

/**
 * A validation error: the request field at fault, with its ErrorCode and
 * the value that failed, which a client must not keep.
 */
export const validationError = (code: number, field: string, value = "") =>
  businessError(400, "INVALID_ARGUMENT", [
    {
      "@type": "type.googleapis.com/google.mybusiness.v4.ValidationError",
      errorDetails: [
        { code, field, message: `Invalid ${field}: ${value}`, value },
      ],
    },
  ]);

/** A refusal naming the project, as when the API is not enabled. */
export const projectRefusal = (reason: string) =>
  businessError(403, "PERMISSION_DENIED", [
    {
      "@type": "type.googleapis.com/google.rpc.ErrorInfo",
      domain: "googleapis.com",
      reason,
    },
  ]);

const unauthenticated = businessError(401, "UNAUTHENTICATED");

const topicTypes: ReadonlySet<string> = new Set([
  "STANDARD",
  "EVENT",
  "OFFER",
  "ALERT",
]);

const actionTypes: ReadonlySet<string> = new Set([
  "BOOK",
  "ORDER",
  "SHOP",
  "LEARN_MORE",
  "SIGN_UP",
  "CALL",
]);

const { invalidValue, missingValue, photoFetchFailed } = businessErrorCodes;

// An event, with all four fields of its schedule, is required for EVENT
// and OFFER.
const eventProblem = (body: NewLocalPost): PlatformAnswer | undefined => {
  if (body.topicType !== "EVENT" && body.topicType !== "OFFER") {
    return undefined;
  }

  const schedule = body.event?.schedule;

  if ((body.event?.title ?? "") === "") {
    return validationError(missingValue, "event.title");
  }

  return schedule?.startDate === undefined ||
    schedule.startTime === undefined ||
    schedule.endDate === undefined ||
    schedule.endTime === undefined
    ? validationError(missingValue, "event.schedule")
    : undefined;
};

// A button has one of Google's action types, and a URL unless it calls.
const buttonProblem = (body: NewLocalPost): PlatformAnswer | undefined => {
  if (body.callToAction === undefined) {
    return undefined;
  }

  const { actionType = "", url } = body.callToAction;

  if (!actionTypes.has(actionType)) {
    return validationError(invalidValue, "call_to_action.action_type");
  }

  return (actionType === "CALL") === (url === undefined)
    ? undefined
    : validationError(invalidValue, "call_to_action.url", url);
};

// A photo is given by its sourceUrl, which Google fetches.
const mediaProblem = (
  body: NewLocalPost,
  unfetchable: ReadonlySet<string>
): PlatformAnswer | undefined => {
  for (const [index, item] of (body.media ?? []).entries()) {
    if (item.mediaFormat !== "PHOTO" || item.sourceUrl === undefined) {
      return validationError(invalidValue, `media[${index}].media_format`);
    }

    if (unfetchable.has(item.sourceUrl)) {
      return validationError(
        photoFetchFailed,
        `media[${index}].source_url`,
        item.sourceUrl
      );
    }
  }

  return undefined;
};

// What the reference says of a LocalPost's fields, the topic type first,
// which is required.
const problemWith = (
  body: NewLocalPost,
  unfetchable: ReadonlySet<string>
): PlatformAnswer | undefined => {
  if (body.topicType === undefined) {
    return validationError(missingValue, "topic_type");
  }

  if (!topicTypes.has(body.topicType)) {
    return validationError(invalidValue, "topic_type", body.topicType);
  }

  return (
    eventProblem(body) ?? buttonProblem(body) ?? mediaProblem(body, unfetchable)
  );
};

/**
 * The My Business API v4's local posts for one synthetic location, written
 * from its reference: create (which checks the post as the reference
 * describes it), get and list, newest first, in pages. A post answers its
 * `state`, which moves on at each read. Tokens are those in `validTokens`.
 */
export const fakeGoogleBusinessApi = Effect.fnUntraced(
  function* fakeGoogleBusinessApi(options: FakeGoogleBusinessOptions = {}) {
    const validTokens = new Set(["ya29.business-1"]);
    const posts: FakeLocalPost[] = [];
    const scripts = scripted<BusinessScript>();
    const unfetchable = new Set(options.unfetchable);
    const collection = `/v4/${businessLocationPath}/localPosts`;

    const isAuthorized = (request: PlatformRequest) =>
      validTokens.has(
        headerOf(request, "authorization").replace(/^Bearer /u, "")
      );

    // The post as Google answers it, its state moving on once read.
    const shown = (post: FakeLocalPost) => {
      const [state = "LIVE", ...later] = post.states;

      if (later.length > 0) {
        post.states = later;
      }

      const answer = {
        ...post.body,
        createTime: post.createTime,
        name: post.name,
        state,
        updateTime: post.createTime,
      };

      return state === "LIVE"
        ? {
            ...answer,
            searchUrl: `https://local.google.example/place?id=1&use=posts&lpsid=${post.name.split("/").at(-1) ?? ""}`,
          }
        : answer;
    };

    const hold = (body: NewLocalPost, createTime: string) => {
      const post: FakeLocalPost = {
        body,
        createTime,
        name: `${businessLocationPath}/localPosts/${String(posts.length + 1).padStart(19, "7")}`,
        states: [...(options.states ?? ["LIVE"])],
      };

      posts.push(post);

      return post;
    };

    const create = (
      request: PlatformRequest,
      script: BusinessScript | undefined
    ): PlatformAnswer => {
      if (options.verified === false) {
        return validationError(
          businessErrorCodes.locationDisabledForLocalPosts,
          "parent"
        );
      }

      const body = postOf(request);
      const problem = problemWith(body, unfetchable);

      if (problem !== undefined) {
        return problem;
      }

      const post = hold(body, new Date().toISOString());

      return script?._tag === "publishThenDrop" ? dropped : json(shown(post));
    };

    const list = (request: PlatformRequest): PlatformAnswer => {
      const from = Number(request.query.get("pageToken") ?? "0");
      const size = Number(request.query.get("pageSize") ?? "20");
      const newest = posts.toReversed();
      const page = newest.slice(from, from + size).map(shown);

      return json(
        from + size < newest.length
          ? { localPosts: page, nextPageToken: String(from + size) }
          : { localPosts: page }
      );
    };

    const handle = (request: PlatformRequest): PlatformAnswer => {
      const route = `${request.method} ${request.path}`;
      const script = scripts.next(route);

      if (script !== undefined && script._tag !== "publishThenDrop") {
        return script;
      }

      if (!isAuthorized(request)) {
        return unauthenticated;
      }

      if (route === `POST ${collection}`) {
        return create(request, script);
      }

      if (route === `GET ${collection}`) {
        return list(request);
      }

      // The location's own posts only, as Google finds no other there.
      const removed = posts.findIndex(
        ({ name }) => route === `DELETE /v4/${name}`
      );

      if (removed !== -1) {
        posts.splice(removed, 1);

        return json({});
      }

      if (request.method === "DELETE") {
        return businessError(404, "NOT_FOUND");
      }

      // localPosts.patch: "You must specify each field that is being
      // updated in the mask"; a field the mask does not name is left as
      // it was, and a patch without a mask is refused.
      if (request.method === "PATCH") {
        const patched = posts.find(
          ({ name }) => request.path === `/v4/${name}`
        );

        if (patched === undefined) {
          return businessError(404, "NOT_FOUND");
        }

        const mask = (request.query.get("updateMask") ?? "")
          .split(",")
          .filter((field) => field !== "");

        if (mask.length === 0) {
          return validationError(
            businessErrorCodes.missingValue,
            "update_mask"
          );
        }

        const body = postOf(request);

        patched.body = mask.includes("summary")
          ? { ...patched.body, summary: body.summary ?? "" }
          : patched.body;

        return json(shown(patched));
      }

      const post = posts.find(({ name }) => route === `GET /v4/${name}`);

      return post === undefined
        ? businessError(404, "NOT_FOUND")
        : json(shown(post));
    };

    const server = yield* platformServer(handle);

    return {
      ...server,
      /** The route of the create call, and of the list. */
      collection,
      /** Holds a post made earlier, outside any attempt. */
      hold,
      /** The posts Google holds, oldest first. */
      posts: () => [...posts],
      /** Makes the next requests to `route` answer as scripted. */
      script: (route: string, answers: readonly BusinessScript[]) => {
        scripts.push(route, answers);
      },
    };
  }
);
