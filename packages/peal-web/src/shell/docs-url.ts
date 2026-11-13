import { Config, Option } from "effect";

/**
 * Where the operator publishes Peal's documentation, which the top bar
 * links to: PEAL_DOCS_URL, the one the server gives its discovery documents,
 * read at request time; none when it is unset or empty, and the top bar
 * then shows no link.
 */
export const docsUrlConfig = Config.option(Config.String("PEAL_DOCS_URL")).pipe(
  Config.map((url) =>
    url.pipe(
      Option.map((value) => value.trim()),
      Option.filter((value) => value !== ""),
      Option.getOrNull
    )
  )
);
