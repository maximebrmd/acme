import { Option, Schema } from "effect";

const decodePage = Schema.decodeUnknownOption(
  Schema.NumberFromString.check(
    Schema.isInt(),
    Schema.isBetween({ maximum: 10_000, minimum: 1 })
  )
);

const decodeText = Schema.decodeUnknownOption(Schema.String);

/** A search parameter, as Next hands it to pages. */
export type SearchParameter = string | readonly string[] | undefined;

/** The page a console list shows, from its `page` parameter: 1 unless told. */
export const pageOf = (value: SearchParameter): number =>
  Option.getOrElse(decodePage(value), () => 1);

/** A search's text, from its `query` parameter, if one was typed. */
export const queryOf = (value: SearchParameter): string | undefined =>
  decodeText(value).pipe(
    Option.map((text) => text.trim()),
    Option.filter((text) => text !== "" && text.length <= 200),
    Option.getOrUndefined
  );

/** How many pages a list of `total` rows fills, one at least. */
export const pageCount = (total: number, pageSize: number): number =>
  Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

/** A console page's address, with its search and page. */
export const pagedHref = (
  pathname: string,
  {
    page,
    query,
  }: { readonly page: number; readonly query?: string | undefined }
): string => {
  const params = new URLSearchParams();

  if (query !== undefined) {
    params.set("query", query);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();

  return search === "" ? pathname : `${pathname}?${search}`;
};
