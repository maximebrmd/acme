import { Context, Effect, Layer } from "effect";
import type { Option } from "effect";

import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import type { ContentViolation } from "#publishing/domain/content-violation.ts";
import type { MediaFile } from "#publishing/domain/media-file.ts";
import { followUpsOn } from "#publishing/domain/platform-rules.ts";
import type { TargetOptions } from "#publishing/domain/target-options.ts";
import { creatorViolationsOn } from "#publishing/domain/tiktok-creator.ts";

import { CurrentThreadedPlatforms } from "./threaded-platforms.ts";
import { TikTokCreators } from "./tiktok-creators.ts";

/** A post on one of its channels, as it is about to be scheduled. */
export interface AccountTarget {
  readonly channel: ChannelOnPlatform;
  readonly files: readonly MediaFile[];
  /** How many parts the post has after its first. */
  readonly followUps: number;
  readonly options: Option.Option<TargetOptions>;
}

const photoViolations = (target: AccountTarget): readonly ContentViolation[] =>
  target.files.flatMap((file): readonly ContentViolation[] =>
    file.kind === "image"
      ? [
          {
            _tag: "mediaTypeUnsupported",
            ...target.channel,
            contentType: file.contentType,
            mediaId: file.mediaId,
          },
        ]
      : []
  );

/**
 * What a channel's own account refuses, beyond its platform's rules, read
 * from the platform when a post is scheduled: a TikTok creator's audiences,
 * interactions and longest video (`creatorViolationsOn`), and photos on a
 * server TikTok takes none from. When the platform cannot tell now, the
 * post is scheduled anyway: its adapter checks again when it goes out.
 */
export class AccountRules extends Context.Service<
  AccountRules,
  {
    readonly violationsOn: (
      target: AccountTarget
    ) => Effect.Effect<readonly ContentViolation[]>;
  }
>()("peal-server/publishing/application/AccountRules") {
  /** No account sets rules of its own. */
  static readonly none = Layer.succeed(
    AccountRules,
    AccountRules.of({ violationsOn: () => Effect.succeed([]) })
  );

  /** TikTok creators' settings, read through TikTokCreators. */
  static readonly layer = Layer.effect(
    AccountRules,
    Effect.gen(function* AccountRulesLive() {
      const creators = yield* TikTokCreators;
      const threaded = yield* CurrentThreadedPlatforms;

      // Parts on a platform whose rules take them, where the operator
      // turned them off (`X_THREADS`): the post is refused as one with
      // more parts than the platform takes.
      const partsOff = (target: AccountTarget): readonly ContentViolation[] =>
        target.followUps > 0 &&
        followUpsOn(target.channel.platform) !== undefined &&
        !threaded.takesParts(target.channel.platform)
          ? [
              {
                _tag: "tooManyParts",
                ...target.channel,
                count: target.followUps + 1,
                maximum: 1,
              },
            ]
          : [];

      const tiktok = Effect.fn("AccountRules.tiktok")(function* tiktok(
        target: AccountTarget
      ) {
        const photos = creators.takesPhotos ? [] : photoViolations(target);

        const posting = yield* creators.read(target.channel.channelId).pipe(
          Effect.tapError((failure) =>
            Effect.logWarning(
              "A TikTok creator's settings could not be read to schedule a post",
              failure
            ).pipe(Effect.annotateLogs({ channelId: target.channel.channelId }))
          ),
          Effect.option
        );

        if (posting._tag === "None" || posting.value._tag === "blocked") {
          return photos;
        }

        return [
          ...photos,
          ...creatorViolationsOn(
            target.channel,
            posting.value.creator,
            target.options,
            target.files
          ),
        ];
      });

      return AccountRules.of({
        violationsOn: (target) =>
          target.channel.platform === "tiktok"
            ? tiktok(target)
            : Effect.succeed(partsOff(target)),
      });
    })
  );
}
