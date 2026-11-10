import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/** Another workspace of the partner has this external id already. */
export class ExternalIdTaken extends Schema.TaggedError<ExternalIdTaken>()(
  "ExternalIdTaken",
  { externalId: Schema.String, workspaceId: WorkspaceIdSchema }
) {}
