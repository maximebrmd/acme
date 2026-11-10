import { describe, expect, it } from "@effect/vitest";
import { Cause, Exit, Option } from "effect";
import {
  Forbidden,
  TooManyWebhookEndpoints,
  WebhookDeliveryNotFound,
  WebhookEndpointDisabled,
  WebhookEndpointNotFound,
  WebhooksNotConfigured,
  WebhookUrlRefused,
} from "peal-contract";

import { webhookErrorOf } from "#webhooks/errors.ts";

describe(webhookErrorOf, () => {
  it("is none for a call that worked", () => {
    expect(webhookErrorOf(Exit.succeed("done"))).toStrictEqual(Option.none());
  });

  it("keeps how many endpoints a workspace may have", () => {
    expect(
      webhookErrorOf(Exit.fail(new TooManyWebhookEndpoints({ allowed: 10 })))
    ).toStrictEqual(Option.some({ allowed: 10, key: "tooMany" }));
  });

  it("keeps why an address is refused", () => {
    expect(
      webhookErrorOf(Exit.fail(new WebhookUrlRefused({ reason: "notPublic" })))
    ).toStrictEqual(Option.some({ key: "urlRefused", reason: "notPublic" }));
  });

  it.each([
    [new Forbidden(), "forbidden"],
    [new WebhookEndpointNotFound(), "notFound"],
    [new WebhookDeliveryNotFound(), "deliveryNotFound"],
    [new WebhookEndpointDisabled(), "endpointDisabled"],
    [new WebhooksNotConfigured(), "notConfigured"],
    [{ _tag: "Unauthenticated" }, "unknown"],
  ])("explains %o as %s", (failure, key) => {
    expect(webhookErrorOf(Exit.fail(failure))).toStrictEqual(
      Option.some({ key })
    );
  });

  it("calls anything but the API's errors unknown", () => {
    expect(webhookErrorOf(Exit.failCause(Cause.die("offline")))).toStrictEqual(
      Option.some({ key: "unknown" })
    );
  });
});
