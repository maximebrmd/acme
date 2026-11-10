import { Schema } from "effect";

/**
 * The requests a boost is made of, in the order they are sent. The three
 * `create` steps make objects that are paused and spend nothing; the
 * `activate` steps turn them on from the innermost out, and only the last,
 * `activateCampaign`, starts spending. `pause` and `resume` set the
 * campaign's state, which holds everything under it.
 *
 * Stored in the journal: add one, never rename one.
 */
export const SpendStepSchema = Schema.Literals([
  "createCampaign",
  "createAdSet",
  "createAd",
  "activateAd",
  "activateAdSet",
  "activateCampaign",
  "pause",
  "resume",
]);

export type SpendStep = typeof SpendStepSchema.Type;

/**
 * How a journalled request ended:
 *
 * - `done`: the network confirmed it.
 * - `refused`: the network answered that nothing changed.
 * - `found`: no answer came, and looking the object up found it done.
 * - `absent`: no answer came, and looking it up found it not done.
 * - `unknown`: no answer came, and looking it up could not tell.
 *
 * A row without an outcome is a request cut short: it is looked up before
 * anything else is sent.
 */
export const SpendOutcomeSchema = Schema.Literals([
  "done",
  "refused",
  "found",
  "absent",
  "unknown",
]);

export type SpendOutcome = typeof SpendOutcomeSchema.Type;
