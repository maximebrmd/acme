/**
 * What a `User-Agent` holds, in lower case, when an automated reader sends
 * the request: crawlers, link previews, monitors and command-line tools.
 * A judgement, not a standard: what platforms' readers call themselves
 * changes, so a count is approximate. It decides counting only, never the
 * redirect.
 */
export const automatedReaderMarkers: readonly string[] = [
  "bot",
  "crawler",
  "spider",
  "preview",
  "externalhit",
  "facebookexternal",
  "embedly",
  "slurp",
  "curl",
  "wget",
  "python-requests",
  "httpclient",
  "headless",
  "monitor",
];

/** What a request to a short link says, for counting it. */
export interface VisitRequest {
  readonly method: string;
  /** `Purpose` or `Sec-Purpose`, as sent. */
  readonly purpose: string | undefined;
  readonly userAgent: string | undefined;
}

/**
 * Whether a request counts as a click: a `GET` that names a `User-Agent`
 * holding none of `automatedReaderMarkers`, and that is no prefetch or
 * preview (`Sec-Purpose` or `Purpose` naming `prefetch` or `preview`).
 */
export const isCountedVisit = ({
  method,
  purpose,
  userAgent,
}: VisitRequest): boolean => {
  if (method !== "GET" || userAgent === undefined || userAgent.trim() === "") {
    return false;
  }

  const asked = (purpose ?? "").toLowerCase();

  if (asked.includes("prefetch") || asked.includes("preview")) {
    return false;
  }

  const agent = userAgent.toLowerCase();

  return !automatedReaderMarkers.some((marker) => agent.includes(marker));
};
