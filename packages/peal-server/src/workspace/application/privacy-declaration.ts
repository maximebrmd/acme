import { Context } from "effect";

import type { OperatorDeclaration } from "#workspace/domain/operator-declaration.ts";

/**
 * What the export's information block needs that only this server's
 * settings tell: what its operator declared about the processing (who the
 * controller is, its sub-processors, its supervisory authority), and
 * whether the server bills, so billing's records are described only where
 * they exist. Read once, when the server starts.
 */
export class PrivacyDeclaration extends Context.Service<
  PrivacyDeclaration,
  {
    readonly bills: boolean;
    readonly declared: OperatorDeclaration;
  }
>()("peal-server/workspace/application/PrivacyDeclaration") {}
