import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import type { LinkDomainSettings } from "./settings.ts";

/**
 * The zone settings the short-link domain keeps: HTTPS alone (a short link
 * is written https://, and a visitor who types http:// is sent there), TLS
 * 1.2 at least, and the origin's certificate checked. The tunnel carries
 * the request from the edge to the server, so the last one holds whatever
 * the origin is.
 */
const zoneSettings = {
  always_use_https: "on",
  min_tls_version: "1.2",
  ssl: "strict",
} as const;

/**
 * The short-link domain (peal.link): a zone of its own, so a platform that
 * frowns on a host that redirects marks it and never the host people sign
 * in at. Every environment's short-link host name is on it (each
 * environment's stack makes its record, to its tunnel), so what applies to
 * the whole zone is here, in the account's project:
 *
 * - the zone itself, which Cloudflare Registrar made: imported, never made
 *   again (README.md, "Adopting what exists"), and kept when its resource
 *   goes;
 * - DNSSEC, whose DS record Cloudflare Registrar publishes by itself;
 * - the zone settings above;
 * - mail: the domain sends and receives none, which a null MX (RFC 7505),
 *   an SPF record that allows no sender and a DMARC policy that rejects
 *   everything say, so no one can send mail in its name;
 * - routing: the bare domain sends visitors to the site, with a 302 so
 *   browsers keep nothing should it get a page of its own; every other path
 *   is rewritten from /<code> to /api/l/<code>, the server's redirect
 *   route. The tunnel then serves /api/l/ and seven letters and digits
 *   alone, and answers 404 to anything else (the Ansible project's
 *   cloudflared role), so a path that is no code says it is not a link,
 *   rather than landing on the site as a link that works.
 */
export class PealLinkDomain extends pulumi.ComponentResource {
  readonly dnssec: cloudflare.ZoneDnssec;
  readonly mail: readonly cloudflare.DnsRecord[];
  readonly redirect: cloudflare.Ruleset;
  readonly rewrite: cloudflare.Ruleset;
  readonly settings: readonly cloudflare.ZoneSetting[];
  readonly zone: cloudflare.Zone;
  readonly zoneId: pulumi.Output<string>;

  constructor(
    name: string,
    settings: LinkDomainSettings,
    options?: pulumi.ComponentResourceOptions
  ) {
    super("peal:cloudflare:LinkDomain", name, {}, options);
    const { accountId, domain, linkDomain } = settings;

    const child = (protect: boolean): pulumi.CustomResourceOptions => ({
      parent: this,
      protect,
    });

    // Imported at its id with PEAL_PULUMI_IMPORT, and protected: up refuses
    // to delete it, and removing it from here leaves it at Cloudflare.
    this.zone = new cloudflare.Zone(
      "link-zone",
      { account: { id: accountId }, name: linkDomain, type: "full" },
      { ...child(true), retainOnDelete: true }
    );
    const zoneId = this.zone.id;

    this.dnssec = new cloudflare.ZoneDnssec(
      "link-dnssec",
      { status: "active", zoneId },
      child(true)
    );

    this.settings = Object.entries(zoneSettings).map(
      ([settingId, value]) =>
        new cloudflare.ZoneSetting(
          `link-setting-${settingId}`,
          { settingId, value, zoneId },
          child(false)
        )
    );

    const record = (
      resourceName: string,
      args: Omit<cloudflare.DnsRecordArgs, "ttl" | "zoneId">
    ) =>
      new cloudflare.DnsRecord(
        resourceName,
        { ...args, ttl: 1, zoneId },
        child(false)
      );

    this.mail = [
      record("link-mail-null-mx", {
        content: ".",
        name: linkDomain,
        priority: 0,
        type: "MX",
      }),
      record("link-mail-spf", {
        content: '"v=spf1 -all"',
        name: linkDomain,
        type: "TXT",
      }),
      record("link-mail-dmarc", {
        content: '"v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s"',
        name: `_dmarc.${linkDomain}`,
        type: "TXT",
      }),
    ];

    // A zone has one ruleset per phase: both stay here, for every host name
    // of the zone.
    this.redirect = new cloudflare.Ruleset(
      "link-redirect",
      {
        description: "The bare short-link domain leads to the site",
        kind: "zone",
        name: "Short-link domain redirects",
        phase: "http_request_dynamic_redirect",
        rules: [
          {
            action: "redirect",
            actionParameters: {
              fromValue: {
                preserveQueryString: false,
                statusCode: 302,
                targetUrl: { value: `https://${domain}/` },
              },
            },
            description: "The bare domain to the site",
            expression: `(http.host eq "${linkDomain}" and http.request.uri.path eq "/")`,
          },
        ],
        zoneId,
      },
      child(true)
    );

    this.rewrite = new cloudflare.Ruleset(
      "link-rewrite",
      {
        description: "A short link's path, to the server's redirect route",
        kind: "zone",
        name: "Short-link domain rewrites",
        phase: "http_request_transform",
        rules: [
          {
            action: "rewrite",
            actionParameters: {
              uri: {
                path: { expression: 'concat("/api/l", http.request.uri.path)' },
              },
            },
            description: "/<code> to /api/l/<code>",
            expression: '(http.request.uri.path ne "/")',
          },
        ],
        zoneId,
      },
      child(true)
    );

    this.zoneId = zoneId;
    this.registerOutputs({ zoneId });
  }
}
