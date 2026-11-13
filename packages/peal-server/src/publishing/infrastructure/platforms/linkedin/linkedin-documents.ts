import { Effect, Option, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import type {
  MediaForPublishing,
  PublishableMedia,
} from "#publishing/application/media-for-publishing.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import type { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import type { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { unanswered } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";
import {
  encodedUrn,
  restCall,
} from "#shared/infrastructure/platforms/linkedin-rest.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { streamedBody } from "#shared/infrastructure/platforms/public-http.ts";

import { authorUrnOf } from "./linkedin-author.ts";
import { mediaRefusal } from "./linkedin-refusal.ts";

type Http = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

type AnswerError = HttpClientError.HttpClientError | Schema.SchemaError;

// From the Documents API: PDF among the formats it takes, up to 100 MB and
// 300 pages, which the platform rules and the media library check first.
const documentType = "application/pdf";

const DocumentUploadSchema = Schema.Struct({
  value: Schema.Struct({
    document: Schema.NonEmptyString,
    uploadUrl: Schema.NonEmptyString,
  }),
});

// WAITING_UPLOAD, PROCESSING, AVAILABLE or PROCESSING_FAILED.
const DocumentSchema = Schema.Struct({ status: Schema.String });

const isSuccess = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300;

/**
 * A PDF on LinkedIn, through the Documents API, as an image goes through
 * the Images API: `initializeUpload` for the post's author (the member or
 * the page) answers a document URN and an upload URL, the bytes are sent
 * there with the channel's token, and the document is processed before a
 * post can show it. `status` reads how far that is; none when the token
 * may not read documents back (a member's `w_member_social` only writes).
 * The upload URL comes in LinkedIn's answer: the token goes to LinkedIn's
 * own hosts only.
 */
export const linkedinDocuments = (options: {
  readonly api: Http;
  readonly apiUrl: URL;
  readonly credentials: PlatformCredentials["Service"];
  readonly media: MediaForPublishing["Service"];
  readonly uploads: Http;
  readonly version: string;
}) => {
  const { api, apiUrl, credentials, media, uploads } = options;
  const rest = restCall(options.version);

  const call = <A>(
    post: OutgoingPost,
    client: Http,
    request: Parameters<typeof rest>[0],
    versioned: boolean,
    answer: (
      response: HttpClientResponse.HttpClientResponse
    ) => Effect.Effect<A, AnswerError | PublishFailure | TokenRejected>
  ) =>
    credentials.withToken(post.channelId, ({ accessToken }) =>
      client
        .execute(
          versioned
            ? rest(request, accessToken)
            : HttpClientRequest.bearerToken(request, accessToken)
        )
        .pipe(
          Effect.flatMap(answer),
          Effect.catchTags({
            HttpClientError: unanswered,
            OutboundRequestRefused: unanswered,
            SchemaError: unanswered,
          })
        )
    );

  const uploadUrlOf = (value: string): Effect.Effect<URL, MediaRejected> => {
    const url = URL.parse(value);

    const linkedin =
      url !== null &&
      (url.origin === apiUrl.origin ||
        (url.protocol === "https:" &&
          (url.hostname === "linkedin.com" ||
            url.hostname.endsWith(".linkedin.com"))));

    return linkedin
      ? Effect.succeed(url)
      : Effect.fail(new MediaRejected({ code: "uploadUrlNotAllowed" }));
  };

  const upload = Effect.fn("LinkedInDocuments.upload")(function* upload(
    post: OutgoingPost,
    attachment: MediaAttachment,
    described: PublishableMedia
  ) {
    if (described.contentType !== documentType) {
      return yield* new MediaRejected({ code: "unsupportedType" });
    }

    const { value } = yield* call(
      post,
      api,
      HttpClientRequest.post(new URL("/rest/documents", apiUrl)).pipe(
        HttpClientRequest.setUrlParam("action", "initializeUpload"),
        HttpClientRequest.bodyJsonUnsafe({
          initializeUploadRequest: { owner: authorUrnOf(post.accountId) },
        })
      ),
      true,
      (response) =>
        isSuccess(response)
          ? HttpClientResponse.schemaBodyJson(DocumentUploadSchema)(response)
          : mediaRefusal(response)
    );

    const uploadUrl = yield* uploadUrlOf(value.uploadUrl);

    // The whole file in one request, up to 100 MiB, streamed from the
    // media store as it is sent, never held whole, with its length
    // (`streamedBody`). Its turn among the large uploads is waited for
    // before the request opens, and kept if the request is sent again with
    // a renewed token.
    yield* Effect.scoped(
      media.held(post.workspaceId, attachment.mediaId).pipe(
        Effect.flatMap((bytes) =>
          call(
            post,
            uploads,
            HttpClientRequest.put(uploadUrl).pipe(
              streamedBody(bytes, {
                contentLength: described.byteSize,
                contentType: "application/octet-stream",
              })
            ),
            false,
            (response) =>
              isSuccess(response) ? Effect.void : mediaRefusal(response)
          )
        )
      )
    );

    return value.document;
  });

  /** The document's processing status; none when the token may not read it. */
  const status = (post: OutgoingPost, document: string) =>
    call(
      post,
      api,
      HttpClientRequest.get(
        new URL(`/rest/documents/${encodedUrn(document)}`, apiUrl)
      ),
      true,
      (
        response
      ): Effect.Effect<
        Option.Option<string>,
        AnswerError | PublishFailure | TokenRejected
      > => {
        if (response.status === 403) {
          return Effect.succeed(Option.none());
        }

        return isSuccess(response)
          ? HttpClientResponse.schemaBodyJson(DocumentSchema)(response).pipe(
              Effect.map((found) => Option.some(found.status))
            )
          : mediaRefusal(response);
      }
    );

  return { status, upload };
};
