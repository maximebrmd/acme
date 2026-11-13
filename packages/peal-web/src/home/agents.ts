/** The AI assistants the workspace's home shows how to connect. */
export type Agent =
  | "chatgpt"
  | "claude"
  | "claudeCode"
  | "cursor"
  | "geminiCli"
  | "vsCode"
  | "windsurf";

/**
 * How an assistant takes Peal: a command to run, a configuration to paste
 * into its file of MCP servers, or the address alone (a connector added in
 * its settings).
 */
export type SetupKind = "address" | "command" | "configuration";

export interface Setup {
  readonly kind: SetupKind;
  /** What the copy button copies. */
  readonly text: string;
}

/** The order the home lists them in. */
export const agents: readonly Agent[] = [
  "claude",
  "claudeCode",
  "chatgpt",
  "cursor",
  "vsCode",
  "geminiCli",
  "windsurf",
];

/**
 * The MCP endpoint of the Peal a browser has open: `/api/mcp` at the
 * address the person opens Peal at (the docs' "The endpoint").
 */
export const endpointOf = (origin: string): string =>
  `${origin.replace(/\/+$/u, "")}/api/mcp`;

const setups: Readonly<Record<Agent, (endpoint: string) => Setup>> = {
  chatgpt: (endpoint) => ({ kind: "address", text: endpoint }),
  claude: (endpoint) => ({ kind: "address", text: endpoint }),
  claudeCode: (endpoint) => ({
    kind: "command",
    text: `claude mcp add --transport http peal ${endpoint}`,
  }),
  cursor: (endpoint) => ({
    kind: "configuration",
    text: JSON.stringify({ mcpServers: { peal: { url: endpoint } } }),
  }),
  geminiCli: (endpoint) => ({
    kind: "command",
    text: `gemini mcp add --transport http peal ${endpoint}`,
  }),
  vsCode: (endpoint) => ({
    kind: "command",
    text: `code --add-mcp '${JSON.stringify({ name: "peal", type: "http", url: endpoint })}'`,
  }),
  windsurf: (endpoint) => ({
    kind: "configuration",
    text: JSON.stringify({ mcpServers: { peal: { serverUrl: endpoint } } }),
  }),
};

/**
 * What to give an assistant to reach the endpoint, in the form its own
 * documentation asks for a remote server over HTTP. Each signs in with
 * OAuth on its first request: no key is ever part of it.
 */
export const setupOf = (agent: Agent, endpoint: string): Setup =>
  setups[agent](endpoint);

/** The configuration most other MCP clients take, as `peal mcp` prints it. */
export const genericSetupOf = (endpoint: string): string =>
  JSON.stringify(
    { mcpServers: { peal: { type: "http", url: endpoint } } },
    null,
    2
  );
