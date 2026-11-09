import { createHash } from "node:crypto";

import { Effect, Option, Schema } from "effect";

import {
  dropped,
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

/** The synthetic account's DID. */
export const blueskyDid = "did:plc:testpublisheraccount0000";

/** A blob the PDS stored. */
export interface FakeBlob {
  readonly cid: string;
  readonly mimeType: string;
  readonly size: number;
}

/** A record the PDS holds. */
export interface FakeRecord {
  readonly rkey: string;
  readonly value: { readonly [field: string]: JsonValue };
}

/**
 * What the fake does with the next request to a route instead of its own
 * behaviour: an answer, or `createThenDrop`, which creates the record and
 * drops the connection, so the answer is lost.
 */
export type BlueskyScript =
  | PlatformAnswer
  | { readonly _tag: "createThenDrop" };

export interface FakeBlueskyOptions {
  /** How many looks at a video job find it still processing. */
  readonly videoPolls?: number;
  /** A video job that fails, with this code. */
  readonly videoFailure?: string;
}

const ProofSchema = Schema.fromJsonString(
  Schema.Struct({
    ath: Schema.String,
    htm: Schema.String,
    htu: Schema.String,
    nonce: Schema.optionalKey(Schema.String),
  })
);

const decodeProof = Schema.decodeUnknownOption(ProofSchema);

const CreateSchema = Schema.Struct({
  collection: Schema.String,
  record: Schema.Record(Schema.String, Schema.Json),
  repo: Schema.String,
  rkey: Schema.String,
});

const createOf = jsonBodyOf(CreateSchema);

const tidPattern = /^[234567a-j][234567a-z]{12}$/u;

const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("base64url");

const payloadOf = (jwt: string) =>
  decodeProof(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString());

/**
 * One server playing the PDS of a Bluesky account and the video service.
 * The PDS checks DPoP as a resource server does: the token must be one it
 * issued, and each proof must name the request, hash the token and carry
 * the current nonce, which a request without it is told (401
 * use_dpop_nonce). Records are kept by key, and a second create with a key
 * is refused with 500, as the reference PDS does. Video jobs complete
 * after `videoPolls` looks.
 */
export const fakeBluesky = Effect.fnUntraced(function* fakeBluesky(
  options: FakeBlueskyOptions = {}
) {
  const validTokens = new Set(["access-1"]);
  const nonce = "nonce-a";
  const blobs: FakeBlob[] = [];
  const records = new Map<string, FakeRecord>();
  const jobs = new Map<string, { blob: FakeBlob; polls: number }>();
  const serviceTokens = new Set<string>();
  const scripts = scripted<BlueskyScript>();

  // The DPoP check, as a resource server makes it: none when it passes.
  const dpopRefusal = (
    request: PlatformRequest,
    origin: string
  ): Option.Option<PlatformAnswer> => {
    const authorization = headerOf(request, "authorization");
    const token = authorization.replace(/^DPoP /u, "");

    if (!authorization.startsWith("DPoP ") || !validTokens.has(token)) {
      return Option.some(
        json({ error: "InvalidToken", message: "Bad token" }, 401, {
          "www-authenticate": 'DPoP error="invalid_token"',
        })
      );
    }

    const proof = payloadOf(headerOf(request, "dpop"));

    if (
      proof._tag === "None" ||
      proof.value.ath !== sha256(token) ||
      proof.value.htm !== request.method ||
      proof.value.htu !== `${origin}${request.path}`
    ) {
      return Option.some(json({ error: "InvalidDPoPProof" }, 400));
    }

    return proof.value.nonce === nonce
      ? Option.none()
      : Option.some(
          json({ error: "use_dpop_nonce" }, 401, {
            "dpop-nonce": nonce,
            "www-authenticate": 'DPoP error="use_dpop_nonce"',
          })
        );
  };

  const storeBlob = (mimeType: string, size: number): FakeBlob => {
    const blob = { cid: `bafkblob${blobs.length + 1}`, mimeType, size };

    blobs.push(blob);

    return blob;
  };

  const blobRef = (blob: FakeBlob) => ({
    $type: "blob",
    mimeType: blob.mimeType,
    ref: { $link: blob.cid },
    size: blob.size,
  });

  const create = (request: PlatformRequest) => {
    const body = createOf(request);

    if (!tidPattern.test(body.rkey) || body.repo !== blueskyDid) {
      return json({ error: "InvalidRequest", message: "Bad record" }, 400);
    }

    if (records.has(body.rkey)) {
      return json({ error: "InternalServerError" }, 500);
    }

    records.set(body.rkey, { rkey: body.rkey, value: body.record });

    return json({
      cid: `bafyrecord${records.size}`,
      uri: `at://${blueskyDid}/${body.collection}/${body.rkey}`,
    });
  };

  const jobStatus = (jobId: string) => {
    const job = jobs.get(jobId);

    if (job === undefined) {
      return json({ error: "NotFound" }, 404);
    }

    if (job.polls > 0) {
      job.polls -= 1;

      return json({
        jobStatus: { did: blueskyDid, jobId, state: "JOB_STATE_ENCODING" },
      });
    }

    return options.videoFailure === undefined
      ? json({
          jobStatus: {
            blob: blobRef(job.blob),
            did: blueskyDid,
            jobId,
            state: "JOB_STATE_COMPLETED",
          },
        })
      : json({
          jobStatus: {
            did: blueskyDid,
            failureCode: options.videoFailure,
            jobId,
            state: "JOB_STATE_FAILED",
          },
        });
  };

  const handle = (request: PlatformRequest, origin: string): PlatformAnswer => {
    const route = `${request.method} ${request.path}`;
    const script = scripts.next(route);

    if (script !== undefined && script._tag !== "createThenDrop") {
      return script;
    }

    switch (route) {
      case "GET /xrpc/com.atproto.repo.getRecord": {
        const found = records.get(request.query.get("rkey") ?? "");

        return found === undefined
          ? json({ error: "RecordNotFound", message: "Could not locate" }, 400)
          : json({
              cid: "bafyrecord",
              uri: `at://${blueskyDid}/app.bsky.feed.post/${found.rkey}`,
              value: found.value,
            });
      }

      case "POST /xrpc/app.bsky.video.uploadVideo": {
        const token = headerOf(request, "authorization").replace(
          /^Bearer /u,
          ""
        );

        if (!serviceTokens.has(token)) {
          return json({ error: "AuthRequired" }, 401);
        }

        const jobId = `job-${jobs.size + 1}`;
        const blob = storeBlob("video/mp4", request.body.length);

        jobs.set(jobId, { blob, polls: options.videoPolls ?? 2 });

        return json({ did: blueskyDid, jobId, state: "JOB_STATE_CREATED" });
      }

      case "GET /xrpc/app.bsky.video.getJobStatus": {
        return jobStatus(request.query.get("jobId") ?? "");
      }

      default: {
        break;
      }
    }

    const refused = dpopRefusal(request, origin);

    if (Option.isSome(refused)) {
      // The request never reached the handler the script is for.
      if (script !== undefined) {
        scripts.putBack(route, script);
      }

      return refused.value;
    }

    switch (route) {
      case "POST /xrpc/com.atproto.repo.uploadBlob": {
        const blob = storeBlob(
          headerOf(request, "content-type"),
          request.body.length
        );

        return json({ blob: blobRef(blob) });
      }

      case "POST /xrpc/com.atproto.repo.createRecord": {
        const answer = create(request);

        return script?._tag === "createThenDrop" ? dropped : answer;
      }

      case "GET /xrpc/com.atproto.server.getServiceAuth": {
        const token = `service-${serviceTokens.size + 1}`;

        serviceTokens.add(token);

        return json({ token });
      }

      default: {
        return json({ error: "MethodNotImplemented" }, 501);
      }
    }
  };

  const server = yield* platformServer(handle);

  return {
    ...server,
    /** Makes `token` one the PDS takes, as after a refresh. */
    allowToken: (token: string) => {
      validTokens.add(token);
    },
    blobs: () => [...blobs],
    records: () => [...records.values()],
    /** Makes the next requests to `route` go as scripted. */
    script: (route: string, answers: readonly BlueskyScript[]) => {
      scripts.push(route, answers);
    },
  };
});
