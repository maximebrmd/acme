import { createHmac } from "node:crypto";

import { describe, expect, it } from "@effect/vitest";

import { signedContent, signedHeaders } from "#webhooks/domain/signature.ts";

// The example of the Standard Webhooks specification, "Signature scheme".
const message = {
  body: '{"type":"contact.created","timestamp":"2022-11-03T20:26:10.344522Z","data":{"id":"1f81eb52-5198-4599-803e-771906343485"}}',
  id: "msg_2KWPBgLlAfxdpx2AI54pPJ85f4W",
  timestamp: 1_674_087_231,
};

describe(signedContent, () => {
  it("joins the id, the timestamp and the body with full stops", () => {
    expect(signedContent(message)).toBe(
      'msg_2KWPBgLlAfxdpx2AI54pPJ85f4W.1674087231.{"type":"contact.created","timestamp":"2022-11-03T20:26:10.344522Z","data":{"id":"1f81eb52-5198-4599-803e-771906343485"}}'
    );
  });
});

describe(signedHeaders, () => {
  it("names the event, the attempt's time and each signature", () => {
    const mac = (key: string) =>
      createHmac("sha256", Buffer.from(key, "base64"))
        .update(signedContent(message))
        .digest("base64");

    const current = mac("MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw");
    const previous = mac("c2VjcmV0LWJlZm9yZS10aGUtcm90YXRpb24h");

    expect(signedHeaders(message, [current, previous])).toStrictEqual({
      "webhook-id": "msg_2KWPBgLlAfxdpx2AI54pPJ85f4W",
      "webhook-signature": `v1,${current} v1,${previous}`,
      "webhook-timestamp": "1674087231",
    });
  });
});
