import { describe, expect, it } from "@effect/vitest";
import { Duration } from "effect";
import {
  ConnectFailureReasonSchema,
  ConnectLinkLocaleSchema,
  connectLinkRetentionDays,
  defaultConnectLinkHours,
  HostedConnectFailureSchema,
  maxConnectLinkHours,
  maxConnectLinkStarts,
  maxPendingConnectLinks,
  maxReturnUrlLength,
  minConnectLinkHours,
} from "peal-contract";

import { HostedFailureReasonSchema } from "#channels/application/hosted-connect-failed.ts";
import {
  defaultLinkLifetime,
  linkRetention,
  maxLinkHours,
  maxLinkStarts,
  maxPendingLinks,
  minLinkHours,
} from "#channels/domain/connect-link.ts";
import { LocaleSchema } from "#shared/domain/locale.ts";
import { maxReturnUrlLength as domainMaxReturnUrlLength } from "#workspace/domain/return-origin.ts";

// The SDKs, the web app's hosted page and the docs read the contract's
// copy of the connect links' rules. These keep it equal to the server's.
describe("the contract", () => {
  it("states the limits the server applies to connect links", () => {
    expect({
      defaultHours: defaultConnectLinkHours,
      maxHours: maxConnectLinkHours,
      minHours: minConnectLinkHours,
      pending: maxPendingConnectLinks,
      retentionDays: connectLinkRetentionDays,
      returnUrl: maxReturnUrlLength,
      starts: maxConnectLinkStarts,
    }).toStrictEqual({
      defaultHours: Duration.toHours(defaultLinkLifetime),
      maxHours: maxLinkHours,
      minHours: minLinkHours,
      pending: maxPendingLinks,
      retentionDays: Duration.toDays(linkRetention),
      returnUrl: domainMaxReturnUrlLength,
      starts: maxLinkStarts,
    });
  });

  it("names why a hosted page connects nothing as the server does", () => {
    expect(HostedConnectFailureSchema.literals).toStrictEqual(
      HostedFailureReasonSchema.literals
    );
    // Every reason a member's own connection fails for is one of them.
    expect(HostedConnectFailureSchema.literals).toStrictEqual(
      expect.arrayContaining([...ConnectFailureReasonSchema.literals])
    );
  });

  it("writes hosted pages in the languages Peal speaks", () => {
    expect(ConnectLinkLocaleSchema.literals).toStrictEqual(
      LocaleSchema.literals
    );
  });
});
