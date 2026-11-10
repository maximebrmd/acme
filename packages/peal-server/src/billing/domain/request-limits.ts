import { Duration } from "effect";

/**
 * How many acknowledgements one email address is sent in a day. Past it,
 * requests naming the address are still recorded, and left to staff: the
 * form never floods someone's mailbox.
 */
export const acknowledgementsPerDay = 5;

/** The day over which `acknowledgementsPerDay` counts. */
export const acknowledgementWindow = Duration.days(1);

/** How long the link sent to a request's address applies it. */
export const confirmationLifetime = Duration.days(30);

/**
 * How long a request is left to its own run before the sweep looks at it:
 * what the mail or Stripe could not take then is tried again.
 */
export const catchUpDelay = Duration.minutes(2);

/**
 * How long the sweep keeps asking Stripe to apply a request Stripe does
 * not answer for. Past it, or at once when Stripe refuses the request
 * itself, the request is left to staff and its sender told a person will
 * look: it never waits unseen.
 */
export const applyingPatience = Duration.hours(24);

/**
 * How long the sweep keeps trying to send an acknowledgement the mail
 * does not take. Past it, the acknowledgement is withheld, and a request
 * that needed its link is left to staff.
 */
export const acknowledgingPatience = Duration.days(7);

/** How many requests staff see, and the sweep takes, at once. */
export const requestBatch = 200;
