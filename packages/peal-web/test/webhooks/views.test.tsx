import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { WebhookDelivery, WebhookEndpoint } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  DeliveryLogView,
  EndpointFieldsView,
  EndpointItemView,
  WebhookSecretView,
} from "#components/webhooks/webhook-views.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { emptyDraft } from "#webhooks/endpoint-draft.ts";

const render = async (locale: "en" | "fr", view: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      {view}
    </NextIntlClientProvider>
  );

const at = (iso: string) => DateTime.makeUnsafe(iso);

// The texts among `expected` that the markup lacks.
const missingFrom = (html: string, expected: readonly string[]) =>
  expected.filter((text) => !html.includes(text));

const noop = () => {
  // Nothing changes while rendering to markup.
};

const on: WebhookEndpoint = {
  channelIds: [],
  createdAt: at("2026-11-01T09:00:00Z"),
  description: "Synthetic receiver",
  disabledAt: null,
  disabledReason: null,
  enabled: true,
  eventTypes: ["post.published", "post.failed"],
  failingSince: null,
  headerNames: [],
  id: "00000000-0000-7000-8000-000000000001",
  previousSecretExpiresAt: null,
  scope: "workspace",
  updatedAt: at("2026-11-01T09:00:00Z"),
  url: "https://hooks.example.com/peal?source=test",
  workspaceIds: [],
};

const failing: WebhookEndpoint = {
  ...on,
  description: "",
  disabledAt: at("2026-11-08T10:30:00Z"),
  disabledReason: "failing",
  enabled: false,
  eventTypes: ["channel.reconnect_needed"],
  failingSince: at("2026-11-03T10:30:00Z"),
  id: "00000000-0000-7000-8000-000000000002",
  url: "https://receiver.example.org/hooks",
};

const delivery: WebhookDelivery = {
  attempts: 1,
  completedAt: at("2026-11-10T09:00:01Z"),
  createdAt: at("2026-11-10T09:00:00Z"),
  durationMs: 182,
  endpointId: "00000000-0000-7000-8000-000000000001",
  error: null,
  eventId: "00000000-0000-7000-8000-00000000000a",
  eventType: "post.published",
  failureReason: null,
  id: "00000000-0000-7000-8000-00000000000b",
  lastAttemptAt: at("2026-11-10T09:00:01Z"),
  nextAttemptAt: null,
  redeliveryOf: null,
  responseExcerpt: null,
  responseStatus: 204,
  status: "succeeded",
  workspaceExternalId: null,
  workspaceId: "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f",
};

