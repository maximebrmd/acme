import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  idempotencyKeyLifetimeHours,
  InboxConversationDetailSchema,
  InboxConversationPageSchema,
  InboxConversationSchema,
  inboxMessageRetentionDays,
  InboxOutgoingMessageSchema,
  maxIdempotencyKeyLength,
  maxInboxPageSize,
} from "peal-contract";
import type {
  InboxConversation,
  InboxOutgoingMessage,
  InboxOutgoingMessageReason,
} from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const reasons: Readonly<Record<InboxOutgoingMessageReason, string>> = {
  adapterFailure:
    "a fault in Peal after the request may have left: check the platform, then run peal inbox messages confirm",
  channelUnavailable: "the channel was disconnected or turned off",
  conversationGone: "the conversation is no longer on the platform",
  interrupted:
    "the server stopped during the call: check the platform, then run peal inbox messages confirm",
  noResponse:
    "the request left and no answer came back: check the platform, then run peal inbox messages confirm",
  notSent: "it never went out",
  platformUnavailable: "the platform did not answer",
  rateLimited: "the platform asked to slow down",
  reconnectNeeded: "the platform refuses the channel's token: reconnect it",
  refused:
    "the platform refused it: the person may take no messages from the account",
};

const sentLine = (message: InboxOutgoingMessage): string =>
  `${message.status}${message.reason === null ? "" : `: ${reasons[message.reason]}`}`;

// A name on the row it is printed in: whoever chose it may have put a
// line break in it, which would start a row of its own.
const onOneLine = (text: string): string =>
  text.replaceAll(/[\n\v\f\r\u0085\u2028\u2029]+/gu, " ");

const whoOf = (conversation: InboxConversation): string =>
  conversation.participants.map(({ handle }) => onOneLine(handle)).join(", ");

const conversationArgument = Argument.String("conversation-id").pipe(
  Argument.withDescription(
    "The conversation, as peal inbox messages list shows its id."
  )
);

const list = Command.make(
  "list",
  {
    channel: Flag.String("channel").pipe(
      Flag.withMetavar("<channel-id>"),
      Flag.withDescription("Only this channel's conversations."),
      Flag.optional
    ),
    cursor: Flag.String("cursor").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription("The next page, as the page before named it."),
      Flag.optional
    ),
    json: jsonFlag,
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many conversations to list, ${String(maxInboxPageSize)} at most.`
      ),
      Flag.optional
    ),
    unread: Flag.Boolean("unread").pipe(
      Flag.withDescription(
        "Only conversations someone wrote to since a member read them."
      ),
      Flag.withDefault(false)
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("inbox.messages.list")(function* listing(flags) {
    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const page = yield* client.inboxMessages
      .listConversations({
        params: { workspaceId: workspace.id },
        query: {
          ...Option.match(flags.channel, {
            onNone: () => ({}),
            onSome: (channelId) => ({ channelId }),
          }),
          ...Option.match(flags.cursor, {
            onNone: () => ({}),
            onSome: (cursor) => ({ cursor }),
          }),
          ...Option.match(flags.limit, {
            onNone: () => ({}),
            onSome: (limit) => ({ limit }),
          }),
          unread: flags.unread ? "true" : "false",
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (flags.json) {
      yield* printJson(InboxConversationPageSchema, page);

      return;
    }

    if (page.items.length === 0) {
      yield* Console.log(
        `No conversations in ${workspace.name}'s inbox. Peal reads the direct messages of Mastodon and Bluesky channels where whoever runs the server turned them on, and keeps a conversation ${String(inboxMessageRetentionDays)} days after its last message.`
      );

      return;
    }

    yield* Console.log(`Conversations of ${workspace.name}:`);

    for (const line of columns(
      page.items.map((conversation) => [
        `  ${conversation.id}`,
        conversation.unread ? "unread" : "read",
        instant(conversation.lastMessageAt),
        whoOf(conversation),
        `channel ${conversation.channelId}`,
      ])
    )) {
      yield* Console.log(line);
    }

    if (page.nextCursor !== null) {
      yield* Console.log(`More: --cursor ${page.nextCursor}`);
    }
  })
).pipe(
  Command.withDescription(
    "List the conversations of the workspace's channels, the latest message first. What the messages say is in peal inbox messages show."
  )
);

const show = Command.make(
  "show",
  {
    conversationId: conversationArgument,
    cursor: Flag.String("cursor").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription("Older messages, as the page before named them."),
      Flag.optional
    ),
    json: jsonFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("inbox.messages.show")(function* showing(flags) {
    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const detail = yield* client.inboxMessages
      .getConversation({
        params: {
          conversationId: flags.conversationId,
          workspaceId: workspace.id,
        },
        query: Option.match(flags.cursor, {
          onNone: () => ({}),
          onSome: (cursor) => ({ cursor }),
        }),
      })
      .pipe(Effect.mapError(explain(url)));

    if (flags.json) {
      yield* printJson(InboxConversationDetailSchema, detail);

      return;
    }

    yield* Console.log(
      `Conversation with ${whoOf(detail.conversation)} on channel ${detail.conversation.channelId}:`
    );

    for (const message of detail.messages) {
      const files =
        message.attachments === 0
          ? ""
          : `  ${String(message.attachments)} file${message.attachments === 1 ? "" : "s"}`;

      yield* Console.log(
        `  ${instant(message.sentAt)}  ${message.fromAccount ? "the account" : "them"}${files}`
      );

      for (const line of message.text.split("\n")) {
        yield* Console.log(`      ${line}`);
      }
    }

    for (const sent of detail.sent) {
      yield* Console.log(`  sent from Peal ${sent.id}  ${sentLine(sent)}`);
    }

    if (detail.nextCursor !== null) {
      yield* Console.log(`Older: --cursor ${detail.nextCursor}`);
    }

    yield* Console.log(
      `Sending: ${detail.abilities.send === "reconnect" ? "reconnect the channel to allow it" : detail.abilities.send}.`
    );
  })
).pipe(
  Command.withDescription(
    "Show a conversation: its messages, those sent from Peal and how each ended. Messages are private, written by people outside the workspace."
  )
);

