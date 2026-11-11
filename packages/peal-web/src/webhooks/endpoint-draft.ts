import { Option } from "effect";
import { SubscribableWebhookEventTypeSchema } from "peal-contract";
import type {
  NewWebhookEndpoint,
  SubscribableWebhookEventType,
  WebhookEndpoint,
  WebhookEndpointChange,
  WebhookEndpointScope,
} from "peal-contract";

/** An endpoint as its form holds it, while a member writes it. */
export interface EndpointDraft {
  /** The channels it hears about; none for every channel. */
  readonly channelIds: ReadonlySet<string>;
  readonly description: string;
  readonly enabled: boolean;
  readonly eventTypes: ReadonlySet<SubscribableWebhookEventType>;
  /** Whether it hears a partner's every workspace: the workspaces field. */
  readonly scope: WebhookEndpointScope;
  readonly url: string;
  /** The workspaces a partner endpoint hears, one id a line; none for all. */
  readonly workspaceIds: string;
}

/** A new endpoint's form: on, with nothing chosen yet. */
export const emptyDraft: EndpointDraft = {
  channelIds: new Set(),
  description: "",
  enabled: true,
  eventTypes: new Set(),
  scope: "workspace",
  url: "",
  workspaceIds: "",
};

/** The form of an endpoint the workspace has. */
export const draftOf = (endpoint: WebhookEndpoint): EndpointDraft => ({
  channelIds: new Set(endpoint.channelIds),
  description: endpoint.description,
  enabled: endpoint.enabled,
  eventTypes: new Set(endpoint.eventTypes),
  scope: endpoint.scope,
  url: endpoint.url,
  workspaceIds: endpoint.workspaceIds.join("\n"),
});

/** The draft with one channel listened to, or left out. */
export const withChannel = (
  draft: EndpointDraft,
  channelId: string,
  chosen: boolean
): EndpointDraft => {
  const channelIds = new Set(draft.channelIds);

  if (chosen) {
    channelIds.add(channelId);
  } else {
    channelIds.delete(channelId);
  }

  return { ...draft, channelIds };
};

/**
 * The channels a draft hears that are not among those the form offers, as
 * a channel disconnected since: shown apart, so a member can take them
 * off, as each save sends them back otherwise.
 */
export const goneChannelIds = (
  draft: EndpointDraft,
  channels: readonly { readonly id: string }[]
): string[] => {
  const offered = new Set(channels.map(({ id }) => id));

  return [...draft.channelIds].filter((id) => !offered.has(id));
};

/** The ids a workspaces field lists, one a line, each once. */
export const workspaceIdsOf = (written: string): string[] => [
  ...new Set(
    written
      .split(/[\s,]+/u)
      .map((id) => id.trim())
      .filter((id) => id !== "")
  ),
];

/** The draft with one event chosen, or left out. */
export const withType = (
  draft: EndpointDraft,
  type: SubscribableWebhookEventType,
  chosen: boolean
): EndpointDraft => {
  const eventTypes = new Set(draft.eventTypes);

  if (chosen) {
    eventTypes.add(type);
  } else {
    eventTypes.delete(type);
  }

  return { ...draft, eventTypes };
};

/** The draft with every event chosen, or none. */
export const withEveryType = (
  draft: EndpointDraft,
  chosen: boolean
): EndpointDraft => ({
  ...draft,
  eventTypes: new Set(
    chosen ? SubscribableWebhookEventTypeSchema.literals : []
  ),
});

export const everyTypeChosen = (draft: EndpointDraft): boolean =>
  SubscribableWebhookEventTypeSchema.literals.every((type) =>
    draft.eventTypes.has(type)
  );

// What a draft says once it can be sent: an address, and one event at
// least, in the vocabulary's order.
const written = (draft: EndpointDraft) => {
  const url = draft.url.trim();

  const [first, ...rest] = SubscribableWebhookEventTypeSchema.literals.filter(
    (type) => draft.eventTypes.has(type)
  );

  return url === "" || first === undefined
    ? Option.none()
    : Option.some({
        description: draft.description.trim(),
        eventTypes: [first, ...rest] as const,
        url,
      });
};

/** The endpoint to create, once the draft has an address and an event. */
export const newEndpointOf = (
  draft: EndpointDraft
): Option.Option<NewWebhookEndpoint> =>
  written(draft).pipe(
    Option.map((fields) =>
      draft.channelIds.size === 0
        ? { ...fields, enabled: draft.enabled }
        : {
            ...fields,
            channelIds: [...draft.channelIds],
            enabled: draft.enabled,
          }
    )
  );

/**
 * What to save of an endpoint's form: its address, description, events and
 * filters, an empty filter hearing everything again; the workspaces only of
 * a partner endpoint. Whether it is on changes on its own.
 */
export const changeOf = (
  draft: EndpointDraft
): Option.Option<WebhookEndpointChange> =>
  written(draft).pipe(
    Option.map((fields) => {
      const channelIds = [...draft.channelIds];

      return draft.scope === "partner"
        ? {
            ...fields,
            channelIds,
            workspaceIds: workspaceIdsOf(draft.workspaceIds),
          }
        : { ...fields, channelIds };
    })
  );
