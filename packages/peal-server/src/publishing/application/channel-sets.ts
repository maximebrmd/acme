import { Context, DateTime, Effect, Layer, Option } from "effect";

import { ChannelSetIdSchema } from "#publishing/domain/channel-set-id.ts";
import type { ChannelSetId } from "#publishing/domain/channel-set-id.ts";
import {
  createChannelSet,
  editChannelSet,
  maxChannelSetsPerWorkspace,
  setKeyOf,
} from "#publishing/domain/channel-set.ts";
import type {
  ChannelSet,
  ChannelSetDetails,
} from "#publishing/domain/channel-set.ts";
import { checkDraft } from "#publishing/domain/content-rules.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import { emptyContent } from "#publishing/domain/post-content.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ChannelSetNameTaken } from "./channel-set-name-taken.ts";
import { ChannelSetNotFound } from "./channel-set-not-found.ts";
import { ChannelSetStore } from "./channel-set-store.ts";
import { channelsFor } from "./post-references.ts";
import { TooManyChannelSets } from "./too-many-channel-sets.ts";
import type { UnknownChannels } from "./unknown-channels.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";

/** A set, and which of its channels the workspace no longer has. */
export interface ListedChannelSet {
  readonly set: ChannelSet;
  /** Its channels disconnected since, which a post made with it skips. */
  readonly unavailable: readonly ChannelId[];
}

type WriteFailure =
  | ChannelSetNameTaken
  | DatabaseError
  | MissingPermission
  | PostContentRejected
  | UnknownChannels;

// Fails when another set of the workspace has the name.
const nameFree = (
  kept: readonly ChannelSet[],
  name: string,
  except: Option.Option<ChannelSetId>
) =>
  kept.some(
    (set) =>
      setKeyOf(set.name) === setKeyOf(name) && !Option.contains(except, set.id)
  )
    ? Effect.fail(new ChannelSetNameTaken({ name }))
    : Effect.void;

/**
 * A workspace's channel sets: selections of its channels kept under a
 * name, with the options posts take on some of them.
 *
 * Reading them needs post:read and channel:read; writing one post:update,
 * as editing a post does. A set is saved with channels of the workspace
 * only, and options of their own platforms, unfinished as a draft's may
 * be: they are checked when a post that takes them is scheduled. A
 * workspace has one set per name, whatever its case.
 */
export class ChannelSets extends Context.Service<
  ChannelSets,
  {
    /** The workspace's sets, oldest first. */
    readonly list: (
      actor: Actor
    ) => Effect.Effect<
      readonly ListedChannelSet[],
      DatabaseError | MissingPermission
    >;
    readonly create: (
      actor: Actor,
      details: ChannelSetDetails
    ) => Effect.Effect<ListedChannelSet, TooManyChannelSets | WriteFailure>;
    readonly update: (
      actor: Actor,
      setId: ChannelSetId,
      details: ChannelSetDetails
    ) => Effect.Effect<ListedChannelSet, ChannelSetNotFound | WriteFailure>;
    readonly remove: (
      actor: Actor,
      setId: ChannelSetId
    ) => Effect.Effect<
      void,
      ChannelSetNotFound | DatabaseError | MissingPermission
    >;
  }
>()("peal-server/publishing/application/ChannelSets") {
  static readonly layer = Layer.effect(
    ChannelSets,
    Effect.gen(function* ChannelSetsLive() {
      const store = yield* ChannelSetStore;
      const channels = yield* WorkspaceChannels;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<Ids | WorkspaceChannels>();

      const withPorts = Effect.provideContext(ports);

      // Whoever may write sets, channels that are the workspace's, and
      // options that are theirs.
      const checked = Effect.fn("ChannelSets.checked")(function* checked(
        actor: Actor,
        { channelIds, options }: ChannelSetDetails
      ) {
        yield* Effect.fromResult(authorize(actor, "post:update"));

        const found = yield* channelsFor(actor, channelIds).pipe(withPorts);

        yield* Effect.fromResult(checkDraft(emptyContent, found, options));
      });

      const list = Effect.fn("ChannelSets.list")(function* list(actor: Actor) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        const kept = yield* store.list(actor.workspaceId);
        const named = [...new Set(kept.flatMap((set) => set.channelIds))];

        const connected = new Set<ChannelId>(
          named.length === 0
            ? []
            : (yield* channels.lookUp(actor, named)).map(
                ({ channelId }) => channelId
              )
        );

        return kept.map((set): ListedChannelSet => ({
          set,
          unavailable: set.channelIds.filter(
            (channelId) => !connected.has(channelId)
          ),
        }));
      });

      const create = Effect.fn("ChannelSets.create")(function* create(
        actor: Actor,
        details: ChannelSetDetails
      ) {
        yield* checked(actor, details);

        const setId = yield* newId(ChannelSetIdSchema).pipe(withPorts);
        const now = yield* DateTime.now;

        return yield* transaction(
          Effect.gen(function* add() {
            yield* store.claim(actor.workspaceId);

            const kept = yield* store.list(actor.workspaceId);

            if (kept.length >= maxChannelSetsPerWorkspace) {
              return yield* new TooManyChannelSets({
                allowed: maxChannelSetsPerWorkspace,
              });
            }

            yield* nameFree(kept, details.name, Option.none());

            const set = createChannelSet(
              setId,
              actor.workspaceId,
              details,
              now
            );

            yield* store.insert(set);

            const made: ListedChannelSet = { set, unavailable: [] };

            return made;
          })
        );
      });

      const update = Effect.fn("ChannelSets.update")(function* update(
        actor: Actor,
        setId: ChannelSetId,
        details: ChannelSetDetails
      ) {
        yield* checked(actor, details);

        return yield* transaction(
          Effect.gen(function* edit() {
            yield* store.claim(actor.workspaceId);

            const kept = yield* store.list(actor.workspaceId);
            const current = kept.find(({ id }) => id === setId);

            if (current === undefined) {
              return yield* new ChannelSetNotFound({ channelSet: setId });
            }

            yield* nameFree(kept, details.name, Option.some(setId));

            const set = editChannelSet(current, details);

            yield* store.update(set);

            const saved: ListedChannelSet = { set, unavailable: [] };

            return saved;
          })
        );
      });

      const remove = Effect.fn("ChannelSets.remove")(function* remove(
        actor: Actor,
        setId: ChannelSetId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:update"));

        return yield* transaction(
          Effect.gen(function* drop() {
            yield* store.claim(actor.workspaceId);

            const kept = yield* store.list(actor.workspaceId);

            if (!kept.some(({ id }) => id === setId)) {
              return yield* new ChannelSetNotFound({ channelSet: setId });
            }

            return yield* store.remove(actor.workspaceId, setId);
          })
        );
      });

      return ChannelSets.of({ create, list, remove, update });
    })
  );
}
