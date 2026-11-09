// The rules the stacks and the images keep, checked without Docker: ports on
// 127.0.0.1 only, exact image versions, a health check on every service,
// production services that restart and a server that gets 75 seconds to
// stop, and images on the workspace's Bun and Node versions that run without
// privileges.
import { readFileSync } from "node:fs";
import path from "node:path";

import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const read = (...segments: readonly string[]): string =>
  readFileSync(path.join(import.meta.dirname, ...segments), "utf-8");

// Short volume syntax is a string; the long syntax, image mounts included, is
// an object.
const Mount = Schema.Struct({ source: Schema.String, type: Schema.String });

const isMount = Schema.is(Mount);

const Volume = Schema.Union([Schema.String, Mount]);

const ServiceSchema = Schema.Struct({
  build: Schema.optionalKey(Schema.Struct({ dockerfile: Schema.String })),
  healthcheck: Schema.optionalKey(
    Schema.Struct({ test: Schema.NonEmptyArray(Schema.String) })
  ),
  image: Schema.String,
  ports: Schema.optionalKey(Schema.Array(Schema.String)),
  restart: Schema.optionalKey(Schema.String),
  stop_grace_period: Schema.optionalKey(Schema.String),
  volumes: Schema.optionalKey(Schema.Array(Volume)),
});

type Service = typeof ServiceSchema.Type;

const Compose = Schema.Struct({
  services: Schema.Record(Schema.String, ServiceSchema),
});

const servicesOf = (file: string): [string, Service][] =>
  Object.entries(
    Schema.decodeUnknownSync(Compose)(
      // Merge keys share settings between services.
      parse(read("..", file), { merge: true })
    ).services
  );

const development = servicesOf("compose.yaml");
const production = servicesOf("compose.production.yaml");
const selfHost = servicesOf("compose.self-host.yaml");

// An exact version: a tag with a digit in it, never a moving name like latest.
const isPinned = (image: string): boolean => {
  const tag = image.split("@").at(0)?.split(":").at(1) ?? "";

  return /\d/u.test(tag) && !tag.startsWith("latest");
};

// A tag for reading, then the digest that fixes the bytes.
const isPinnedByDigest = (image: string): boolean =>
  /^[^@\s]+:[^@\s]+@sha256:[\da-f]{64}$/u.test(image);

const mountedImages = (service: Service): string[] =>
  (service.volumes ?? [])
    .filter(isMount)
    .filter((mount) => mount.type === "image")
    .map((mount) => mount.source);

const publicPorts = (service: Service): string[] =>
  (service.ports ?? []).filter((port) => !port.startsWith("127.0.0.1:"));

const healthTest = (service: Service): string | undefined =>
  service.healthcheck?.test.at(0);

describe("compose.yaml", () => {
  it("defines services", () => {
    expect(development.length).toBeGreaterThan(0);
  });

  it.each(development)("%s pins an exact image version", (_name, service) => {
    expect(service.image).toSatisfy(isPinned);
  });

  it.each(development)("%s pins the images it mounts", (_name, service) => {
    expect(
      mountedImages(service).filter((image) => !isPinned(image))
    ).toStrictEqual([]);
  });

  it.each(development)(
    "%s publishes ports on 127.0.0.1 only",
    (_name, service) => {
      expect(publicPorts(service)).toStrictEqual([]);
    }
  );

  it.each(development)("%s has a health check", (_name, service) => {
    expect(healthTest(service)).toMatch(/^CMD(?:-SHELL)?$/u);
  });
});

describe("compose.production.yaml", () => {
  it("defines services", () => {
    expect(production.length).toBeGreaterThan(0);
  });

  // Acme's own images are built from this repository, and tagged with the
  // release (acme-infra) or `local`; Postgres's changes only with its image.
  it.each(production)(
    "%s builds its image here or pins it by digest",
    (name, service) => {
      const version =
        name === "postgres" ? "ACME_POSTGRES_VERSION" : "ACME_VERSION";

      expect(
        service.build === undefined
          ? isPinnedByDigest(service.image)
          : service.image === `acme-${name}:\${${version}:-local}`
      ).toBeTruthy();
    }
  );

  it.each(production)(
    "%s pins the images it mounts by digest",
    (_name, service) => {
      expect(
        mountedImages(service).filter((image) => !isPinnedByDigest(image))
      ).toStrictEqual([]);
    }
  );

  // So production runs the versions the development stack is used with.
  it.each(production.filter(([, service]) => service.build === undefined))(
    "%s runs the image development runs",
    (name, service) => {
      const image = development.find(([other]) => other === name)?.[1].image;

      expect(service.image.split("@").at(0)).toBe(image);
    }
  );

  it.each(production)(
    "%s publishes ports on 127.0.0.1 only",
    (_name, service) => {
      expect(publicPorts(service)).toStrictEqual([]);
    }
  );

  it.each(production)("%s has a health check", (_name, service) => {
    expect(healthTest(service)).toMatch(/^CMD(?:-SHELL)?$/u);
  });

  it.each(production)("%s restarts unless stopped", (_name, service) => {
    expect(service.restart).toBe("unless-stopped");
  });

  // The server waits up to 60 seconds for platform calls in flight.
  it("gives the server 75 seconds to stop", () => {
    const server = production.find(([name]) => name === "server")?.[1];

    expect(server?.stop_grace_period).toBe("75s");
  });
});

