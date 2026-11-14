import {
  Array as Arr,
  Context,
  DateTime,
  Effect,
  Layer,
  Option,
  Result,
} from "effect";

import { optionsOn } from "#publishing/domain/channel-options.ts";
import type { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { channelOf, previewOn } from "#publishing/domain/channel-preview.ts";
import type { ChannelPreview } from "#publishing/domain/channel-preview.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import type { ContentViolation } from "#publishing/domain/content-violation.ts";
import {
  contentOn,
  duplicateRange,
} from "#publishing/domain/duplicate-window.ts";
import type { Duplicate } from "#publishing/domain/duplicate-window.ts";
import { referencedMedia } from "#publishing/domain/named-media.ts";
import { partsOn } from "#publishing/domain/post-content.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";
import { scheduleGrace } from "#publishing/domain/post.ts";
import { postingMonthOf } from "#publishing/domain/posting-month.ts";
import type { QueueId } from "#publishing/domain/queue-id.ts";
import type { Queue, QueueNoRoom } from "#publishing/domain/queue.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { AllowanceReason } from "#shared/domain/allowance-reached.ts";
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
import type { ChannelSetNotFound } from "./channel-set-not-found.ts";
import { ContentFingerprints } from "./content-fingerprints.ts";
import { freeSlotOf, queueNamed } from "./placement.ts";
import type { Placement } from "./placement.ts";
import { PostAllowance } from "./post-allowance.ts";
import { PostMeter } from "./post-meter.ts";
import { nothingAsked, PostPresets } from "./post-presets.ts";
import type { DroppedChannels, PresetAsk } from "./post-presets.ts";
import { PostRepository } from "./post-repository.ts";
import { violationsOf } from "./publishability.ts";
import type { QueueNotFound } from "./queue-not-found.ts";
import type { QueueStore } from "./queue-store.ts";
import type { SignatureNotFound } from "./signature-not-found.ts";
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
   * What it takes from what the workspace saved: channel sets, and
   * signatures, filled in before anything is checked. Left out, nothing.
   */
  readonly presets?: PresetAsk;
  /**
   * When it would go out, if the request says: now, at an instant, or on
   * a queue's next free slot. None is a draft, whose time and room in the
   * plan are not checked.
   */
  readonly when: Option.Option<Placement>;
}

/** The slot a post added to a queue now would take, or why there is none. */
export interface QueueSlotCheck {
  readonly queueId: QueueId;
  readonly slot: Result.Result<DateTime.Utc, QueueNoRoom>;
}

/** What sending a post would come to. */
export interface PostCheck {
  /** The time it was checked at, when it has one. */
  readonly at: Option.Option<DateTime.Utc>;
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
  /**
   * Channels of the sets it names that it would be made without, as the
   * workspace no longer has them.
   */
  readonly dropped: readonly DroppedChannels[];
  /**
   * What was checked, once the sets and signatures it names are filled
   * in: the channels it would go to, what it would say and the options
   * it would have on each.
   */
  readonly filled: {
    readonly channelIds: readonly ChannelId[];
    readonly content: PostContent;
    readonly options: readonly ChannelOptions[];
  };
  /** The limit of the plan it would pass, when it has a time. */
  readonly planLimit: Option.Option<PlanLimitReached>;
  /**
   * Its channels on a platform that bills each post (X) the billing
   * account cannot pay for now, and why, when it has a time: it is still
   * made, and they fail when due unless that changes (a warning).
   */
  readonly unbilled: Option.Option<UnbilledChannels>;
  /** The slot it would take, when it is added to a queue. */
  readonly queueSlot: Option.Option<QueueSlotCheck>;
  /** Whether its time can be kept, when it has one. */
  readonly schedule: Option.Option<"inPast" | "ok">;
  readonly unknownChannels: readonly ChannelId[];
  readonly unknownMedia: readonly MediaAssetId[];
  /** What is wrong with it whatever the channel. */
  readonly violations: readonly ContentViolation[];
}

/** Channels on X its billing account cannot pay for, and why. */
export interface UnbilledChannels {
  readonly channelIds: readonly ChannelId[];
  readonly reason: AllowanceReason;
}

/**
 * The post's channels on X whose parts the billing account's meter has no
 * room for now, all its X parts counted together (`PostMeter.fits`); none
 * when it has room, has no X channel, or the server does not bill.
 */
export const unbilledOn = Effect.fn("PostChecks.unbilledOn")(
  function* unbilledOn(
    workspaceId: WorkspaceId,
    channels: readonly ChannelOnPlatform[],
    content: PostContent
  ) {
    const onX = channels.filter(({ platform }) => platform === "x");

    if (onX.length === 0) {
      return Option.none<UnbilledChannels>();
    }

    const meter = yield* PostMeter;

    const refused = yield* meter.fits(
      onX.flatMap(({ channelId }) =>
        partsOn(content, channelId).map(({ text }) => ({
          platform: "x" as const,
          text,
          workspaceId,
        }))
      )
    );

    return refused.pipe(
      Option.map(({ reason }): UnbilledChannels => ({
        channelIds: onX.map(({ channelId }) => channelId),
        reason,
      }))
    );
  }
);

