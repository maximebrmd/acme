import { Schema } from "effect";
import { Tool } from "effect/ai";
import { CurrentMember } from "peal-contract";

import { reading } from "#app/mcp/annotations.ts";
import { ToolRefused } from "#app/mcp/tool-refused.ts";

/**
 * The areas the tools are sorted in, one per toolkit: an area gains tools,
 * and a new area comes with its toolkit (`#app/mcp/catalogue.ts`).
 */
export const ToolAreaSchema = Schema.Literals([
  "account",
  "posts",
  "media",
  "reports",
  "people",
  "webhooks",
]).annotate({
  description:
    "An area of Peal: `account` (who the connection is, its workspace and channels, the server), `posts` (drafts, scheduling, publishing, outcomes), `media` (images and videos), `reports` (analytics and the plan), `people` (members and invitations), `webhooks` (endpoints and their deliveries).",
});

export type ToolArea = typeof ToolAreaSchema.Type;

/** A tool as `find_tools` lists it: enough to choose, not its schema. */
export const FoundToolSchema = Schema.Struct({
  area: ToolAreaSchema,
  // Whether it changes something, in Peal or outside.
  changes: Schema.Boolean,
  // Whether it removes or overwrites what was there.
  destructive: Schema.Boolean,
  name: Schema.String,
  // Whether its effect reaches outside Peal: a post on a platform, an
  // email, a request to another server.
  reachesOutside: Schema.Boolean,
  // The OAuth scope a client needs to call it.
  scope: Schema.Literals([
    "workspace:read",
    "workspace:write",
    "workspace:publish",
  ]),
  // Whether this connection holds that scope: null for an API key, which
  // carries permissions, not scopes (whoami lists them).
  scopeGranted: Schema.NullOr(Schema.Boolean),
  // What it does, in a sentence. tools/list gives the whole description.
  summary: Schema.String,
  title: Schema.String,
});

export type FoundTool = typeof FoundToolSchema.Type;

export const FindTools = Tool.make("find_tools", {
  dependencies: [CurrentMember],
  description:
    "Lists Peal's tools by area, with what each does in a sentence, whether it changes something or reaches outside Peal, the OAuth scope it takes and whether this connection holds it. Call it to choose a tool, or to learn what this connection may do before trying: `area` narrows to one area, `query` to the tools whose name, title or description holds every word given. It lists every tool tools/list does, and calls none; a tool's parameters are in tools/list.",
  failure: ToolRefused,
  parameters: Schema.Struct({
    area: Schema.optionalKey(ToolAreaSchema),
    query: Schema.optionalKey(
      Schema.String.check(Schema.isMaxLength(200)).annotate({
        description:
          "Words to look for, in any order and any case: every one must be in the tool's name, title or description.",
      })
    ),
  }),
  success: Schema.Struct({ tools: Schema.Array(FoundToolSchema) }),
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "Find tools");
