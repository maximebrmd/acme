/**
 * How many of the day's assistant requests an image costs: an image costs
 * a provider far more than a suggestion, and the workspace's daily
 * allowance is the one both draw on.
 */
export const imageRequestCost = 5;

/**
 * The largest image the assistant takes from a provider: the largest image
 * the media library stores (a test keeps the two equal).
 */
export const maxImageBytes = 16 * 1024 * 1024;

/**
 * How many images are made at once: two a workspace and eight a server,
 * each holding an image in memory for up to the call's time. Past either,
 * a request is refused at once, to be asked again in a moment.
 */
export const imagesAtOnce = { perServer: 8, perWorkspace: 2 } as const;
