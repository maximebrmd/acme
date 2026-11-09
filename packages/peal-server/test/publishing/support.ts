import { Effect, Layer, Option } from "effect";

import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { AttachableMedia } from "#publishing/application/attachable-media.ts";
import { PostOrigins } from "#publishing/application/post-origins.ts";
import { WorkspaceChannels } from "#publishing/application/workspace-channels.ts";
import { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { MediaFile } from "#publishing/domain/media-file.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { TextOverride } from "#publishing/domain/text-override.ts";
import { PlanPostAllowanceLive } from "#publishing/infrastructure/plan-post-allowance.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import type {
  ChannelId,
  MediaAssetId,
  UserId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { UnmeteredTest } from "#test/billing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Stand-ins for what posts refer to in other contexts, and synthetic content.

/** Every channel asked for is the workspace's, on `platform`. */
export const anyChannelOn = (platform: Platform = "mastodon") =>
  Layer.succeed(
    WorkspaceChannels,
    WorkspaceChannels.of({
      lookUp: (_actor, channelIds) =>
        Effect.succeed(
          channelIds.map((channelId) => ({ channelId, platform }))
        ),
    })
  );

/** Only these files may be attached. */
export const attachableMedia = (files: readonly MediaFile[] = []) =>
  Layer.succeed(
    AttachableMedia,
    AttachableMedia.of({
      lookUp: (_actor, requested) =>
        Effect.succeed(
          files.filter(({ mediaId }) => requested.includes(mediaId))
        ),
    })
  );

/**
 * A synthetic file of the media context: by default a 200 kB JPEG of
 * 1200×800, which every platform with media rules takes.
 */
export const mediaFile = (
  mediaId: MediaAssetId,
  {
    byteSize = 200_000,
    contentType = "image/jpeg",
    dimensions = Option.some({ height: 800, width: 1200 }),
    duration = Option.none(),
  }: Partial<
    Pick<MediaFile, "byteSize" | "contentType" | "dimensions" | "duration">
  > = {}
): MediaFile =>
  new MediaFile({ byteSize, contentType, dimensions, duration, mediaId });

/**
 * The posts a month allows, on a server whose plans are `entitlements`
 * (none, by default: nothing is limited).
 */
export const postAllowance = (
  entitlements: typeof UnmeteredTest = UnmeteredTest,
  connected = 0
) =>
  PlanPostAllowanceLive.pipe(
    Layer.provide(entitlements),
    Layer.provide(
      Layer.succeed(
        ChannelUsage,
        ChannelUsage.of({ connected: () => Effect.succeed(connected) })
      )
    )
  );

/**
 * Channels on Mastodon, no media, no limit, and keys and applications
 * without names: what most tests need.
 */
export const ReferencesTest = Layer.mergeAll(
  anyChannelOn(),
  attachableMedia(),
  postAllowance(),
  PostOrigins.unnamed
);

const syntheticUser = UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

/** Someone signed in to the workspace with these permissions. */
export const actorIn = (
  workspaceId: WorkspaceId,
  permissions: readonly Permission[] = permissionsFor("editor")
): Actor =>
  new Actor({
    permissions,
    subject: {
      _tag: "user",
      impersonatedBy: Option.none(),
      userId: syntheticUser,
    },
    workspaceId,
  });

/** The member `userId`, signed in to the workspace with these permissions. */
export const actorAs = (
  userId: UserId,
  workspaceId: WorkspaceId,
  permissions: readonly Permission[] = permissionsFor("editor")
): Actor =>
  new Actor({
    permissions,
    subject: { _tag: "user", impersonatedBy: Option.none(), userId },
    workspaceId,
  });

/** An API key of the workspace, with these permissions. */
export const apiKeyIn = (
  workspaceId: WorkspaceId,
  permissions: readonly Permission[] = permissionsFor("editor")
): Actor =>
  new Actor({
    permissions,
    subject: { _tag: "apiKey", apiKeyId: "synthetic-key" },
    workspaceId,
  });

/** Content with this text, and optionally media and overrides. */
export const contentOf = (
  text: string,
  {
    media = [],
    overrides = [],
  }: {
    readonly media?: readonly MediaAssetId[];
    readonly overrides?: readonly (readonly [ChannelId, string])[];
  } = {}
): PostContent =>
  new PostContent({
    media: media.map(
      (mediaId) =>
        new MediaAttachment({ altText: "A synthetic image", mediaId })
    ),
    overrides: overrides.map(
      ([channelId, override]) => new TextOverride({ channelId, text: override })
    ),
    text,
  });

/** What synthetic posts say. */
export const syntheticContent = contentOf("A synthetic post for tests.");
