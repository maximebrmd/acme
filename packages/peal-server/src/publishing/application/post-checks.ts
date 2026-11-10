import { Array as Arr, Context, DateTime, Effect, Layer, Option } from "effect";

import type { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { channelOf, previewOn } from "#publishing/domain/channel-preview.ts";
import type { ChannelPreview } from "#publishing/domain/channel-preview.ts";
import type { ContentViolation } from "#publishing/domain/content-violation.ts";
import {
  contentOn,
  duplicateRange,
} from "#publishing/domain/duplicate-window.ts";
import type { Duplicate } from "#publishing/domain/duplicate-window.ts";
import { shownMedia } from "#publishing/domain/post-content.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";
import { scheduleGrace } from "#publishing/domain/post.ts";
import { postingMonthOf } from "#publishing/domain/posting-month.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { roomForOneMore, withinAllowance } from "#shared/domain/allowance.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type {
  ChannelId,
  MediaAssetId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

import type { AccountRules } from "./account-rules.ts";
import { ApprovalGate } from "./approval-gate.ts";
import { AttachableMedia } from "./attachable-media.ts";
import { ContentFingerprints } from "./content-fingerprints.ts";
import { PostAllowance } from "./post-allowance.ts";
import { PostRepository } from "./post-repository.ts";
import { violationsOf } from "./publishability.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";

/** A post to check: what `send` takes, or a draft, which has no time. */
export interface CheckPostRequest {
  /** True when the same content may go to a channel that has it. */
  readonly allowDuplicate?: boolean;
  readonly channelIds: readonly ChannelId[];
  readonly content: PostContent;
  // The options it has on some channels, one at most per channel.
  readonly options?: readonly ChannelOptions[];
  /**
   * When it would go out, if the request says: at an instant, or now. None
   * is a draft, whose time and room in the plan are not checked.
   */
  readonly when: Option.Option<{ readonly at: Option.Option<DateTime.Utc> }>;
}

/** What sending a post would come to. */
export interface PostCheck {
  /**
   * Whether the post, sent with a time, would wait for an approval before
   * it is scheduled (`ApprovalGate.holds`). Waiting refuses nothing: the
   * post would be made, and held.
   */
  readonly awaitsApproval: boolean;
  /** One per channel of the workspace it names, in the order given. */
  readonly channels: readonly ChannelPreview[];
  /**
   * The channels that already have the same content from another post
   * near its time, when it has one and does not allow them.
   */
  readonly duplicates: readonly Duplicate[];
  /** The limit of the plan it would pass, when it has a time. */
  readonly planLimit: Option.Option<PlanLimitReached>;
  /** Whether its time can be kept, when it has one. */
  readonly schedule: Option.Option<"inPast" | "ok">;
  readonly unknownChannels: readonly ChannelId[];
  readonly unknownMedia: readonly MediaAssetId[];
  /** What is wrong with it whatever the channel. */
  readonly violations: readonly ContentViolation[];
}

/** Whether nothing the check found would refuse the post. */
export const isSendable = (check: PostCheck): boolean =>
  check.violations.length === 0 &&
  check.unknownChannels.length === 0 &&
  check.unknownMedia.length === 0 &&
  check.duplicates.length === 0 &&
  check.channels.every(({ violations }) => violations.length === 0) &&
  Option.isNone(check.planLimit) &&
  !Option.contains(check.schedule, "inPast");

type Ports =
  | AccountRules
  | ApprovalGate
  | AttachableMedia
  | ContentFingerprints
  | PostAllowance
  | PostRepository
  | WorkspaceChannels;

/**
 * Checking a post without making it: every rule scheduling one goes
 * through (`violationsOf`, the workspace's channels and media, the time,
 * the plan), answered together rather than at the first that fails, with
 * what each channel would receive. It writes nothing, claims nothing and
 * locks nothing: the plan's month is counted as it stands, so a post found
 * to fit can still be refused when it is sent, once others took its room.
 * Needs post:read, and what reading the channels and media needs.
 */
export class PostChecks extends Context.Service<
  PostChecks,
  {
    readonly check: (
      actor: Actor,
      request: CheckPostRequest
    ) => Effect.Effect<PostCheck, DatabaseError | MissingPermission>;
  }
>()("peal-server/publishing/application/PostChecks") {
  static readonly layer = Layer.effect(
    PostChecks,
    Effect.gen(function* PostChecksLive() {
      const posts = yield* PostRepository;
      const allowance = yield* PostAllowance;
      const workspaceChannels = yield* WorkspaceChannels;
      const attachable = yield* AttachableMedia;
      const fingerprints = yield* ContentFingerprints;
      const gate = yield* ApprovalGate;
      const ports = yield* Effect.context<Ports>();

      // The first limit of the plan a post at `at` would pass, as
      // scheduling checks them: its channels, its members, then the month.
      const planLimitAt = Effect.fn("PostChecks.planLimitAt")(
        function* planLimitAt(workspaceId: WorkspaceId, at: DateTime.Utc) {
          const channels = yield* allowance.channels(workspaceId);

          yield* Effect.fromResult(
            withinAllowance("channels", channels.allowed, channels.connected)
          );

          const members = yield* allowance.members(workspaceId);

          yield* Effect.fromResult(
            withinAllowance("members", members.allowed, members.taken)
          );

          const allowed = yield* allowance.scheduledPerMonth(workspaceId);

          if (Option.isNone(allowed)) {
            return;
          }

          const going = yield* posts.countGoingOut(
            workspaceId,
            postingMonthOf(at),
            Option.none()
          );

          yield* Effect.fromResult(
            roomForOneMore("scheduledPosts", allowed, going)
          );
        },
        (checked) =>
          checked.pipe(
            Effect.as(Option.none<PlanLimitReached>()),
            Effect.catchTag("PlanLimitReached", (reached) =>
              Effect.succeed(Option.some(reached))
            )
          )
      );

      const check = Effect.fn("PostChecks.check")(function* check(
        actor: Actor,
        {
          allowDuplicate = false,
          channelIds,
          content,
          options = [],
          when,
        }: CheckPostRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        const requested = Arr.dedupe(channelIds);

        const found =
          requested.length === 0
            ? []
            : yield* workspaceChannels.lookUp(actor, requested);

        const channels = requested.flatMap((channelId) =>
          found.filter((channel) => channel.channelId === channelId)
        );

        const known = new Set(channels.map(({ channelId }) => channelId));
        const unknownChannels = requested.filter((id) => !known.has(id));

        // Every file the post shows, in any of its parts.
        const mediaIds = shownMedia(content).map(({ mediaId }) => mediaId);

        const attached =
          mediaIds.length === 0
            ? []
            : yield* attachable.lookUp(actor, mediaIds);

        const files = mediaIds.flatMap((mediaId) =>
          attached.filter((file) => file.mediaId === mediaId)
        );

        const ready = new Set(files.map(({ mediaId }) => mediaId));
        const unknownMedia = mediaIds.filter((id) => !ready.has(id));

        const violations = yield* violationsOf(
          content,
          channels,
          files,
          options
        ).pipe(Effect.provideContext(ports));

        // A channel that is not the workspace's is said once, as unknown:
        // not again as a text or options for a channel the post is not
        // for, nor as a post for no channel.
        const general = violations.filter(
          (violation) =>
            channelOf(violation) === undefined &&
            (violation._tag === "noChannels"
              ? unknownChannels.length === 0
              : !unknownChannels.includes(violation.channelId))
        );

        const now = yield* DateTime.now;

        const at = when.pipe(
          Option.map((timing) => Option.getOrElse(timing.at, () => now))
        );

        const schedule = at.pipe(
          Option.map((instant) =>
            DateTime.isLessThan(
              instant,
              DateTime.subtractDuration(now, scheduleGrace)
            )
              ? ("inPast" as const)
              : ("ok" as const)
          )
        );

        const planLimit = yield* Option.match(at, {
          onNone: () => Effect.succeed(Option.none<PlanLimitReached>()),
          onSome: (instant) => planLimitAt(actor.workspaceId, instant),
        });

        // Read without a transaction, so nothing is held: as the plan's
        // room, it says how things stand now.
        const duplicates = yield* Option.match(at, {
          onNone: () => Effect.succeed([]),
          onSome: (instant) =>
            allowDuplicate
              ? Effect.succeed([])
              : fingerprints.glance({
                  ...duplicateRange(instant),
                  contents: channels.map(({ channelId }) => ({
                    channelId,
                    content: contentOn(content, channelId),
                  })),
                  except: Option.none(),
                  workspaceId: actor.workspaceId,
                }),
        });

        // A draft's content is sent nowhere: nothing waits.
        const awaitsApproval = Option.isSome(when)
          ? yield* gate.holds(actor)
          : false;

        const checked: PostCheck = {
          awaitsApproval,
          channels: channels.map((channel) =>
            previewOn(
              content,
              channel,
              violations.filter(
                (violation) => channelOf(violation) === channel.channelId
              )
            )
          ),
          duplicates,
          planLimit,
          schedule,
          unknownChannels,
          unknownMedia,
          violations: general,
        };

        return checked;
      });

      return PostChecks.of({ check });
    })
  );
}
