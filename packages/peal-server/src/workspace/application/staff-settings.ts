import { Context, Layer } from "effect";

/** What this server requires of its staff, as its settings say. */
export class StaffSettings extends Context.Service<
  StaffSettings,
  {
    /**
     * Whether the staff console is refused to staff whose own account does
     * not have two-step verification on.
     */
    readonly twoStepRequired: boolean;
  }
>()("peal-server/workspace/application/StaffSettings") {
  /** For tests: two-step verification required of staff, or not. */
  static readonly layerTest = (twoStepRequired: boolean) =>
    Layer.succeed(StaffSettings, StaffSettings.of({ twoStepRequired }));
}
