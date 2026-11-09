import type { ClientErrorReport } from "peal-contract";

/** How many reports a page sends at most, however many errors it meets. */
export const maxReportsPerPage = 10;

/**
 * Sends each report once: the same error met again, as in a render loop,
 * is not sent twice, and a page sends `maxReportsPerPage` at most.
 */
export const makeReporter = (send: (report: ClientErrorReport) => void) => {
  const seen = new Set<string>();

  return (report: ClientErrorReport): void => {
    const key = `${report.kind}\n${report.message}\n${report.path}`;

    if (seen.size >= maxReportsPerPage || seen.has(key)) {
      return;
    }

    seen.add(key);
    send(report);
  };
};
