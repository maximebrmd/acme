import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import type { AccountSettings, UptimeSettings } from "./settings.ts";

/** Addresses on the domain, each forwarded to the owner's mailbox. */
const forwardedLocals = [
  "hello",
  "maxime",
  "notifications",
  "sandbox",
] as const;

/**
 * The uptime server's records, which Cloudflare does not proxy: the server
 * and its status page answer when Cloudflare does not, and Caddy's TLS-ALPN
 * challenge reaches it (the Ansible project's README, "The status page").
 * The status page's name is a CNAME to the server's, so a new address
 * changes the A and AAAA records alone. The addresses stay out of Git, a
 * secret setting of the stack, and secret in the state.
 */
const uptimeRecords = (
  uptime: UptimeSettings,
  domain: string,
  zoneId: string,
  options: pulumi.CustomResourceOptions
): cloudflare.DnsRecord[] => {
  const uptimeName = `${uptime.hostname}.${domain}`;

  const record = (
    resourceName: string,
    type: string,
    name: string,
    content: pulumi.Input<string>
  ) =>
    new cloudflare.DnsRecord(
      resourceName,
      { content, name, proxied: false, ttl: 1, type, zoneId },
      options
    );

  return [
    record("uptime-a", "A", uptimeName, pulumi.secret(uptime.ipv4)),
    ...(uptime.ipv6 === undefined
      ? []
      : [
          record("uptime-aaaa", "AAAA", uptimeName, pulumi.secret(uptime.ipv6)),
        ]),
    record(
      "status-cname",
      "CNAME",
      `${uptime.statusHostname}.${domain}`,
      uptimeName
    ),
  ];
};

/**
 * What the whole Cloudflare account shares, whatever the environment: the
 * Access policies the environments' applications use, the addresses
 * Email Routing forwards, and the uptime server's records, once it exists.
 * The owner's address is a secret of the stack.
 */
export class PealAccount extends pulumi.ComponentResource {
  readonly blueskyHandleRecord: cloudflare.DnsRecord | undefined;
  readonly forwardedAddresses: readonly pulumi.Output<string>[];
  readonly ownerPolicyId: pulumi.Output<string>;
  readonly publicCallbacksPolicyId: pulumi.Output<string>;
  readonly uptimeRecords: readonly cloudflare.DnsRecord[];

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

    // Records route traffic: protected, as the environments' are.
    this.uptimeRecords =
      settings.uptime === undefined
        ? []
        : uptimeRecords(settings.uptime, domain, zoneId, {
            parent: this,
            protect: true,
          });

    // The domain is the handle of Peal's Bluesky account: Bluesky reads the
    // account's DID from this record.
    this.blueskyHandleRecord =
      settings.blueskyDid === undefined
        ? undefined
        : new cloudflare.DnsRecord(
            "bluesky-handle",
            {
              content: `"did=${settings.blueskyDid}"`,
              name: `_atproto.${domain}`,
              proxied: false,
              ttl: 1,
              type: "TXT",
              zoneId,
            },
            { parent: this }
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
