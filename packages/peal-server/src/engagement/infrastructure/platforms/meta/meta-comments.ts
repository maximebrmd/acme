import { DateTime, Duration, Effect, Match, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { Mac } from "effect/crypto";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClientResponse as Response } from "effect/http";

import type { ChannelAccount } from "#channels/application/channel-access.ts";
import type { ActionOutcome } from "#engagement/application/ports/reply-sender.ts";
import type { ReplyFailure, SendOutcome } from "#engagement/domain/reply.ts";
import type {
  OutgoingReply,
  PlatformHttp,
} from "#engagement/infrastructure/platforms/engagement-platform.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { graphRefusalOf } from "#shared/infrastructure/platforms/graph-refusal.ts";
import type { GraphRefusal } from "#shared/infrastructure/platforms/graph-refusal.ts";
import {
  appSecretProof,
  graphUrl,
  instagramUrl,
} from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";

// What Facebook Pages' and Instagram's comment adapters share: Graph calls
// with a channel's token, what Meta refusing one means, and how a reply an
// earlier run may have made is looked for. Nothing here sends a reply
// again: Meta takes no idempotency key.

export interface MetaEngagementOptions {
  /**
   * Meta's main app's secret, whose `appsecret_proof` every call through
   * Facebook Login carries; none on a server without that app.
   */
  readonly appSecret: Option.Option<Redacted.Redacted>;
  readonly hosts: MetaHosts;
  readonly http: PlatformHttp;
  /**
   * The client threads are read with, whose answers end at
   * `maxThreadBytes` rather than fail past a megabyte; `http` otherwise.
   */
  readonly reader?: PlatformHttp;
  /** How long a read may keep the channel's gate. */
  readonly deadline?: Duration.Duration;
}

/** How long a read keeps the channel's gate unless told. */
export const defaultDeadline = Duration.seconds(30);

/** The comments one page of a read asks for. */
export const commentsPerPage = 25;

/**
 * Whether the account is an Instagram account connected through Instagram
 * Login: its calls go to graph.instagram.com, with the Instagram app's
 * token and no proof. Every other Meta channel came through Facebook
 * Login (an Instagram row without a connection did).
 */
const viaInstagramLogin = (account: ChannelAccount) =>
  account.platform === "instagram" &&
  Option.contains(account.connection, "instagramLogin");

type Params = Readonly<Record<string, Redacted.Redacted | string>>;

/** A Graph call as the account, built with its token and proof. */
export const graphRequest = Effect.fn("MetaEngagement.request")(
  function* graphRequest(
    options: Pick<MetaEngagementOptions, "appSecret" | "hosts">,
    account: ChannelAccount,
    token: Redacted.Redacted,
    method: "DELETE" | "GET" | "POST",
    path: string,
    params: Params = {}
  ) {
    const instagramLogin = viaInstagramLogin(account);

    const url = instagramLogin
      ? instagramUrl(options.hosts, path)
      : graphUrl(options.hosts, path);

    const proof =
      instagramLogin || Option.isNone(options.appSecret)
        ? {}
        : {
            appsecret_proof: yield* appSecretProof(
              token,
              options.appSecret.value
            ),
          };

    const all = { ...params, ...proof, access_token: token };

    return method === "POST"
      ? HttpClientRequest.post(url).pipe(HttpClientRequest.bodyUrlParams(all))
      : HttpClientRequest.make(method)(url).pipe(
          HttpClientRequest.setUrlParams(all)
        );
  }
);

/** A path of the Graph API for one node, its id encoded. */
export const nodePath = (id: string, edge = "") =>
  `/${encodeURIComponent(id)}${edge === "" ? "" : `/${edge}`}`;

/**
 * What Meta refusing a comment call means:
 *
 * - `token`: Meta refused the token itself, which only a new one helps.
 * - `permission`: the token lacks a permission (Graph code 10, or 200 to
 *   299): nothing is marked to reconnect, the call just cannot be made.
 * - `rateLimited`: Meta asked to slow down.
 * - `unavailable`: Meta failed, or said to try again.
 * - `gone`: the object does not exist (code 100, subcode 33).
 * - `refused`: anything else Meta refused as sent.
 */
