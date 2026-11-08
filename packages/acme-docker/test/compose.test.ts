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

describe("server.Dockerfile", () => {
  const bunVersion = read("..", "..", "..", ".bun-version").trim();

  it("builds on the workspace's Bun version", () => {
    const bases = instructions("FROM").map((from) => from.split(" ").at(0));

    const prefix = `oven/bun:${bunVersion}-`;

    expect(bases.length).toBeGreaterThan(0);

    expect(
      bases.filter((base) => base?.startsWith(prefix) !== true)
    ).toStrictEqual([]);
  });

  it("runs as a user without privileges", () => {
    expect(instructions("USER").at(-1)).toBe("nonroot");
  });
});
