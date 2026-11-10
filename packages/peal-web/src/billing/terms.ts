import { Config, Option } from "effect";

/**
 * Where the operator publishes the terms of service, which the billing page
 * links to before an order: PEAL_TERMS_URL, read at request time; none
 * when it is unset or empty.
 */
export const termsUrlConfig = Config.option(
  Config.String("PEAL_TERMS_URL")
).pipe(
  Config.map((url) =>
    url.pipe(
      Option.map((value) => value.trim()),
      Option.filter((value) => value !== ""),
      Option.getOrNull
    )
  )
);

/**
 * Where to write for more than the largest plan allows: PEAL_CONTACT_URL,
 * an address of a page or a `mailto:`, read at request time; none when it
 * is unset or empty, and the app then says to write to whoever runs the
 * server.
 */
export const contactUrlConfig = Config.option(
  Config.String("PEAL_CONTACT_URL")
).pipe(
  Config.map((url) =>
    url.pipe(
      Option.map((value) => value.trim()),
      Option.filter((value) => value !== ""),
      Option.getOrNull
    )
  )
);
