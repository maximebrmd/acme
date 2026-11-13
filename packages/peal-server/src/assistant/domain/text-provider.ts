import { Schema } from "effect";

import {
  ProviderAddressSchema,
  ProviderModelSchema,
} from "./image-provider.ts";

/**
 * The API a workspace's text provider speaks, as `PEAL_AI_PROVIDER` names
 * the server's: Anthropic's Messages API (`POST {base}/v1/messages`), or
 * an OpenAI-compatible endpoint (`POST {base}/chat/completions`).
 */
export const TextProviderKindSchema = Schema.Literals([
  "anthropic",
  "openai-compatible",
]);

export type TextProviderKind = typeof TextProviderKindSchema.Type;

/**
 * Where Anthropic's API is reached, which its paths (`/v1/messages`)
 * follow: what clients offer for an `anthropic` provider.
 */
export const anthropicAddress = "https://api.anthropic.com";

/**
 * How many requests a workspace may send its own text provider each UTC
 * day, whatever each ends with: none of them is Peal's, so this bounds
 * only the workspace's hold on the server (a request may wait 90 seconds
 * for an answer), not what it costs.
 */
export const ownTextRequestsPerDay = 500;

/**
 * The settings of the text provider a workspace brought: the API it
 * speaks, its address, its model and when they were saved. Its key is
 * kept apart, sealed, and never part of them.
 */
export class TextProviderSettings extends Schema.Class<TextProviderSettings>(
  "peal-server/assistant/domain/TextProviderSettings"
)({
  baseUrl: ProviderAddressSchema,
  kind: TextProviderKindSchema,
  model: ProviderModelSchema,
  updatedAt: Schema.DateTimeUtc,
}) {}
