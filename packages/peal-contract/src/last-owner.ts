import { Schema } from "effect";

/**
 * The account owns, alone, workspaces that other members still use: it can
 * be deleted once another member owns each of them, or they are deleted.
 */
export class LastOwner extends Schema.TaggedError<LastOwner>()(
  "LastOwner",
  {
    workspaces: Schema.Array(
      Schema.Struct({ id: Schema.String, name: Schema.String })
    ),
  },
  {
    description:
      "The account is the only owner of workspaces with other members, which `workspaces` lists. Make another member an owner of each, or delete them, first.",
    httpApiStatus: 409,
  }
) {}
