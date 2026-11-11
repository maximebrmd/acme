import { Array as Arr, Context, Effect, Layer, Option, Schema } from "effect";

import type { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { ChannelSetIdSchema } from "#publishing/domain/channel-set-id.ts";
import { setKeyOf } from "#publishing/domain/channel-set.ts";
import type { ChannelSet } from "#publishing/domain/channel-set.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";
import type { SignatureId } from "#publishing/domain/signature-id.ts";
import {
  withDefaultSignatures,
  withSignature,
} from "#publishing/domain/signature.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ChannelDefaultsStore } from "./channel-defaults-store.ts";
import { ChannelSetNotFound } from "./channel-set-not-found.ts";
import { ChannelSetStore } from "./channel-set-store.ts";
import { SignatureNotFound } from "./signature-not-found.ts";
import { SignatureStore } from "./signature-store.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";

/** What a request asks of what its workspace saved, by name. */
export interface PresetAsk {
  /**
   * The channel sets it names, each by its id or its name whatever its
   * case, whose channels it goes to as well.
   */
  readonly channelSets: readonly string[];
  /** Whether each channel's default signature goes under its text. */
  readonly defaultSignatures: boolean;
  /** A signature to put under its text, on every channel. */
  readonly signatureId: Option.Option<SignatureId>;
}

/** A request that names nothing saved. */
export const nothingAsked: PresetAsk = {
  channelSets: [],
  defaultSignatures: false,
  signatureId: Option.none(),
};

/** What a new post asks of what its workspace saved. */
export interface PresetRequest extends PresetAsk {
  /** The channels it lists itself. */
  readonly channelIds: readonly ChannelId[];
  readonly content: PostContent;
  /**
   * Whether a channel on which it gives no options takes the channel's
   * default ones: so for a new post, never for a draft that is changed,
   * which keeps what it is given.
   */
  readonly defaultOptions: boolean;
  /** The options it gives itself, which win over any saved ones. */
  readonly options: readonly ChannelOptions[];
}

/**
 * Channels a post could not take, disconnected since: those of a set it
 * named, or of the queue it was added to, which it went to as it named
 * none.
 */
export type DroppedChannels =
  | {
      readonly _tag: "set";
      readonly channelIds: readonly [ChannelId, ...ChannelId[]];
      readonly setId: string;
      readonly setName: string;
    }
  | {
      readonly _tag: "queue";
      readonly channelIds: readonly [ChannelId, ...ChannelId[]];
      readonly queueId: string;
      readonly queueName: string;
    };

/** The post as it is once everything it named is filled in. */
export interface PresetPost {
  readonly channelIds: readonly ChannelId[];
  readonly content: PostContent;
  /** What was left out, set by set, for the caller to say. */
  readonly dropped: readonly DroppedChannels[];
  readonly options: readonly ChannelOptions[];
}

const decodeSetId = Schema.decodeUnknownOption(ChannelSetIdSchema);

// The set a request names: by id, or by name whatever its case.
const named = (kept: readonly ChannelSet[], reference: string) =>
  Option.fromUndefinedOr(
    kept.find(
      (set) =>
        Option.contains(decodeSetId(reference), set.id) ||
        setKeyOf(set.name) === setKeyOf(reference)
    )
  );

// Nothing saved is asked for: the post is as written.
const asks = (request: PresetRequest) =>
  request.channelSets.length > 0 ||
  request.defaultOptions ||
  request.defaultSignatures ||
  Option.isSome(request.signatureId);

/**
 * Filling a post in from what its workspace saved, before it is checked
 * and kept as any other: the channels of the sets it names, with the
 * options each set gives them, the channels' default options, and
 * signatures.
 *
 * A channel a set lists that the workspace no longer has is left out and
 * reported (`dropped`), never silently: the post goes to the others. A
 * channel the post lists itself is left as it is, for the use case that
 * saves the post to refuse. Options are taken in this order: the post's
 * own, a set's, the channel's defaults.
 *
 * Signatures are text of the post once applied: they are counted against
 * each platform's limit when the post is scheduled, as the rest of its
 * text, and never added under a text that ends with them already.
 *
 * It checks no permission of its own beyond channel:read, which telling
 * the workspace's channels takes: the use case that saves the post decides
 * who may make it.
 */
export class PostPresets extends Context.Service<
  PostPresets,
  {
    readonly fill: (
      actor: Actor,
      request: PresetRequest
    ) => Effect.Effect<
      PresetPost,
      ChannelSetNotFound | DatabaseError | MissingPermission | SignatureNotFound
    >;
    /**
     * Which of these are sets of the workspace, by id or by name, for a
     * caller whose list mixes channels and sets (a CSV file's cell).
     */
    readonly setsAmong: (
      actor: Actor,
      references: readonly string[]
    ) => Effect.Effect<readonly string[], DatabaseError>;
  }
>()("peal-server/publishing/application/PostPresets") {
  static readonly layer = Layer.effect(
    PostPresets,
    Effect.gen(function* PostPresetsLive() {
      const sets = yield* ChannelSetStore;
      const defaults = yield* ChannelDefaultsStore;
      const signatures = yield* SignatureStore;
      const channels = yield* WorkspaceChannels;

      const setsNamed = Effect.fn("PostPresets.setsNamed")(function* setsNamed(
        actor: Actor,
        references: readonly string[]
      ) {
        if (references.length === 0) {
          const none: readonly ChannelSet[] = [];

          return none;
        }

        const kept = yield* sets.list(actor.workspaceId);

        return yield* Effect.all(
          references.map((reference) =>
            Option.match(named(kept, reference), {
              onNone: () =>
                Effect.fail(new ChannelSetNotFound({ channelSet: reference })),
              onSome: Effect.succeed,
            })
          )
        );
      });

      const fill = Effect.fn("PostPresets.fill")(function* fill(
        actor: Actor,
        request: PresetRequest
      ) {
        if (!asks(request)) {
          const asWritten: PresetPost = {
            channelIds: request.channelIds,
            content: request.content,
            dropped: [],
            options: request.options,
          };

          return asWritten;
        }

        const chosen = yield* setsNamed(actor, request.channelSets);

        const asked = Arr.dedupe([
          ...request.channelIds,
          ...chosen.flatMap((set) => set.channelIds),
        ]);

        const connected =
          asked.length === 0 ? [] : yield* channels.lookUp(actor, asked);

        const known = new Set<ChannelId>(
          connected.map(({ channelId }) => channelId)
        );

        const own = new Set<ChannelId>(request.channelIds);

        // What the post lists itself stays, connected or not; a set's
        // channels only while the workspace has them.
        const channelIds = asked.filter(
          (channelId) => own.has(channelId) || known.has(channelId)
        );

        const dropped = chosen.flatMap((set): DroppedChannels[] => {
          const gone = set.channelIds.filter(
            (channelId) => !known.has(channelId)
          );

          return Arr.isReadonlyArrayNonEmpty(gone)
            ? [
                {
                  _tag: "set",
                  channelIds: gone,
                  setId: set.id,
                  setName: set.name,
                },
              ]
            : [];
        });

        const kept = request.defaultOptions
          ? yield* defaults.among(actor.workspaceId, channelIds)
          : [];

        // The post's own options, else the first named set's, else the
        // channel's defaults.
        const options = channelIds.flatMap((channelId) =>
          Option.fromUndefinedOr(
            [
              ...request.options,
              ...chosen.flatMap((set) => set.options),
              ...kept,
            ].find((given) => given.channelId === channelId)
          ).pipe(Option.toArray)
        );

        // Options for a channel the post is not for stay, to be refused.
        const stray = request.options.filter(
          ({ channelId }) => !channelIds.includes(channelId)
        );

        const written = yield* signatures.list(actor.workspaceId);

        const explicit = yield* Option.match(request.signatureId, {
          onNone: () => Effect.succeed(request.content),
          onSome: (signatureId) =>
            Option.match(
              Option.fromUndefinedOr(
                written.find(({ id }) => id === signatureId)
              ),
              {
                onNone: () =>
                  Effect.fail(
                    new SignatureNotFound({ signature: signatureId })
                  ),
                onSome: (signature) =>
                  Effect.succeed(withSignature(request.content, signature)),
              }
            ),
        });

        const filled: PresetPost = {
          channelIds,
          content: request.defaultSignatures
            ? withDefaultSignatures(explicit, connected, written)
            : explicit,
          dropped,
          options: [...options, ...stray],
        };

        return filled;
      });

      const setsAmong = Effect.fn("PostPresets.setsAmong")(function* setsAmong(
        actor: Actor,
        references: readonly string[]
      ) {
        if (references.length === 0) {
          return references;
        }

        const kept = yield* sets.list(actor.workspaceId);

        return references.filter((reference) =>
          Option.isSome(named(kept, reference))
        );
      });

      return PostPresets.of({ fill, setsAmong });
    })
  );
}