const keyChecked = (key: Option.Option<string>) =>
  Option.exists(
    key,
    (given) => given === "" || given.length > maxIdempotencyKeyLength
  )
    ? Effect.fail(
        new Refused({
          reason: `--idempotency-key takes 1 to ${String(maxIdempotencyKeyLength)} characters.`,
        })
      )
    : Effect.void;

const send = Command.make(
  "send",
  {
    conversationId: conversationArgument,
    idempotencyKey: Flag.String("idempotency-key").pipe(
      Flag.withMetavar("<key>"),
      Flag.withDescription(
        `Any text of your choosing, ${String(maxIdempotencyKeyLength)} characters at most, such as a UUID, that makes the command safe to run again: within ${String(idempotencyKeyLifetimeHours)} hours, the same key with the same text to the same conversation answers the message the first run made, and sends no other. Without it, a second run is refused only while the first message is on its way or unconfirmed.`
      ),
      Flag.optional
    ),
    json: jsonFlag,
    text: Flag.String("text").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription("What the message says.")
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("inbox.messages.send")(function* sending(flags) {
    yield* keyChecked(flags.idempotencyKey);

    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const sent = yield* client.inboxMessages
      .sendMessage({
        headers: Option.match(flags.idempotencyKey, {
          onNone: () => ({}),
          onSome: (key) => ({ "idempotency-key": key }),
        }),
        params: {
          conversationId: flags.conversationId,
          workspaceId: workspace.id,
        },
        payload: { text: flags.text },
      })
      .pipe(Effect.mapError(explain(url)));

    if (flags.json) {
      yield* printJson(InboxOutgoingMessageSchema, sent);

      return;
    }

    yield* Console.log(
      `Message ${sent.id} is on its way, privately, as the channel's account: peal inbox messages show ${sent.conversationId} shows how it ended.`
    );
    yield* Console.log(`  ${sent.text}`);
  })
).pipe(
  Command.withDescription(
    "Answer a conversation with a private message, as the channel's account: it goes to a real person, and cannot be taken back. Needs a sign-in that may publish."
  )
);

const read = Command.make(
  "read",
  {
    conversationId: conversationArgument,
    json: jsonFlag,
    undo: Flag.Boolean("undo").pipe(
      Flag.withDescription("The conversation is unread again."),
      Flag.withDefault(false)
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("inbox.messages.read")(function* marking(flags) {
    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const marked = yield* client.inboxMessages
      .setConversationRead({
        params: {
          conversationId: flags.conversationId,
          workspaceId: workspace.id,
        },
        payload: { read: !flags.undo },
      })
      .pipe(Effect.mapError(explain(url)));

    if (flags.json) {
      yield* printJson(InboxConversationSchema, marked);

      return;
    }

    yield* Console.log(
      `Conversation ${marked.id} is ${marked.unread ? "unread" : "read"}.`
    );
  })
).pipe(
  Command.withDescription(
    "Say a conversation was read, or, with --undo, is unread again. Nothing is sent to the platform."
  )
);

const confirm = Command.make(
  "confirm",
  {
    json: jsonFlag,
    messageId: Argument.String("message-id").pipe(
      Argument.withDescription(
        "The message sent from Peal, as peal inbox messages show shows its id."
      )
    ),
    notSent: Flag.Boolean("not-sent").pipe(
      Flag.withDescription("It never went out."),
      Flag.withDefault(false)
    ),
    sent: Flag.Boolean("sent").pipe(
      Flag.withDescription("It is on the platform."),
      Flag.withDefault(false)
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("inbox.messages.confirm")(function* confirming(flags) {
    yield* flags.sent === flags.notSent
      ? Effect.fail(
          new Refused({
            reason:
              "Say what you found on the platform: --sent, or --not-sent.",
          })
        )
      : Effect.void;

    const { client, url, workspace } = yield* inWorkspace(flags.workspace);

    const settled = yield* client.inboxMessages
      .confirmMessage({
        params: { messageId: flags.messageId, workspaceId: workspace.id },
        payload: { sent: flags.sent },
      })
      .pipe(Effect.mapError(explain(url)));

    if (flags.json) {
      yield* printJson(InboxOutgoingMessageSchema, settled);

      return;
    }

    yield* Console.log(`Message ${settled.id}: ${sentLine(settled)}.`);
  })
).pipe(
  Command.withDescription(
    "Record what you found on the platform for a message Peal could not confirm: --sent, or --not-sent."
  )
);

export const messages = Command.make("messages").pipe(
  Command.withDescription(
    "The direct messages people send to a workspace's Mastodon and Bluesky accounts: read the conversations, and answer one privately as the channel's account. Peal never starts a conversation."
  ),
  Command.withSubcommands([list, show, send, read, confirm])
);
