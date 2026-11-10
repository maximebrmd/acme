import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  maxWebhookDeliveryPageSize,
  maxWebhookEndpoints,
  SubscribableWebhookEventTypeSchema,
  webhookFailingDays,
  webhookSecretOverlapHours,
} from "peal-contract";
import type {
  SubscribableWebhookEventType,
  WebhookAttemptError,
  WebhookDelivery,
  WebhookDeliveryFailure,
  WebhookDisabledReason,
  WebhookEndpoint,
  WebhookEndpointChange,
} from "peal-contract";

import { explain } from "#explain.ts";
import { columns, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const everyEvent = SubscribableWebhookEventTypeSchema.literals;

type Events = readonly [
  SubscribableWebhookEventType,
  ...SubscribableWebhookEventType[],
];

const decodeEvents = Schema.decodeUnknownEffect(
  Schema.NonEmptyArray(SubscribableWebhookEventTypeSchema)
);

// `--events`: the types an endpoint subscribes to, separated by commas, or
// `all`. One the contract does not list is refused before anything is
// asked of the server.
const eventsOf = (given: string): Effect.Effect<Events, Refused> =>
  given.trim() === "all"
    ? Effect.succeed(everyEvent)
    : decodeEvents(given.split(",").map((type) => type.trim())).pipe(
        Effect.mapError(
          () =>
            new Refused({
              reason: `--events takes all, or some of these, separated by commas: ${everyEvent.join(", ")}.`,
            })
        )
      );

const eventsFlag = Flag.String("events").pipe(
  Flag.withMetavar("<type,...|all>"),
  Flag.withDescription(
    `The events Peal sends the endpoint, separated by commas, or all: ${everyEvent.join(", ")}.`
  )
);

const urlFlag = Flag.String("url").pipe(
  Flag.withMetavar("<https-url>"),
  Flag.withDescription(
    "Where Peal sends the events: HTTPS, on the default port, on a public host, without a user name or a password."
  )
);

const descriptionFlag = Flag.String("description").pipe(
  Flag.withMetavar("<text>"),
  Flag.withDescription("What the endpoint is for.")
);

const endpointArgument = Argument.String("endpoint-id").pipe(
  Argument.withDescription("The endpoint, as peal webhooks list shows its id.")
);

const offReasons: Readonly<Record<WebhookDisabledReason, string>> = {
  failing: `every delivery failed for ${String(webhookFailingDays)} days`,
  gone: "the receiver answered 410 Gone",
  manual: "turned off by a member",
};

// Whether Peal sends the endpoint anything, and why not.
const statusOf = (endpoint: WebhookEndpoint): string => {
  if (!endpoint.enabled) {
    return endpoint.disabledReason === null
      ? "off"
      : `off: ${offReasons[endpoint.disabledReason]}`;
  }

  return endpoint.failingSince === null
    ? "on"
    : `on, failing since ${instant(endpoint.failingSince)}`;
};

const eventsOn = (endpoint: WebhookEndpoint): string =>
  everyEvent.every((type) => endpoint.eventTypes.includes(type))
    ? "all events"
    : endpoint.eventTypes.join(", ");

// An endpoint, a line per thing known of it. Never its secret, which the
// server shows once.
const endpointLines = (endpoint: WebhookEndpoint): string[] =>
  columns([
    ["  Address", endpoint.url],
    ["  Status", statusOf(endpoint)],
    ["  Events", eventsOn(endpoint)],
    ["  Description", endpoint.description === "" ? "–" : endpoint.description],
    ["  Created", instant(endpoint.createdAt)],
    ...(endpoint.previousSecretExpiresAt === null
      ? []
      : [
          [
            "  Previous secret",
            `signs until ${instant(endpoint.previousSecretExpiresAt)}`,
          ],
        ]),
  ]);

const failures: Readonly<Record<WebhookDeliveryFailure, string>> = {
  endpointDisabled: "the endpoint was turned off",
  exhausted: "every attempt failed",
  gone: "the receiver answered 410 Gone",
  notConfigured: "the server can no longer read the endpoint's secret",
};

const attemptErrors: Readonly<Record<WebhookAttemptError, string>> = {
  connection: "could not connect",
  refused: "not sent: the address is not HTTPS on a public host",
  timeout: "no answer in time",
};

// How the last attempt ended: the receiver's status, or why none came.
const answerOf = (delivery: WebhookDelivery): string => {
  if (delivery.responseStatus !== null) {
    return `HTTP ${String(delivery.responseStatus)}`;
  }

  return delivery.error === null ? "–" : attemptErrors[delivery.error];
};

const deliveryRow = (delivery: WebhookDelivery): string[] => [
  `  ${delivery.id}`,
  delivery.eventType,
  delivery.failureReason === null
    ? delivery.status
    : `${delivery.status}: ${failures[delivery.failureReason]}`,
  `${String(delivery.attempts)} ${delivery.attempts === 1 ? "attempt" : "attempts"}`,
  answerOf(delivery),
  delivery.durationMs === null ? "–" : `${String(delivery.durationMs)} ms`,
  delivery.nextAttemptAt === null
    ? ""
    : `next attempt ${instant(delivery.nextAttemptAt)}`,
];

const list = Command.make(
  "list",
  { workspace: workspaceFlag },
  Effect.fn("webhooks.list")(function* list({ workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const endpoints = yield* client.webhooks
      .list({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (endpoints.length === 0) {
      yield* Console.log(
        `${workspace.name} has no webhook endpoints: peal webhooks create adds one.`
      );

      return;
    }

    yield* Console.log(`Webhook endpoints of ${workspace.name}:`);

    for (const line of columns(
      endpoints.map((endpoint) => [
        `  ${endpoint.id}`,
        statusOf(endpoint),
        endpoint.url,
        eventsOn(endpoint),
        endpoint.description,
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's webhook endpoints: whether each is on, where its events go and which it subscribes to."
  )
);

const create = Command.make(
  "create",
  {
    description: descriptionFlag.pipe(Flag.optional),
    disabled: Flag.Boolean("disabled").pipe(
      Flag.withDescription(
        "Create it turned off: Peal sends it nothing until it is turned on."
      ),
      Flag.withDefault(false)
    ),
    events: eventsFlag,
    url: urlFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("webhooks.create")(function* create(input) {
    const eventTypes = yield* eventsOf(input.events);
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const { endpoint, secret } = yield* client.webhooks
      .create({
        params: { workspaceId: workspace.id },
        payload: {
          ...Option.match(input.description, {
            onNone: () => ({}),
            onSome: (description) => ({ description }),
          }),
          enabled: !input.disabled,
          eventTypes,
          url: input.url,
        },
      })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Created webhook endpoint ${endpoint.id} in ${workspace.name}: Peal sends ${eventsOn(endpoint)} to ${endpoint.url}.`
    );

    if (!endpoint.enabled) {
      yield* Console.log(
        `It is off: Peal sends it nothing until peal webhooks update ${endpoint.id} --enable.`
      );
    }

    yield* Console.log(`Signing secret: ${secret}`);
    yield* Console.log(
      "It is shown this once: keep it where the receiver checks each delivery's webhook-signature."
    );
  })
).pipe(
  Command.withDescription(
    `Add a webhook endpoint to the workspace, and print its signing secret, which is shown once. A workspace has ${String(maxWebhookEndpoints)} at most.`
  )
);

const show = Command.make(
  "show",
  { endpointId: endpointArgument, workspace: workspaceFlag },
  Effect.fn("webhooks.show")(function* show({ endpointId, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const endpoint = yield* client.webhooks
      .get({ params: { endpointId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(`Webhook endpoint ${endpoint.id} of ${workspace.name}:`);

    for (const line of endpointLines(endpoint)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Show one webhook endpoint: its address, events, and whether it is on or failing."
  )
);

const update = Command.make(
  "update",
  {
    description: descriptionFlag.pipe(Flag.optional),
    disable: Flag.Boolean("disable").pipe(
      Flag.withDescription(
        "Turn it off: Peal sends it nothing, and its pending deliveries fail."
      ),
      Flag.withDefault(false)
    ),
    enable: Flag.Boolean("enable").pipe(
      Flag.withDescription(
        "Turn it back on, forgetting the failures that turned it off."
      ),
      Flag.withDefault(false)
    ),
    endpointId: endpointArgument,
    events: eventsFlag.pipe(Flag.optional),
    url: urlFlag.pipe(Flag.optional),
    workspace: workspaceFlag,
  },
  Effect.fn("webhooks.update")(function* update(input) {
    if (input.enable && input.disable) {
      yield* new Refused({ reason: "Give --enable or --disable, not both." });
    }

    const eventTypes = yield* Effect.transposeOption(
      input.events.pipe(Option.map(eventsOf))
    );

    const enabled =
      input.enable || input.disable ? Option.some(input.enable) : Option.none();

    // Only what was given: the endpoint keeps the rest.
    const payload: WebhookEndpointChange = {
      ...Option.match(input.description, {
        onNone: () => ({}),
        onSome: (description) => ({ description }),
      }),
      ...Option.match(enabled, {
        onNone: () => ({}),
        onSome: (on) => ({ enabled: on }),
      }),
      ...Option.match(eventTypes, {
        onNone: () => ({}),
        onSome: (types) => ({ eventTypes: types }),
      }),
      ...Option.match(input.url, {
        onNone: () => ({}),
        onSome: (address) => ({ url: address }),
      }),
    };

    if (Object.keys(payload).length === 0) {
      yield* new Refused({
        reason:
          "Nothing to change: give --url, --events, --description, --enable or --disable.",
      });
    }

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const endpoint = yield* client.webhooks
      .update({
        params: { endpointId: input.endpointId, workspaceId: workspace.id },
        payload,
      })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Updated webhook endpoint ${endpoint.id} of ${workspace.name}.`
    );

    for (const line of endpointLines(endpoint)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Change a webhook endpoint's address, events or description, or turn it off or back on. What you leave out stays as it is."
  )
);

const remove = Command.make(
  "delete",
  { endpointId: endpointArgument, workspace: workspaceFlag },
  Effect.fn("webhooks.delete")(function* remove({
    endpointId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    yield* client.webhooks
      .delete({ params: { endpointId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Deleted webhook endpoint ${endpointId} of ${workspace.name}, with its secret and its delivery log: nothing more is sent to it.`
    );
  })
).pipe(
  Command.withDescription(
    "Delete a webhook endpoint, its secret and its delivery log for good."
  )
);

const rotateSecret = Command.make(
  "rotate-secret",
  { endpointId: endpointArgument, workspace: workspaceFlag },
  Effect.fn("webhooks.rotateSecret")(function* rotateSecret({
    endpointId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const { endpoint, secret } = yield* client.webhooks
      .rotateSecret({ params: { endpointId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    const overlap = `${String(webhookSecretOverlapHours)} hours`;

    yield* Console.log(
      `Rotated the signing secret of webhook endpoint ${endpoint.id} of ${workspace.name}.`
    );
    yield* Console.log(`Signing secret: ${secret}`);
    yield* Console.log(
      endpoint.previousSecretExpiresAt === null
        ? `It is shown this once. The secret it had still signs deliveries for ${overlap}, beside the new one: change the receiver's before then.`
        : `It is shown this once. The secret it had still signs deliveries for ${overlap}, until ${instant(endpoint.previousSecretExpiresAt)}, beside the new one: change the receiver's before then.`
    );
  })
).pipe(
  Command.withDescription(
    `Replace a webhook endpoint's signing secret, and print the new one, which is shown once. The old one still signs for ${String(webhookSecretOverlapHours)} hours.`
  )
);

const test = Command.make(
  "test",
  { endpointId: endpointArgument, workspace: workspaceFlag },
  Effect.fn("webhooks.test")(function* test({ endpointId, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const delivery = yield* client.webhooks
      .sendTest({ params: { endpointId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Sent a ${delivery.eventType} event to endpoint ${endpointId}: delivery ${delivery.id} is ${delivery.status}.`
    );
    yield* Console.log(
      `See how it ended: peal webhooks deliveries ${endpointId} --workspace ${workspace.slug}`
    );
  })
).pipe(
  Command.withDescription(
    "Send a webhook.test event to an endpoint, whatever it subscribes to, to try its receiver."
  )
);

const deliveries = Command.make(
  "deliveries",
  {
    cursor: Flag.String("cursor").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription("Where the page before ended, as it printed."),
      Flag.optional
    ),
    endpointId: endpointArgument,
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many deliveries a page holds, at most ${String(maxWebhookDeliveryPageSize)}.`
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("webhooks.deliveries")(function* deliveries({
    cursor,
    endpointId,
    limit,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const page = yield* client.webhooks
      .listDeliveries({
        params: { endpointId, workspaceId: workspace.id },
        query: {
          ...Option.match(cursor, {
            onNone: () => ({}),
            onSome: (after) => ({ cursor: after }),
          }),
          ...Option.match(limit, {
            onNone: () => ({}),
            onSome: (size) => ({
              limit: Math.min(Math.max(size, 1), maxWebhookDeliveryPageSize),
            }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (page.items.length === 0) {
      yield* Console.log(`Endpoint ${endpointId} has no deliveries.`);

      return;
    }

    yield* Console.log(`Deliveries to endpoint ${endpointId}, newest first:`);

    for (const line of columns(page.items.map(deliveryRow))) {
      yield* Console.log(line);
    }

    if (page.nextCursor !== null) {
      yield* Console.log(
        `More: peal webhooks deliveries ${endpointId} --workspace ${workspace.slug} --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "List an endpoint's recent deliveries, newest first: each one's event, status, attempts, the receiver's last answer and when the next attempt is."
  )
);

// Arguments are read in the order of their keys: the endpoint, then the
// delivery of its log to send again.
const redeliver = Command.make(
  "redeliver",
  {
    endpointId: endpointArgument,
    pastDeliveryId: Argument.String("delivery-id").pipe(
      Argument.withDescription(
        "The delivery, as peal webhooks deliveries shows its id."
      )
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("webhooks.redeliver")(function* redeliver({
    endpointId,
    pastDeliveryId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const delivery = yield* client.webhooks
      .redeliver({
        params: {
          deliveryId: pastDeliveryId,
          endpointId,
          workspaceId: workspace.id,
        },
      })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Sending the ${delivery.eventType} event of delivery ${pastDeliveryId} to endpoint ${endpointId} again: delivery ${delivery.id} is ${delivery.status}.`
    );
    yield* Console.log(
      `The receiver gets the same webhook-id. See how it ended: peal webhooks deliveries ${endpointId} --workspace ${workspace.slug}`
    );
  })
).pipe(
  Command.withDescription(
    "Send a delivery's event to its endpoint again, as a new delivery: the receiver gets the same webhook-id and body."
  )
);

export const webhooks = Command.make("webhooks").pipe(
  Command.withDescription(
    "A workspace's webhook endpoints: where Peal sends what happens in it, signed, and how each delivery went."
  ),
  Command.withSubcommands([
    list,
    create,
    show,
    update,
    remove,
    rotateSecret,
    test,
    deliveries,
    redeliver,
  ])
);
