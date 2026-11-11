import { Array as Arr, Effect, Option, Schema } from "effect";
import {
  CurrentMember,
  defaultQueuePreview,
  maxChannelSetsPerWorkspace,
  maxQueuesPerWorkspace,
  maxSignaturesPerWorkspace,
} from "peal-contract";

import { notAllowed, refuse } from "#app/mcp/refusals.ts";
import { SavedTools } from "#app/mcp/saved-tools.ts";
import { channelSetView } from "#publishing/api/channel-set-view.ts";
import {
  channelSetDetailsFrom,
  channelSetIdFrom,
} from "#publishing/api/channel-sets.ts";
import { optionsFrom } from "#publishing/api/post-input.ts";
import {
  slotView,
  previewView,
  queueView,
} from "#publishing/api/queue-view.ts";
import { queueDetailsFrom, queueIdFrom } from "#publishing/api/queues.ts";
import { signatureView } from "#publishing/api/signature-view.ts";
import {
  signatureDetailsFrom,
  signatureIdFrom,
} from "#publishing/api/signatures.ts";
import { ChannelDefaults } from "#publishing/application/channel-defaults.ts";
import { ChannelSets } from "#publishing/application/channel-sets.ts";
import { Queues } from "#publishing/application/queues.ts";
import { Signatures } from "#publishing/application/signatures.ts";
import { TargetOptionsSchema } from "#publishing/domain/target-options.ts";
import { actorOf } from "#shared/api/actor.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";

// The domain's options, as plain values the contract describes.
const encodeOptions = Schema.encodeSync(TargetOptionsSchema);

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

// What the use cases' refusals tell the user, through their MCP client.

const noSignature = () =>
  refuse(
    "The workspace has no signature with this id: list_signatures answers its signatures."
  );

const signatureNameTaken = () =>
  refuse(
    "The workspace already has a signature of this name, whatever its case: nothing was changed. list_signatures answers its signatures."
  );

const noSet = () =>
  refuse(
    "The workspace has no channel set with this id: list_channel_sets answers its sets."
  );

const setNameTaken = () =>
  refuse(
    "The workspace already has a channel set of this name, whatever its case: nothing was changed. list_channel_sets answers its sets."
  );

const unknownChannels = ({
  channelIds,
}: {
  readonly channelIds: readonly string[];
}) =>
  refuse(
    channelIds.length === 0
      ? "Name one channel at least, as list_channels answers their ids: nothing was changed."
      : `These channels are not the workspace's, or no longer connected: ${channelIds.join(", ")}. Nothing was changed. list_channels answers its channels.`
  );

const noChannel = () =>
  refuse(
    "The workspace has no channel with this id: list_channels answers its channels."
  );

// The channel a call names, or a refusal: a malformed id names none.
const channelFrom = (raw: string) =>
  Option.match(decodeChannelId(raw), {
    onNone: noChannel,
    onSome: (id) => Effect.succeed(id),
  });

// Every violation, as data a model fixes the options from.
const optionsRejected = ({
  violations,
}: {
  readonly violations: readonly { readonly _tag: string }[];
}) =>
  refuse(
    `The options were refused, and nothing was changed: they must be those of each channel's own platform, for a channel that is named. Fix every violation, then call again: ${JSON.stringify(violations)}`
  );

const noQueue = () =>
  refuse(
    "The workspace has no queue with this id: list_queues answers its queues."
  );

const queueNameTaken = () =>
  refuse(
    "The workspace already has a queue of this name, whatever its case: nothing was changed. list_queues answers its queues."
  );

const badZone = ({ timeZone }: { readonly timeZone: string }) =>
  refuse(
    `${timeZone} is not an IANA time zone, such as Europe/Paris: nothing was changed. Offsets such as +01:00 are refused.`
  );

// What saving a queue is refused with, in words the user acts on.
const queueRefusals = {
  ChannelSetNotFound: noSet,
  DatabaseError: Effect.die,
  MissingPermission: notAllowed("change queues"),
  QueueNameTaken: queueNameTaken,
  UnknownChannels: unknownChannels,
} as const;

/**
 * What the tools of what a workspace saves do, through the publishing
 * context's use cases.
 */
