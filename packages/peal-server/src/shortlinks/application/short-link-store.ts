import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ChannelId,
  PostId,
  PostTargetId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { ClickRange } from "#shortlinks/domain/click-range.ts";
import type { ShortCode } from "#shortlinks/domain/short-code.ts";
import type { ShortLinkId } from "#shortlinks/domain/short-link-id.ts";
import type { ShortLink } from "#shortlinks/domain/short-link.ts";

import type { CodeTaken } from "./code-taken.ts";

/** What a target's part asks a short link for. */
export interface LinkAsked {
  readonly channelId: ChannelId;
  readonly destination: string;
  readonly part: number;
  readonly postId: PostId;
  readonly targetId: PostTargetId;
  readonly workspaceId: WorkspaceId;
}

/** A link with its clicks in a range. */
export interface CountedLink {
  readonly clicks: number;
  readonly link: ShortLink;
}

/** A page of a workspace's links, newest first. */
export interface LinkPage {
  readonly links: readonly CountedLink[];
  /** The last link's id, when more may follow. */
  readonly next: Option.Option<ShortLinkId>;
}

/** Which of a workspace's links to list. */
export interface LinkFilter {
  readonly channelId: Option.Option<ChannelId>;
  readonly cursor: Option.Option<ShortLinkId>;
  readonly limit: number;
  readonly postId: Option.Option<PostId>;
}

/** Short links, their daily clicks and each workspace's default. */
export class ShortLinkStore extends Context.Service<
  ShortLinkStore,
  {
    /**
     * Keeps a link under `code` unless the target's part has one for the
     * destination already, and answers the code the table holds for it.
     * CodeTaken when another link holds `code`.
     */
    readonly issue: (
      asked: LinkAsked,
      fresh: {
        readonly code: ShortCode;
        readonly createdAt: DateTime.Utc;
        readonly id: ShortLinkId;
      }
    ) => Effect.Effect<ShortCode, CodeTaken | DatabaseError>;
    readonly byCode: (
      code: ShortCode
    ) => Effect.Effect<Option.Option<ShortLink>, DatabaseError>;
    /** Adds one to the link's clicks of `day`. */
    readonly count: (
      linkId: ShortLinkId,
      day: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    readonly page: (
      workspaceId: WorkspaceId,
      filter: LinkFilter,
      range: ClickRange
    ) => Effect.Effect<LinkPage, DatabaseError>;
    readonly linkOf: (
      workspaceId: WorkspaceId,
      linkId: ShortLinkId
    ) => Effect.Effect<Option.Option<ShortLink>, DatabaseError>;
    /** The link's clicks each day of the range that has some. */
    readonly days: (
      linkId: ShortLinkId,
      range: ClickRange
    ) => Effect.Effect<
      readonly { readonly clicks: number; readonly day: DateTime.Utc }[],
      DatabaseError
    >;
    /** Deletes up to `limit` days' counts before `before`, and says how many. */
    readonly purge: (
      before: DateTime.Utc,
      limit: number
    ) => Effect.Effect<number, DatabaseError>;
    readonly byDefault: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DatabaseError>;
    readonly setByDefault: (
      workspaceId: WorkspaceId,
      byDefault: boolean
    ) => Effect.Effect<void, DatabaseError>;
    /** Deletes the workspace's links, their clicks and its default. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** The workspace's links, oldest first, for its export. */
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly ShortLink[], DatabaseError>;
    /** Turns a link off or on again, by its code; false when none has it. */
    readonly setDisabled: (
      code: ShortCode,
      disabledAt: Option.Option<DateTime.Utc>
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/shortlinks/application/ShortLinkStore") {}
