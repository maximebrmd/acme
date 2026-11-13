import { describe, expect, it } from "@effect/vitest";

import { agents, endpointOf, genericSetupOf, setupOf } from "#home/agents.ts";

const endpoint = endpointOf("https://peal.example.com/");

describe("the agents' setup", () => {
  it("puts the endpoint at /api/mcp of the address Peal is opened at", () => {
    expect(endpoint).toBe("https://peal.example.com/api/mcp");
    expect(endpointOf("http://localhost:3001")).toBe(
      "http://localhost:3001/api/mcp"
    );
  });

  it("gives each assistant the endpoint in its own form, and never a key", () => {
    for (const agent of agents) {
      const { text } = setupOf(agent, endpoint);

      expect(text).toContain(endpoint);
      expect(text).not.toMatch(/key|token|secret/iu);
    }
  });

  it("writes each command and configuration as its assistant reads it", () => {
    expect(setupOf("claudeCode", endpoint)).toStrictEqual({
      kind: "command",
      text: "claude mcp add --transport http peal https://peal.example.com/api/mcp",
    });
    expect(JSON.parse(setupOf("cursor", endpoint).text)).toStrictEqual({
      mcpServers: { peal: { url: endpoint } },
    });
    expect(JSON.parse(setupOf("windsurf", endpoint).text)).toStrictEqual({
      mcpServers: { peal: { serverUrl: endpoint } },
    });
    expect(setupOf("vsCode", endpoint).text).toBe(
      `code --add-mcp '{"name":"peal","type":"http","url":"${endpoint}"}'`
    );
    expect(setupOf("chatgpt", endpoint)).toStrictEqual({
      kind: "address",
      text: endpoint,
    });
  });

  it("gives other clients the configuration peal mcp prints", () => {
    expect(JSON.parse(genericSetupOf(endpoint))).toStrictEqual({
      mcpServers: { peal: { type: "http", url: endpoint } },
    });
  });
});