export const SavedToolsLive = SavedTools.toLayer(
  Effect.gen(function* savedTools() {
    const signatures = yield* Signatures;
    const sets = yield* ChannelSets;
    const defaults = yield* ChannelDefaults;
    const queues = yield* Queues;
    const actor = CurrentMember.pipe(Effect.map(actorOf));

    return SavedTools.of({
      clear_channel_defaults: ({ channelId }) =>
        Effect.gen(function* clear() {
          yield* defaults
            .clear(yield* actor, yield* channelFrom(channelId))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("change default options"),
                UnknownChannels: noChannel,
              })
            );

          return { cleared: channelId };
        }),
      create_channel_set: (details) =>
        Effect.gen(function* create() {
          const created = yield* sets
            .create(yield* actor, yield* channelSetDetailsFrom(details))
            .pipe(
              Effect.catchTags({
                ChannelSetNameTaken: setNameTaken,
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("create channel sets"),
                PostContentRejected: optionsRejected,
                TooManyChannelSets: () =>
                  refuse(
                    `The workspace has ${String(maxChannelSetsPerWorkspace)} channel sets, the most it may: nothing was created. The user deletes one first.`
                  ),
              })
            );

          return channelSetView(created);
        }).pipe(Effect.catchTags({ UnknownChannels: unknownChannels })),
      create_queue: (given) =>
        Effect.gen(function* create() {
          const made = yield* queues
            .create(yield* actor, yield* queueDetailsFrom(given))
            .pipe(
              Effect.catchTags({
                ...queueRefusals,
                TooManyQueues: () =>
                  refuse(
                    `The workspace keeps ${String(maxQueuesPerWorkspace)} queues, the most it may: nothing was created. Delete one first, if the user agrees.`
                  ),
              })
            );

          return queueView(made);
        }).pipe(
          Effect.catchTags({
            ChannelSetNotFound: noSet,
            InvalidTimeZone: badZone,
            UnknownChannels: unknownChannels,
          })
        ),
      create_signature: (details) =>
        Effect.gen(function* create() {
          const created = yield* signatures
            .create(yield* actor, yield* signatureDetailsFrom(details))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("create signatures"),
                SignatureNameTaken: signatureNameTaken,
                TooManySignatures: () =>
                  refuse(
                    `The workspace has ${String(maxSignaturesPerWorkspace)} signatures, the most it may: nothing was created. The user deletes one first.`
                  ),
              })
            );

          return signatureView(created);
        }).pipe(Effect.catchTags({ UnknownChannels: unknownChannels })),
      delete_channel_set: ({ channelSetId }) =>
        Effect.gen(function* remove() {
          yield* sets
            .remove(yield* actor, yield* channelSetIdFrom(channelSetId))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("delete channel sets"),
              })
            );

          return { deleted: channelSetId };
        }).pipe(Effect.catchTags({ ChannelSetNotFound: noSet })),
      delete_queue: ({ queueId }) =>
        Effect.gen(function* remove() {
          yield* queues.remove(yield* actor, yield* queueIdFrom(queueId)).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("delete queues"),
            })
          );

          return { deleted: queueId };
        }).pipe(Effect.catchTags({ QueueNotFound: noQueue })),
      delete_signature: ({ signatureId }) =>
        Effect.gen(function* remove() {
          yield* signatures
            .remove(yield* actor, yield* signatureIdFrom(signatureId))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("delete signatures"),
              })
            );

          return { deleted: signatureId };
        }).pipe(Effect.catchTags({ SignatureNotFound: noSignature })),
      get_channel_defaults: ({ channelId }) =>
        Effect.gen(function* get() {
          const kept = yield* defaults
            .get(yield* actor, yield* channelFrom(channelId))
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("read default options"),
                UnknownChannels: noChannel,
              })
            );

          return {
            options: kept.pipe(Option.map(encodeOptions), Option.getOrNull),
          };
        }),
      list_channel_sets: () =>
        Effect.gen(function* list() {
          const found = yield* sets.list(yield* actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read channel sets"),
            })
          );

          return { channelSets: found.map(channelSetView) };
        }),
      list_queues: () =>
        Effect.gen(function* list() {
          const found = yield* queues.list(yield* actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read queues"),
            })
          );

          return { queues: found.map(queueView) };
        }),
      list_signatures: () =>
        Effect.gen(function* list() {
          const found = yield* signatures.list(yield* actor).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("read signatures"),
            })
          );

          return { signatures: found.map(signatureView) };
        }),
      preview_queue: ({ count = defaultQueuePreview, queueId }) =>
        Effect.gen(function* preview() {
          const coming = yield* queues
            .preview(yield* actor, yield* queueIdFrom(queueId), count)
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("read queues"),
              })
            );

          return previewView(coming);
        }).pipe(Effect.catchTags({ QueueNotFound: noQueue })),
      set_channel_defaults: ({ channelId, options }) =>
        Effect.gen(function* set() {
          const id = yield* channelFrom(channelId);

          const [given] = yield* optionsFrom([{ channelId, options }]).pipe(
            Effect.catchTag("UnknownChannels", noChannel)
          );

          if (given === undefined) {
            return yield* noChannel();
          }

          const kept = yield* defaults
            .set(yield* actor, id, given.options)
            .pipe(
              Effect.catchTags({
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("change default options"),
                PostContentRejected: optionsRejected,
                UnknownChannels: noChannel,
              })
            );

          return { options: encodeOptions(kept) };
        }),
      update_channel_set: ({ channelIds, channelSetId, name, options }) =>
        Effect.gen(function* update() {
          if (
            channelIds === undefined &&
            name === undefined &&
            options === undefined
          ) {
            return yield* refuse(
              "Give a name, channels, options or several: nothing else of a channel set changes."
            );
          }

          const member = yield* actor;
          const id = yield* channelSetIdFrom(channelSetId);

          // What the call leaves out stays as the set has it.
          const current = yield* sets.list(member).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("change channel sets"),
            }),
            Effect.map((kept) => kept.find(({ set }) => set.id === id))
          );

          if (current === undefined) {
            return yield* noSet();
          }

          // But the channels disconnected since, which a set cannot keep.
          const channels =
            channelIds ??
            current.set.channelIds.filter(
              (channelId) => !current.unavailable.includes(channelId)
            );

          if (!Arr.isReadonlyArrayNonEmpty(channels)) {
            return yield* refuse(
              "None of this set's channels is connected any more: give its channels (list_channels answers them), or delete the set. Nothing was changed."
            );
          }

          const details = yield* channelSetDetailsFrom({
            channelIds: channels,
            name: name ?? current.set.name,
            options: options ?? [],
          });

          const updated = yield* sets
            .update(member, id, {
              ...details,
              options:
                options === undefined
                  ? current.set.options.filter(({ channelId }) =>
                      details.channelIds.includes(channelId)
                    )
                  : details.options,
            })
            .pipe(
              Effect.catchTags({
                ChannelSetNameTaken: setNameTaken,
                DatabaseError: Effect.die,
                MissingPermission: notAllowed("change channel sets"),
                PostContentRejected: optionsRejected,
              })
            );

          return channelSetView(updated);
        }).pipe(
          Effect.catchTags({
            ChannelSetNotFound: noSet,
            UnknownChannels: unknownChannels,
          })
        ),
      update_queue: ({ queueId, ...given }) =>
        Effect.gen(function* update() {
          const member = yield* actor;
          const id = yield* queueIdFrom(queueId);

          // What the call leaves out stays as the queue has it.
          const { queue, unavailable } = yield* queues.get(member, id).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("change queues"),
            })
          );

          // But the channels disconnected since, which a queue cannot keep.
          const channelIds =
            given.channelIds ??
            queue.channelIds.filter(
              (channelId) => !unavailable.includes(channelId)
            );

          const setId =
            given.channelSetId === undefined
              ? Option.getOrNull(queue.channelSetId)
              : given.channelSetId;

          const details = yield* queueDetailsFrom(
            setId === null
              ? {
                  channelIds,
                  isDefault: given.isDefault ?? queue.isDefault,
                  name: given.name ?? queue.name,
                  slots: given.slots ?? queue.slots.map(slotView),
                  timeZone: given.timeZone ?? queue.timeZone,
                }
              : {
                  channelIds,
                  channelSetId: setId,
                  isDefault: given.isDefault ?? queue.isDefault,
                  name: given.name ?? queue.name,
                  slots: given.slots ?? queue.slots.map(slotView),
                  timeZone: given.timeZone ?? queue.timeZone,
                }
          );

          const updated = yield* queues
            .update(member, id, details)
            .pipe(Effect.catchTags(queueRefusals));

          return queueView(updated);
        }).pipe(
          Effect.catchTags({
            ChannelSetNotFound: noSet,
            InvalidTimeZone: badZone,
            QueueNotFound: noQueue,
            UnknownChannels: unknownChannels,
          })
        ),
      update_signature: ({ isDefault, name, scope, signatureId, text }) =>
        Effect.gen(function* update() {
          if (
            isDefault === undefined &&
            name === undefined &&
            scope === undefined &&
            text === undefined
          ) {
            return yield* refuse(
              "Give a name, a text, a scope, isDefault or several: nothing else of a signature changes."
            );
          }

          const member = yield* actor;
          const id = yield* signatureIdFrom(signatureId);

          // What the call leaves out stays as the signature has it.
          const current = yield* signatures.list(member).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("change signatures"),
            }),
            Effect.map((kept) => kept.find((signature) => signature.id === id))
          );

          if (current === undefined) {
            return yield* noSignature();
          }

          const details = yield* signatureDetailsFrom({
            isDefault: isDefault ?? current.isDefault,
            name: name ?? current.name,
            scope: scope ?? current.scope,
            text: text ?? current.text,
          });

          const updated = yield* signatures.update(member, id, details).pipe(
            Effect.catchTags({
              DatabaseError: Effect.die,
              MissingPermission: notAllowed("change signatures"),
              SignatureNameTaken: signatureNameTaken,
            })
          );

          return signatureView(updated);
        }).pipe(
          Effect.catchTags({
            SignatureNotFound: noSignature,
            UnknownChannels: unknownChannels,
          })
        ),
    });
  })
);
