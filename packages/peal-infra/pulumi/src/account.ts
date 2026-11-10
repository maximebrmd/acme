import * as cloudflare from "@pulumi/cloudflare";
import type * as pulumi from "@pulumi/pulumi";

import type { AccountSettings } from "./settings.ts";

/** Addresses on the domain, each forwarded to the owner's mailbox. */
const forwardedAddresses = ["hello", "notifications"] as const;

export interface Account {
  readonly forwardedAddresses: readonly pulumi.Output<string>[];
  readonly ownerPolicyId: pulumi.Output<string>;
  readonly publicCallbacksPolicyId: pulumi.Output<string>;
}

/**
 * What the whole Cloudflare account shares, whatever the environment: the
 * Access policies the environments' applications use, and the addresses
 * Email Routing forwards. The owner's address is a secret of the stack.
 */
export const account = (
  settings: AccountSettings,
  ownerEmail: pulumi.Output<string>
): Account => {
  const { accountId, domain, zoneId } = settings;

  const ownerPolicy = new cloudflare.ZeroTrustAccessPolicy("owner-only", {
    accountId,
    decision: "allow",
    includes: [{ email: { email: ownerEmail } }],
    name: `${settings.ownerName} only`,
  });

  // The paths that outside services call, open to everyone on an
  // environment otherwise behind Access (peal_access_bypass_paths).
  const publicCallbacksPolicy = new cloudflare.ZeroTrustAccessPolicy(
    "public-callbacks",
    {
      accountId,
      decision: "bypass",
      includes: [{ everyone: {} }],
      name: "Public callbacks",
    }
  );

  const forwards = forwardedAddresses.map(
    (local) =>
      new cloudflare.EmailRoutingRule(`forward-${local}`, {
        actions: [{ type: "forward", values: [ownerEmail] }],
        enabled: true,
        matchers: [
          { field: "to", type: "literal", value: `${local}@${domain}` },
        ],
        name: local,
        zoneId,
      })
  );

  return {
    forwardedAddresses: forwards.map((rule) =>
      rule.matchers.apply((matchers) => matchers[0]?.value ?? "")
    ),
    ownerPolicyId: ownerPolicy.id,
    publicCallbacksPolicyId: publicCallbacksPolicy.id,
  };
};
