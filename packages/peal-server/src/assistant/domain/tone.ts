import { Schema } from "effect";

/** The tones the assistant can rewrite a post in. */
export const ToneSchema = Schema.Literals([
  "professional",
  "friendly",
  "casual",
  "enthusiastic",
  "witty",
]);

export type Tone = typeof ToneSchema.Type;

/** Each tone, as the instructions describe it to the model. */
export const toneDescriptions: Readonly<Record<Tone, string>> = {
  casual: "casual: relaxed and conversational, as one would talk to a friend",
  enthusiastic:
    "enthusiastic: energetic and upbeat, without piling up exclamation marks",
  friendly: "friendly: warm, approachable and personal",
  professional: "professional: clear, confident and polished",
  witty: "witty: clever and light, with a touch of humour",
};
