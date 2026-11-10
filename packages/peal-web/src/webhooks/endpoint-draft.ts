import { Option } from "effect";
import { SubscribableWebhookEventTypeSchema } from "peal-contract";
import type {
  NewWebhookEndpoint,
  SubscribableWebhookEventType,
  WebhookEndpoint,
  WebhookEndpointChange,
} from "peal-contract";

/** An endpoint as its form holds it, while a member writes it. */
export interface EndpointDraft {
  readonly description: string;
  readonly enabled: boolean;
  readonly eventTypes: ReadonlySet<SubscribableWebhookEventType>;
  readonly url: string;
}

/** A new endpoint's form: on, with nothing chosen yet. */
export const emptyDraft: EndpointDraft = {
  description: "",
  enabled: true,
  eventTypes: new Set(),
  url: "",
};

/** The form of an endpoint the workspace has. */
export const draftOf = (endpoint: WebhookEndpoint): EndpointDraft => ({
  description: endpoint.description,
  enabled: endpoint.enabled,
  eventTypes: new Set(endpoint.eventTypes),
  url: endpoint.url,
});

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
    Option.map((fields) => ({ ...fields, enabled: draft.enabled }))
  );

/**
 * What to save of an endpoint's form: its address, description and events.
 * Whether it is on changes on its own.
 */
export const changeOf = (
  draft: EndpointDraft
): Option.Option<WebhookEndpointChange> => written(draft);
