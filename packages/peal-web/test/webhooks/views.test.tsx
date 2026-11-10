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
  createdAt: at("2026-11-01T09:00:00Z"),
  description: "Synthetic receiver",
  disabledAt: null,
  disabledReason: null,
  enabled: true,
  eventTypes: ["post.published", "post.failed"],
  failingSince: null,
  id: "00000000-0000-7000-8000-000000000001",
  previousSecretExpiresAt: null,
  scope: "workspace",
  updatedAt: at("2026-11-01T09:00:00Z"),
  url: "https://hooks.example.com/peal?source=test",
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
  error: null,
  eventId: "00000000-0000-7000-8000-00000000000a",
  eventType: "post.published",
  failureReason: null,
  id: "00000000-0000-7000-8000-00000000000b",
  lastAttemptAt: at("2026-11-10T09:00:01Z"),
  nextAttemptAt: null,
  responseExcerpt: null,
  responseStatus: 204,
  status: "succeeded",
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
