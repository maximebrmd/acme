import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  maxWebhookBulkRedelivery,
  maxWebhookDeliveryPageSize,
  maxWebhookEndpoints,
  maxWebhookFilterChannels,
  maxWebhookFilterWorkspaces,
  maxWebhookHeaders,
  SubscribableWebhookEventTypeSchema,
  webhookBulkRedeliveriesPerHour,
  WebhookBulkRedeliverySchema,
  WebhookDeliveryPageSchema,
  WebhookDeliverySchema,
  WebhookDeliveryStatusSchema,
  WebhookEndpointSchema,
  WebhookEndpointSecretSchema,
  WebhookEventTypeSchema,
  webhookFailingDays,
  WebhookHeaderSchema,
  webhookSecretOverlapHours,
} from "peal-contract";
import type {
  SubscribableWebhookEventType,
  WebhookAttemptError,
  WebhookDelivery,
  WebhookBulkRedelivery,
  WebhookDeliveryFailure,
  WebhookDeliveryPage,
  WebhookDisabledReason,
  WebhookEndpoint,
  WebhookEndpointChange,
  WebhookHeader,
} from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import { channelIdsOf } from "#post-flags.ts";
import { columns, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { instantOf } from "#when.ts";
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

const channelFilterFlag = Flag.String("channel").pipe(
  Flag.withMetavar("<channel-id>"),
  Flag.withDescription(
    `Only the events about this channel, as peal channels list shows its id: repeat it, or separate ids with commas, ${String(maxWebhookFilterChannels)} at most. Events about no channel (files, boosts) still come: leave their types out of --events.`
  ),
  Flag.atLeast(0)
);

const workspaceFilterFlag = Flag.String("workspace-id").pipe(
  Flag.withMetavar("<workspace-id>"),
  Flag.withDescription(
    `On a partner endpoint, only the events of this workspace: repeat it, ${String(maxWebhookFilterWorkspaces)} at most. The home workspace is heard only if it is listed.`
  ),
  Flag.atLeast(0)
);

const headerFlag = Flag.String("header").pipe(
  Flag.withMetavar("<name: value>"),
  Flag.withDescription(
    `A header every delivery carries beside Peal's own, as a gateway in front of the receiver may ask: repeat it, ${String(maxWebhookHeaders)} at most. Its value is never shown again, and your shell keeps what you type in its history: write it as "Authorization: $TOKEN" from a variable.`
  ),
  Flag.atLeast(0)
);

const decodeHeaders = Schema.decodeUnknownEffect(
  Schema.Array(WebhookHeaderSchema).check(Schema.isMaxLength(maxWebhookHeaders))
);

// `--header "Name: value"`, each once, as the endpoint takes them: refused
// before anything is asked of the server.
const headersOf = (
  given: readonly string[]
): Effect.Effect<readonly WebhookHeader[], Refused> => {
  const split = given.map((header) => {
    const colon = header.indexOf(":");

    return colon === -1
      ? undefined
      : {
          name: header.slice(0, colon).trim(),
          value: header.slice(colon + 1).trim(),
        };
  });

  const refused = new Refused({
    reason: `--header takes "Name: value", ${String(maxWebhookHeaders)} at most, each name once: a name that is an HTTP token and not one Peal sets (Host, User-Agent, Cookie, Expect, Accept-Encoding, a connection's own, any Content- or webhook- name), a value of visible ASCII on one line.`,
  });

  const names = split.flatMap((header) =>
    header === undefined ? [] : [header.name.toLowerCase()]
  );

  return split.some((header) => header === undefined) ||
    new Set(names).size !== names.length
    ? Effect.fail(refused)
    : decodeHeaders(split).pipe(Effect.mapError(() => refused));
};

// Ids given to a filter flag, each once, as the server keeps them.
const filterOf = (given: readonly string[]) =>
  given.length === 0 ? Option.none() : Option.some(channelIdsOf(given));

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

const listed = (ids: readonly string[], every: string): string =>
  ids.length === 0 ? every : ids.join(", ");

// An endpoint, a line per thing known of it. Never its secret, which the
// server shows once.
const endpointLines = (endpoint: WebhookEndpoint): string[] =>
  columns([
    ["  Address", endpoint.url],
    ["  Status", statusOf(endpoint)],
    ["  Events", eventsOn(endpoint)],
    ["  Channels", listed(endpoint.channelIds, "every channel")],
    // Their names: the values are never shown.
    ["  Headers", listed(endpoint.headerNames, "none")],
    ...(endpoint.scope === "partner"
      ? [["  Workspaces", listed(endpoint.workspaceIds, "every workspace")]]
      : []),
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

const deliveryRow = (
  delivery: WebhookDelivery,
  ofEndpoints = false
): string[] => [
  `  ${delivery.id}`,
  ...(ofEndpoints ? [`to ${delivery.endpointId}`] : []),
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
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("webhooks.list")(function* list({ json, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const endpoints = yield* client.webhooks
      .list({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(Schema.Array(WebhookEndpointSchema), endpoints);

      return;
    }

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
    channels: channelFilterFlag,
    description: descriptionFlag.pipe(Flag.optional),
    disabled: Flag.Boolean("disabled").pipe(
      Flag.withDescription(
        "Create it turned off: Peal sends it nothing until it is turned on."
      ),
      Flag.withDefault(false)
    ),
    events: eventsFlag,
    headers: headerFlag,
    json: jsonFlag,
    partner: Flag.Boolean("partner").pipe(
      Flag.withDescription(
        "In a partner account's home workspace, hear every workspace the partner owns too."
      ),
      Flag.withDefault(false)
    ),
    url: urlFlag,
    workspace: workspaceFlag,
    workspaceIds: workspaceFilterFlag,
  },
  Effect.fn("webhooks.create")(function* create(input) {
    const eventTypes = yield* eventsOf(input.events);
    const headers = yield* headersOf(input.headers);

    if (input.workspaceIds.length > 0 && !input.partner) {
      yield* new Refused({
        reason:
          "--workspace-id narrows a partner endpoint: give --partner too, in a partner account's home workspace.",
      });
    }

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const created = yield* client.webhooks
      .create({
        params: { workspaceId: workspace.id },
        payload: {
          ...Option.match(input.description, {
            onNone: () => ({}),
            onSome: (description) => ({ description }),
          }),
          ...Option.match(filterOf(input.channels), {
            onNone: () => ({}),
            onSome: (channelIds) => ({ channelIds }),
          }),
          enabled: !input.disabled,
          eventTypes,
          headers,
          scope: input.partner ? "partner" : "workspace",
          url: input.url,
          ...Option.match(filterOf(input.workspaceIds), {
            onNone: () => ({}),
            onSome: (workspaceIds) => ({ workspaceIds }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(WebhookEndpointSecretSchema, created);

      return;
    }

    const { endpoint, secret } = created;

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
  { endpointId: endpointArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("webhooks.show")(function* show({
    endpointId,
    json,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const endpoint = yield* client.webhooks
      .get({ params: { endpointId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(WebhookEndpointSchema, endpoint);

      return;
    }

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
    channels: channelFilterFlag,
    clearChannels: Flag.Boolean("clear-channels").pipe(
      Flag.withDescription("Hear every channel again."),
      Flag.withDefault(false)
    ),
    clearHeaders: Flag.Boolean("clear-headers").pipe(
      Flag.withDescription("Send no header of the endpoint's own any more."),
      Flag.withDefault(false)
    ),
    clearWorkspaces: Flag.Boolean("clear-workspaces").pipe(
      Flag.withDescription(
        "On a partner endpoint, hear every workspace again."
      ),
      Flag.withDefault(false)
    ),
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
    headers: headerFlag,
    json: jsonFlag,
    url: urlFlag.pipe(Flag.optional),
    workspace: workspaceFlag,
    workspaceIds: workspaceFilterFlag,
  },
  Effect.fn("webhooks.update")(function* update(input) {
    if (input.enable && input.disable) {
      yield* new Refused({ reason: "Give --enable or --disable, not both." });
    }

    if (input.clearChannels && input.channels.length > 0) {
      yield* new Refused({
        reason: "Give --channel or --clear-channels, not both.",
      });
    }

    if (input.clearHeaders && input.headers.length > 0) {
      yield* new Refused({
        reason: "Give --header or --clear-headers, not both.",
      });
    }

    // Given, they replace every header the endpoint had.
    const headers =
      input.clearHeaders || input.headers.length > 0
        ? Option.some(yield* headersOf(input.headers))
        : Option.none();

    if (input.clearWorkspaces && input.workspaceIds.length > 0) {
      yield* new Refused({
        reason: "Give --workspace-id or --clear-workspaces, not both.",
      });
    }

    const channelIds = input.clearChannels
      ? Option.some([])
      : filterOf(input.channels);

    const workspaceIds = input.clearWorkspaces
      ? Option.some([])
      : filterOf(input.workspaceIds);

    const eventTypes = yield* Effect.transposeOption(
      input.events.pipe(Option.map(eventsOf))
    );

    const enabled =
      input.enable || input.disable ? Option.some(input.enable) : Option.none();

    // Only what was given: the endpoint keeps the rest.
    const payload: WebhookEndpointChange = {
      ...Option.match(channelIds, {
        onNone: () => ({}),
        onSome: (ids) => ({ channelIds: ids }),
      }),
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
      ...Option.match(headers, {
        onNone: () => ({}),
        onSome: (given) => ({ headers: given }),
      }),
      ...Option.match(input.url, {
        onNone: () => ({}),
        onSome: (address) => ({ url: address }),
      }),
      ...Option.match(workspaceIds, {
        onNone: () => ({}),
        onSome: (ids) => ({ workspaceIds: ids }),
      }),
    };

    if (Object.keys(payload).length === 0) {
      yield* new Refused({
        reason:
          "Nothing to change: give --url, --events, --description, --channel, --workspace-id, --header, a --clear flag, --enable or --disable.",
      });
    }

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const endpoint = yield* client.webhooks
      .update({
        params: { endpointId: input.endpointId, workspaceId: workspace.id },
        payload,
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(WebhookEndpointSchema, endpoint);

      return;
    }

    yield* Console.log(
      `Updated webhook endpoint ${endpoint.id} of ${workspace.name}.`
    );

    for (const line of endpointLines(endpoint)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Change a webhook endpoint's address, events, description, filters or headers, or turn it off or back on. What you leave out stays as it is; --channel, --workspace-id and --header replace the lists the endpoint had. Header values go only to the host they were given for: a --url on another host, on an endpoint with headers, needs every --header again with its value, or --clear-headers."
  )
);

const remove = Command.make(
  "delete",
  { endpointId: endpointArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("webhooks.delete")(function* remove({
    endpointId,
    json,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    yield* client.webhooks
      .delete({ params: { endpointId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* json
      ? printNothing
      : Console.log(
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
  { endpointId: endpointArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("webhooks.rotateSecret")(function* rotateSecret({
    endpointId,
    json,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const rotated = yield* client.webhooks
      .rotateSecret({ params: { endpointId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(WebhookEndpointSecretSchema, rotated);

      return;
    }

    const { endpoint, secret } = rotated;

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
  {
    endpointId: endpointArgument,
    event: Flag.Literals("event", everyEvent).pipe(
      Flag.withDescription(
        "Send a sample of this type instead of webhook.test: its real shape, ids that name nothing, and sample: true, which the receiver must never act on."
      ),
      Flag.optional
    ),
    json: jsonFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("webhooks.test")(function* test({
    endpointId,
    event,
    json,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const delivery = yield* client.webhooks
      .sendTest({
        params: { endpointId, workspaceId: workspace.id },
        query: Option.match(event, {
          onNone: () => ({}),
          onSome: (eventType) => ({ eventType }),
        }),
      })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(WebhookDeliverySchema, delivery);

      return;
    }

    yield* Console.log(
      Option.isSome(event)
        ? `Sent a sample ${delivery.eventType} event to endpoint ${endpointId}, marked sample: true: delivery ${delivery.id} is ${delivery.status}.`
        : `Sent a ${delivery.eventType} event to endpoint ${endpointId}: delivery ${delivery.id} is ${delivery.status}.`
    );
    yield* Console.log(
      `See how it ended: peal webhooks deliveries ${endpointId} --workspace ${workspace.slug}`
    );
  })
).pipe(
  Command.withDescription(
    "Send a webhook.test event to an endpoint, or a sample of an event type, whatever it subscribes to or filters, to try its receiver."
  )
);

const instantFlag = (name: string, description: string) =>
  Flag.String(name).pipe(
    Flag.withMetavar("<instant>"),
    Flag.withDescription(
      `${description}: an instant with its offset, such as 2026-11-20T09:00:00Z.`
    ),
    Flag.optional
  );

// An instant a flag gave, with its offset: there is no time zone to read a
// local time in.
const givenInstant = (given: Option.Option<string>, flag: string) =>
  Effect.transposeOption(
    given.pipe(Option.map((written) => instantOf(written, "UTC", flag)))
  );

const printPage = Effect.fn("webhooks.printPage")(function* printPage(
  page: WebhookDeliveryPage,
  ofEndpoints: boolean,
  title: string,
  empty: string,
  more: string
) {
  if (page.items.length === 0) {
    yield* Console.log(empty);

    return;
  }

  yield* Console.log(title);

  for (const line of columns(
    page.items.map((delivery) => deliveryRow(delivery, ofEndpoints))
  )) {
    yield* Console.log(line);
  }

  if (page.nextCursor !== null) {
    yield* Console.log(`More: ${more} --cursor ${page.nextCursor}`);
  }
});

const deliveries = Command.make(
  "deliveries",
  {
    cursor: Flag.String("cursor").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription(
        "Where the page before ended, as it printed: give it with the same filters."
      ),
      Flag.optional
    ),
    endpointId: endpointArgument.pipe(
      Argument.withDescription(
        "The endpoint, as peal webhooks list shows its id; every endpoint's deliveries when left out."
      ),
      Argument.optional
    ),
    event: Flag.Literals("event", WebhookEventTypeSchema.literals).pipe(
      Flag.withDescription("Only the deliveries of this event type."),
      Flag.optional
    ),
    json: jsonFlag,
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many deliveries a page holds, at most ${String(maxWebhookDeliveryPageSize)}.`
      ),
      Flag.optional
    ),
    since: instantFlag("since", "Only the deliveries made then or later"),
    status: Flag.Literals("status", WebhookDeliveryStatusSchema.literals).pipe(
      Flag.withDescription(
        "Only the deliveries pending, succeeded, or failed for good (the ones to send again)."
      ),
      Flag.optional
    ),
    until: instantFlag("until", "Only the deliveries made before then"),
    workspace: workspaceFlag,
  },
  Effect.fn("webhooks.deliveries")(function* deliveries(input) {
    const since = yield* givenInstant(input.since, "--since");
    const until = yield* givenInstant(input.until, "--until");
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const query = {
      ...Option.match(input.cursor, {
        onNone: () => ({}),
        onSome: (after) => ({ cursor: after }),
      }),
      ...Option.match(input.event, {
        onNone: () => ({}),
        onSome: (eventType) => ({ eventType }),
      }),
      ...Option.match(input.limit, {
        onNone: () => ({}),
        onSome: (size) => ({
          limit: Math.min(Math.max(size, 1), maxWebhookDeliveryPageSize),
        }),
      }),
      ...Option.match(input.status, {
        onNone: () => ({}),
        onSome: (status) => ({ status }),
      }),
    };

    // One endpoint's log, unless the time asks for the log across them.
    const page =
      Option.isSome(input.endpointId) &&
      Option.isNone(since) &&
      Option.isNone(until)
        ? yield* client.webhooks
            .listDeliveries({
              params: {
                endpointId: input.endpointId.value,
                workspaceId: workspace.id,
              },
              query,
            })
            .pipe(Effect.mapError(explain(url)))
        : yield* client.webhooks
            .searchDeliveries({
              params: { workspaceId: workspace.id },
              query: {
                ...query,
                ...Option.match(input.endpointId, {
                  onNone: () => ({}),
                  onSome: (endpointId) => ({ endpointId }),
                }),
                ...Option.match(since, {
                  onNone: () => ({}),
                  onSome: (at) => ({ since: at }),
                }),
                ...Option.match(until, {
                  onNone: () => ({}),
                  onSome: (at) => ({ until: at }),
                }),
              },
            })
            .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(WebhookDeliveryPageSchema, page);

      return;
    }

    const where = Option.match(input.endpointId, {
      onNone: () => `of ${workspace.name}'s endpoints`,
      onSome: (endpointId) => `to endpoint ${endpointId}`,
    });

    yield* printPage(
      page,
      Option.isNone(input.endpointId),
      `Deliveries ${where}, newest first:`,
      Option.isSome(input.endpointId) &&
        Option.isNone(input.status) &&
        Option.isNone(input.event) &&
        Option.isNone(since) &&
        Option.isNone(until)
        ? `Endpoint ${input.endpointId.value} has no deliveries.`
        : `No deliveries ${where} match.`,
      `peal webhooks deliveries ${Option.getOrElse(input.endpointId, () => "")} --workspace ${workspace.slug}`.replace(
        "  ",
        " "
      )
    );
  })
).pipe(
  Command.withDescription(
    "List recent deliveries, newest first, of one endpoint or of every one: each one's endpoint, event, status, attempts, the receiver's last answer and when the next attempt is. --status failed lists the deliveries to send again."
  )
);

const skipReasons: Readonly<
  Record<WebhookBulkRedelivery["skipped"][number]["reason"], string>
> = {
  alreadySent:
    "sent again already, and that delivery is pending or went through",
  endpointDisabled: "its endpoint is off",
  notFound: "not a delivery of this workspace",
};

const printRedelivered = Effect.fn("webhooks.printRedelivered")(
  function* printRedelivered(
    result: WebhookBulkRedelivery,
    endpointIds: ReadonlySet<string>
  ) {
    yield* Console.log(
      `Sending ${String(result.redelivered.length)} ${result.redelivered.length === 1 ? "delivery" : "deliveries"} again, as new deliveries of the same events.`
    );

    for (const line of columns(
      result.redelivered.map((delivery) => deliveryRow(delivery, true))
    )) {
      yield* Console.log(line);
    }

    for (const { deliveryId, reason } of result.skipped) {
      yield* Console.log(
        reason === "notFound" && endpointIds.has(deliveryId)
          ? `  Skipped ${deliveryId}: an endpoint's id, not a delivery's: name the endpoint with --endpoint ${deliveryId}.`
          : `  Skipped ${deliveryId}: ${skipReasons[reason]}.`
      );
    }

    if (result.remaining > 0) {
      yield* Console.log(
        `${String(result.remaining)} more failed deliveries are left: run the same command again.`
      );
    }
  }
);

// What a redeliver's flags ask for holds together, before any request.
const checkRedelivery = Effect.fn("webhooks.checkRedelivery")(
  function* checkRedelivery(input: {
    readonly deliveryIds: readonly string[];
    readonly endpoint: Option.Option<string>;
    readonly event: Option.Option<string>;
    readonly failed: boolean;
    readonly since: Option.Option<string>;
    readonly until: Option.Option<string>;
  }) {
    if (input.failed && input.deliveryIds.length > 0) {
      yield* new Refused({
        reason: "Give --failed with --endpoint, or delivery ids, not both.",
      });
    }

    if (input.failed && Option.isNone(input.endpoint)) {
      yield* new Refused({
        reason:
          "--failed sends one endpoint's failed deliveries again: give --endpoint too.",
      });
    }

    if (
      !input.failed &&
      (Option.isSome(input.since) ||
        Option.isSome(input.until) ||
        Option.isSome(input.event))
    ) {
      yield* new Refused({
        reason:
          "--since, --until and --event go with --failed, which picks an endpoint's failed deliveries: deliveries named by id are sent again whatever their time or type.",
      });
    }

    if (!input.failed && input.deliveryIds.length === 0) {
      yield* new Refused({
        reason:
          "Give the deliveries to send again, or --failed --endpoint <id>.",
      });
    }
  }
);

const redeliver = Command.make(
  "redeliver",
  {
    deliveryIds: Argument.String("delivery-id").pipe(
      Argument.withDescription(
        `The deliveries to send again, as peal webhooks deliveries shows their ids, ${String(maxWebhookBulkRedelivery)} at most; none with --failed.`
      ),
      Argument.atLeast(0)
    ),
    endpoint: Flag.String("endpoint").pipe(
      Flag.withMetavar("<endpoint-id>"),
      Flag.withDescription(
        "The endpoint: with --failed, whose failed deliveries to send again; with one delivery id, the endpoint it went to."
      ),
      Flag.optional
    ),
    event: Flag.Literals("event", everyEvent).pipe(
      Flag.withDescription("With --failed, only the deliveries of this type."),
      Flag.optional
    ),
    failed: Flag.Boolean("failed").pipe(
      Flag.withDescription(
        `Send the endpoint's failed deliveries again, oldest first, ${String(maxWebhookBulkRedelivery)} a call, the last of each event only.`
      ),
      Flag.withDefault(false)
    ),
    json: jsonFlag,
    since: instantFlag("since", "With --failed, only those made then or later"),
    until: instantFlag("until", "With --failed, only those made before then"),
    workspace: workspaceFlag,
  },
  Effect.fn("webhooks.redeliver")(function* redeliver(input) {
    yield* checkRedelivery(input);

    const since = yield* givenInstant(input.since, "--since");
    const until = yield* givenInstant(input.until, "--until");
    const { client, url, workspace } = yield* inWorkspace(input.workspace);
    const [single, ...others] = input.deliveryIds;

    // One delivery of a named endpoint: sent again on its own.
    if (
      !input.failed &&
      Option.isSome(input.endpoint) &&
      single !== undefined &&
      others.length === 0
    ) {
      const delivery = yield* client.webhooks
        .redeliver({
          params: {
            deliveryId: single,
            endpointId: input.endpoint.value,
            workspaceId: workspace.id,
          },
        })
        .pipe(Effect.mapError(explain(url)));

      if (input.json) {
        yield* printJson(WebhookDeliverySchema, delivery);

        return;
      }

      yield* Console.log(
        `Sending the ${delivery.eventType} event of delivery ${single} to endpoint ${input.endpoint.value} again: delivery ${delivery.id} is ${delivery.status}.`
      );
      yield* Console.log(
        `The receiver gets the same webhook-id. See how it ended: peal webhooks deliveries ${input.endpoint.value} --workspace ${workspace.slug}`
      );

      return;
    }

    const result = yield* client.webhooks
      .redeliverMany({
        params: { workspaceId: workspace.id },
        payload:
          input.failed && Option.isSome(input.endpoint)
            ? {
                endpointId: input.endpoint.value,
                ...Option.match(input.event, {
                  onNone: () => ({}),
                  onSome: (eventType) => ({ eventType }),
                }),
                ...Option.match(since, {
                  onNone: () => ({}),
                  onSome: (at) => ({ since: at }),
                }),
                ...Option.match(until, {
                  onNone: () => ({}),
                  onSome: (at) => ({ until: at }),
                }),
              }
            : {
                deliveryIds: [single ?? "", ...others],
              },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(WebhookBulkRedeliverySchema, result);
    } else {
      // An id skipped as no delivery may be an endpoint's, as the command
      // once took the endpoint first.
      const endpointIds = result.skipped.some(
        ({ reason }) => reason === "notFound"
      )
        ? new Set(
            (yield* client.webhooks
              .list({ params: { workspaceId: workspace.id } })
              .pipe(Effect.mapError(explain(url)))).map(({ id }) => id)
          )
        : new Set<string>();

      yield* printRedelivered(result, endpointIds);
    }

    if (result.redelivered.length === 0) {
      yield* new Refused({
        code: "nothing_redelivered",
        reason:
          result.skipped.length === 0
            ? "Nothing was sent again: no delivery matched."
            : "Nothing was sent again: every delivery was skipped, as said above.",
      });
    }
  })
).pipe(
  Command.withDescription(
    `Send deliveries again, as new deliveries of the same events: the receivers get the same webhook-id and body. Name them by id, or give --failed --endpoint <id> for an endpoint's failed ones. A workspace sends ${String(webhookBulkRedeliveriesPerHour)} again this way an hour; one delivery with --endpoint counts with the test events.`
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
