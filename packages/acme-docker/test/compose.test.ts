// The rules the stack and the images keep, checked without Docker: ports on
// 127.0.0.1 only, exact image versions, a health check on every service, and a
// server image on the workspace's Bun version that runs without privileges.
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

const Service = Schema.Struct({
  healthcheck: Schema.optionalKey(
    Schema.Struct({ test: Schema.NonEmptyArray(Schema.String) })
  ),
  image: Schema.String,
  ports: Schema.optionalKey(Schema.Array(Schema.String)),
  volumes: Schema.optionalKey(Schema.Array(Volume)),
});

const Compose = Schema.Struct({
  services: Schema.Record(Schema.String, Service),
});

const compose = Schema.decodeUnknownSync(Compose)(
  // Merge keys share the health check timings between services.
  parse(read("..", "compose.yaml"), { merge: true })
);

const services = Object.entries(compose.services);

// An exact version: a tag with a digit in it, never a moving name like latest.
const isPinned = (image: string): boolean => {
  const tag = image.split(":").at(1) ?? "";

  return /\d/u.test(tag) && !tag.startsWith("latest");
};

const dockerfile = read("..", "server.Dockerfile");

const instructions = (keyword: string): string[] =>
  dockerfile
    .split("\n")
    .filter((line) => line.startsWith(`${keyword} `))
    .map((line) => line.slice(keyword.length + 1).trim());

describe("compose.yaml", () => {
  it("defines services", () => {
    expect(services.length).toBeGreaterThan(0);
  });

  it.each(services)("%s pins an exact image version", (_name, service) => {
    expect(service.image).toSatisfy(isPinned);
  });

  it.each(services)("%s pins the images it mounts", (_name, service) => {
    const images = (service.volumes ?? [])
      .filter(isMount)
      .filter((mount) => mount.type === "image")
      .map((mount) => mount.source);

    expect(images.filter((image) => !isPinned(image))).toStrictEqual([]);
  });

  it.each(services)(
    "%s publishes ports on 127.0.0.1 only",
    (_name, service) => {
      const ports = service.ports ?? [];

      expect(
        ports.filter((port) => !port.startsWith("127.0.0.1:"))
      ).toStrictEqual([]);
    }
  );

  it.each(services)("%s has a health check", (_name, service) => {
    expect(service.healthcheck?.test.at(0)).toMatch(/^CMD(?:-SHELL)?$/u);
  });
});

// A tag for reading, then the digest that fixes the bytes.
const isPinnedByDigest = (image: string): boolean =>
  /^[^@\s]+:[^@\s]+@sha256:[\da-f]{64}$/u.test(image);

describe("server.Dockerfile", () => {
  const bunVersion = read("..", "..", "..", ".bun-version").trim();

  const bases = instructions("FROM").map((from) => from.split(" ").at(0) ?? "");

  it("builds on the workspace's Bun version", () => {
    const prefix = `oven/bun:${bunVersion}-`;

    expect(bases.length).toBeGreaterThan(0);

    expect(bases.filter((base) => !base.startsWith(prefix))).toStrictEqual([]);
  });

  it("pins its base images by digest", () => {
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

  it("ships ffprobe, which probes videos", () => {
    expect(
      instructions("COPY").some((copy) =>
        copy.endsWith(" /usr/local/bin/ffprobe")
      )
    ).toBeTruthy();
  });

  it("pins its BuildKit frontend by digest", () => {
    const syntax = dockerfile.split("\n").at(0) ?? "";

    expect(syntax.replace("# syntax=", "")).toSatisfy(isPinnedByDigest);
  });

  it("runs as a user without privileges", () => {
    expect(instructions("USER").at(-1)).toBe("nonroot");
  });
});
