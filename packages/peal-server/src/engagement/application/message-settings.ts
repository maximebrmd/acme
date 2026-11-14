import { Context, DateTime, Effect, Layer, Option } from "effect";

import { readsMessagesOn } from "#engagement/domain/message-abilities.ts";
import { followBox } from "#engagement/domain/message-box.ts";
import { CurrentInboxMessages } from "#shared/application/current-inbox-messages.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { MeteredUsage } from "#shared/application/metered-usage.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { forgetChannelMessages } from "./forget-channel-messages.ts";
import { MessageAbilityUnavailable } from "./message-ability-unavailable.ts";
import { MessagesNeedPerson } from "./messages-need-person.ts";
import { EngagementChannels } from "./ports/engagement-channels.ts";
import { MessageStore } from "./ports/message-store.ts";
import type {
  MessagesApplication,
  MessagesSwitchedOn,
} from "./ports/message-store.ts";

type Refused = DatabaseError | MessagesNeedPerson | MissingPermission;

/** What a workspace decided about its direct messages. */
export interface MessageSettingsView {
  readonly applications: readonly MessagesApplication[];
  readonly channels: readonly MessagesSwitchedOn[];
}

// A member in their own session: not an API key, an application acting
// for them, or staff acting as them (whom the permissions already refuse).
const inPerson = (actor: Actor) =>
  actor.subject._tag === "user" &&
  actor.subject.clientId === undefined &&
  Option.isNone(actor.subject.impersonatedBy)
    ? Effect.void
    : Effect.fail(new MessagesNeedPerson());

/**
 * What a workspace decides about its direct messages, each by a member in
 * person. Nothing of a channel's conversations is read until a member who
 * connects channels (`channel:connect`) turns its messages on; turning
 * them off deletes what Peal kept of them at once. Only an owner
 * (`organization:secure`) lets an application (an OAuth client) read and
 * answer them; without that, an application lists conversations only.
 */
export class MessageSettings extends Context.Service<
  MessageSettings,
  {
    readonly settings: (
      actor: Actor
    ) => Effect.Effect<MessageSettingsView, Refused>;
    readonly switchChannel: (
      actor: Actor,
      channelId: ChannelId,
      on: boolean
    ) => Effect.Effect<
      MessageSettingsView,
      MessageAbilityUnavailable | Refused
    >;
    readonly allowApplication: (
      actor: Actor,
      clientId: string,
      allowed: boolean
    ) => Effect.Effect<MessageSettingsView, Refused>;
  }
>()("peal-server/engagement/application/MessageSettings") {
  static readonly layer = Layer.effect(
    MessageSettings,
    Effect.gen(function* MessageSettingsLive() {
      const store = yield* MessageStore;
      const channels = yield* EngagementChannels;
      const messages = yield* CurrentInboxMessages;
      const { transaction } = yield* TransactionRunner;
      const meters = yield* MeteredUsage;

      const viewOf = (actor: Actor) =>
        Effect.all({
          applications: store.applications(actor.workspaceId),
          channels: store.switchedOn(actor.workspaceId),
        });

      const settings = Effect.fn("MessageSettings.settings")(function* settings(
        actor: Actor
      ) {
        yield* Effect.fromResult(authorize(actor, "channel:connect"));

        return yield* viewOf(actor);
      });

      const switchChannel = Effect.fn("MessageSettings.switchChannel")(
        function* switchChannel(
          actor: Actor,
          channelId: ChannelId,
          on: boolean
        ) {
          yield* Effect.fromResult(authorize(actor, "channel:connect"));
          yield* inPerson(actor);

          if (!(yield* channels.belongs(channelId, actor.workspaceId))) {
            return yield* new MessageAbilityUnavailable({
              ability: "read",
              standing: "unsupported",
            });
          }

          if (!on) {
            // What was on its way and never set out is not sent: its
            // outbound message is given back as its row goes.
            yield* transaction(forgetChannelMessages(store, meters, channelId));

            return yield* viewOf(actor);
          }

          const channel = yield* channels.describe(channelId).pipe(
            Effect.map(Option.some),
            Effect.catchTag("ChannelUnreadable", () =>
              Effect.succeed(Option.none())
            )
          );

          if (
            Option.isNone(channel) ||
            !readsMessagesOn(channel.value.platform, messages)
          ) {
            return yield* new MessageAbilityUnavailable({
              ability: "read",
              standing: "unsupported",
            });
          }

          const now = yield* DateTime.now;
          const box = { channelId, workspaceId: actor.workspaceId };

          yield* transaction(
            store.switchOn(
              {
                ...box,
                enabledAt: now,
                enabledBy:
                  actor.subject._tag === "user"
                    ? Option.some(actor.subject.userId)
                    : Option.none(),
              },
              followBox(box, now)
            )
          );

          return yield* viewOf(actor);
        }
      );

      const allowApplication = Effect.fn("MessageSettings.allowApplication")(
        function* allowApplication(
          actor: Actor,
          clientId: string,
          allowed: boolean
        ) {
          yield* Effect.fromResult(authorize(actor, "organization:secure"));
          yield* inPerson(actor);

          yield* allowed
            ? store.allowApplication({
                clientId,
                grantedAt: yield* DateTime.now,
                grantedBy:
                  actor.subject._tag === "user"
                    ? Option.some(actor.subject.userId)
                    : Option.none(),
                workspaceId: actor.workspaceId,
              })
            : store.revokeApplication(actor.workspaceId, clientId);

          return yield* viewOf(actor);
        }
      );

      return MessageSettings.of({ allowApplication, settings, switchChannel });
    })
  );
}