export type MetaRefusal =
  | "gone"
  | "permission"
  | "rateLimited"
  | "refused"
  | "token"
  | "unavailable";

const refusalOf = (refusal: GraphRefusal): MetaRefusal =>
  Match.valueTags(refusal, {
    duplicate: () => "refused" as const,
    rateLimited: () => "rateLimited" as const,
    refused: ({ code }) =>
      code === "graph100.33" ? ("gone" as const) : ("refused" as const),
    token: ({ permission }) =>
      permission ? ("permission" as const) : ("token" as const),
    unavailable: () => "unavailable" as const,
  });

/** What an answer that is not a success says, as the comment calls read it. */
export const metaRefusalOf = (response: Response.HttpClientResponse) =>
  graphRefusalOf(response).pipe(Effect.map(refusalOf));

/** Whether an answer is a success. */
export const isSuccess = (response: Response.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

/** Why an action was not done, from Meta's refusal of it. */
export const actionFailure = (refusal: MetaRefusal): ReplyFailure => {
  if (refusal === "rateLimited") {
    return "rateLimited";
  }

  if (refusal === "unavailable") {
    return "platformUnavailable";
  }

  return refusal === "gone" ? "commentGone" : "refused";
};

/** Done; and when the comment is already gone, done as well. */
export const done: ActionOutcome = { _tag: "done" };

export const notDone = (reason: ReplyFailure): ActionOutcome => ({
  _tag: "failed",
  reason,
});

/** A resumed reply nobody can tell the fate of: a person checks. */
export const undecided: SendOutcome = {
  _tag: "unconfirmed",
  reason: "interrupted",
};

/** A reply that may have reached Meta without an answer coming back. */
export const unanswered: SendOutcome = {
  _tag: "unconfirmed",
  reason: "noResponse",
};

/**
 * An instant as Meta writes it, ISO 8601 with an offset of four digits
 * (`2026-11-12T09:05:53+0000`) or with a colon; none otherwise.
 */
export const instantOf = (written: string): Option.Option<DateTime.Utc> =>
  DateTime.make(
    written.replace(
      /(?<hours>[+-]\d{2})(?<minutes>\d{2})$/u,
      "$<hours>:$<minutes>"
    )
  );

const MadeSchema = Schema.Struct({ id: Schema.NonEmptyString });

// What the Comment and IG Comment references answer an update or a
// deletion with.
const SucceededSchema = Schema.Struct({ success: Schema.Boolean });

const succeededOf = HttpClientResponse.schemaBodyJson(SucceededSchema);

/** One Graph call of an action, as the account: its answer, or none. */
export type GraphCall = (
  method: "DELETE" | "GET" | "POST",
  path: string,
  params?: Readonly<Record<string, string>>
) => Effect.Effect<Option.Option<Response.HttpClientResponse>>;

/**
 * An action that sets a state on a comment (hide, show, delete), safe to
 * ask twice. Done only when Meta answers `{ "success": true }`. Meta's
 * code 100, subcode 33 says the object "does not exist, cannot be loaded
 * due to missing permissions, or does not support this operation": it
 * means the comment is gone, and the action done, only when the same
 * token still loads the thread's post; otherwise nobody can tell, and
 * nothing is done.
 */
export const confirmedAction = Effect.fn("MetaEngagement.action")(
  function* confirmedAction(
    call: GraphCall,
    method: "DELETE" | "POST",
    commentId: string,
    rootPostId: string,
    params: Readonly<Record<string, string>> = {}
  ) {
    const answer = yield* call(method, nodePath(commentId), params);

    if (Option.isNone(answer)) {
      return notDone("platformUnavailable");
    }

    const response = answer.value;

    if (isSuccess(response)) {
      const body = yield* succeededOf(response).pipe(Effect.option);

      return Option.match(body, {
        onNone: () => notDone("platformUnavailable"),
        onSome: ({ success }) => (success ? done : notDone("refused")),
      });
    }

    const refusal = yield* metaRefusalOf(response);

    if (refusal === "token") {
      return yield* new TokenRejected();
    }

    if (refusal !== "gone") {
      return notDone(actionFailure(refusal));
    }

    const post = yield* call("GET", nodePath(rootPostId), { fields: "id" });

    return Option.exists(post, isSuccess) ? done : notDone("refused");
  }
);

/** The id Meta answered a reply it made with, if it can be read. */
export const madeOf = (response: Response.HttpClientResponse) =>
  HttpClientResponse.schemaBodyJson(MadeSchema)(response).pipe(
    Effect.map(({ id }): SendOutcome => ({
      _tag: "sent",
      permalink: Option.none(),
      platformCommentId: id,
    })),
    // Made, and answered in a shape Peal cannot read.
    Effect.orElseSucceed(() => unanswered)
  );

/**
 * How far Meta's clock and Peal's may differ when a reply's time on Meta
 * is compared with when Peal wrote it.
 */
const clockSkew = Duration.minutes(1);

/** A reply the account made under a comment, as Meta lists it. */
export interface ListedReply {
  readonly fromAccount: boolean;
  readonly id: string;
  readonly text: string;
  readonly writtenAt: Option.Option<DateTime.Utc>;
}

/**
 * What a resumed reply is, from the replies Meta lists under its comment
 * (all of them: a list that may miss some proves nothing): sent when
 * exactly one by the account, written since the reply was (give or take
 * `clockSkew`), has its text; otherwise unconfirmed, for a person to
 * settle. None found may be one Meta has not listed yet, and two alike
 * cannot be told apart: neither is sent again.
 */
export const foundAmong = (
  reply: OutgoingReply,
  listed: readonly ListedReply[]
): SendOutcome => {
  const since = DateTime.subtractDuration(reply.createdAt, clockSkew);
  const text = reply.text.trim();

  const matching = listed.filter(
    (candidate) =>
      candidate.fromAccount &&
      candidate.text.trim() === text &&
      Option.exists(candidate.writtenAt, (at) =>
        DateTime.isGreaterThanOrEqualTo(at, since)
      )
  );

  const [only] = matching;

  return matching.length === 1 && only !== undefined
    ? { _tag: "sent", permalink: Option.none(), platformCommentId: only.id }
    : undecided;
};

/** The parameters of the page after `after`, if any. */
export const pageAfter = (after: Option.Option<string>): Params =>
  Option.match(after, {
    onNone: () => ({}),
    onSome: (cursor) => ({ after: cursor }),
  });

/** Graph's paging, as far as Peal follows it: the cursor after, if more follow. */
export const PagingSchema = Schema.optionalKey(
  Schema.Struct({
    cursors: Schema.optionalKey(
      Schema.Struct({ after: Schema.optionalKey(Schema.String) })
    ),
    next: Schema.optionalKey(Schema.String),
  })
);

/** The cursor of the next page, none when this one is the last. */
export const nextCursor = (
  paging: typeof PagingSchema.Type | undefined
): Option.Option<string> =>
  paging?.next === undefined
    ? Option.none()
    : Option.fromUndefinedOr(paging.cursors?.after).pipe(
        Option.filter((cursor) => cursor !== "")
      );

/** Builds requests with the Mac the proof needs, for an adapter's calls. */
export const requestsWith = Effect.fn("MetaEngagement.requests")(
  function* requestsWith(
    options: Pick<MetaEngagementOptions, "appSecret" | "hosts">
  ) {
    const mac = yield* Mac.Mac;

    return (
      account: ChannelAccount,
      token: Redacted.Redacted,
      method: "DELETE" | "GET" | "POST",
      path: string,
      params?: Params
    ) =>
      graphRequest(options, account, token, method, path, params).pipe(
        Effect.provideService(Mac.Mac, mac)
      );
  }
);