/** Whether nothing the check found would refuse the post. */
export const isSendable = (check: PostCheck): boolean =>
  check.violations.length === 0 &&
  check.unknownChannels.length === 0 &&
  check.unknownMedia.length === 0 &&
  check.duplicates.length === 0 &&
  check.channels.every(({ violations }) => violations.length === 0) &&
  Option.isNone(check.planLimit) &&
  !Option.contains(check.schedule, "inPast") &&
  !Option.exists(check.queueSlot, ({ slot }) => Result.isFailure(slot));

type Ports =
  | AccountRules
  | ApprovalGate
  | AttachableMedia
  | ContentFingerprints
  | PostAllowance
  | PostPresets
  | PostRepository
  | QueueStore
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
    ) => Effect.Effect<
      PostCheck,
      | ChannelSetNotFound
      | DatabaseError
      | MissingPermission
      | QueueNotFound
      | SignatureNotFound
    >;
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
      const meter = yield* PostMeter;
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
        { allowDuplicate = false, when, ...asked }: CheckPostRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        const now = yield* DateTime.now;
        const withPorts = Effect.provideContext(ports);

        // The queue it would be added to, and the slot it would take now,
        // read without a lock: advice, as the rest.
        const queue = yield* Option.match(
          when.pipe(
            Option.flatMap((placement) =>
              placement._tag === "queue"
                ? Option.some(placement.queueId)
                : Option.none()
            )
          ),
          {
            onNone: () =>
              Effect.succeed(
                Option.none<{
                  readonly queue: Queue;
                  readonly slot: Result.Result<DateTime.Utc, QueueNoRoom>;
                }>()
              ),
            onSome: (queueId) =>
              queueNamed(actor.workspaceId, queueId).pipe(
                withPorts,
                Effect.flatMap((found) =>
                  freeSlotOf(found, now).pipe(
                    withPorts,
                    Effect.map((slot) => Option.some({ queue: found, slot }))
                  )
                )
              ),
          }
        );

        const presetsAsked = asked.presets ?? nothingAsked;

        // Naming no channel and no set, it would go to the queue's.
        const fromQueue = queue.pipe(
          Option.filter(
            () =>
              asked.channelIds.length === 0 &&
              presetsAsked.channelSets.length === 0
          )
        );

        const filled = yield* PostPresets.use((presets) =>
          presets.fill(actor, {
            ...presetsAsked,
            channelIds: Option.match(fromQueue, {
              onNone: () => asked.channelIds,
              onSome: ({ queue: chosen }) => chosen.channelIds,
            }),
            channelSets: Option.match(fromQueue, {
              onNone: () => presetsAsked.channelSets,
              onSome: ({ queue: chosen }) =>
                Option.toArray(chosen.channelSetId),
            }),
            content: asked.content,
            defaultOptions: true,
            options: asked.options ?? [],
          })
        ).pipe(withPorts);

        const { content, options } = filled;

        // A queue's channel disconnected since is left out, and said.
        const queueChannels = Option.match(fromQueue, {
          onNone: () => new Set<ChannelId>(),
          onSome: ({ queue: chosen }) => new Set<ChannelId>(chosen.channelIds),
        });

        const listed =
          queueChannels.size === 0
            ? []
            : yield* workspaceChannels.lookUp(actor, [...queueChannels]);

        const connected = new Set(listed.map(({ channelId }) => channelId));

        const gone = [...queueChannels].filter((id) => !connected.has(id));

        const channelIds = filled.channelIds.filter(
          (channelId) => !gone.includes(channelId)
        );

        const dropped: readonly DroppedChannels[] = [
          ...Option.match(fromQueue, {
            onNone: () => [],
            onSome: ({ queue: chosen }): DroppedChannels[] =>
              Arr.isReadonlyArrayNonEmpty(gone)
                ? [
                    {
                      _tag: "queue",
                      channelIds: gone,
                      queueId: chosen.id,
                      queueName: chosen.name,
                    },
                  ]
                : [],
          }),
          ...filled.dropped,
        ];

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

        // Every file the post depends on: those it shows, in any of its
        // parts, and those its options name.
        const mediaIds = referencedMedia(content, options);

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

        // Its time: now, the instant asked, or the queue's free slot; a
        // queue without one gives it none, and that is said instead.
        const at = when.pipe(
          Option.flatMap((placement) => {
            if (placement._tag === "at") {
              return Option.some(placement.at);
            }

            if (placement._tag === "now") {
              return Option.some(now);
            }

            return queue.pipe(
              Option.flatMap(({ slot }) => Result.getSuccess(slot))
            );
          })
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

        // As the plan's room, how things stand now: a warning, never a
        // refusal, as a ceiling may be raised before the post is due.
        const unbilled = Option.isSome(at)
          ? yield* unbilledOn(actor.workspaceId, channels, content).pipe(
              Effect.provideService(PostMeter, meter)
            )
          : Option.none<UnbilledChannels>();

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
                    content: contentOn(
                      content,
                      channelId,
                      optionsOn(options, channelId)
                    ),
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
          at,
          awaitsApproval,
          channels: channels.map((channel) =>
            previewOn(
              content,
              channel,
              violations.filter(
                (violation) => channelOf(violation) === channel.channelId
              ),
              optionsOn(options, channel.channelId)
            )
          ),
          dropped,
          duplicates,
          filled: { channelIds: requested, content, options },
          planLimit,
          queueSlot: queue.pipe(
            Option.map(({ queue: chosen, slot }) => ({
              queueId: chosen.id,
              slot,
            }))
          ),
          schedule,
          unbilled,
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
