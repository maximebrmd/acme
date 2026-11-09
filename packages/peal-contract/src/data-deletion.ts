import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { DataDeletionNotFound } from "./data-deletion-not-found.ts";
import { MetaAppNotConfigured } from "./meta-app-not-configured.ts";
import { SignedRequestRefused } from "./signed-request-refused.ts";

/**
 * The Meta apps whose users can ask Peal to delete their data: `facebook`,
 * the main app, whose Facebook Login connects Facebook Pages and Instagram
 * accounts, and `threads`, its Threads credentials.
 */
export const MetaAppSchema = Schema.Literals(["facebook", "threads"]).annotate({
  description: "A Meta app that signs users in to connect channels.",
  identifier: "MetaApp",
});

export type MetaApp = typeof MetaAppSchema.Type;

/** What Meta posts to a data deletion callback, as a form. */
export const SignedRequestFormSchema = Schema.Struct({
  // `<signature>.<payload>`, both base64url, signed with the app's secret.
  signed_request: Schema.String.check(Schema.isBetweenLength(1, 8192)),
}).annotate({ identifier: "SignedRequestForm" });

export type SignedRequestForm = typeof SignedRequestFormSchema.Type;

/** The answer Meta expects: where the user follows the request, and its code. */
export const DataDeletionConfirmationSchema = Schema.Struct({
  confirmation_code: Schema.String,
  url: Schema.String,
}).annotate({ identifier: "DataDeletionConfirmation" });

export type DataDeletionConfirmation =
  typeof DataDeletionConfirmationSchema.Type;

/** A data deletion request, as its status page shows it. */
export const DataDeletionStatusSchema = Schema.Struct({
  app: MetaAppSchema,
  // How many connected accounts were deleted.
  channelsDeleted: Schema.Int,
  completedAt: Schema.DateTimeUtc,
  confirmationCode: Schema.String,
  requestedAt: Schema.DateTimeUtc,
  // Peal deletes the data when the request comes, so a request it knows is
  // done.
  status: Schema.Literal("completed"),
}).annotate({ identifier: "DataDeletionStatus" });

export type DataDeletionStatus = typeof DataDeletionStatusSchema.Type;

/**
 * Meta's data deletion callbacks. Meta calls them, without signing in, when
 * one of its users asks for the data Peal holds about them to be deleted;
 * the request's signature, made with the app's secret, is its authority.
 */
export class DataDeletionApi extends HttpApiGroup.make("dataDeletion")
  .add(
    HttpApiEndpoint.post("request", "/:app", {
      error: [SignedRequestRefused, MetaAppNotConfigured],
      params: { app: MetaAppSchema },
      payload: SignedRequestFormSchema.pipe(HttpApiSchema.asFormUrlEncoded()),
      success: DataDeletionConfirmationSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Meta's data deletion callback for the app: deletes, in every workspace, the channels the user connected, with their tokens, and answers with a confirmation code and the page where its status shows. Register it in the app's dashboard as the data deletion request URL.",
        summary: "Delete a Meta user's data",
      })
    ),
    HttpApiEndpoint.get("status", "/requests/:code", {
      error: DataDeletionNotFound,
      params: { code: Schema.String },
      success: DataDeletionStatusSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "The status of a data deletion request, by the confirmation code Meta showed the user. Anyone holding the code may read it; it names nobody.",
        summary: "Get a data deletion request's status",
      })
    )
  )
  .prefix("/api/data-deletion") {}
