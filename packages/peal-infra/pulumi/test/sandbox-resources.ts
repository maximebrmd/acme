/**
 * Every resource the sandbox's stack makes, as the mocks record it for the
 * settings of environment.test.ts: its type, its name (what the state knows
 * it by) and its inputs. The sandbox is applied, so a change here is a
 * change its preview shows: an input that moves updates or replaces the
 * resource, a name that moves deletes it and makes it again. Change this
 * only with a change the sandbox is meant to take.
 */
export const sandboxResources = [
  {
    inputs: {
      accountId: "account-synthetic",
      destinations: [
        {
          type: "public",
          uri: "sandbox.example.test",
        },
        {
          type: "public",
          uri: "sandbox-site.example.test",
        },
        {
          type: "public",
          uri: "sandbox-docs.example.test",
        },
        {
          type: "public",
          uri: "sandbox.short.test",
        },
      ],
      domain: "sandbox.example.test",
      name: "Peal sandbox",
      policies: [
        {
          id: "owner-policy",
          precedence: 1,
        },
      ],
      sessionDuration: "24h",
      type: "self_hosted",
    },
    name: "access-app",
    type: "cloudflare:index/zeroTrustAccessApplication:ZeroTrustAccessApplication",
  },
  {
    inputs: {
      accountId: "account-synthetic",
      destinations: [
        {
          type: "public",
          uri: "sandbox.example.test/api/channels/oauth",
        },
        {
          type: "public",
          uri: "sandbox.example.test/api/auth/stripe/webhook",
        },
        {
          type: "public",
          uri: "sandbox.example.test/api/data-deletion",
        },
      ],
      domain: "sandbox.example.test/api/channels/oauth",
      name: "Peal sandbox callbacks",
      policies: [
        {
          id: "callbacks-policy",
          precedence: 1,
        },
      ],
      sessionDuration: "24h",
      type: "self_hosted",
    },
    name: "access-callbacks",
    type: "cloudflare:index/zeroTrustAccessApplication:ZeroTrustAccessApplication",
  },
  {
    inputs: {
      accountId: "account-synthetic",
      destinations: [
        {
          type: "public",
          uri: "sandbox-grafana.example.test",
        },
      ],
      domain: "sandbox-grafana.example.test",
      name: "Peal sandbox Grafana",
      policies: [
        {
          id: "owner-policy",
          precedence: 1,
        },
      ],
      sessionDuration: "24h",
      type: "self_hosted",
    },
    name: "access-grafana",
    type: "cloudflare:index/zeroTrustAccessApplication:ZeroTrustAccessApplication",
  },
  {
    inputs: {
      accountId: "account-synthetic",
      destinations: [
        {
          type: "public",
          uri: "sandbox-ssh.example.test",
        },
      ],
      domain: "sandbox-ssh.example.test",
      name: "Peal sandbox SSH",
      policies: [
        {
          id: "owner-policy",
          precedence: 1,
        },
      ],
      sessionDuration: "24h",
      type: "self_hosted",
    },
    name: "access-ssh",
    type: "cloudflare:index/zeroTrustAccessApplication:ZeroTrustAccessApplication",
  },
  {
    inputs: {
      accountId: "account-synthetic",
      jurisdiction: "eu",
      name: "peal-sandbox-backups",
    },
    name: "bucket-backups",
    type: "cloudflare:index/r2Bucket:R2Bucket",
  },
  {
    inputs: {
      accountId: "account-synthetic",
      jurisdiction: "eu",
      name: "peal-sandbox-media",
    },
    name: "bucket-media",
    type: "cloudflare:index/r2Bucket:R2Bucket",
  },
  {
    inputs: {
      accountId: "account-synthetic",
      bucketName: "peal-sandbox-media",
      jurisdiction: "eu",
      rules: [
        {
          allowed: {
            headers: ["content-type", "if-none-match"],
            methods: ["PUT"],
            origins: ["https://sandbox.example.test"],
          },
          maxAgeSeconds: 3600,
        },
      ],
    },
    name: "cors-media",
    type: "cloudflare:index/r2BucketCors:R2BucketCors",
  },
  {
    inputs: {},
    name: "environment",
    type: "peal:cloudflare:Environment",
  },
  {
    inputs: {
      content: "tunnel-id.cfargotunnel.com",
      name: "sandbox.example.test",
      proxied: true,
      ttl: 1,
      type: "CNAME",
      zoneId: "zone-synthetic",
    },
    name: "hostname-app",
    type: "cloudflare:index/dnsRecord:DnsRecord",
  },
  {
    inputs: {
      content: "tunnel-id.cfargotunnel.com",
      name: "sandbox-docs.example.test",
      proxied: true,
      ttl: 1,
      type: "CNAME",
      zoneId: "zone-synthetic",
    },
    name: "hostname-docs",
    type: "cloudflare:index/dnsRecord:DnsRecord",
  },
  {
    inputs: {
      content: "tunnel-id.cfargotunnel.com",
      name: "sandbox-grafana.example.test",
      proxied: true,
      ttl: 1,
      type: "CNAME",
      zoneId: "zone-synthetic",
    },
    name: "hostname-grafana",
    type: "cloudflare:index/dnsRecord:DnsRecord",
  },
  {
    inputs: {
      content: "tunnel-id.cfargotunnel.com",
      name: "sandbox.short.test",
      proxied: true,
      ttl: 1,
      type: "CNAME",
      zoneId: "link-zone-synthetic",
    },
    name: "hostname-short-links",
    type: "cloudflare:index/dnsRecord:DnsRecord",
  },
  {
    inputs: {
      content: "tunnel-id.cfargotunnel.com",
      name: "sandbox-site.example.test",
      proxied: true,
      ttl: 1,
      type: "CNAME",
      zoneId: "zone-synthetic",
    },
    name: "hostname-site",
    type: "cloudflare:index/dnsRecord:DnsRecord",
  },
  {
    inputs: {
      content: "tunnel-id.cfargotunnel.com",
      name: "sandbox-ssh.example.test",
      proxied: true,
      ttl: 1,
      type: "CNAME",
      zoneId: "zone-synthetic",
    },
    name: "hostname-ssh",
    type: "cloudflare:index/dnsRecord:DnsRecord",
  },
  {
    inputs: {
      accountId: "account-synthetic",
      name: "peal-sandbox-backups-key",
      policies: [
        {
          effect: "allow",
          permissionGroups: [
            {
              id: "2efd5506f9c8494dacb1fa10a3e7d5b6",
            },
          ],
          resources:
            '{"com.cloudflare.edge.r2.bucket.account-synthetic_eu_peal-sandbox-backups":"*"}',
        },
      ],
    },
    name: "key-backups",
    type: "cloudflare:index/accountToken:AccountToken",
  },
  {
    inputs: {
      accountId: "account-synthetic",
      name: "peal-sandbox-media-key",
      policies: [
        {
          effect: "allow",
          permissionGroups: [
            {
              id: "2efd5506f9c8494dacb1fa10a3e7d5b6",
            },
          ],
          resources:
            '{"com.cloudflare.edge.r2.bucket.account-synthetic_eu_peal-sandbox-media":"*"}',
        },
      ],
    },
    name: "key-media",
    type: "cloudflare:index/accountToken:AccountToken",
  },
  {
    inputs: {
      accountId: "account-synthetic",
      bucketName: "peal-sandbox-backups",
      jurisdiction: "eu",
      rules: [
        {
          abortMultipartUploadsTransition: {
            condition: {
              maxAge: 7 * 86_400,
              type: "Age",
            },
          },
          conditions: {
            prefix: "",
          },
          enabled: true,
          id: "Default Multipart Abort Rule",
        },
      ],
    },
    name: "lifecycle-backups",
    type: "cloudflare:index/r2BucketLifecycle:R2BucketLifecycle",
  },
  {
    inputs: {
      accountId: "account-synthetic",
      bucketName: "peal-sandbox-media",
      jurisdiction: "eu",
      rules: [
        {
          abortMultipartUploadsTransition: {
            condition: {
              maxAge: 86_400,
              type: "Age",
            },
          },
          conditions: {
            prefix: "",
          },
          enabled: true,
          id: "abort-incomplete-uploads",
        },
        {
          conditions: {
            prefix: "erasures/",
          },
          deleteObjectsTransition: {
            condition: {
              maxAge: 42 * 86_400,
              type: "Age",
            },
          },
          enabled: true,
          id: "expire-erasures",
        },
      ],
    },
    name: "lifecycle-media",
    type: "cloudflare:index/r2BucketLifecycle:R2BucketLifecycle",
  },
  {
    inputs: {
      accountId: "account-synthetic",
      configSrc: "local",
      name: "peal-sandbox",
    },
    name: "tunnel",
    type: "cloudflare:index/zeroTrustTunnelCloudflared:ZeroTrustTunnelCloudflared",
  },
];
