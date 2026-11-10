import { Schema } from "effect";

/** The partner account still owns workspaces. */
export class PartnerOwnsWorkspaces extends Schema.TaggedError<PartnerOwnsWorkspaces>()(
  "PartnerOwnsWorkspaces",
  { owned: Schema.Int },
  {
    description:
      "The workspace's partner account still owns `owned` workspaces: delete each through the partner API first. Nothing was deleted.",
    httpApiStatus: 409,
  }
) {}
