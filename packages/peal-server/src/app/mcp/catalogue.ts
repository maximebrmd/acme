import { Context } from "effect";
import { Tool } from "effect/ai";

import { AdsTools } from "#app/mcp/ads-tools.ts";
import { CapabilityTools } from "#app/mcp/capabilities-tools.ts";
import { ConnectTools } from "#app/mcp/connect-tools.ts";
import { ToolAreaSchema } from "#app/mcp/discovery-tools.ts";
import type { ToolArea } from "#app/mcp/discovery-tools.ts";
import { MediaTools } from "#app/mcp/media-tools.ts";
import { PeopleTools } from "#app/mcp/people-tools.ts";
import { PostTools } from "#app/mcp/posts-tools.ts";
import { ReportTools } from "#app/mcp/reports-tools.ts";
import { ReviewTools } from "#app/mcp/review-tools.ts";
import { BasicTools } from "#app/mcp/tools.ts";
import { WebhookTools } from "#app/mcp/webhooks-tools.ts";
import type { WorkspaceScope } from "#workspace/domain/oauth-grant.ts";

// What the catalogue reads of a tool.
interface ListedTool {
  readonly annotations: Context.Context<never>;
  readonly description?: string | undefined;
  readonly name: string;
}

/**
 * The tools by area: one toolkit an area. Tools are written by hand, each
 * with a description of what it changes, and none is generated from an
 * endpoint; as their number grows, `find_tools` lists them from here, so a
 * client chooses among summaries rather than read every description. A new
 * toolkit joins this map, `ToolAreaSchema` and `PealTools` together.
 */
export const toolAreas: Readonly<Record<ToolArea, readonly ListedTool[]>> = {
  account: Object.values(BasicTools.tools),
  ads: Object.values(AdsTools.tools),
  channels: Object.values(CapabilityTools.tools),
  connect: Object.values(ConnectTools.tools),
  media: Object.values(MediaTools.tools),
  people: Object.values(PeopleTools.tools),
  posts: Object.values(PostTools.tools),
  reports: Object.values(ReportTools.tools),
  review: Object.values(ReviewTools.tools),
  webhooks: Object.values(WebhookTools.tools),
};

/**
 * The tools that decide what goes out to the platforms, and when: their
 * use cases check the publishing permissions, which only the scope
 * `workspace:publish` leaves to an OAuth client
 * (`#workspace/domain/oauth-grant.ts`). A test calls each with a
 * connection that lacks the scope.
 */
export const publishingTools: ReadonlySet<string> = new Set([
  "approve_post",
  "cancel_post",
  "confirm_target",
  "create_post",
  "create_posts",
  "publish_post",
  "repost_target",
  "request_changes",
  "reschedule_post",
  "schedule_post",
  "unschedule_post",
]);

/** A tool as the catalogue describes it. */
export interface CatalogueTool {
  readonly area: ToolArea;
  readonly changes: boolean;
  readonly description: string;
  readonly destructive: boolean;
  readonly name: string;
  readonly reachesOutside: boolean;
  /** The scope an OAuth client needs to call it. */
  readonly scope: WorkspaceScope;
  readonly title: string;
}

/**
 * The tools that spend on ads, or change what spends: their use cases
 * check `ads:spend` or `ads:manage`, which the scope `workspace:ads`
 * leaves to an OAuth client, beside `workspace:publish` for those that
 * spend. A test calls each with a connection that lacks the scope.
 */
export const adsTools: ReadonlySet<string> = new Set([
  "boost_post",
  "pause_boost",
  "resume_boost",
  "stop_boost",
]);

const scopeOf = (name: string, changes: boolean): WorkspaceScope => {
  if (adsTools.has(name)) {
    return "workspace:ads";
  }

  if (publishingTools.has(name)) {
    return "workspace:publish";
  }

  return changes ? "workspace:write" : "workspace:read";
};

/** Every tool the endpoint offers, area by area, in the order they list. */
export const toolCatalogue = (): readonly CatalogueTool[] =>
  ToolAreaSchema.literals.flatMap((area) =>
    toolAreas[area].map((tool): CatalogueTool => {
      const hint = (annotation: typeof Tool.Readonly) =>
        Context.getOrElse(tool.annotations, annotation, () => false);

      const changes = !hint(Tool.Readonly);

      return {
        area,
        changes,
        description: tool.description ?? "",
        destructive: hint(Tool.Destructive),
        name: tool.name,
        reachesOutside: hint(Tool.OpenWorld),
        scope: scopeOf(tool.name, changes),
        title: Context.getOrElse(tool.annotations, Tool.Title, () => tool.name),
      };
    })
  );

// A description's first sentence.
const firstSentence = /^.*?[.!?](?=\s|$)/su;

/** What a tool does, in a sentence: its description's first. */
export const summaryOf = (description: string): string =>
  firstSentence.exec(description)?.[0] ?? description;

/**
 * The catalogue's tools in an area, if one is asked, that hold every word
 * of a query in their name, title or description.
 */
export const findTools = (search: {
  readonly area?: ToolArea | undefined;
  readonly query?: string | undefined;
}): readonly CatalogueTool[] => {
  const words = (search.query ?? "")
    .toLowerCase()
    .split(/\s+/u)
    .filter((word) => word !== "");

  return toolCatalogue().filter((tool) => {
    const text = `${tool.name} ${tool.title} ${tool.description}`.toLowerCase();

    return (
      (search.area === undefined || tool.area === search.area) &&
      words.every((word) => text.includes(word))
    );
  });
};