describe("compose.self-host.yaml", () => {
  it.each(selfHost)("%s pins its image by digest", (_name, service) => {
    expect(service.image).toSatisfy(isPinnedByDigest);
  });

  it.each(selfHost)("%s has a health check", (_name, service) => {
    expect(healthTest(service)).toMatch(/^CMD(?:-SHELL)?$/u);
  });

  it("opens only Caddy's HTTP and HTTPS ports to the world", () => {
    const opened = selfHost.flatMap(([name, service]) =>
      publicPorts(service).map((port) => `${name} ${port}`)
    );

    expect(opened).toStrictEqual([
      "caddy 80:80",
      "caddy 443:443",
      "caddy 443:443/udp",
    ]);
  });
});

const bunVersion = read("..", "..", "..", ".bun-version").trim();

// The Node version CI runs, which builds and runs the web app.
const nodeVersion =
  /node-version: (?<version>\S+)/u.exec(
    read("..", "..", "..", ".github", "workflows", "ci.yml")
  )?.groups?.["version"] ?? "";

const dockerfiles = [
  "server.Dockerfile",
  "web.Dockerfile",
  "static.Dockerfile",
  "postgres.Dockerfile",
];

const instructionsOf =
  (dockerfile: string) =>
  (keyword: string): string[] =>
    dockerfile
      .split("\n")
      .filter((line) => line.startsWith(`${keyword} `))
      .map((line) => line.slice(keyword.length + 1).trim());

const basesOf = (file: string): string[] =>
  instructionsOf(read("..", file))("FROM").map(
    (from) => from.split(" ").at(0) ?? ""
  );

describe.each(dockerfiles)("%s", (file) => {
  const dockerfile = read("..", file);
  const instructions = instructionsOf(dockerfile);
  const bases = basesOf(file);

  it("pins its base images by digest", () => {
    expect(bases.length).toBeGreaterThan(0);

    expect(bases.filter((base) => !isPinnedByDigest(base))).toStrictEqual([]);
  });

  // COPY --from=<image> brings files from an image, as FROM does.
  it("pins the images it copies from by digest", () => {
    const stages = new Set(
      instructions("FROM").flatMap((from) => {
        const alias = / AS (?<alias>\S+)$/iu.exec(from)?.groups?.["alias"];

        return alias === undefined ? [] : [alias];
      })
    );

    const copied = instructions("COPY").flatMap((copy) => {
      const source = /--from=(?<source>\S+)/u.exec(copy)?.groups?.["source"];

      return source === undefined || stages.has(source) ? [] : [source];
    });

    expect(copied.filter((image) => !isPinnedByDigest(image))).toStrictEqual(
      []
    );
  });

  it("pins its BuildKit frontend by digest", () => {
    const syntax = dockerfile.split("\n").at(0) ?? "";

    expect(syntax.replace("# syntax=", "")).toSatisfy(isPinnedByDigest);
  });

  it("uses the workspace's Bun and CI's Node", () => {
    const runtimes = bases.filter((base) => /^(?:oven\/bun|node):/u.test(base));

    expect(
      runtimes.filter(
        (base) =>
          !base.startsWith(`oven/bun:${bunVersion}-`) &&
          !base.startsWith(`node:${nodeVersion}-`)
      )
    ).toStrictEqual([]);
  });
});

// Postgres's entrypoint starts as root and drops to the postgres user itself.
describe.each(dockerfiles.filter((file) => file !== "postgres.Dockerfile"))(
  "%s",
  (file) => {
    it("runs as a user without privileges", () => {
      const user = instructionsOf(read("..", file))("USER").at(-1);

      expect(user).toBeDefined();

      expect(["root", "0"]).not.toContain(user);
    });
  }
);

describe("server.Dockerfile", () => {
  it("builds on the workspace's Bun version", () => {
    expect(
      basesOf("server.Dockerfile").filter(
        (base) => !base.startsWith(`oven/bun:${bunVersion}-`)
      )
    ).toStrictEqual([]);
  });

  it("ships ffprobe, which probes videos", () => {
    expect(
      instructionsOf(read("..", "server.Dockerfile"))("COPY").some((copy) =>
        copy.endsWith(" /usr/local/bin/ffprobe")
      )
    ).toBeTruthy();
  });
});

describe("web.Dockerfile", () => {
  // The standalone server leaves .next/static out.
  it("copies Next's static files beside the server", () => {
    expect(
      instructionsOf(read("..", "web.Dockerfile"))("COPY").some((copy) =>
        copy.endsWith(" packages/acme-web/.next/static")
      )
    ).toBeTruthy();
  });
});
