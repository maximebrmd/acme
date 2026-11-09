import { Context, Effect, Layer, Schema } from "effect";

import type { TikTokPosting } from "#publishing/domain/tiktok-creator.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { TikTokCreators } from "./tiktok-creators.ts";
import type { CreatorFailure } from "./tiktok-creators.ts";
import { UnknownChannels } from "./unknown-channels.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

/** What the composer shows of a TikTok channel's creator. */
export interface TikTokAccount {
  readonly posting: TikTokPosting;
  /** Whether this server can post photos to TikTok. */
  readonly takesPhotos: boolean;
}

/**
 * A TikTok channel's creator, as the composer shows them before a post
 * (TikTok's guidelines ask for the creator's nickname, the audiences the
 * account offers and the interactions it allows, fresh from TikTok). Needs
 * post:create; a channel of the workspace that is not TikTok's is
 * UnknownChannels, as one it does not have.
 */
export class TikTokCreatorInfo extends Context.Service<
  TikTokCreatorInfo,
  {
    readonly read: (
      actor: Actor,
      channelId: string
    ) => Effect.Effect<
      TikTokAccount,
      CreatorFailure | DatabaseError | MissingPermission | UnknownChannels
    >;
  }
>()("acme-server/publishing/application/TikTokCreatorInfo") {
  static readonly layer = Layer.effect(
    TikTokCreatorInfo,
    Effect.gen(function* TikTokCreatorInfoLive() {
      const channels = yield* WorkspaceChannels;
      const creators = yield* TikTokCreators;

      const read = Effect.fn("TikTokCreatorInfo.read")(function* read(
        actor: Actor,
        channelId: string
      ) {
        yield* Effect.fromResult(authorize(actor, "post:create"));

        const id = decodeChannelId(channelId);

        if (id._tag === "None") {
          return yield* new UnknownChannels({ channelIds: [channelId] });
        }

        const [channel] = yield* channels.lookUp(actor, [id.value]);

        if (channel === undefined || channel.platform !== "tiktok") {
          return yield* new UnknownChannels({ channelIds: [channelId] });
        }

        const account: TikTokAccount = {
          posting: yield* creators.read(channel.channelId),
          takesPhotos: creators.takesPhotos,
        };

        return account;
      });

      return TikTokCreatorInfo.of({ read });
    })
  );
}
