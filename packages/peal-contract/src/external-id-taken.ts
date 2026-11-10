import { Schema } from "effect";

/** Another workspace of the partner has this external id. */
export class ExternalIdTaken extends Schema.TaggedError<ExternalIdTaken>()(
  "ExternalIdTaken",
  { workspaceId: Schema.String },
  {
    description:
      "Another workspace of the partner has this external id: `workspaceId` is that workspace. Nothing was created or changed.",
    httpApiStatus: 409,
  }
) {}
