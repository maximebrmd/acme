import { describe, expect, it } from "bun:test";

import { everything, outsideProjects, plan } from "./ci-plan.ts";

const roots = [
  "packages/peal-contract",
  "packages/peal-docker",
  "packages/peal-docs",
  "packages/peal-e2e",
  "packages/peal-infra/ansible",
  "packages/peal-infra/pulumi",
  "packages/peal-sdk",
  "packages/peal-sdk/node",
  "packages/peal-server",
  "packages/peal-site",
  "packages/peal-web",
];

const none = { ansible: false, e2e: false, sdks: false, server: false };

describe("the CI plan", () => {
  it("runs no long job for a change to the site alone", () => {
    expect(
      plan({
        affected: ["peal-site"],
        files: ["packages/peal-site/src/pages/index.astro"],
        roots,
      })
    ).toEqual(none);
  });

  it("runs the server's tests, Ansible's and the end-to-end run for a server change", () => {
    expect(
      plan({
        affected: ["peal-server", "peal-e2e"],
        files: ["packages/peal-server/src/main.ts"],
        roots,
      })
    ).toEqual({ ansible: true, e2e: true, sdks: false, server: true });
  });

  it("runs the SDKs for a contract change, which the project graph does not link", () => {
    expect(
      plan({
        affected: ["peal-contract", "peal-server", "peal-e2e", "peal-web"],
        files: ["packages/peal-contract/src/index.ts"],
        roots,
      }).sdks
    ).toBe(true);
  });

  it("runs the SDKs for a change to one SDK", () => {
    expect(
      plan({
        affected: ["peal-sdk-node"],
        files: ["packages/peal-sdk/node/src/index.ts"],
        roots,
      })
    ).toEqual({ ...none, sdks: true });
  });

  it("runs the server's tests for a docs change, since one of them reads the docs", () => {
    expect(
      plan({
        affected: ["peal-docs"],
        files: ["packages/peal-docs/docs/index.mdx"],
        roots,
      })
    ).toEqual({ ...none, server: true });
  });

  it("runs the server's tests and the end-to-end run when the compose file changes", () => {
    expect(
      plan({
        affected: ["peal-docker"],
        files: ["packages/peal-docker/compose.yaml"],
        roots,
      })
    ).toEqual({ ansible: true, e2e: true, sdks: false, server: true });
  });

  it("runs every job for a change outside every project", () => {
    const change = { affected: [], files: [".github/workflows/ci.yml"], roots };
    expect(outsideProjects(change)).toEqual([".github/workflows/ci.yml"]);
    expect(plan(change)).toEqual(everything);
  });

  it("runs no long job for prose outside every project", () => {
    expect(
      plan({
        affected: [],
        files: [
          "AGENTS.md",
          ".github/CONTRIBUTING.md",
          "packages/peal-infra/DEPLOYMENT.md",
        ],
        roots,
      })
    ).toEqual(none);
  });

  it("runs Ansible's tests for DESIGN.md, which the uptime page's test reads", () => {
    expect(plan({ affected: [], files: ["DESIGN.md"], roots })).toEqual({
      ...none,
      ansible: true,
    });
  });

  it("does not take a project for another whose name it starts", () => {
    expect(
      outsideProjects({
        affected: [],
        files: ["packages/peal-sdk-extra/file.ts"],
        roots,
      })
    ).toEqual(["packages/peal-sdk-extra/file.ts"]);
  });
});
