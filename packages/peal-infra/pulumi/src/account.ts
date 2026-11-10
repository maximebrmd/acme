import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import type { AccountSettings } from "./settings.ts";

/** Addresses on the domain, each forwarded to the owner's mailbox. */
const forwardedLocals = ["hello", "notifications"] as const;

/**
 * What the whole Cloudflare account shares, whatever the environment: the
 * Access policies the environments' applications use, and the addresses
 * Email Routing forwards. The owner's address is a secret of the stack.
 */
export class PealAccount extends pulumi.ComponentResource {
  readonly forwardedAddresses: readonly pulumi.Output<string>[];
  readonly ownerPolicyId: pulumi.Output<string>;
  readonly publicCallbacksPolicyId: pulumi.Output<string>;

  constructor(
    name: string,
    settings: AccountSettings,
    ownerEmail: pulumi.Output<string>,
    options?: pulumi.ComponentResourceOptions
  ) {
    super("peal:cloudflare:Account", name, {}, options);
    const { accountId, domain, zoneId } = settings;

    // The resources were made at the stack's root before this component:
    // the alias keeps them, rather than making them again.
    const child = (protect: boolean): pulumi.CustomResourceOptions => ({
      aliases: [{ parent: pulumi.rootStackResource }],
      parent: this,
      protect,
    });

    const ownerPolicy = new cloudflare.ZeroTrustAccessPolicy(
      "owner-only",
      {
        accountId,
        decision: "allow",
        includes: [{ email: { email: ownerEmail } }],
        name: `${settings.ownerName} only`,
      },
      child(true)
    );

    // The paths that outside services call, open to everyone on an
    // environment otherwise behind Access (peal_access_bypass_paths).
    const publicCallbacksPolicy = new cloudflare.ZeroTrustAccessPolicy(
      "public-callbacks",
      {
        accountId,
        decision: "bypass",
        includes: [{ everyone: {} }],
        name: "Public callbacks",
      },
      child(true)
    );

    const forwards = forwardedLocals.map(
      (local) =>
        new cloudflare.EmailRoutingRule(
          `forward-${local}`,
          {
            actions: [{ type: "forward", values: [ownerEmail] }],
            enabled: true,
            matchers: [
              { field: "to", type: "literal", value: `${local}@${domain}` },
            ],
            name: local,
            zoneId,
          },
          child(false)
        )
    );

    this.forwardedAddresses = forwards.map((rule) =>
      rule.matchers.apply((matchers) => matchers[0]?.value ?? "")
    );
    this.ownerPolicyId = ownerPolicy.id;
    this.publicCallbacksPolicyId = publicCallbacksPolicy.id;
    this.registerOutputs({
      forwardedAddresses: this.forwardedAddresses,
      ownerPolicyId: this.ownerPolicyId,
      publicCallbacksPolicyId: this.publicCallbacksPolicyId,
    });
  }
}
