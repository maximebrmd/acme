import { Config, Effect, Layer, Option, Schema } from "effect";

import { CurrentInboxMessages } from "#shared/application/current-inbox-messages.ts";
import { InboxMessagePlatformSchema } from "#shared/domain/inbox-message-platform.ts";
import type {
  InboxMessagePlatform,
  InboxMessagePlatforms,
} from "#shared/domain/inbox-message-platform.ts";

import { InvalidInboxSettings } from "./invalid-inbox-settings.ts";

const decodePlatform = Schema.decodeUnknownOption(InboxMessagePlatformSchema);

// The names the setting takes, as a sentence: "a and b".
const takenNames = (() => {
  const names = [...InboxMessagePlatformSchema.literals];
  const last = names.pop();

  return names.length === 0
    ? String(last)
    : `${names.join(", ")} and ${String(last)}`;
})();

/**
 * `PEAL_INBOX_MESSAGES`: the platforms whose direct messages the inbox
 * reads and answers, comma-separated among `mastodon` and `bluesky`; none
 * when unset or blank. Any other name stops the server. Off, no
 * conversation is read, Bluesky's sign-in asks what it asked before, and
 * a channel can do nothing with messages.
 */
export const inboxMessagesConfig = Effect.gen(function* inboxMessages() {
  const written = yield* Config.option(Config.String("PEAL_INBOX_MESSAGES"));

  const names = Option.getOrElse(written, () => "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");

  const platforms = new Set<InboxMessagePlatform>();

  for (const name of names) {
    const platform = decodePlatform(name);

    if (Option.isNone(platform)) {
      return yield* new InvalidInboxSettings({
        reason: `PEAL_INBOX_MESSAGES takes ${takenNames} only`,
      });
    }

    platforms.add(platform.value);
  }

  const read: InboxMessagePlatforms = platforms;

  return read;
});

/** The platforms the inbox reads direct messages on, as the operator set them. */
export const InboxMessagesLive = Layer.effect(
  CurrentInboxMessages,
  inboxMessagesConfig
);