describe(EndpointItemView, () => {
  it("shows an endpoint that is on: its address, what it is for and its events", async () => {
    const html = await render(
      "en",
      <ul>
        <EndpointItemView
          endpoint={on}
          actions={<button type="button">Edit</button>}
        />
      </ul>
    );

    expect(
      missingFrom(html, [
        "https://hooks.example.com/peal?source=test",
        "Synthetic receiver",
        ">On<",
        "A post goes live on a channel",
        "post.failed",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("turned it off");
  });

  it("says when and why Peal turned an endpoint off", async () => {
    const [english, french] = await Promise.all([
      render("en", <EndpointItemView endpoint={failing} />),
      render("fr", <EndpointItemView endpoint={failing} />),
    ]);

    expect(english).toContain(">Off<");
    expect(english).toContain(
      "Peal turned it off on Nov 8, 2026: every delivery had failed for 5 days. Fix the receiver, then turn it back on."
    );
    expect(english).toContain("A channel must be reconnected");
    expect(french).toContain(">Désactivé<");
    expect(french).toContain(
      "Peal l’a désactivé le 8 nov. 2026 : toutes les livraisons échouaient depuis 5 jours."
    );
  });

  it("warns while every delivery fails, and while two secrets sign", async () => {
    const html = await render(
      "en",
      <EndpointItemView
        endpoint={{
          ...on,
          failingSince: at("2026-11-09T08:15:00Z"),
          previousSecretExpiresAt: at("2026-11-11T09:00:00Z"),
        }}
      />
    );

    expect(html).toContain(
      "Every delivery has failed since Nov 9, 2026 at 8:15 AM. After 5 days of failures, Peal turns the endpoint off."
    );
    expect(html).toContain(
      "The secret before the last rotation still signs deliveries until Nov 11, 2026 at 9:00 AM."
    );
  });
});

describe(WebhookSecretView, () => {
  it("shows the secret once, to copy, and says it is not shown again", async () => {
    const html = await render(
      "en",
      <WebhookSecretView
        rotated={false}
        secret="whsec_c3ludGhldGljLXNlY3JldC1mb3ItdGVzdHM="
        onDone={noop}
      />
    );

    expect(html).toContain(
      'value="whsec_c3ludGhldGljLXNlY3JldC1mb3ItdGVzdHM="'
    );
    expect(html).toContain("it is not shown again");
    expect(html).toContain("Copy");
    expect(html).toContain("I saved it");
  });

  it("names a rotated secret as the new one, in French", async () => {
    const html = await render(
      "fr",
      <WebhookSecretView rotated secret="whsec_c3ludGhldGlj" onDone={noop} />
    );

    expect(html).toContain("Le nouveau secret de signature");
    expect(html).toContain("il ne sera plus affiché");
  });
});

describe(DeliveryLogView, () => {
  const pending: WebhookDelivery = {
    ...delivery,
    attempts: 2,
    completedAt: null,
    durationMs: 15_000,
    error: "timeout",
    id: "00000000-0000-7000-8000-00000000000c",
    nextAttemptAt: at("2026-11-10T09:05:05Z"),
    responseStatus: null,
    status: "pending",
  };

  const failed: WebhookDelivery = {
    ...delivery,
    attempts: 8,
    eventType: "webhook.test",
    failureReason: "exhausted",
    id: "00000000-0000-7000-8000-00000000000d",
    responseExcerpt: '{"error": "signature mismatch"}',
    responseStatus: 401,
    status: "failed",
  };

  it("shows a row for each delivery, whatever its status", async () => {
    const html = await render(
      "en",
      <DeliveryLogView
        deliveries={[delivery, pending, failed]}
        actionFor={({ id }) => (
          <button type="button" data-delivery={id}>
            Send again
          </button>
        )}
      />
    );

    expect(
      missingFrom(html, [
        "Delivered",
        "HTTP 204",
        "182 ms",
        "1 of 8",
        "Pending",
        "No answer in time",
        "Next attempt Nov 10, 2026 at 9:05 AM",
        "Failed",
        "Every attempt failed",
        "HTTP 401",
        "{&quot;error&quot;: &quot;signature mismatch&quot;}",
        "Test event",
        'data-delivery="00000000-0000-7000-8000-00000000000d"',
      ])
    ).toStrictEqual([]);
  });

  it("writes the statuses in French", async () => {
    const html = await render(
      "fr",
      <DeliveryLogView deliveries={[delivery, pending, failed]} />
    );

    expect(html).toContain("Livrée");
    expect(html).toContain("En attente");
    expect(html).toContain("Échouée");
    expect(html).toContain("2 sur 8");
  });
});

describe(EndpointFieldsView, () => {
  it("explains a refused address above the fields", async () => {
    const [english, french] = await Promise.all([
      render(
        "en",
        <EndpointFieldsView
          channels={[]}
          draft={{ ...emptyDraft, url: "https://10.0.0.8/hooks" }}
          error={{ key: "urlRefused", reason: "notPublic" }}
          disabled={false}
          idPrefix="new"
          withEnabled
          onChange={noop}
        />
      ),
      render(
        "fr",
        <EndpointFieldsView
          channels={[]}
          draft={emptyDraft}
          error={{ key: "urlRefused", reason: "notHttps" }}
          disabled={false}
          idPrefix="new"
          withEnabled
          onChange={noop}
        />
      ),
    ]);

    expect(english).toContain('role="alert"');
    expect(english).toContain(
      "The address’s host is not public, so Peal does not send requests to it."
    );
    expect(english).toContain('value="https://10.0.0.8/hooks"');
    expect(english).toContain("All events");
    expect(french).toContain(
      "L’adresse doit être en HTTPS, sur le port par défaut."
    );
  });

  it("says how many endpoints a workspace may have", async () => {
    const html = await render(
      "en",
      <EndpointFieldsView
        channels={[]}
        draft={emptyDraft}
        error={{ allowed: 10, key: "tooMany" }}
        disabled={false}
        idPrefix="new"
        withEnabled={false}
        onChange={noop}
      />
    );

    expect(html).toContain(
      "The workspace already has 10 endpoints, the most it may. Delete one first."
    );
  });
});

describe("an endpoint's filters, in the views", () => {
  it("offers the channels, and the workspaces of a partner endpoint", async () => {
    const [english, french] = await Promise.all(
      (["en", "fr"] as const).map(
        async (locale) =>
          await render(
            locale,
            <EndpointFieldsView
              channels={[
                {
                  id: "00000000-0000-7000-8000-0000000000c1",
                  label: "@peal_example",
                },
              ]}
              draft={{ ...emptyDraft, scope: "partner" }}
              error={null}
              disabled={false}
              idPrefix="edit"
              withEnabled={false}
              onChange={noop}
            />
          )
      )
    );

    expect(
      missingFrom(english ?? "", [
        "Only these channels",
        "@peal_example",
        "Only these workspaces",
      ])
    ).toStrictEqual([]);
    expect(
      missingFrom(french ?? "", [
        "Seulement ces chaînes",
        "Seulement ces espaces de travail",
      ])
    ).toStrictEqual([]);
  });

  it("shows the channels it hears that are no longer connected, ticked, to take off", async () => {
    const [english, french] = await Promise.all(
      (["en", "fr"] as const).map(
        async (locale) =>
          await render(
            locale,
            <EndpointFieldsView
              channels={[]}
              draft={{
                ...emptyDraft,
                channelIds: new Set(["00000000-0000-7000-8000-0000000000c2"]),
              }}
              error={null}
              disabled={false}
              idPrefix="edit"
              withEnabled={false}
              onChange={noop}
            />
          )
      )
    );

    expect(
      missingFrom(english ?? "", [
        "A channel no longer connected (00000000-0000-7000-8000-0000000000c2)",
        "edit-webhook-channel-00000000-0000-7000-8000-0000000000c2",
        "Untick a channel no longer connected to stop filtering on it.",
      ])
    ).toStrictEqual([]);
    expect(
      missingFrom(french ?? "", [
        "Une chaîne qui n’est plus connectée (00000000-0000-7000-8000-0000000000c2)",
      ])
    ).toStrictEqual([]);
  });

  it("says what an endpoint listens to", async () => {
    const html = await render(
      "en",
      <EndpointItemView
        endpoint={{
          ...on,
          channelIds: ["00000000-0000-7000-8000-0000000000c1"],
          scope: "partner",
          workspaceIds: ["5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"],
        }}
      />
    );

    expect(
      missingFrom(html, [
        "Only events about 1 channel, and those about no channel",
        "Only 1 workspace",
      ])
    ).toStrictEqual([]);
  });

  it("names each delivery's endpoint in the log across endpoints", async () => {
    const html = await render(
      "fr",
      <DeliveryLogView
        deliveries={[delivery]}
        endpointOf={() => "hooks.example.com"}
      />
    );

    expect(
      missingFrom(html, ["Point de terminaison", "hooks.example.com"])
    ).toStrictEqual([]);
  });
});
