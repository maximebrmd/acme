import type { Channel } from "acme-contract";
import { DateTime } from "effect";

/** An instant as the command line prints it: ISO 8601, in UTC. */
export const instant = (at: DateTime.Utc): string =>
  DateTime.formatIso(at).replace(/\.\d{3}Z$/u, "Z");

const excerptLength = 60;

/** A post's text on one line, cut short. */
export const excerpt = (text: string): string => {
  const line = text.replaceAll(/\s+/gu, " ").trim();

  if (line === "") {
    return "(no text)";
  }

  return line.length > excerptLength
    ? `${line.slice(0, excerptLength - 1)}…`
    : line;
};

/** A count the platform may not give: a dash for none. */
export const count = (value: number | null): string =>
  value === null ? "–" : String(value);

/** Rows as aligned columns, two spaces apart. */
export const columns = (rows: readonly (readonly string[])[]): string[] => {
  const widths: number[] = [];

  for (const row of rows) {
    for (const [index, cell] of row.entries()) {
      widths[index] = Math.max(widths[index] ?? 0, cell.length);
    }
  }

  return rows.map((row) =>
    row
      .map((cell, index) =>
        index === row.length - 1 ? cell : cell.padEnd(widths[index] ?? 0)
      )
      .join("  ")
      .trimEnd()
  );
};

/** A channel as people recognize it: its platform and handle. */
export const channelName = (channel: Channel): string =>
  `${channel.platform} ${channel.handle}`;
