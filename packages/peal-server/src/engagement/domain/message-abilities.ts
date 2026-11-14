import { Schema } from "effect";

import {
  allowsRpc,
  blueskyChatService,
} from "#shared/domain/bluesky-scopes.ts";
import type { BlueskyChatMethod } from "#shared/domain/bluesky-scopes.ts";
import { InboxMessagePlatformSchema } from "#shared/domain/inbox-message-platform.ts";
import type {
  InboxMessagePlatform,
  InboxMessagePlatforms,
} from "#shared/domain/inbox-message-platform.ts";
import type { Platform } from "#shared/domain/platform.ts";

import type { AbilityStanding } from "./engagement-abilities.ts";

/**
 * What a channel's account can do with its direct messages:
 *
 * - `read`: Peal collects its conversations.
 * - `send`: answer a conversation, privately, as the account.
 */
export const MessageAbilitySchema = Schema.Literals(["read", "send"]);

export type MessageAbility = typeof MessageAbilitySchema.Type;

export type MessageAbilities = Readonly<
  Record<MessageAbility, AbilityStanding>
>;

const none: MessageAbilities = { read: "unsupported", send: "unsupported" };

const isMessagePlatform = (
  platform: Platform
): platform is InboxMessagePlatform =>
  InboxMessagePlatformSchema.literals.some((named) => named === platform);

/**
 * Whether this server reads direct messages on `platform`: only where the
 * operator named it (`PEAL_INBOX_MESSAGES`).
 */
export const readsMessagesOn = (
  platform: Platform,
  messages: InboxMessagePlatforms
): platform is InboxMessagePlatform =>
  isMessagePlatform(platform) && messages.has(platform);

const standing = (granted: boolean): AbilityStanding =>
  granted ? "available" : "reconnect";

const chat =
  (...methods: readonly BlueskyChatMethod[]) =>
  (scopes: readonly string[]) =>
    methods.every((method) => allowsRpc(scopes, method, blueskyChatService));

/**
 * What a channel can do with its messages, from its platform, the scopes
 * its account granted and the platforms the server reads messages on:
 *
 * - Mastodon (docs.joinmastodon.org/methods/conversations and
 *   /methods/statuses, read 2026-11-14): `GET /api/v1/conversations` and a
 *   status's context take `read:statuses`; a message is a status of
 *   `direct` visibility, `write:statuses`. Both are what Peal's sign-in
 *   has asked for since its first release, so a channel without them is
 *   one whose server granted less, and reconnecting asks them again.
 * - Bluesky: the chat methods each take their `rpc` scope at the chat
 *   service (`blueskyChatScopes`), which a sign-in asks for only when a
 *   member turns the channel's messages on (a reconnect with
 *   `messages`): until then a channel has none of them, and is
 *   `reconnect`. Reading takes
 *   `listConvos` and `getMessages`; answering also `sendMessage`, and
 *   `acceptConvo` for a conversation someone else began.
 *
 * Off, or on any other platform, nothing is possible.
 */
export const messageAbilitiesOf = (
  platform: Platform,
  scopes: readonly string[],
  messages: InboxMessagePlatforms
): MessageAbilities => {
  if (!readsMessagesOn(platform, messages)) {
    return none;
  }

  if (platform === "mastodon") {
    return {
      read: standing(
        scopes.some((scope) => scope === "read" || scope === "read:statuses")
      ),
      send: standing(
        scopes.some((scope) => scope === "write" || scope === "write:statuses")
      ),
    };
  }

  const reading = chat(
    "chat.bsky.convo.listConvos",
    "chat.bsky.convo.getMessages"
  );

  return {
    read: standing(reading(scopes)),
    send: standing(
      reading(scopes) &&
        chat(
          "chat.bsky.convo.sendMessage",
          "chat.bsky.convo.acceptConvo"
        )(scopes)
    ),
  };
};
