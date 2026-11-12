// The sample file the import screen offers: three rows of made-up text,
// dated next year in the reader's zone, on a placeholder the reader
// replaces with a channel's id. Written here, never read: the server is
// the one reader of CSV.

/** What the reader replaces with one of the workspace's channel ids. */
export const channelPlaceholder = "CHANNEL_ID";

// A cell, between double quotes when it holds a comma, a quote or a line
// break, each quote doubled (RFC 4180).
const cell = (value: string): string =>
  /[\n\r",]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

export const sampleCsv = ({
  texts,
  timeZone,
  year,
}: {
  readonly texts: readonly [string, string, string];
  readonly timeZone: string;
  /** The current year: the rows go out the next one. */
  readonly year: number;
}): string => {
  const days = ["05", "12", "19"];

  const rows = texts.map((text, index) =>
    [
      cell(text),
      channelPlaceholder,
      `${String(year + 1)}-01-${days[index] ?? "05"} 09:00`,
      cell(timeZone),
    ].join(",")
  );

  return [["text", "channels", "at", "time_zone"].join(","), ...rows, ""].join(
    "\r\n"
  );
};
