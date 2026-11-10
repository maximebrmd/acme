import { Layer } from "effect";

import { HostedConnectApiLive } from "#channels/container.ts";

import { ConnectLinkIntakeLive } from "./intake.ts";

/**
 * The hosted connect pages' endpoints, and the intake in front of them.
 * They need the channels context's ConnectLinks and the workspace
 * context's Authenticate, for the origins the server trusts.
 */
export const HostedConnectLive = HostedConnectApiLive.pipe(
  Layer.provideMerge(ConnectLinkIntakeLive)
);
