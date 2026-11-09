import { localePaths } from "./i18n/locales.ts";

// The legal documents platforms ask for during app review. Each is a page at
// /<document> (and /<locale>/<document>), written in
// src/content/legal/<locale>/<document>.md.
export const legalDocuments = ["privacy", "terms", "data-deletion"] as const;

export type LegalDocument = (typeof legalDocuments)[number];

/** The document a route parameter names, or `undefined` for any other value. */
export const legalDocument = (
  value: string | undefined
): LegalDocument | undefined =>
  legalDocuments.find((document) => document === value);

/** `getStaticPaths` entries for every legal document in every locale. */
export const legalPaths = () =>
  localePaths().flatMap(({ params }) =>
    legalDocuments.map((document) => ({ params: { ...params, document } }))
  );
