import { defineMeta } from "blume";

// The MCP endpoint. The order holds in both languages;
// fr/developers/mcp/meta.ts gives the French label.
export const shared = {
  icon: "plug",
  pages: ["index", "tools"],
  title: "MCP",
} as const;

export default defineMeta(shared);
