import { Context } from "effect";
import type { Effect } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

import type { SiteConnectLimited } from "./site-connect-limited.ts";

/**
 * How often a workspace may try to connect a website: each try calls the
 * site it names, with the password it was given, so a workspace cannot
 * have Peal call sites, or try passwords, at will.
 */
export class SiteConnectPace extends Context.Service<
  SiteConnectPace,
  {
    /** Takes one try for the workspace, or refuses it for now. */
    readonly take: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, SiteConnectLimited>;
  }
>()("peal-server/channels/application/SiteConnectPace") {}
