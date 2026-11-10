import { Schema } from "effect";

import type { EngagementAbility } from "./engagement-abilities.ts";

/**
 * What a member asks the channel's account to do about a comment. Each
 * sets a state on the platform (hidden or not, liked or not, gone), so
 * asking twice changes nothing more.
 */
export const ModerationActionSchema = Schema.Literals([
  "hide",
  "unhide",
  "like",
  "unlike",
  "delete",
]);

export type ModerationAction = typeof ModerationActionSchema.Type;

const abilities: Readonly<Record<ModerationAction, EngagementAbility>> = {
  delete: "delete",
  hide: "hide",
  like: "like",
  unhide: "hide",
  unlike: "like",
};

/** The ability an action takes. */
export const abilityFor = (action: ModerationAction): EngagementAbility =>
  abilities[action];
