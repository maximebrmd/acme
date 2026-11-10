import { Option } from "effect";

/**
 * The database a Postgres URL names: its path, never its query, so a
 * script that must run on one database alone is not fooled by a parameter
 * that holds the name. None when the URL names no database, or is no URL.
 */
export const databaseNameOf = (url: string): Option.Option<string> => {
  if (!URL.canParse(url)) {
    return Option.none();
  }

  const name = decodeURIComponent(new URL(url).pathname.slice(1));

  return name === "" ? Option.none() : Option.some(name);
};
