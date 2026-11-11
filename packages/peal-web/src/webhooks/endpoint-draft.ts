import { Option } from "effect";
import { SubscribableWebhookEventTypeSchema } from "peal-contract";
import type {
  NewWebhookEndpoint,
  SubscribableWebhookEventType,
  WebhookEndpoint,
  WebhookEndpointChange,
  WebhookEndpointScope,
  WebhookHeader,
  WebhookHeaderChange,
} from "peal-contract";

/**
 * A header in an endpoint's form: one the endpoint has (`saved`), whose
 * value is never shown and kept unless typed again, or one being added.
 */
export interface HeaderRow {
  readonly name: string;
  readonly saved: boolean;
  /** Typed in this form; empty for a saved one that keeps its value. */
  readonly value: string;
}

/** An endpoint as its form holds it, while a member writes it. */
export interface EndpointDraft {
  /** The channels it hears about; none for every channel. */
  readonly channelIds: ReadonlySet<string>;
  readonly description: string;
  readonly enabled: boolean;
  readonly eventTypes: ReadonlySet<SubscribableWebhookEventType>;
  /** Its headers, as the form lists them. */
  readonly headers: readonly HeaderRow[];
  /** The names of the headers it has, to tell whether they changed. */
  readonly savedHeaderNames: readonly string[];
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
  headers: [],
  savedHeaderNames: [],
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
  headers: endpoint.headerNames.map((name) => ({
    name,
    saved: true,
    value: "",
  })),
  savedHeaderNames: endpoint.headerNames,
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

/** The draft with a header row more, empty, for a new header. */
export const withNewHeader = (draft: EndpointDraft): EndpointDraft => ({
  ...draft,
  headers: [...draft.headers, { name: "", saved: false, value: "" }],
});

/** The draft with what was typed in one header row. */
export const withHeader = (
  draft: EndpointDraft,
  index: number,
  typed: { readonly name?: string; readonly value?: string }
): EndpointDraft => ({
  ...draft,
  headers: draft.headers.map((row, at) =>
    at === index
      ? {
          name: row.saved ? row.name : (typed.name ?? row.name),
          saved: row.saved,
          value: typed.value ?? row.value,
        }
      : row
  ),
});

/** The draft without one header row. */
export const withoutHeader = (
  draft: EndpointDraft,
  index: number
): EndpointDraft => ({
  ...draft,
  headers: draft.headers.filter((_row, at) => at !== index),
});

// The rows that say something: an empty new row is no header.
const filledRows = (draft: EndpointDraft) =>
  draft.headers
    .map((row) => ({ ...row, name: row.name.trim() }))
    .filter((row) => row.saved || row.name !== "" || row.value !== "");

// A new endpoint's headers, once each row has a name and a value.
const newHeadersOf = (
  draft: EndpointDraft
): Option.Option<readonly WebhookHeader[]> => {
  const rows = filledRows(draft);

  return rows.every(({ name, value }) => name !== "" && value !== "")
    ? Option.some(rows.map(({ name, value }) => ({ name, value })))
    : Option.none();
};

// A change's headers: none while the form lists what the endpoint has,
// untouched; the whole list otherwise, a saved row without a new value
// keeping its own. A new row needs a name and a value.
const changedHeadersOf = (
  draft: EndpointDraft
): Option.Option<Option.Option<readonly WebhookHeaderChange[]>> => {
  const rows = filledRows(draft);

  if (
    rows.some(
      ({ name, saved, value }) => !saved && (name === "" || value === "")
    )
  ) {
    return Option.none();
  }

  const untouched =
    rows.length === draft.savedHeaderNames.length &&
    rows.every(
      ({ name, saved, value }, index) =>
        saved && value === "" && draft.savedHeaderNames[index] === name
    );

  return Option.some(
    untouched
      ? Option.none()
      : Option.some(
          rows.map(({ name, value }) =>
            value === "" ? { name } : { name, value }
          )
        )
  );
};

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

/**
 * The endpoint to create, once the draft has an address, an event, and a
 * name and a value for each header it lists.
 */
export const newEndpointOf = (
  draft: EndpointDraft
): Option.Option<NewWebhookEndpoint> =>
  Option.all([written(draft), newHeadersOf(draft)]).pipe(
    Option.map(([fields, headers]): NewWebhookEndpoint => {
      const made: NewWebhookEndpoint = { ...fields, enabled: draft.enabled };
      const channelIds = [...draft.channelIds];

      if (channelIds.length > 0 && headers.length > 0) {
        return { ...made, channelIds, headers };
      }

      if (channelIds.length > 0) {
        return { ...made, channelIds };
      }

      return headers.length > 0 ? { ...made, headers } : made;
    })
  );

/**
 * What to save of an endpoint's form: its address, description, events and
 * filters, an empty filter hearing everything again; the workspaces only of
 * a partner endpoint. Whether it is on changes on its own.
 */
export const changeOf = (
  draft: EndpointDraft
): Option.Option<WebhookEndpointChange> =>
  Option.all([written(draft), changedHeadersOf(draft)]).pipe(
    Option.map(([fields, headers]): WebhookEndpointChange => {
      const change: WebhookEndpointChange = {
        ...fields,
        channelIds: [...draft.channelIds],
      };

      const filtered: WebhookEndpointChange =
        draft.scope === "partner"
          ? { ...change, workspaceIds: workspaceIdsOf(draft.workspaceIds) }
          : change;

      return Option.match(headers, {
        onNone: () => filtered,
        onSome: (given) => ({ ...filtered, headers: given }),
      });
    })
  );
