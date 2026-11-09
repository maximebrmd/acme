/** A URL as the command line prints it: without its trailing slash. */
export const display = (url: URL): string => url.href.replace(/\/$/u, "");
