/**
 * The host an endpoint's deliveries go to, to name the endpoint by: its
 * address may be long, and its path may hold a secret of the receiver's.
 */
export const hostOf = (url: string): string =>
  URL.canParse(url) ? new URL(url).host : url;
