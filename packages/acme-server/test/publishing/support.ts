import { Effect, Layer, Option } from "effect";

import { AttachableMedia } from "#publishing/application/attachable-media.ts";
import { WorkspaceChannels } from "#publishing/application/workspace-channels.ts";
import { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { TextOverride } from "#publishing/domain/text-override.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import type {
  ChannelId,
  MediaAssetId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
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

/** Only these media may be attached. */
export const attachableMedia = (mediaIds: readonly MediaAssetId[] = []) =>
  Layer.succeed(
    AttachableMedia,
    AttachableMedia.of({
      lookUp: (_actor, requested) =>
        Effect.succeed(requested.filter((id) => mediaIds.includes(id))),
    })
  );

/** Channels on Mastodon, and no media: what most tests need. */
export const ReferencesTest = Layer.mergeAll(anyChannelOn(), attachableMedia());

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
