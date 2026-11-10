import { Option } from "effect";
import { describe, expect, it } from "vitest";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import { limitSubjectOf } from "#workspace/domain/limit-subject.ts";
import {
  PartnerIdSchema,
  PartnerKeyIdSchema,
} from "#workspace/domain/partner-id.ts";
import { PartnerKeyPrincipal } from "#workspace/domain/partner-key-principal.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

const userId = UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

describe("what a principal's requests are counted under", () => {
  it("counts a key by its id, a partner key included, and an application by itself and its user", () => {
    expect(
      limitSubjectOf(
        new ApiKeyPrincipal({
          apiKeyId: "synthetic-key",
          permissions: [],
          workspaceId: WorkspaceIdSchema.make(
            "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"
          ),
        })
      )
    ).toStrictEqual(Option.some("key:synthetic-key"));

    // One count for a partner key, whichever workspace it acts in.
    expect(
      limitSubjectOf(
        new PartnerKeyPrincipal({
          partnerId: PartnerIdSchema.make(
            "0195d2c0-0000-7000-8000-0000000000a1"
          ),
          partnerKeyId: PartnerKeyIdSchema.make(
            "0195d2c0-0000-7000-8000-0000000000a2"
          ),
          permissions: [],
          scopes: [],
        })
      )
    ).toStrictEqual(
      Option.some("partner-key:0195d2c0-0000-7000-8000-0000000000a2")
    );

    expect(
      limitSubjectOf(
        new UserPrincipal({
          impersonatedBy: Option.none(),
          oauth: Option.some({
            clientId: "peal-cli",
            scopes: ["workspace:read"],
            workspaceId: Option.none(),
          }),
          userId,
        })
      )
    ).toStrictEqual(Option.some(`oauth:peal-cli:${userId}`));
  });

  it("does not count a person in their own session", () => {
    expect(
      limitSubjectOf(
        new UserPrincipal({ impersonatedBy: Option.none(), userId })
      )
    ).toStrictEqual(Option.none());
  });
});
