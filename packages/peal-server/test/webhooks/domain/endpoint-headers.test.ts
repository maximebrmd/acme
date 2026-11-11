import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

import {
  EndpointHeadersSchema,
  HeaderNameSchema,
  HeaderValueSchema,
  maxHeaderNameLength,
  maxHeaderValueLength,
  refusedHeaderNames,
} from "#webhooks/domain/endpoint-headers.ts";

const isName = Schema.is(HeaderNameSchema);

const isValue = Schema.is(HeaderValueSchema);

const areHeaders = Schema.is(EndpointHeadersSchema);

const header = (name: string, value = "synthetic-value") => ({ name, value });

describe("an endpoint's headers", () => {
  it("take a name that is an HTTP token, authorization included", () => {
    const taken = [
      "Authorization",
      "X-Gateway-Token",
      "x_route",
      "a".repeat(maxHeaderNameLength),
    ];

    const refused = [
      "",
      "a".repeat(maxHeaderNameLength + 1),
      "With Space",
      "colon:",
      "Ünicode",
    ];

    expect(taken.filter((name) => !isName(name))).toStrictEqual([]);
    expect(refused.filter(isName)).toStrictEqual([]);
  });

  it("refuse the names Peal sets, those of the connection, and any webhook- name, whatever their case", () => {
    const refused = [
      ...refusedHeaderNames,
      ...refusedHeaderNames.map((name) => name.toUpperCase()),
      "Webhook-Signature",
      "webhook-anything",
      "Content-Type",
      "Host",
      "Transfer-Encoding",
    ];

    expect(refused.filter(isName)).toStrictEqual([]);
  });

  it("take a value of visible ASCII, spaces inside it, without a line break", () => {
    const taken = [
      "Bearer synthetic-token",
      "x",
      "a".repeat(maxHeaderValueLength),
    ];

    const refused = [
      "",
      " leading",
      "trailing ",
      "line\nbreak",
      "line\r\nX-Injected: 1",
      "tab\tinside",
      "nul\u0000inside",
      "half \uD83D pair",
      "é",
      "a".repeat(maxHeaderValueLength + 1),
    ];

    expect(taken.filter((value) => !isValue(value))).toStrictEqual([]);
    expect(refused.filter(isValue)).toStrictEqual([]);
  });

  it("are five at most, each name once whatever its case", () => {
    const five = ["A", "B", "C", "D", "E"].map((name) => header(name));

    expect(areHeaders(five)).toBeTruthy();
    expect(areHeaders([...five, header("F")])).toBeFalsy();
    expect(
      areHeaders([header("Authorization"), header("authorization", "other")])
    ).toBeFalsy();
    expect(areHeaders([])).toBeTruthy();
  });
});
