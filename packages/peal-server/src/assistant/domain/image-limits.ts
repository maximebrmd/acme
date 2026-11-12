/**
 * How many of the day's assistant requests an image costs: an image costs
 * a provider far more than a suggestion, and the workspace's daily
 * allowance is the one both draw on.
 */
export const imageRequestCost = 5;

/**
 * How many of the day's requests images may take while the workspace's
 * plan is on trial: none, as on the free plan. A trial needs no card, so
 * images made during one would be paid by nobody. The one place to change
 * if trials should make images.
 */
export const imageRequestsOnTrial = 0;

/**
 * The largest image the assistant takes from a provider: the largest image
 * the media library stores (a test keeps the two equal).
 */
export const maxImageBytes = 16 * 1024 * 1024;

/**
 * How many images are made at once: two a workspace and eight a server,
 * each holding an image in memory for up to the call's time. Past either,
 * a request is refused at once, to be asked again in a moment. Images of
 * the server's model and of workspaces' own providers each have slots of
 * their own, these many: an endpoint that never answers holds only its
 * own kind's.
 */
export const imagesAtOnce = { perServer: 8, perWorkspace: 2 } as const;

/**
 * How many images a workspace's own provider is asked for each UTC day,
 * whatever each ends with: they spend none of Peal's allowance, so this
 * bounds what a workspace holds of the server's slots and memory for
 * free. The one place to change it.
 */
export const ownImagesPerDay = 50;
