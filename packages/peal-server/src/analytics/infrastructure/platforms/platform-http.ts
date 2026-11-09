import type { HttpClient, HttpClientError } from "effect/http";

import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

/** The HTTP client readers send through: the public one. */
export type PlatformHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;
