import { Context, Layer } from "effect";

/** How this server opens partner accounts, as its settings say. */
export class PartnerSettings extends Context.Service<
  PartnerSettings,
  {
    /**
     * Whether a workspace's owners and admins may open a partner account
     * themselves. Otherwise only the server's staff open one.
     */
    readonly selfService: boolean;
  }
>()("peal-server/workspace/application/PartnerSettings") {
  /** For tests: partner accounts opened by staff only, or by anyone. */
  static readonly layerTest = (selfService: boolean) =>
    Layer.succeed(PartnerSettings, PartnerSettings.of({ selfService }));
}
